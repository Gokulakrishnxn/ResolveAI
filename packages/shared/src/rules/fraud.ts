import { z } from 'zod';
import { customerRiskFlagEnum, type CustomerRiskFlag } from './types.js';

/**
 * Phase 2 Fraud / Abuse Guards.
 *
 * Deterministic, side-effect-free signal detection over per-customer
 * aggregates. The output of `evaluateFraudGuards` is consumed by the
 * decision pipeline ahead of the rules engine — fraud always wins.
 */

export const fraudGuardThresholdsSchema = z.object({
  refundCountWindowDays: z.number().int().positive().default(30),
  refundCountThreshold: z.number().int().positive().default(2),
  refundRatioThreshold: z.number().min(0).max(1).default(0.4),
});
export type FraudGuardThresholds = z.infer<typeof fraudGuardThresholdsSchema>;

export const DEFAULT_FRAUD_THRESHOLDS: FraudGuardThresholds = fraudGuardThresholdsSchema.parse({});

export const fraudGuardInputSchema = z.object({
  refundCount30d: z.number().int().nonnegative(),
  refundTotal30dUsd: z.number().nonnegative(),
  lifetimeValueUsd: z.number().nonnegative(),
  existingFlags: z.array(customerRiskFlagEnum).default([]),
  disputeCount: z.number().int().nonnegative().default(0),
});
export type FraudGuardInput = z.infer<typeof fraudGuardInputSchema>;

export const fraudGuardDecisionEnum = z.enum(['ALLOW', 'REQUIRE_HUMAN']);
export type FraudGuardDecision = z.infer<typeof fraudGuardDecisionEnum>;

export const fraudSignalCodeEnum = z.enum([
  'VELOCITY_REFUND_COUNT',
  'HIGH_REFUND_RATIO',
  'PRESENT_RISK_FLAG',
  'CHARGEBACK_HISTORY',
  'OK',
]);
export type FraudSignalCode = z.infer<typeof fraudSignalCodeEnum>;

export const fraudSignalSchema = z.object({
  code: fraudSignalCodeEnum,
  message: z.string(),
  detail: z.record(z.string(), z.unknown()).optional(),
});
export type FraudSignal = z.infer<typeof fraudSignalSchema>;

export const fraudGuardResultSchema = z.object({
  decision: fraudGuardDecisionEnum,
  signals: z.array(fraudSignalSchema),
  flags: z.array(customerRiskFlagEnum),
  evaluatedAt: z.string().datetime(),
});
export type FraudGuardResult = z.infer<typeof fraudGuardResultSchema>;

interface EvaluateFraudOptions {
  input: FraudGuardInput;
  thresholds?: FraudGuardThresholds;
  now?: Date;
}

export function evaluateFraudGuards(opts: EvaluateFraudOptions): FraudGuardResult {
  const input = fraudGuardInputSchema.parse(opts.input);
  const thresholds = opts.thresholds ?? DEFAULT_FRAUD_THRESHOLDS;
  const evaluatedAt = (opts.now ?? new Date()).toISOString();
  const signals: FraudSignal[] = [];
  const flags = new Set<CustomerRiskFlag>(input.existingFlags);

  if (input.refundCount30d > thresholds.refundCountThreshold) {
    signals.push({
      code: 'VELOCITY_REFUND_COUNT',
      message: `Customer has ${input.refundCount30d} refunds in the past ${thresholds.refundCountWindowDays} days (threshold ${thresholds.refundCountThreshold}).`,
      detail: { refundCount30d: input.refundCount30d, threshold: thresholds.refundCountThreshold },
    });
    flags.add('velocity_excess');
  }

  if (input.lifetimeValueUsd > 0) {
    const ratio = input.refundTotal30dUsd / input.lifetimeValueUsd;
    if (ratio > thresholds.refundRatioThreshold) {
      signals.push({
        code: 'HIGH_REFUND_RATIO',
        message: `Refunds ratio ${(ratio * 100).toFixed(1)}% exceeds the ${(thresholds.refundRatioThreshold * 100).toFixed(0)}% threshold.`,
        detail: { ratio, threshold: thresholds.refundRatioThreshold },
      });
      flags.add('high_refund_ratio');
    }
  }

  if (input.disputeCount > 0) {
    signals.push({
      code: 'CHARGEBACK_HISTORY',
      message: `Customer has ${input.disputeCount} dispute(s) on record.`,
      detail: { disputeCount: input.disputeCount },
    });
    flags.add('chargeback_history');
  }

  const presentRiskFlags = input.existingFlags.filter((f) =>
    f === 'fraud_suspected' || f === 'manual_review' || f === 'chargeback_history',
  );
  if (presentRiskFlags.length > 0) {
    signals.push({
      code: 'PRESENT_RISK_FLAG',
      message: `Existing risk flags: ${presentRiskFlags.join(', ')}.`,
      detail: { flags: presentRiskFlags },
    });
  }

  if (signals.length === 0) {
    return {
      decision: 'ALLOW',
      signals: [{ code: 'OK', message: 'No fraud / abuse signals detected.' }],
      flags: Array.from(flags),
      evaluatedAt,
    };
  }

  return {
    decision: 'REQUIRE_HUMAN',
    signals,
    flags: Array.from(flags),
    evaluatedAt,
  };
}

/**
 * Compose the fraud guard with the auto-refund policy decision. Fraud
 * `REQUIRE_HUMAN` strictly overrides any policy `AUTO_APPROVE`.
 */
export function composeWithFraud<T extends { decision: 'AUTO_APPROVE' | 'REQUIRE_HUMAN' | 'REJECT' }>(
  policyResult: T,
  fraudResult: FraudGuardResult,
): T {
  if (policyResult.decision === 'AUTO_APPROVE' && fraudResult.decision === 'REQUIRE_HUMAN') {
    return {
      ...policyResult,
      decision: 'REQUIRE_HUMAN',
      reasons: [
        ...((policyResult as unknown as { reasons?: unknown[] }).reasons ?? []),
        ...fraudResult.signals.map((s) => ({
          code: 'CUSTOMER_BLOCKED' as const,
          message: s.message,
          detail: s.detail,
        })),
      ],
    } as unknown as T;
  }
  return policyResult;
}
