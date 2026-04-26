import { z } from 'zod';

export const ticketChannelSchema = z.enum([
  'EMAIL',
  'CHAT',
  'SHOPIFY_INBOX',
  'WHATSAPP',
  'API',
]);
export type TicketChannel = z.infer<typeof ticketChannelSchema>;

export const ticketStatusSchema = z.enum([
  'NEW',
  'IN_PROGRESS',
  'AWAITING_CUSTOMER',
  'AWAITING_HUMAN',
  'RESOLVED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketIntentSchema = z.enum([
  'REFUND',
  'REPLACEMENT',
  'ORDER_STATUS',
  'CHANGE_ADDRESS',
  'CANCEL_ORDER',
  'COMPLAINT',
  'PRODUCT_QUESTION',
  'GENERAL',
  'SPAM',
  'UNKNOWN',
]);
export type TicketIntent = z.infer<typeof ticketIntentSchema>;

export const ticketSentimentSchema = z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANGRY']);
export type TicketSentiment = z.infer<typeof ticketSentimentSchema>;

export const ticketPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const createTicketSchema = z.object({
  storeId: z.string().min(1),
  channel: ticketChannelSchema,
  subject: z.string().max(500).optional(),
  externalId: z.string().optional(),
  externalThreadId: z.string().optional(),
  customer: z
    .object({
      externalId: z.string().optional(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
  initialMessage: z.object({
    body: z.string().min(1).max(50_000),
    bodyHtml: z.string().optional(),
    authorName: z.string().optional(),
    authorEmail: z.string().email().optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
          contentType: z.string().optional(),
          size: z.number().int().nonnegative().optional(),
        }),
      )
      .default([]),
  }),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  intent: ticketIntentSchema.optional(),
  assignedUserId: z.string().nullable().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  intent: ticketIntentSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  channel: ticketChannelSchema.optional(),
  assignedUserId: z.string().optional(),
  search: z.string().optional(),
  /** Default text-based contains search; semantic uses pgvector. */
  searchMode: z.enum(['text', 'semantic']).default('text'),
  autoResolved: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === 'true')),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const messageRoleSchema = z.enum(['CUSTOMER', 'AGENT', 'AI', 'SYSTEM']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const appendMessageSchema = z.object({
  ticketId: z.string().min(1),
  role: messageRoleSchema,
  body: z.string().min(1).max(50_000),
  bodyHtml: z.string().optional(),
  authorName: z.string().optional(),
  authorEmail: z.string().email().optional(),
  externalId: z.string().optional(),
});
export type AppendMessageInput = z.infer<typeof appendMessageSchema>;
