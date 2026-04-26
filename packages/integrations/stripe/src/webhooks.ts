import type Stripe from 'stripe';
import { z } from 'zod';

/**
 * Maps Stripe subscription statuses → our internal `SubscriptionStatus`
 * enum. We collapse `incomplete` and `unpaid` into `PAST_DUE` so the
 * billing-aware ingestion path has a single "merchant needs to fix
 * their card" branch to handle.
 */
export function mapStripeStatus(
  status: Stripe.Subscription.Status,
):
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'PAUSED' {
  switch (status) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'paused':
      return 'PAUSED';
    default:
      return 'PAUSED';
  }
}

/** Subset of webhook event types we actually act on. */
export const HANDLED_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
] as const;

export type HandledStripeEvent = (typeof HANDLED_EVENT_TYPES)[number];

export const stripeMetadataSchema = z.object({
  storeId: z.string().min(1),
});
