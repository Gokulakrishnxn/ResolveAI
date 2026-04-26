import { describe, expect, it } from 'vitest';
import {
  composeWithFraud,
  evaluateFraudGuards,
  type FraudGuardInput,
} from '../fraud.js';

const baseInput: FraudGuardInput = {
  refundCount30d: 0,
  refundTotal30dUsd: 0,
  lifetimeValueUsd: 100,
  existingFlags: [],
  disputeCount: 0,
};

describe('evaluateFraudGuards', () => {
  it('ALLOW with default-clean customer', () => {
    const r = evaluateFraudGuards({ input: baseInput });
    expect(r.decision).toBe('ALLOW');
    expect(r.signals[0]?.code).toBe('OK');
  });

  it('REQUIRE_HUMAN when refund count exceeds threshold', () => {
    const r = evaluateFraudGuards({
      input: { ...baseInput, refundCount30d: 3 },
    });
    expect(r.decision).toBe('REQUIRE_HUMAN');
    expect(r.signals.map((s) => s.code)).toContain('VELOCITY_REFUND_COUNT');
    expect(r.flags).toContain('velocity_excess');
  });

  it('REQUIRE_HUMAN when refund ratio exceeds 0.4', () => {
    const r = evaluateFraudGuards({
      input: {
        ...baseInput,
        refundTotal30dUsd: 60,
        lifetimeValueUsd: 100,
      },
    });
    expect(r.decision).toBe('REQUIRE_HUMAN');
    expect(r.signals.map((s) => s.code)).toContain('HIGH_REFUND_RATIO');
    expect(r.flags).toContain('high_refund_ratio');
  });

  it('does not divide by zero when LTV is 0', () => {
    const r = evaluateFraudGuards({
      input: { ...baseInput, lifetimeValueUsd: 0, refundTotal30dUsd: 50 },
    });
    expect(r.decision).toBe('ALLOW');
  });

  it('REQUIRE_HUMAN when chargeback present', () => {
    const r = evaluateFraudGuards({
      input: { ...baseInput, disputeCount: 1 },
    });
    expect(r.decision).toBe('REQUIRE_HUMAN');
    expect(r.signals.map((s) => s.code)).toContain('CHARGEBACK_HISTORY');
    expect(r.flags).toContain('chargeback_history');
  });

  it('REQUIRE_HUMAN when an existing risk flag is present', () => {
    const r = evaluateFraudGuards({
      input: { ...baseInput, existingFlags: ['fraud_suspected'] },
    });
    expect(r.decision).toBe('REQUIRE_HUMAN');
    expect(r.signals.map((s) => s.code)).toContain('PRESENT_RISK_FLAG');
  });
});

describe('composeWithFraud', () => {
  it('keeps AUTO_APPROVE when fraud allows', () => {
    const policy = {
      decision: 'AUTO_APPROVE' as const,
      reasons: [{ code: 'OK', message: 'ok' }],
      policyVersion: 1,
      evaluatedAt: new Date().toISOString(),
    };
    const fraud = evaluateFraudGuards({ input: baseInput });
    const out = composeWithFraud(policy, fraud);
    expect(out.decision).toBe('AUTO_APPROVE');
  });

  it('demotes AUTO_APPROVE to REQUIRE_HUMAN when fraud requires human', () => {
    const policy = {
      decision: 'AUTO_APPROVE' as const,
      reasons: [{ code: 'OK', message: 'ok' }],
      policyVersion: 1,
      evaluatedAt: new Date().toISOString(),
    };
    const fraud = evaluateFraudGuards({
      input: { ...baseInput, refundCount30d: 5 },
    });
    const out = composeWithFraud(policy, fraud);
    expect(out.decision).toBe('REQUIRE_HUMAN');
  });

  it('keeps REJECT when fraud requires human (REJECT wins)', () => {
    const policy = {
      decision: 'REJECT' as const,
      reasons: [{ code: 'ELIGIBILITY_DENIED', message: 'denied' }],
      policyVersion: 1,
      evaluatedAt: new Date().toISOString(),
    };
    const fraud = evaluateFraudGuards({
      input: { ...baseInput, refundCount30d: 5 },
    });
    const out = composeWithFraud(policy, fraud);
    expect(out.decision).toBe('REJECT');
  });
});
