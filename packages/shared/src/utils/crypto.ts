import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM symmetric encryption for at-rest secrets (e.g. Shopify access tokens,
 * SMTP passwords). Output is JSON-friendly (base64 strings), versioned, and
 * authenticated.
 *
 * Key requirements: 32 bytes, supplied via `ENCRYPTION_KEY` (base64 or hex).
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = 1;

export interface EncryptedPayload {
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

/**
 * Resolve a 32-byte key from a base64 or hex env value. Throws if invalid.
 * Exposed to allow callers to validate at boot.
 */
export function resolveEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('ENCRYPTION_KEY is empty');
  // Try base64 first.
  try {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32 && buf.toString('base64').replace(/=+$/, '') === trimmed.replace(/=+$/, '')) {
      return buf;
    }
  } catch {
    /* fall through */
  }
  // Try hex (64 chars).
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  // Try raw 32-char utf8 (NOT recommended, but useful for local dev). 32 bytes only.
  const utf8 = Buffer.from(trimmed, 'utf8');
  if (utf8.length === 32) return utf8;
  throw new Error(
    'ENCRYPTION_KEY must be a 32-byte key (base64, hex, or 32-char utf8). Got ' + utf8.length + ' bytes.',
  );
}

export function encryptString(plaintext: string, key: Buffer): EncryptedPayload {
  if (key.length !== 32) throw new Error('AES-256-GCM requires a 32-byte key');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: VERSION,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ct.toString('base64'),
  };
}

export function decryptString(payload: EncryptedPayload, key: Buffer): string {
  if (key.length !== 32) throw new Error('AES-256-GCM requires a 32-byte key');
  if (payload.v !== VERSION) throw new Error(`Unsupported encrypted payload version: ${payload.v}`);
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ct = Buffer.from(payload.ct, 'base64');
  if (iv.length !== IV_BYTES) throw new Error('Bad IV length');
  if (tag.length !== TAG_BYTES) throw new Error('Bad auth tag length');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Encrypt an object by JSON-stringifying it. */
export function encryptJSON<T>(value: T, key: Buffer): EncryptedPayload {
  return encryptString(JSON.stringify(value), key);
}

/** Decrypt back into a typed object. Caller must validate with zod afterwards. */
export function decryptJSON<T = unknown>(payload: EncryptedPayload, key: Buffer): T {
  return JSON.parse(decryptString(payload, key)) as T;
}

/** Type-guard for the on-disk shape. */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<EncryptedPayload>;
  return (
    typeof v.v === 'number' &&
    typeof v.iv === 'string' &&
    typeof v.tag === 'string' &&
    typeof v.ct === 'string'
  );
}
