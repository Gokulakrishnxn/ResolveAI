import { z } from 'zod';

/**
 * Refund eligibility decisions surfaced to the dashboard and persisted on
 * the proposed `Action.eligibility` JSON.
 */
export const refundEligibilityDecisionEnum = z.enum(['ELIGIBLE', 'PARTIAL', 'DENIED']);
export type RefundEligibilityDecision = z.infer<typeof refundEligibilityDecisionEnum>;

export const refundEligibilityReasonCodeEnum = z.enum([
  'OK',
  'WITHIN_RETURN_WINDOW',
  'OUTSIDE_RETURN_WINDOW',
  'ALREADY_FULLY_REFUNDED',
  'PARTIAL_ALREADY_REFUNDED',
  'NOT_FULFILLED_OK_TO_REFUND',
  'STORE_RULE_BLOCKED',
  'NO_CHARGE',
  'CANCELLED_NO_REFUND_NEEDED',
]);
export type RefundEligibilityReasonCode = z.infer<typeof refundEligibilityReasonCodeEnum>;

export const refundEligibilitySchema = z.object({
  decision: refundEligibilityDecisionEnum,
  refundableAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
  currency: z.string().length(3),
  reasonCode: refundEligibilityReasonCodeEnum,
  reasonHumanReadable: z.string().min(1).max(500),
  /** Snapshot of the order facts the rule engine evaluated. Useful for audit. */
  facts: z
    .object({
      orderTotal: z.string(),
      alreadyRefunded: z.string(),
      currency: z.string(),
      daysSincePlaced: z.number().int().nonnegative(),
      isFulfilled: z.boolean(),
      isCancelled: z.boolean(),
    })
    .partial()
    .default({}),
});
export type RefundEligibility = z.infer<typeof refundEligibilitySchema>;
