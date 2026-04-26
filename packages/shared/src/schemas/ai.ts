import { z } from 'zod';
import { ticketIntentSchema, ticketSentimentSchema } from './ticket.js';
import { actionSchema } from './action.js';

/**
 * Phase 1 classifier output (exact public schema).
 *
 * Intentionally narrower than the full `intentClassificationSchema` above so
 * we can ship Phase 1 with a tight prompt and grow the surface later.
 */
export const phase1IntentEnum = z.enum([
  'ORDER_STATUS',
  'REFUND',
  'REPLACEMENT',
  'WRONG_ITEM',
  'OTHER',
]);
export type Phase1Intent = z.infer<typeof phase1IntentEnum>;

export const phase1UrgencyEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type Phase1Urgency = z.infer<typeof phase1UrgencyEnum>;

export const phase1SentimentEnum = z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANGRY']);
export type Phase1Sentiment = z.infer<typeof phase1SentimentEnum>;

export const phase1ExtractedSchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  productName: z.string().trim().min(1).optional(),
});
export type Phase1Extracted = z.infer<typeof phase1ExtractedSchema>;

export const phase1IntentClassificationSchema = z.object({
  intent: phase1IntentEnum,
  urgency: phase1UrgencyEnum,
  sentiment: phase1SentimentEnum,
  extracted: phase1ExtractedSchema.default({}),
  confidence: z.number().min(0).max(1),
});
export type Phase1IntentClassification = z.infer<typeof phase1IntentClassificationSchema>;

/** LLM classifier output. We force JSON mode + validate. */
export const intentClassificationSchema = z.object({
  intent: ticketIntentSchema,
  confidence: z.number().min(0).max(1),
  sentiment: ticketSentimentSchema,
  language: z.string().min(2).max(10).default('en'),
  isSpam: z.boolean().default(false),
  summary: z.string().max(500),
  /** Entities the model extracted (order numbers, tracking IDs, …). */
  entities: z
    .object({
      orderNumber: z.string().optional(),
      trackingNumber: z.string().optional(),
      productNames: z.array(z.string()).default([]),
      mentionedAmount: z
        .object({ amount: z.number(), currency: z.string().length(3) })
        .optional(),
    })
    .default({ productNames: [] }),
});
export type IntentClassification = z.infer<typeof intentClassificationSchema>;

/** Resolver output: a draft reply + zero or more proposed actions. */
export const resolutionDraftSchema = z.object({
  reply: z.object({
    body: z.string().min(1).max(20_000),
    tone: z.enum(['professional', 'friendly', 'apologetic', 'firm']).default('friendly'),
  }),
  actions: z.array(actionSchema).default([]),
  needsHuman: z.boolean().default(false),
  reasoning: z.string().max(2000),
  citations: z
    .array(
      z.object({
        kind: z.enum(['FAQ', 'PAST_TICKET', 'ORDER', 'POLICY']),
        id: z.string(),
        snippet: z.string().max(500),
      }),
    )
    .default([]),
});
export type ResolutionDraft = z.infer<typeof resolutionDraftSchema>;

export const ragRetrievalRequestSchema = z.object({
  storeId: z.string().min(1),
  query: z.string().min(1).max(4000),
  topK: z.number().int().min(1).max(20).default(5),
  ownerKinds: z
    .array(z.enum(['FAQ_DOC', 'TICKET', 'MESSAGE', 'PRODUCT']))
    .default(['FAQ_DOC', 'TICKET']),
});
export type RagRetrievalRequest = z.infer<typeof ragRetrievalRequestSchema>;

export const ragHitSchema = z.object({
  ownerKind: z.enum(['FAQ_DOC', 'TICKET', 'MESSAGE', 'PRODUCT']),
  ownerId: z.string(),
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type RagHit = z.infer<typeof ragHitSchema>;
