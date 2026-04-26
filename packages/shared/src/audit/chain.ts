import { createHmac } from 'node:crypto';
import { canonicalJson } from '../rules/signing.js';

/**
 * SOC2-friendly hash chain for AuditLog rows.
 *
 * Each entry's `digest = HMAC(secret, canonical(prevDigest || row))`,
 * making it impossible to insert/edit/delete rows without breaking the
 * chain for that store. Verification re-walks every row in `createdAt`
 * order and checks each `digest`.
 */

export interface AuditChainInput {
  storeId: string;
  ticketId?: string | null;
  userId?: string | null;
  kind: string;
  payload: unknown;
  createdAt: Date;
}

/**
 * Compute the next `(prevDigest, digest)` pair for a row. Pure function
 * so it's easy to unit-test and reuse from a verifier CLI.
 */
export function computeChainDigest(
  input: AuditChainInput,
  prevDigest: string | null,
  secret: string,
): { digest: string; prevDigest: string | null } {
  const body = {
    storeId: input.storeId,
    ticketId: input.ticketId ?? null,
    userId: input.userId ?? null,
    kind: input.kind,
    payload: input.payload ?? {},
    createdAt: input.createdAt.toISOString(),
    prev: prevDigest ?? null,
  };
  const canonical = canonicalJson(body);
  const digest = createHmac('sha256', secret).update(canonical).digest('hex');
  return { digest, prevDigest };
}

/**
 * Verify a sequence of audit log rows is a valid chain. Returns the
 * index of the first broken row, or `null` if the entire chain is
 * valid.
 */
export function verifyChain(
  rows: Array<AuditChainInput & { digest: string | null; prevDigest: string | null }>,
  secret: string,
): { ok: true } | { ok: false; brokenAtIndex: number } {
  let prev: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const expectedDigest: string = computeChainDigest(r, prev, secret).digest;
    if (r.digest !== expectedDigest) return { ok: false, brokenAtIndex: i };
    if ((r.prevDigest ?? null) !== prev) return { ok: false, brokenAtIndex: i };
    prev = r.digest;
  }
  return { ok: true };
}
