/**
 * WhatsApp outbound policy gates.
 *
 * Meta enforces:
 *  - Freeform messages are only allowed inside the 24h "Customer Service
 *    Window" — measured from the customer's last inbound message.
 *  - Outside that window, only pre-approved templates may be sent.
 *
 * Real enforcement happens server-side at Meta, but we want to fail fast
 * locally with a clear reason rather than burning our quota on rejected
 * messages.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface WindowEvaluationInput {
  /** Most recent inbound message timestamp from the customer. */
  lastInboundAt: Date | null;
  /** Whether the outbound message uses a pre-approved template. */
  isTemplate: boolean;
  now?: Date;
}

export type WindowDecision =
  | { allowed: true }
  | { allowed: false; reason: 'OUTSIDE_24H_WINDOW' | 'NO_PRIOR_INBOUND' };

export function evaluateWhatsappWindow(input: WindowEvaluationInput): WindowDecision {
  if (input.isTemplate) return { allowed: true };

  if (!input.lastInboundAt) {
    return { allowed: false, reason: 'NO_PRIOR_INBOUND' };
  }
  const now = (input.now ?? new Date()).getTime();
  const last = input.lastInboundAt.getTime();
  if (now - last > TWENTY_FOUR_HOURS_MS) {
    return { allowed: false, reason: 'OUTSIDE_24H_WINDOW' };
  }
  return { allowed: true };
}
