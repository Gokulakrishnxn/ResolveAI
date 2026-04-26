import { createHash, createHmac } from 'node:crypto';

/**
 * Tamper-evident audit signing for policy decisions and auto-refund payloads.
 *
 * We canonicalize objects (sorted keys, no `undefined`) and then either:
 *   - hash with SHA-256 (always), or
 *   - sign with HMAC-SHA256 using `AUDIT_SIGNING_KEY` if present.
 *
 * Both the canonical string and the digest are stored alongside the audit
 * payload so it can be re-verified later.
 */

export interface SignedPayload<T> {
  payload: T;
  canonical: string;
  digest: string;
  algorithm: 'sha256' | 'hmac-sha256';
  signedAt: string;
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      const v = obj[k];
      if (v === undefined) continue;
      out[k] = canonicalize(v);
    }
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function signAuditPayload<T>(payload: T, key?: string): SignedPayload<T> {
  const canonical = canonicalJson(payload);
  const signingKey = key ?? process.env.AUDIT_SIGNING_KEY ?? process.env.ENCRYPTION_KEY ?? '';
  if (signingKey.length > 0) {
    const digest = createHmac('sha256', signingKey).update(canonical).digest('hex');
    return {
      payload,
      canonical,
      digest,
      algorithm: 'hmac-sha256',
      signedAt: new Date().toISOString(),
    };
  }
  const digest = createHash('sha256').update(canonical).digest('hex');
  return {
    payload,
    canonical,
    digest,
    algorithm: 'sha256',
    signedAt: new Date().toISOString(),
  };
}

export function verifyAuditPayload<T>(signed: SignedPayload<T>, key?: string): boolean {
  const canonical = canonicalJson(signed.payload);
  if (canonical !== signed.canonical) return false;
  if (signed.algorithm === 'hmac-sha256') {
    const signingKey = key ?? process.env.AUDIT_SIGNING_KEY ?? process.env.ENCRYPTION_KEY ?? '';
    if (signingKey.length === 0) return false;
    const expected = createHmac('sha256', signingKey).update(canonical).digest('hex');
    return expected === signed.digest;
  }
  const expected = createHash('sha256').update(canonical).digest('hex');
  return expected === signed.digest;
}
