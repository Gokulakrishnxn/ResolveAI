import { z } from 'zod';

/**
 * We don't try to fully model every Shopify/Woo payload — only the fields we
 * read at the edge. Anything else passes through as `metadata`.
 */

export const shopifyOrderWebhookSchema = z.object({
  id: z.number().or(z.string()),
  order_number: z.number().optional(),
  email: z.string().email().nullable().optional(),
  currency: z.string().default('USD'),
  total_price: z.string().or(z.number()),
  subtotal_price: z.string().or(z.number()).optional(),
  total_tax: z.string().or(z.number()).optional(),
  financial_status: z.string().optional(),
  fulfillment_status: z.string().nullable().optional(),
  customer: z
    .object({
      id: z.number().or(z.string()).optional(),
      email: z.string().email().nullable().optional(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  line_items: z.array(z.unknown()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type ShopifyOrderWebhook = z.infer<typeof shopifyOrderWebhookSchema>;

export const woocommerceOrderWebhookSchema = z.object({
  id: z.number(),
  number: z.string().optional(),
  status: z.string(),
  currency: z.string(),
  total: z.string(),
  customer_id: z.number().optional(),
  billing: z
    .object({
      email: z.string().email().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .optional(),
  line_items: z.array(z.unknown()).default([]),
  date_created: z.string().optional(),
});
export type WooCommerceOrderWebhook = z.infer<typeof woocommerceOrderWebhookSchema>;

export const inboundEmailSchema = z.object({
  messageId: z.string().min(1),
  from: z.string().email(),
  to: z.array(z.string().email()).min(1),
  subject: z.string().default(''),
  text: z.string().default(''),
  html: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).default([]),
  receivedAt: z.coerce.date(),
});
export type InboundEmail = z.infer<typeof inboundEmailSchema>;

export const chatWidgetMessageSchema = z.object({
  storeId: z.string().min(1),
  sessionId: z.string().min(1),
  visitor: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
  }),
  body: z.string().min(1).max(20_000),
  pageUrl: z.string().url().optional(),
});
export type ChatWidgetMessage = z.infer<typeof chatWidgetMessageSchema>;
