import { z } from 'zod';

export const integrationKindSchema = z.enum([
  'SHOPIFY',
  'WOOCOMMERCE',
  'EMAIL_IMAP',
  'EMAIL_SMTP',
  'CHAT_WIDGET',
  'SLACK',
  'WEBHOOK',
]);
export type IntegrationKind = z.infer<typeof integrationKindSchema>;

export const shopifyCredentialsSchema = z.object({
  shopDomain: z.string().regex(/\.myshopify\.com$/),
  accessToken: z.string().min(1),
  apiVersion: z.string().default('2024-07'),
});

export const woocommerceCredentialsSchema = z.object({
  baseUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  apiVersion: z.string().default('wc/v3'),
});

export const imapCredentialsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().default(993),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
});

export const smtpCredentialsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1),
  password: z.string().min(1),
  from: z.string().email().or(z.string().regex(/^.+\s<.+@.+\..+>$/)),
});

export const integrationCredentialsSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('SHOPIFY'), credentials: shopifyCredentialsSchema }),
  z.object({ kind: z.literal('WOOCOMMERCE'), credentials: woocommerceCredentialsSchema }),
  z.object({ kind: z.literal('EMAIL_IMAP'), credentials: imapCredentialsSchema }),
  z.object({ kind: z.literal('EMAIL_SMTP'), credentials: smtpCredentialsSchema }),
]);
export type IntegrationCredentials = z.infer<typeof integrationCredentialsSchema>;
