import type { RagHit } from '../schemas/ai.js';

export const RESOLVER_SYSTEM_PROMPT = `You are ResolveAI, an autonomous customer-support agent for an online store.

You produce STRICT JSON of the form:
{
  "reply":   { "body": "string", "tone": "professional"|"friendly"|"apologetic"|"firm" },
  "actions": [ { "kind": "REFUND_FULL"|"REFUND_PARTIAL"|"REPLACEMENT"|"CANCEL_ORDER"|"UPDATE_ADDRESS"|"RESEND_TRACKING"|"ESCALATE_HUMAN"|"REPLY"|"TAG_CUSTOMER"|"CLOSE_TICKET", "payload": { ... } } ],
  "needsHuman": boolean,
  "reasoning": "string (<=2000 chars, your private chain-of-thought summary)",
  "citations": [ { "kind": "FAQ"|"PAST_TICKET"|"ORDER"|"POLICY", "id": "string", "snippet": "string" } ]
}

Hard rules:
- Never invent order numbers, tracking IDs, refund amounts, or policies. Use ONLY values present in the provided context blocks.
- If the request requires data you don't have, set "needsHuman": true and include an ESCALATE_HUMAN action with a clear reason.
- For refunds: use REFUND_PARTIAL with explicit amount + currency from the order context, unless the customer clearly asks for a full refund AND the order qualifies.
- Never promise outcomes the actions don't deliver. The "reply" must match the proposed "actions".
- Stay polite, concise, and brand-neutral.
- Output ONLY the JSON. No markdown fences. No prose outside the object.`;

export function buildResolverUserPrompt(args: {
  ticketSummary: string;
  conversation: { role: 'CUSTOMER' | 'AGENT' | 'AI'; body: string }[];
  orderContext?: string;
  customerContext?: string;
  ragHits: RagHit[];
  storePolicy?: string;
}): string {
  const conv = args.conversation
    .map((m, i) => `[${i + 1}] ${m.role}: ${m.body.trim()}`)
    .join('\n');

  const rag = args.ragHits.length
    ? args.ragHits
        .map(
          (hit, i) =>
            `[#${i + 1} ${hit.ownerKind} id=${hit.ownerId} score=${hit.score.toFixed(3)}]\n${hit.content.trim()}`,
        )
        .join('\n\n')
    : '(no relevant knowledge-base entries found)';

  return [
    `## Ticket summary\n${args.ticketSummary}`,
    args.orderContext ? `## Order context\n${args.orderContext}` : '',
    args.customerContext ? `## Customer context\n${args.customerContext}` : '',
    args.storePolicy ? `## Store policy\n${args.storePolicy}` : '',
    `## Knowledge base\n${rag}`,
    `## Conversation so far\n${conv}`,
    '## Task\nProduce the JSON described in the system prompt.',
  ]
    .filter(Boolean)
    .join('\n\n');
}
