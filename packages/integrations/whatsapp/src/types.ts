import { z } from 'zod';

/**
 * Subset of the WhatsApp Business Cloud API webhook payload we actually
 * use. The Meta payload is huge and evolves; we only validate fields that
 * matter for ingestion.
 *
 * Reference:
 *   https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

export const whatsappTextSchema = z.object({
  body: z.string(),
});

export const whatsappImageSchema = z.object({
  caption: z.string().optional(),
  mime_type: z.string().optional(),
  sha256: z.string().optional(),
  id: z.string(),
});

export const whatsappContactProfileSchema = z.object({
  name: z.string().optional(),
});

export const whatsappContactSchema = z.object({
  profile: whatsappContactProfileSchema.optional(),
  wa_id: z.string(),
});

export const whatsappMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: whatsappTextSchema.optional(),
  image: whatsappImageSchema.optional(),
});

export const whatsappValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(whatsappContactSchema).optional(),
  messages: z.array(whatsappMessageSchema).optional(),
  statuses: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const whatsappChangeSchema = z.object({
  value: whatsappValueSchema,
  field: z.string(),
});

export const whatsappEntrySchema = z.object({
  id: z.string(),
  changes: z.array(whatsappChangeSchema),
});

export const whatsappWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(whatsappEntrySchema),
});

export type WhatsappWebhookPayload = z.infer<typeof whatsappWebhookPayloadSchema>;
export type WhatsappMessage = z.infer<typeof whatsappMessageSchema>;
export type WhatsappContact = z.infer<typeof whatsappContactSchema>;

export interface WhatsappOutboundText {
  to: string;
  body: string;
}

export interface WhatsappOutboundTemplate {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
}
