import { z } from 'zod';

/**
 * Canonical inbound event shape every channel adapter normalizes its
 * provider-specific payload into. The TicketIngest pipeline consumes this
 * shape and never knows which channel produced it.
 */

export const channelKindEnum = z.enum(['EMAIL', 'CHAT', 'WHATSAPP', 'API']);
export type ChannelKind = z.infer<typeof channelKindEnum>;

export const channelAttachmentSchema = z.object({
  contentType: z.string(),
  filename: z.string().optional(),
  url: z.string().url().optional(),
  /** base64 encoded content if no URL is available */
  data: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});
export type ChannelAttachment = z.infer<typeof channelAttachmentSchema>;

export const channelAuthorSchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
});
export type ChannelAuthor = z.infer<typeof channelAuthorSchema>;

export const inboundChannelEventSchema = z.object({
  storeId: z.string().min(1),
  channel: channelKindEnum,
  /** Provider-side conversation/thread ID we use to group messages. */
  conversationExternalId: z.string().min(1),
  /** Stable per-message ID from the provider. */
  messageExternalId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  bodyHtml: z.string().optional(),
  attachments: z.array(channelAttachmentSchema).default([]),
  author: channelAuthorSchema,
  receivedAt: z.string().datetime(),
  /** Free-form raw provider payload, kept for audit. */
  raw: z.record(z.string(), z.unknown()).default({}),
});
export type InboundChannelEvent = z.infer<typeof inboundChannelEventSchema>;

export const ingestResultSchema = z.object({
  storeId: z.string(),
  ticketId: z.string(),
  messageId: z.string(),
  isNewTicket: z.boolean(),
});
export type IngestResult = z.infer<typeof ingestResultSchema>;

export const outboundReplySchema = z.object({
  storeId: z.string().min(1),
  ticketId: z.string().min(1),
  channel: channelKindEnum,
  conversationExternalId: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(channelAttachmentSchema).default([]),
  /** Optional template ID for proactive messages on platforms requiring approval (WhatsApp). */
  templateId: z.string().optional(),
});
export type OutboundReply = z.infer<typeof outboundReplySchema>;
