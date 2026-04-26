/**
 * Billing surface — Stripe Checkout, Customer Portal, plan management,
 * and subscription state queries. Webhook handler lives in
 * `webhooks-stripe.ts` because it needs unauthenticated raw-body access.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import {
  PLANS,
  TRIAL_DAYS,
  TRIAL_INCLUDED_TICKETS,
  resolvePriceId,
  type PlanDefinition,
} from '@resolveai/integrations-stripe';
import { BadRequestError, NotFoundError } from '@resolveai/shared';
import { getStripeClient } from '../lib/stripe.js';
import { getConfig } from '../config.js';

const checkoutSchema = z.object({
  tier: z.enum(['STARTER', 'GROWTH', 'SCALE']),
  /** Explicit override; defaults to dashboard `/settings/billing`. */
  successPath: z.string().startsWith('/').optional(),
  cancelPath: z.string().startsWith('/').optional(),
});

const updateEnforcementSchema = z.object({
  enforcement: z.enum(['HARD', 'SOFT']),
});

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  /** GET /billing/plans — public catalog used by the dashboard + onboarding. */
  app.get('/billing/plans', async () => {
    const plans: Array<PlanDefinition & { priceId: string | null }> = (
      Object.values(PLANS) as PlanDefinition[]
    ).map((plan) => ({
      ...plan,
      priceId: resolvePriceId(plan.tier),
    }));
    return { plans, trialDays: TRIAL_DAYS, trialIncludedTickets: TRIAL_INCLUDED_TICKETS };
  });

  /** GET /billing/subscription — current state for the merchant's store. */
  app.get('/billing/subscription', async (req) => {
    const storeId = req.storeId!;
    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    return { subscription: serializeSubscription(sub) };
  });

  /**
   * POST /billing/start-trial — idempotent trial bootstrap. Called on the
   * first dashboard visit (or by the onboarding wizard). Creates a FREE
   * subscription row in TRIALING status — no card required.
   */
  app.post('/billing/start-trial', async (req) => {
    const storeId = req.storeId!;
    const existing = await prisma.subscription.findUnique({ where: { storeId } });
    if (existing) return { subscription: serializeSubscription(existing) };

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const sub = await prisma.subscription.create({
      data: {
        storeId,
        tier: 'FREE',
        status: 'TRIALING',
        includedTickets: TRIAL_INCLUDED_TICKETS,
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
    });
    await prisma.auditLog.create({
      data: {
        storeId,
        userId: req.auth?.userId,
        kind: 'BILLING_SUBSCRIPTION_CREATED',
        payload: { tier: 'FREE', trial: true, trialEndsAt: trialEndsAt.toISOString() },
      },
    });
    return { subscription: serializeSubscription(sub) };
  });

  /**
   * POST /billing/checkout — issue a Stripe Checkout session URL. The
   * merchant is redirected here to enter card details and confirm a
   * paid plan. Stripe's `customer.subscription.created` webhook then
   * updates our `Subscription` row.
   */
  app.post('/billing/checkout', async (req) => {
    const stripe = getStripeClient();
    if (!stripe) throw new BadRequestError('Stripe is not configured on this deployment');
    const cfg = getConfig();
    const body = checkoutSchema.parse(req.body);
    const storeId = req.storeId!;

    const priceId = resolvePriceId(body.tier);
    if (!priceId) throw new BadRequestError(`No Stripe price configured for ${body.tier}`);

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { subscription: true, users: { where: { role: 'OWNER' }, take: 1 } },
    });
    if (!store) throw new NotFoundError('Store not found');

    let customerId = store.subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.createCustomer({
        storeId,
        name: store.name,
        email: store.users[0]?.email,
      });
      customerId = customer.id;
    }

    const baseUrl = cfg.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.createCheckoutSession({
      storeId,
      customerId,
      priceId,
      successUrl: `${baseUrl}${body.successPath ?? '/settings/billing?status=success'}`,
      cancelUrl: `${baseUrl}${body.cancelPath ?? '/settings/billing?status=cancel'}`,
      trialDays: TRIAL_DAYS,
    });

    // Store the customer id eagerly so the portal works even before the
    // subscription webhook has run.
    if (!store.subscription) {
      await prisma.subscription.create({
        data: {
          storeId,
          tier: 'FREE',
          status: 'TRIALING',
          stripeCustomerId: customerId,
          includedTickets: TRIAL_INCLUDED_TICKETS,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        },
      });
    } else if (!store.subscription.stripeCustomerId) {
      await prisma.subscription.update({
        where: { storeId },
        data: { stripeCustomerId: customerId },
      });
    }

    return { url: session.url };
  });

  /**
   * POST /billing/portal — Stripe-hosted Customer Portal. Lets the
   * merchant update payment methods, switch plans, or cancel.
   */
  app.post('/billing/portal', async (req) => {
    const stripe = getStripeClient();
    if (!stripe) throw new BadRequestError('Stripe is not configured on this deployment');
    const cfg = getConfig();
    const storeId = req.storeId!;
    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    if (!sub?.stripeCustomerId) throw new BadRequestError('No Stripe customer for this store');

    const baseUrl = cfg.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.createPortalSession({
      customerId: sub.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing`,
    });
    return { url: session.url };
  });

  /**
   * PATCH /billing/enforcement — flip between HARD and SOFT plan-limit
   * enforcement. Surfaced in /settings/billing as a single switch.
   */
  app.patch('/billing/enforcement', async (req) => {
    const body = updateEnforcementSchema.parse(req.body);
    const storeId = req.storeId!;
    const sub = await prisma.subscription.update({
      where: { storeId },
      data: { enforcement: body.enforcement },
    });
    return { subscription: serializeSubscription(sub) };
  });

  /** GET /billing/usage — current period counter + recent meter events. */
  app.get('/billing/usage', async (req) => {
    const storeId = req.storeId!;
    const [sub, recent] = await Promise.all([
      prisma.subscription.findUnique({ where: { storeId } }),
      prisma.usageEvent.findMany({
        where: { storeId },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        select: {
          id: true,
          kind: true,
          quantity: true,
          occurredAt: true,
          reportedAt: true,
        },
      }),
    ]);
    return {
      subscription: serializeSubscription(sub),
      recent,
    };
  });
}

function serializeSubscription(
  sub: Awaited<ReturnType<typeof prisma.subscription.findUnique>>,
): Record<string, unknown> | null {
  if (!sub) return null;
  return {
    ...sub,
    overageMicroUsd: sub.overageMicroUsd.toString(),
  };
}
