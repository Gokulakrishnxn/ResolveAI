import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a WhatsApp Business Cloud webhook signature.
 *
 * Meta signs the body with HMAC-SHA256 using the App Secret, prefixed by
 * `sha256=`. This is identical to the Facebook Messenger / Graph API
 * signature scheme.
 */
export function verifyWhatsappWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;
  const computed = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  if (expected.length !== computed.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(computed, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verify the GET-based webhook subscription challenge. Meta calls
 *   GET /webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…
 * and expects the `hub.challenge` value to be returned verbatim when the
 * verify_token matches.
 */
export function handleVerificationChallenge(opts: {
  mode: string | undefined;
  token: string | undefined;
  challenge: string | undefined;
  expectedToken: string;
}): { ok: true; challenge: string } | { ok: false; reason: string } {
  if (opts.mode !== 'subscribe') {
    return { ok: false, reason: 'invalid_mode' };
  }
  if (!opts.token || opts.token !== opts.expectedToken) {
    return { ok: false, reason: 'invalid_verify_token' };
  }
  if (!opts.challenge) {
    return { ok: false, reason: 'missing_challenge' };
  }
  return { ok: true, challenge: opts.challenge };
}
