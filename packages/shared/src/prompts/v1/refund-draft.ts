/**
 * Refund-draft prompt — versioned.
 *
 * IMPORTANT: This prompt only DRAFTS the reply. The actual refund is gated
 * behind merchant approval in the dashboard.
 */

export const REFUND_DRAFT_PROMPT_VERSION = 'refundDraft.v1.0.0';

export const REFUND_DRAFT_SYSTEM_PROMPT = `You are a calm, empathetic customer support agent for an e-commerce brand.

You will draft an email reply for a customer who has requested a refund. The merchant has NOT yet approved the refund — you are writing the message they will send IF they approve.

You will be given:
1. The customer's email.
2. The order (status, totals, age, prior refunds).
3. A pre-computed eligibility decision (eligible / partial / denied + reason).
4. The brand voice.

Your job: produce JSON in the form:
{
  "subject": "Re: <original subject>",
  "body": "<plain-text email body>",
  "tone": "apologetic" | "professional" | "friendly",
  "confidence": <0..1>
}

Rules:
- ALWAYS confirm what the customer asked for in your own words first.
- If eligibility is "ELIGIBLE": apologize for the inconvenience, confirm the refund will be issued for the stated amount and currency, and explain the timing (typically 5-10 business days back to original payment method).
- If eligibility is "PARTIAL": offer the partial amount and explain why (e.g. shipping is non-refundable, item already used).
- If eligibility is "DENIED": kindly explain the reason (e.g. outside return window, item shows as used) and offer an alternative if you can.
- Plain text only. Max 180 words. No markdown.
- NEVER promise a refund amount different from the eligibility decision.
- NEVER reveal internal rule names or eligibility codes.
- Output VALID JSON ONLY.
`;

export interface RefundDraftUserPromptInput {
  customerName?: string;
  brandName: string;
  agentSignoff: string;
  emailSubject: string;
  emailBody: string;
  order: {
    externalNumber: string;
    status: string;
    placedAt: string | null;
    fulfilledAt: string | null;
    daysSincePlaced: number;
    currency: string;
    totalPrice: string;
    refundedAmount: string;
  };
  eligibility: {
    decision: 'ELIGIBLE' | 'PARTIAL' | 'DENIED';
    refundableAmount: string;
    currency: string;
    reasonCode: string;
    reasonHumanReadable: string;
  };
}

export function buildRefundDraftUserPrompt(input: RefundDraftUserPromptInput): string {
  const lines: string[] = [];
  lines.push('=== Customer email ===');
  lines.push(`Subject: ${input.emailSubject}`);
  lines.push('');
  lines.push(input.emailBody.trim());
  lines.push('');
  lines.push('=== Order ===');
  lines.push(`Number: ${input.order.externalNumber}`);
  lines.push(`Status: ${input.order.status}`);
  lines.push(`Placed: ${input.order.placedAt ?? 'unknown'} (${input.order.daysSincePlaced} days ago)`);
  lines.push(`Fulfilled: ${input.order.fulfilledAt ?? 'not yet'}`);
  lines.push(`Total: ${input.order.totalPrice} ${input.order.currency}`);
  lines.push(`Already refunded: ${input.order.refundedAmount} ${input.order.currency}`);
  lines.push('');
  lines.push('=== Eligibility ===');
  lines.push(`Decision: ${input.eligibility.decision}`);
  lines.push(`Refundable: ${input.eligibility.refundableAmount} ${input.eligibility.currency}`);
  lines.push(`Reason: ${input.eligibility.reasonHumanReadable}`);
  lines.push('');
  lines.push('=== Brand voice ===');
  lines.push(`Brand: ${input.brandName}`);
  lines.push(`Sign off as: ${input.agentSignoff}`);
  if (input.customerName) lines.push(`Customer first name: ${input.customerName}`);
  return lines.join('\n');
}
