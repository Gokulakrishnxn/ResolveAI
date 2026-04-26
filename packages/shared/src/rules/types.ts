import { z } from 'zod';
import { refundEligibilitySchema } from '../schemas/refund.js';

/**
 * Phase 2 rules engine — store-level policies that gate automated actions.
 *
 * The DSL is intentionally narrow: each policy block (`autoRefund`, …) is a
 * declarative shape rather than a generic JSON-logic tree. This keeps the
 * editor UI simple and the audit trail reproducible.
 */

export const refundReasonCodeEnum = z.enum([
  'not_received',
  'damaged',
  'wrong_item',
  'changed_mind',
  'late_delivery',
  'duplicate_order',
  'other',
]);
export type RefundReasonCode = z.infer<typeof refundReasonCodeEnum>;

export const customerRiskFlagEnum = z.enum([
  'fraud_suspected',
  'chargeback_history',
  'velocity_excess',
  'high_refund_ratio',
  'manual_review',
]);
export type CustomerRiskFlag = z.infer<typeof customerRiskFlagEnum>;

export const autoRefundPolicySchema = z.object({
  enabled: z.boolean().default(false),
  maxAmountUsd: z.number().nonnegative().max(100_000).default(50),
  maxOrderAgeDays: z.number().int().nonnegative().max(3650).default(30),
  allowedReasons: z
    .array(refundReasonCodeEnum)
    .default(['not_received', 'damaged', 'wrong_item']),
  requirePhotoFor: z.array(refundReasonCodeEnum).default(['damaged', 'wrong_item']),
  blocklistCustomerFlags: z
    .array(customerRiskFlagEnum)
    .default(['fraud_suspected', 'chargeback_history']),
});
export type AutoRefundPolicy = z.infer<typeof autoRefundPolicySchema>;

export const storePolicySchema = z.object({
  version: z.number().int().nonnegative().default(1),
  autoRefund: autoRefundPolicySchema.default({}),
});
export type StorePolicy = z.infer<typeof storePolicySchema>;

/**
 * Default policy used when a store has no `StorePolicy` row yet.
 * Phase 2 ships with auto-refund disabled by default; merchants opt in.
 */
export const DEFAULT_STORE_POLICY: StorePolicy = storePolicySchema.parse({});

export const policyDecisionEnum = z.enum(['AUTO_APPROVE', 'REQUIRE_HUMAN', 'REJECT']);
export type PolicyDecision = z.infer<typeof policyDecisionEnum>;

export const policyReasonCodeEnum = z.enum([
  'OK',
  'AUTO_REFUND_DISABLED',
  'AMOUNT_EXCEEDS_MAX',
  'ORDER_TOO_OLD',
  'REASON_NOT_ALLOWED',
  'PHOTO_REQUIRED',
  'CUSTOMER_BLOCKED',
  'ELIGIBILITY_DENIED',
  'NO_LINKED_ORDER',
  'MISSING_REASON_CODE',
  'CURRENCY_NOT_USD',
]);
export type PolicyReasonCode = z.infer<typeof policyReasonCodeEnum>;

export const policyReasonSchema = z.object({
  code: policyReasonCodeEnum,
  message: z.string().min(1).max(500),
  detail: z.record(z.string(), z.unknown()).optional(),
});
export type PolicyReason = z.infer<typeof policyReasonSchema>;

export const policyDecisionResultSchema = z.object({
  decision: policyDecisionEnum,
  reasons: z.array(policyReasonSchema),
  policyVersion: z.number().int().nonnegative(),
  evaluatedAt: z.string().datetime(),
});
export type PolicyDecisionResult = z.infer<typeof policyDecisionResultSchema>;

/**
 * Input for evaluating the auto-refund policy. The worker hydrates this
 * from ticket + order + customer + extracted intent context before invoking
 * the evaluator. All monetary fields are normalized to USD.
 */
export const autoRefundDecisionInputSchema = z.object({
  reasonCode: refundReasonCodeEnum.optional(),
  hasPhoto: z.boolean().default(false),
  requestedAmountUsd: z.number().nonnegative(),
  order: z.object({
    ageDays: z.number().nonnegative(),
    currency: z.string().length(3),
    totalAmountUsd: z.number().nonnegative(),
  }),
  customer: z
    .object({
      flags: z.array(customerRiskFlagEnum).default([]),
    })
    .optional(),
  eligibility: refundEligibilitySchema.optional(),
});
export type AutoRefundDecisionInput = z.infer<typeof autoRefundDecisionInputSchema>;
