import { StripeClient } from '@resolveai/integrations-stripe';
import { getConfig } from '../config.js';

let cached: StripeClient | undefined;

/**
 * Returns a process-wide Stripe client. Lazy so test harnesses don't
 * need a key. Returns `null` when no key is configured (e.g. local
 * dev without Stripe).
 */
export function getStripeClient(): StripeClient | null {
  if (cached) return cached;
  const cfg = getConfig();
  if (!cfg.STRIPE_SECRET_KEY) return null;
  cached = new StripeClient({ apiKey: cfg.STRIPE_SECRET_KEY });
  return cached;
}
