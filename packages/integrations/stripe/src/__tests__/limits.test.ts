import { describe, expect, it } from 'vitest';
import { evaluateQuota } from '../limits.js';

const baseSub = {
  status: 'ACTIVE' as const,
  enforcement: 'SOFT' as const,
  includedTickets: 500,
  ticketsUsedCurrentPeriod: 0,
  trialEndsAt: null,
};

describe('evaluateQuota', () => {
  it('allows when under quota', () => {
    const d = evaluateQuota({ subscription: baseSub });
    expect(d.allowed).toBe(true);
    expect(d.reportUsage).toBe(true);
    expect(d.reason).toBe('within_quota');
  });

  it('soft-overages still go through and are reported', () => {
    const d = evaluateQuota({
      subscription: { ...baseSub, ticketsUsedCurrentPeriod: 500 },
    });
    expect(d.allowed).toBe(true);
    expect(d.reportUsage).toBe(true);
    expect(d.reason).toBe('soft_overage');
    expect(d.overageTickets).toBe(1);
  });

  it('hard-stops at the limit when configured to', () => {
    const d = evaluateQuota({
      subscription: { ...baseSub, enforcement: 'HARD', ticketsUsedCurrentPeriod: 500 },
    });
    expect(d.allowed).toBe(false);
    expect(d.reportUsage).toBe(false);
    expect(d.reason).toBe('hard_limit_reached');
  });

  it('blocks canceled subscriptions', () => {
    const d = evaluateQuota({ subscription: { ...baseSub, status: 'CANCELED' } });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('subscription_canceled');
  });

  it('honors trial included quota and hard-stops past it', () => {
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const at = evaluateQuota({
      subscription: {
        ...baseSub,
        status: 'TRIALING',
        includedTickets: 100,
        ticketsUsedCurrentPeriod: 50,
        trialEndsAt,
      },
    });
    expect(at.allowed).toBe(true);
    expect(at.reason).toBe('within_trial');

    const over = evaluateQuota({
      subscription: {
        ...baseSub,
        status: 'TRIALING',
        includedTickets: 100,
        ticketsUsedCurrentPeriod: 100,
        trialEndsAt,
      },
    });
    expect(over.allowed).toBe(false);
    expect(over.reason).toBe('hard_limit_reached');
  });

  it('passes through when no subscription is present (mid-onboarding)', () => {
    const d = evaluateQuota({ subscription: null });
    expect(d.allowed).toBe(true);
    expect(d.reportUsage).toBe(false);
    expect(d.reason).toBe('no_subscription');
  });
});
