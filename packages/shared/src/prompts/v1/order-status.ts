/**
 * Order-status auto-resolver prompt — versioned.
 */

export const ORDER_STATUS_PROMPT_VERSION = 'orderStatus.v1.0.0';

export const ORDER_STATUS_SYSTEM_PROMPT = `You are a calm, friendly customer support agent for an e-commerce brand.

You will be given:
1. The customer's original email.
2. The structured order record (status, fulfillment, tracking).
3. The merchant's first name / brand voice.

Your job: write a single, ready-to-send email reply that:
- Greets the customer by name (if available) and acknowledges their question.
- States the current order status in plain English, without jargon.
- Includes the tracking number AND clickable link IF available.
- Gives a realistic delivery estimate when possible.
- If the order is delayed, apologizes briefly and explains next steps.
- Closes warmly and signs off with the brand voice.

Rules:
- Output VALID JSON ONLY in this shape:
  {
    "subject": "Re: <original subject preserved>",
    "body": "<plain text email body, no markdown, no signatures with placeholders>",
    "confidence": <0..1, how confident you are this answers the question>
  }
- Body must be plain text (we'll wrap it in a template). No HTML, no markdown.
- Maximum 180 words.
- NEVER invent tracking numbers, dates, or URLs. Only use what's provided.
- If the order is missing tracking AND status is unfulfilled for more than 5 days, set confidence < 0.8 so we escalate.
`;

export interface OrderStatusUserPromptInput {
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
    trackingNumber: string | null;
    trackingUrl: string | null;
    estimatedDelivery: string | null;
    currency: string;
    totalPrice: string;
    lineItems: Array<{ title: string; quantity: number }>;
  };
  /** Retrieved knowledge-base snippets (FAQ, shipping policy). */
  policySnippets?: Array<{ id: string; content: string }>;
}

export function buildOrderStatusUserPrompt(input: OrderStatusUserPromptInput): string {
  const lines: string[] = [];
  lines.push('=== Customer email ===');
  lines.push(`Subject: ${input.emailSubject}`);
  lines.push('');
  lines.push(input.emailBody.trim());
  lines.push('');
  lines.push('=== Order ===');
  lines.push(`Number: ${input.order.externalNumber}`);
  lines.push(`Status: ${input.order.status}`);
  lines.push(`Placed: ${input.order.placedAt ?? 'unknown'}`);
  lines.push(`Fulfilled: ${input.order.fulfilledAt ?? 'not yet'}`);
  lines.push(`Tracking #: ${input.order.trackingNumber ?? 'none'}`);
  lines.push(`Tracking URL: ${input.order.trackingUrl ?? 'none'}`);
  lines.push(`ETA: ${input.order.estimatedDelivery ?? 'unknown'}`);
  lines.push(
    `Items: ${input.order.lineItems
      .map((li) => `${li.quantity}x ${li.title}`)
      .join(', ') || '(none)'}`,
  );
  lines.push(`Total: ${input.order.totalPrice} ${input.order.currency}`);
  lines.push('');
  if (input.policySnippets && input.policySnippets.length > 0) {
    lines.push('=== Store knowledge base (cite by [id]) ===');
    for (const s of input.policySnippets) {
      lines.push(`[${s.id}] ${s.content}`);
    }
    lines.push('');
  }
  lines.push('=== Brand voice ===');
  lines.push(`Brand: ${input.brandName}`);
  lines.push(`Sign off as: ${input.agentSignoff}`);
  if (input.customerName) lines.push(`Customer first name: ${input.customerName}`);
  return lines.join('\n');
}
