import { Prisma, type Order } from '@resolveai/db';
import {
  type RefundEligibility,
  type RefundEligibilityReasonCode,
} from '@resolveai/shared';

const DEFAULT_RETURN_WINDOW_DAYS = 30;

interface StoreRefundSettings {
  refundWindowDays?: number;
  refundShipping?: boolean;
}

export interface ComputeEligibilityInput {
  order: Order;
  settings?: StoreRefundSettings;
}

const REASONS: Record<RefundEligibilityReasonCode, string> = {
  OK: 'Order is within the return window and eligible for refund.',
  WITHIN_RETURN_WINDOW: 'Order is within the return window.',
  OUTSIDE_RETURN_WINDOW: 'Order was placed outside the return window.',
  ALREADY_FULLY_REFUNDED: 'This order has already been fully refunded.',
  PARTIAL_ALREADY_REFUNDED: 'A partial refund has already been issued; remaining amount is offered.',
  NOT_FULFILLED_OK_TO_REFUND: 'Order is not yet fulfilled; full refund is recommended.',
  STORE_RULE_BLOCKED: 'Per the store policy, this order cannot be refunded automatically.',
  NO_CHARGE: 'No payment was captured for this order; nothing to refund.',
  CANCELLED_NO_REFUND_NEEDED: 'Order was cancelled before payment; no refund needed.',
};

export function computeRefundEligibility(input: ComputeEligibilityInput): RefundEligibility {
  const { order } = input;
  const settings = input.settings ?? {};
  const returnWindow = settings.refundWindowDays ?? DEFAULT_RETURN_WINDOW_DAYS;

  const total = new Prisma.Decimal(order.totalPrice);
  const refunded = new Prisma.Decimal(order.refundedAmount ?? 0);
  const remaining = total.minus(refunded);

  const placed = order.placedAt ?? order.createdAt;
  const days = Math.floor((Date.now() - placed.getTime()) / 86_400_000);
  const isFulfilled = order.status === 'FULFILLED' || order.status === 'PARTIALLY_FULFILLED';
  const isCancelled = order.status === 'CANCELLED';

  const facts = {
    orderTotal: total.toFixed(2),
    alreadyRefunded: refunded.toFixed(2),
    currency: order.currency,
    daysSincePlaced: days,
    isFulfilled,
    isCancelled,
  };

  if (total.lessThanOrEqualTo(0)) {
    return {
      decision: 'DENIED',
      refundableAmount: '0.00',
      currency: order.currency,
      reasonCode: 'NO_CHARGE',
      reasonHumanReadable: REASONS.NO_CHARGE,
      facts,
    };
  }

  if (isCancelled && refunded.equals(0)) {
    return {
      decision: 'DENIED',
      refundableAmount: '0.00',
      currency: order.currency,
      reasonCode: 'CANCELLED_NO_REFUND_NEEDED',
      reasonHumanReadable: REASONS.CANCELLED_NO_REFUND_NEEDED,
      facts,
    };
  }

  if (remaining.lessThanOrEqualTo(0)) {
    return {
      decision: 'DENIED',
      refundableAmount: '0.00',
      currency: order.currency,
      reasonCode: 'ALREADY_FULLY_REFUNDED',
      reasonHumanReadable: REASONS.ALREADY_FULLY_REFUNDED,
      facts,
    };
  }

  if (days > returnWindow) {
    return {
      decision: 'DENIED',
      refundableAmount: '0.00',
      currency: order.currency,
      reasonCode: 'OUTSIDE_RETURN_WINDOW',
      reasonHumanReadable: `Order was placed ${days} days ago; the return window is ${returnWindow} days.`,
      facts,
    };
  }

  if (refunded.greaterThan(0) && refunded.lessThan(total)) {
    return {
      decision: 'PARTIAL',
      refundableAmount: remaining.toFixed(2),
      currency: order.currency,
      reasonCode: 'PARTIAL_ALREADY_REFUNDED',
      reasonHumanReadable: REASONS.PARTIAL_ALREADY_REFUNDED,
      facts,
    };
  }

  if (!isFulfilled) {
    return {
      decision: 'ELIGIBLE',
      refundableAmount: remaining.toFixed(2),
      currency: order.currency,
      reasonCode: 'NOT_FULFILLED_OK_TO_REFUND',
      reasonHumanReadable: REASONS.NOT_FULFILLED_OK_TO_REFUND,
      facts,
    };
  }

  return {
    decision: 'ELIGIBLE',
    refundableAmount: remaining.toFixed(2),
    currency: order.currency,
    reasonCode: 'WITHIN_RETURN_WINDOW',
    reasonHumanReadable: REASONS.WITHIN_RETURN_WINDOW,
    facts,
  };
}
