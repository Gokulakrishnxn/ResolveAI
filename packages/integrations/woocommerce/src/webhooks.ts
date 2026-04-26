import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a WooCommerce webhook signature.
 * WC sends `X-WC-Webhook-Signature` = base64(hmac-sha256(secret, rawBody)).
 */
export function verifyWooWebhook(
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
