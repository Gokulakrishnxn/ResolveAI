import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Shopify webhook HMAC signature.
 *
 * @param rawBody  The raw request body BEFORE JSON parsing.
 * @param signature The `X-Shopify-Hmac-Sha256` header value.
 * @param secret   The Shopify app secret (`SHOPIFY_API_SECRET` or webhook secret).
 */
export function verifyShopifyWebhook(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
