import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { IntegrationError, ValidationError } from '@resolveai/shared';

/**
 * Shopify OAuth 2.0 (offline access token).
 * Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */

export const shopDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((s) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s), {
    message: 'Shop must be of the form <store>.myshopify.com',
  });

export interface BuildInstallUrlInput {
  shop: string;
  apiKey: string;
  scopes: string;
  redirectUri: string;
  state: string;
}

export function buildInstallUrl(input: BuildInstallUrlInput): string {
  const shop = shopDomainSchema.parse(input.shop);
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', input.apiKey);
  url.searchParams.set('scope', input.scopes);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('state', input.state);
  url.searchParams.set('grant_options[]', '');
  return url.toString();
}

/**
 * Shopify signs every OAuth callback with an HMAC-SHA256 over all params
 * except `hmac` and `signature`, sorted lexicographically and url-encoded
 * with the original key/value pairs joined by `&`.
 */
export function verifyOAuthHmac(
  query: Record<string, string | string[] | undefined>,
  apiSecret: string,
): boolean {
  const { hmac, signature: _sig, ...rest } = query;
  if (typeof hmac !== 'string') return false;

  const params: string[] = [];
  for (const key of Object.keys(rest).sort()) {
    const v = rest[key];
    if (v === undefined) continue;
    const value = Array.isArray(v) ? v.join(',') : v;
    params.push(`${key}=${value}`);
  }
  const message = params.join('&');
  const computed = createHmac('sha256', apiSecret).update(message).digest('hex');
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hmac, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  scope: z.string(),
});

export interface ExchangeCodeInput {
  shop: string;
  code: string;
  apiKey: string;
  apiSecret: string;
  fetchImpl?: typeof fetch;
}

export interface OfflineToken {
  accessToken: string;
  scope: string[];
}

export async function exchangeCodeForToken(input: ExchangeCodeInput): Promise<OfflineToken> {
  const shop = shopDomainSchema.parse(input.shop);
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: input.apiKey,
      client_secret: input.apiSecret,
      code: input.code,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new IntegrationError(`Shopify token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as unknown;
  const parsed = tokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ValidationError('Shopify token response failed schema validation', parsed.error.issues);
  }
  return {
    accessToken: parsed.data.access_token,
    scope: parsed.data.scope.split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * Topics we subscribe to at install time. Keep in sync with the webhook
 * router in `apps/api`.
 */
export const SHOPIFY_PHASE1_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/fulfilled',
  'app/uninstalled',
] as const;
export type ShopifyPhase1WebhookTopic = (typeof SHOPIFY_PHASE1_WEBHOOK_TOPICS)[number];
