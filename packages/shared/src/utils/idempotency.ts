import { createHash, randomUUID } from 'node:crypto';

/**
 * Deterministic key derivation for outbound mutations.
 *
 *   buildIdempotencyKey('shopify.refund', { storeId, orderId, amount, ticketId })
 *     => 'shopify.refund:{base64url-sha256}'
 *
 * Same inputs always produce the same key, so retries are safe even if the
 * surrounding job is replayed by BullMQ.
 */
export function buildIdempotencyKey(
  scope: string,
  parts: Record<string, string | number | boolean | null | undefined>,
): string {
  const canonical = Object.keys(parts)
    .filter((k) => parts[k] !== undefined && parts[k] !== null)
    .sort()
    .map((k) => `${k}=${String(parts[k])}`)
    .join('|');
  const hash = createHash('sha256').update(`${scope}::${canonical}`).digest('base64url').slice(0, 32);
  return `${scope}:${hash}`;
}

/**
 * For one-off non-deterministic keys (rare — prefer `buildIdempotencyKey`).
 */
export function newIdempotencyKey(scope: string): string {
  return `${scope}:${randomUUID()}`;
}
