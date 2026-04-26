/**
 * Local mirrors of Prisma enum types. See `plans.ts` for rationale.
 */
export type LimitEnforcement = 'HARD' | 'SOFT';
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'PAUSED';

export interface QuotaCheckSubscription {
  status: SubscriptionStatus;
  enforcement: LimitEnforcement;
  includedTickets: number;
  ticketsUsedCurrentPeriod: number;
  trialEndsAt: Date | null;
}

export interface QuotaCheckInput {
  subscription: QuotaCheckSubscription | null;
  /** Override "now" for deterministic testing. */
  now?: Date;
}

export interface QuotaDecision {
  /** True when the ticket can be processed. */
  allowed: boolean;
  /** Reason code surfaced to logs / inbox UI. */
  reason:
    | 'ok'
    | 'within_quota'
    | 'within_trial'
    | 'no_subscription'
    | 'soft_overage'
    | 'hard_limit_reached'
    | 'subscription_canceled'
    | 'subscription_paused';
  /**
   * Whether the ticket counts against quota / generates a metered usage
   * event. Soft-overage tickets are allowed AND counted; hard-blocked
   * tickets are neither.
   */
  reportUsage: boolean;
  /** Number of overage tickets after this one (>= 0 when soft overage). */
  overageTickets: number;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE'];

/**
 * Hot-path quota check, called per ticket before AI processing. Pure
 * function — caller is responsible for incrementing counters / emitting
 * usage events.
 */
export function evaluateQuota(input: QuotaCheckInput): QuotaDecision {
  const sub = input.subscription;
  if (!sub) {
    // No subscription row yet. We allow the request through (the merchant
    // is mid-onboarding) but the API will create a free trial on demand.
    return { allowed: true, reason: 'no_subscription', reportUsage: false, overageTickets: 0 };
  }

  if (sub.status === 'CANCELED') {
    return { allowed: false, reason: 'subscription_canceled', reportUsage: false, overageTickets: 0 };
  }
  if (sub.status === 'PAUSED') {
    return { allowed: false, reason: 'subscription_paused', reportUsage: false, overageTickets: 0 };
  }
  if (!ACTIVE_STATUSES.includes(sub.status)) {
    return { allowed: false, reason: 'subscription_paused', reportUsage: false, overageTickets: 0 };
  }

  if (sub.status === 'TRIALING' && sub.trialEndsAt) {
    const now = input.now ?? new Date();
    if (now >= sub.trialEndsAt) {
      // Trial expired but webhook hasn't run yet — be lenient and allow
      // until the next webhook flips us to ACTIVE/PAST_DUE.
      // Quota still applies normally below.
    } else {
      if (sub.ticketsUsedCurrentPeriod < sub.includedTickets) {
        return { allowed: true, reason: 'within_trial', reportUsage: true, overageTickets: 0 };
      }
      // Trial users are always hard-stopped at the trial cap to prevent
      // abuse — they have to add a card to keep going.
      return { allowed: false, reason: 'hard_limit_reached', reportUsage: false, overageTickets: 0 };
    }
  }

  if (sub.ticketsUsedCurrentPeriod < sub.includedTickets) {
    return { allowed: true, reason: 'within_quota', reportUsage: true, overageTickets: 0 };
  }

  const overage = sub.ticketsUsedCurrentPeriod - sub.includedTickets + 1;
  if (sub.enforcement === 'HARD') {
    return { allowed: false, reason: 'hard_limit_reached', reportUsage: false, overageTickets: 0 };
  }
  return { allowed: true, reason: 'soft_overage', reportUsage: true, overageTickets: overage };
}
