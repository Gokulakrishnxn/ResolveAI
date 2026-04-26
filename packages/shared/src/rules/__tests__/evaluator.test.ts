import { describe, expect, it } from 'vitest';
import { evaluateAutoRefund } from '../evaluator.js';
import { storePolicySchema, type StorePolicy } from '../types.js';
import { mapReasonText } from '../reasons.js';
import { signAuditPayload, verifyAuditPayload } from '../signing.js';

const FROZEN_NOW = new Date('2026-04-01T00:00:00.000Z');

function policyWith(overrides: Partial<StorePolicy['autoRefund']> = {}): StorePolicy {
  return storePolicySchema.parse({
    version: 7,
    autoRefund: { enabled: true, ...overrides },
  });
}

describe('evaluateAutoRefund', () => {
  it('AUTO_APPROVE when every gate passes', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        reasonCode: 'damaged',
        hasPhoto: true,
        requestedAmountUsd: 30,
        order: { ageDays: 5, currency: 'USD', totalAmountUsd: 50 },
        customer: { flags: [] },
      },
      now: FROZEN_NOW,
    });
    expect(result.decision).toBe('AUTO_APPROVE');
    expect(result.reasons[0]?.code).toBe('OK');
    expect(result.policyVersion).toBe(7);
    expect(result.evaluatedAt).toBe(FROZEN_NOW.toISOString());
  });

  it('REQUIRE_HUMAN when policy is disabled', () => {
    const result = evaluateAutoRefund({
      policy: policyWith({ enabled: false }),
      input: {
        reasonCode: 'damaged',
        hasPhoto: true,
        requestedAmountUsd: 5,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('AUTO_REFUND_DISABLED');
  });

  it('REQUIRE_HUMAN when amount exceeds the configured max', () => {
    const result = evaluateAutoRefund({
      policy: policyWith({ maxAmountUsd: 50 }),
      input: {
        reasonCode: 'damaged',
        hasPhoto: true,
        requestedAmountUsd: 75,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 75 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('AMOUNT_EXCEEDS_MAX');
  });

  it('REQUIRE_HUMAN when order is older than the window', () => {
    const result = evaluateAutoRefund({
      policy: policyWith({ maxOrderAgeDays: 30 }),
      input: {
        reasonCode: 'damaged',
        hasPhoto: true,
        requestedAmountUsd: 10,
        order: { ageDays: 60, currency: 'USD', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('ORDER_TOO_OLD');
  });

  it('REQUIRE_HUMAN when reason is not allowed', () => {
    const result = evaluateAutoRefund({
      policy: policyWith({ allowedReasons: ['not_received'] }),
      input: {
        reasonCode: 'changed_mind',
        hasPhoto: true,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('REASON_NOT_ALLOWED');
  });

  it('REQUIRE_HUMAN when photo missing for damaged', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        reasonCode: 'damaged',
        hasPhoto: false,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('PHOTO_REQUIRED');
  });

  it('REQUIRE_HUMAN when customer has a blocked flag', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        reasonCode: 'not_received',
        hasPhoto: false,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
        customer: { flags: ['fraud_suspected'] },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toContain('CUSTOMER_BLOCKED');
  });

  it('REQUIRE_HUMAN when reasonCode is missing', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        hasPhoto: false,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('MISSING_REASON_CODE');
  });

  it('REQUIRE_HUMAN when currency is not USD', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        reasonCode: 'not_received',
        hasPhoto: false,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'EUR', totalAmountUsd: 10 },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    expect(result.reasons.map((r) => r.code)).toContain('CURRENCY_NOT_USD');
  });

  it('REJECT when eligibility is DENIED (overrides everything)', () => {
    const result = evaluateAutoRefund({
      policy: policyWith(),
      input: {
        reasonCode: 'damaged',
        hasPhoto: true,
        requestedAmountUsd: 10,
        order: { ageDays: 1, currency: 'USD', totalAmountUsd: 10 },
        eligibility: {
          decision: 'DENIED',
          refundableAmount: '0.00',
          currency: 'USD',
          reasonCode: 'OUTSIDE_RETURN_WINDOW',
          reasonHumanReadable: 'Outside the window.',
          facts: {},
        },
      },
    });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons[0]?.code).toBe('ELIGIBILITY_DENIED');
  });

  it('aggregates multiple REQUIRE_HUMAN reasons', () => {
    const result = evaluateAutoRefund({
      policy: policyWith({ maxAmountUsd: 10, maxOrderAgeDays: 7 }),
      input: {
        reasonCode: 'damaged',
        hasPhoto: false,
        requestedAmountUsd: 50,
        order: { ageDays: 30, currency: 'USD', totalAmountUsd: 50 },
        customer: { flags: ['chargeback_history'] },
      },
    });
    expect(result.decision).toBe('REQUIRE_HUMAN');
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'AMOUNT_EXCEEDS_MAX',
        'ORDER_TOO_OLD',
        'PHOTO_REQUIRED',
        'CUSTOMER_BLOCKED',
      ]),
    );
  });
});

describe('mapReasonText', () => {
  it.each([
    ['the package never arrived', 'not_received'],
    ['my mug arrived damaged', 'damaged'],
    ['received the wrong color shirt', 'wrong_item'],
    ['changed my mind, please refund', 'changed_mind'],
    ['arrived late after the event', 'late_delivery'],
    ['I was charged twice — duplicate', 'duplicate_order'],
    ['hello, just saying hi', undefined],
  ])('maps %p -> %p', (text, code) => {
    expect(mapReasonText(text)).toBe(code);
  });
});

describe('signAuditPayload', () => {
  it('produces deterministic canonical output', () => {
    const a = signAuditPayload({ b: 2, a: 1 });
    const b = signAuditPayload({ a: 1, b: 2 });
    expect(a.canonical).toBe(b.canonical);
    expect(a.digest).toBe(b.digest);
  });

  it('verifies the same payload', () => {
    const signed = signAuditPayload({ ok: true });
    expect(verifyAuditPayload(signed)).toBe(true);
  });

  it('detects tampering', () => {
    const signed = signAuditPayload({ amount: 10 });
    const tampered = { ...signed, payload: { amount: 9999 } };
    expect(verifyAuditPayload(tampered)).toBe(false);
  });
});
