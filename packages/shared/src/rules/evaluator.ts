import {
  autoRefundDecisionInputSchema,
  type AutoRefundDecisionInput,
  type AutoRefundPolicy,
  type PolicyDecisionResult,
  type PolicyReason,
  type StorePolicy,
} from './types.js';

const REASON_MESSAGES = {
  AUTO_REFUND_DISABLED: 'Auto-refund is disabled for this store.',
  AMOUNT_EXCEEDS_MAX: 'Requested refund amount exceeds the configured limit.',
  ORDER_TOO_OLD: 'Order is older than the configured auto-refund window.',
  REASON_NOT_ALLOWED: 'The customer reason is not in the auto-approve allowlist.',
  PHOTO_REQUIRED: 'A photo is required for this reason but none was provided.',
  CUSTOMER_BLOCKED: 'Customer has a risk flag that blocks auto-refund.',
  ELIGIBILITY_DENIED: 'Refund eligibility check denied this refund.',
  MISSING_REASON_CODE: 'No structured reason code was extracted from the conversation.',
  CURRENCY_NOT_USD: 'Order currency is not USD; auto-refund limits are configured in USD.',
} as const;

interface EvaluateAutoRefundOptions {
  policy: StorePolicy;
  input: AutoRefundDecisionInput;
  /**
   * Override `Date.now()` for deterministic snapshots in tests / audit.
   */
  now?: Date;
}

/**
 * Evaluate the auto-refund policy.
 *
 * Decision precedence:
 *   - REJECT only when eligibility is hard-denied (refund cannot succeed).
 *   - REQUIRE_HUMAN for any policy gate failure.
 *   - AUTO_APPROVE only if every gate passes.
 *
 * The evaluator is deterministic and pure — no I/O, no clock except `now`.
 */
export function evaluateAutoRefund(opts: EvaluateAutoRefundOptions): PolicyDecisionResult {
  const policy: AutoRefundPolicy = opts.policy.autoRefund;
  const input = autoRefundDecisionInputSchema.parse(opts.input);
  const reasons: PolicyReason[] = [];
  const evaluatedAt = (opts.now ?? new Date()).toISOString();

  const reject = (code: keyof typeof REASON_MESSAGES, detail?: Record<string, unknown>): PolicyDecisionResult => {
    reasons.push({
      code,
      message: REASON_MESSAGES[code],
      detail,
    });
    return {
      decision: 'REJECT',
      reasons,
      policyVersion: opts.policy.version,
      evaluatedAt,
    };
  };

  const requireHuman = (
    code: keyof typeof REASON_MESSAGES,
    detail?: Record<string, unknown>,
  ): void => {
    reasons.push({
      code,
      message: REASON_MESSAGES[code],
      detail,
    });
  };

  if (input.eligibility?.decision === 'DENIED') {
    return reject('ELIGIBILITY_DENIED', {
      reasonCode: input.eligibility.reasonCode,
    });
  }

  if (!policy.enabled) {
    requireHuman('AUTO_REFUND_DISABLED');
  }

  if (input.order.currency.toUpperCase() !== 'USD') {
    requireHuman('CURRENCY_NOT_USD', { currency: input.order.currency });
  }

  if (input.requestedAmountUsd > policy.maxAmountUsd) {
    requireHuman('AMOUNT_EXCEEDS_MAX', {
      requested: input.requestedAmountUsd,
      max: policy.maxAmountUsd,
    });
  }

  if (input.order.ageDays > policy.maxOrderAgeDays) {
    requireHuman('ORDER_TOO_OLD', {
      ageDays: input.order.ageDays,
      maxOrderAgeDays: policy.maxOrderAgeDays,
    });
  }

  if (!input.reasonCode) {
    requireHuman('MISSING_REASON_CODE');
  } else if (!policy.allowedReasons.includes(input.reasonCode)) {
    requireHuman('REASON_NOT_ALLOWED', {
      reasonCode: input.reasonCode,
      allowed: policy.allowedReasons,
    });
  } else if (policy.requirePhotoFor.includes(input.reasonCode) && !input.hasPhoto) {
    requireHuman('PHOTO_REQUIRED', { reasonCode: input.reasonCode });
  }

  const blockingFlags = (input.customer?.flags ?? []).filter((f) =>
    policy.blocklistCustomerFlags.includes(f),
  );
  if (blockingFlags.length > 0) {
    requireHuman('CUSTOMER_BLOCKED', { blockingFlags });
  }

  if (reasons.length === 0) {
    return {
      decision: 'AUTO_APPROVE',
      reasons: [
        {
          code: 'OK',
          message: 'All auto-refund policy gates passed.',
        },
      ],
      policyVersion: opts.policy.version,
      evaluatedAt,
    };
  }

  return {
    decision: 'REQUIRE_HUMAN',
    reasons,
    policyVersion: opts.policy.version,
    evaluatedAt,
  };
}
