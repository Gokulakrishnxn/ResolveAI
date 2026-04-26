/**
 * Stripe webhook receiver. Mounted at the top level (no auth) so Stripe
 * can reach it directly. Verifies the signature using `STRIPE_WEBHOOK_SECRET`
 * and translates the event into our `Subscription` model.
 */
import type { FastifyInstance } from 'fastify';
import type Stripe from 'stripe';
import { prisma } from '@resolveai/db';
import { ForbiddenError } from '@resolveai/shared';
import {
  mapStripeStatus,
  planForTier,
  type SubscriptionTier,
} from '@resolveai/integrations-stripe';
import { getStripeClient } from '../lib/stripe.js';
import { appendAuditLog } from '../lib/audit.js';
import { getConfig } from '../config.js';

export async function registerStripeWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/stripe', async (req, reply) => {
    const cfg = getConfig();
    const stripe = getStripeClient();
    if (!stripe || !cfg.STRIPE_WEBHOOK_SECRET) {
      // Fail fast — surfaces misconfiguration in stage/prod logs.
      throw new ForbiddenError('Stripe webhooks are not configured');
    }
    const sig = req.headers['stripe-signature'];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    if (typeof sigStr !== 'string') throw new ForbiddenError('Missing Stripe signature');

    const raw = (req as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);

    let event: Stripe.Event;
    try {
      event = stripe.verifyWebhook(raw, sigStr, cfg.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      req.log.warn({ err }, 'stripe webhook signature failed');
      throw new ForbiddenError('Invalid Stripe signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpserted(sub, stripe);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceEvent(event.type, invoice);
        break;
      }
      default:
        // Ignore other event types — Stripe will retry if we 5xx, so a
        // 200 here keeps the queue healthy.
        break;
    }
    reply.send({ received: true });
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const storeId = session.metadata?.storeId;
  if (!storeId) return;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return;
  await prisma.subscription.update({
    where: { storeId },
    data: { stripeCustomerId: customerId },
  });
}

async function handleSubscriptionUpserted(
  sub: Stripe.Subscription,
  stripe: ReturnType<typeof getStripeClient>,
): Promise<void> {
  const storeId = await resolveStoreIdFromSubscription(sub, stripe);
  if (!storeId) return;

  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const tier = inferTierFromPriceId(priceId);
  const includedTickets = tier ? planForTier(tier)?.includedTickets ?? 0 : 0;

  const data = {
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripePriceId: priceId,
    tier: tier ?? 'FREE',
    status: mapStripeStatus(sub.status),
    includedTickets,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    currentPeriodStart: sub.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : null,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  } as const;

  const previous = await prisma.subscription.findUnique({ where: { storeId } });
  await prisma.subscription.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  });
  await appendAuditLog({
    storeId,
    kind: previous ? 'BILLING_SUBSCRIPTION_UPDATED' : 'BILLING_SUBSCRIPTION_CREATED',
    payload: { tier: data.tier, status: data.status, priceId, stripeId: sub.id },
  });

  // When the period rolls over, reset the metered counter so the next
  // billing cycle starts at 0 included tickets.
  if (
    previous?.currentPeriodEnd &&
    data.currentPeriodEnd &&
    previous.currentPeriodEnd.getTime() !== data.currentPeriodEnd.getTime()
  ) {
    await prisma.subscription.update({
      where: { storeId },
      data: { ticketsUsedCurrentPeriod: 0 },
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const storeId = await resolveStoreIdFromSubscription(sub, getStripeClient());
  if (!storeId) return;
  await prisma.subscription.update({
    where: { storeId },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });
  await appendAuditLog({
    storeId,
    kind: 'BILLING_SUBSCRIPTION_CANCELED',
    payload: { stripeId: sub.id },
  });
}

async function handleInvoiceEvent(
  type: 'invoice.paid' | 'invoice.payment_failed',
  invoice: Stripe.Invoice,
): Promise<void> {
  const subId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
    select: { storeId: true },
  });
  if (!sub) return;
  await prisma.subscription.update({
    where: { storeId: sub.storeId },
    data: { status: type === 'invoice.paid' ? 'ACTIVE' : 'PAST_DUE' },
  });
}

async function resolveStoreIdFromSubscription(
  sub: Stripe.Subscription,
  stripe: ReturnType<typeof getStripeClient>,
): Promise<string | null> {
  if (sub.metadata?.storeId) return sub.metadata.storeId;
  // Fall back to checkout session metadata.
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  if (stripe) {
    const customer = await stripe.raw.customers.retrieve(customerId);
    if (!customer.deleted && customer.metadata?.storeId) {
      return customer.metadata.storeId;
    }
  }
  // As a final fallback, look up the existing row by customer id.
  const existing = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { storeId: true },
  });
  return existing?.storeId ?? null;
}

function inferTierFromPriceId(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  const env = process.env;
  if (priceId === env.STRIPE_PRICE_STARTER) return 'STARTER';
  if (priceId === env.STRIPE_PRICE_GROWTH) return 'GROWTH';
  if (priceId === env.STRIPE_PRICE_SCALE) return 'SCALE';
  return null;
}
