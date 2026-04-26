/**
 * ResolveAI public pricing — single source of truth.
 *
 * Plan tiers map 1:1 to `SubscriptionTier` in the Prisma schema. Each plan
 * is metered: included tickets are bundled in the flat fee, and anything
 * past the included quota is billed at `overageMicroUsd` per ticket
 * (currently $0.05 = 50 000 micro-USD).
 *
 * The `priceIdEnv` field is the env var that maps to the Stripe Price ID
 * for that tier; we resolve it at runtime to keep this package free of
 * deploy-specific identifiers.
 */
/**
 * We mirror the Prisma `SubscriptionTier` enum locally to keep this
 * package free of a hard dependency on `@prisma/client`. Keep these in
 * lockstep with `packages/db/prisma/schema.prisma`.
 */
export type SubscriptionTier = 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE';

export interface PlanDefinition {
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  includedTickets: number;
  overageMicroUsd: bigint;
  /** Marketing-friendly feature bullets. */
  features: string[];
  priceIdEnv: string;
  meterIdEnv: string;
}

export const TICKET_OVERAGE_MICRO_USD = 50_000n; // $0.05

export const TRIAL_DAYS = 14;
export const TRIAL_INCLUDED_TICKETS = 100;

export type PaidTier = Exclude<SubscriptionTier, 'FREE'>;

export const PLANS: Record<PaidTier, PlanDefinition> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    description: 'For small Shopify stores getting started with AI support.',
    priceMonthlyUsd: 29,
    includedTickets: 500,
    overageMicroUsd: TICKET_OVERAGE_MICRO_USD,
    features: [
      '500 AI-resolved tickets / month',
      'Email + chat channels',
      'Auto-resolve "Where is my order?"',
      'Human-approved refunds',
      '$0.05 / ticket overage',
    ],
    priceIdEnv: 'STRIPE_PRICE_STARTER',
    meterIdEnv: 'STRIPE_METER_STARTER',
  },
  GROWTH: {
    tier: 'GROWTH',
    name: 'Growth',
    description: 'For growing brands handling thousands of monthly tickets.',
    priceMonthlyUsd: 99,
    includedTickets: 2_500,
    overageMicroUsd: TICKET_OVERAGE_MICRO_USD,
    features: [
      '2,500 AI-resolved tickets / month',
      'WhatsApp Business channel',
      'Auto-refunds with rules engine',
      'Fraud / abuse guards',
      'Knowledge-base RAG citations',
    ],
    priceIdEnv: 'STRIPE_PRICE_GROWTH',
    meterIdEnv: 'STRIPE_METER_GROWTH',
  },
  SCALE: {
    tier: 'SCALE',
    name: 'Scale',
    description: 'For high-volume merchants with custom rules + SLAs.',
    priceMonthlyUsd: 299,
    includedTickets: 10_000,
    overageMicroUsd: TICKET_OVERAGE_MICRO_USD,
    features: [
      '10,000 AI-resolved tickets / month',
      'Multi-store management',
      'Priority support + 99.9% SLA',
      'OpenTelemetry export to your APM',
      'SAML SSO + SCIM (BetterAuth/WorkOS)',
    ],
    priceIdEnv: 'STRIPE_PRICE_SCALE',
    meterIdEnv: 'STRIPE_METER_SCALE',
  },
};

export function planForTier(tier: SubscriptionTier): PlanDefinition | null {
  if (tier === 'FREE') return null;
  return PLANS[tier as PaidTier] ?? null;
}

/**
 * Resolve a Stripe Price ID at runtime via env. Keeps the package free of
 * environment-specific identifiers and lets staging/production share the
 * same code with different prices.
 */
export function resolvePriceId(
  tier: SubscriptionTier,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const plan = planForTier(tier);
  if (!plan) return null;
  return env[plan.priceIdEnv] ?? null;
}

export function resolveMeterId(
  tier: SubscriptionTier,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const plan = planForTier(tier);
  if (!plan) return null;
  return env[plan.meterIdEnv] ?? null;
}
