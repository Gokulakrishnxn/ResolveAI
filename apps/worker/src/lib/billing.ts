/**
 * Billing-aware ticket gating and metered usage emission. Called from
 * the top of `ticket-processor` so quota enforcement happens before any
 * AI cost is incurred.
 *
 * The flow:
 *   1. Load the store's subscription.
 *   2. Run pure-function `evaluateQuota` to decide allow / soft / hard.
 *   3. If allowed AND `reportUsage` is true, idempotently insert a
 *      `UsageEvent` keyed on the ticket id, increment the counter, and
 *      ship the event to Stripe (when configured).
 */
import { prisma } from '@resolveai/db';
import {
  StripeClient,
  evaluateQuota,
  type QuotaDecision,
} from '@resolveai/integrations-stripe';
import { logger } from './logger.js';
import { getConfig } from '../config.js';

let stripeCache: StripeClient | null | undefined;

function getStripe(): StripeClient | null {
  if (stripeCache !== undefined) return stripeCache;
  const cfg = getConfig();
  stripeCache = cfg.STRIPE_SECRET_KEY ? new StripeClient({ apiKey: cfg.STRIPE_SECRET_KEY }) : null;
  return stripeCache;
}

export interface TicketBillingOutcome {
  decision: QuotaDecision;
  /** True iff a usage event was successfully recorded. */
  usageRecorded: boolean;
}

/**
 * Returns the gating decision and (when allowed) records local usage.
 * Stripe meter event reporting is best-effort and failure-isolated:
 * we log warnings but never block ticket processing because of Stripe.
 */
export async function checkAndRecordTicketUsage(
  storeId: string,
  ticketId: string,
): Promise<TicketBillingOutcome> {
  const subscription = await prisma.subscription.findUnique({ where: { storeId } });
  const decision = evaluateQuota({ subscription });

  if (!decision.allowed) {
    if (decision.reason === 'hard_limit_reached') {
      await prisma.auditLog.create({
        data: {
          storeId,
          ticketId,
          kind: 'BILLING_PLAN_LIMIT_REACHED',
          payload: { reason: decision.reason },
        },
      });
    }
    return { decision, usageRecorded: false };
  }
  if (!decision.reportUsage || !subscription) {
    return { decision, usageRecorded: false };
  }

  // Insert usage event idempotently (ticketId is the key — one per ticket).
  let inserted = false;
  try {
    await prisma.usageEvent.create({
      data: {
        storeId,
        idempotencyKey: ticketId,
        kind: 'tickets_processed',
        quantity: 1,
      },
    });
    inserted = true;
  } catch (err: unknown) {
    // Unique constraint = duplicate; treat as already-counted and proceed.
    inserted = false;
  }

  if (inserted) {
    await prisma.subscription.update({
      where: { storeId },
      data: { ticketsUsedCurrentPeriod: { increment: 1 } },
    });
    await reportToStripe({ storeId, ticketId, subscription }).catch((err) => {
      logger.warn({ err, storeId, ticketId }, 'stripe meter report failed');
    });
  }

  return { decision, usageRecorded: inserted };
}

async function reportToStripe(input: {
  storeId: string;
  ticketId: string;
  subscription: { stripeCustomerId: string | null };
}): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  const { stripeCustomerId } = input.subscription;
  if (!stripeCustomerId) return;

  const result = await stripe.reportMeterEvent({
    eventName: 'tickets_processed',
    customerId: stripeCustomerId,
    quantity: 1,
    idempotencyKey: input.ticketId,
  });
  await prisma.usageEvent.update({
    where: {
      storeId_idempotencyKey_kind: {
        storeId: input.storeId,
        idempotencyKey: input.ticketId,
        kind: 'tickets_processed',
      },
    },
    data: { reportedAt: new Date(), reportedEventId: result.id },
  });
}
