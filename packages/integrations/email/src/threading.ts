/**
 * Email threading helpers.
 *
 * Conversation grouping uses RFC 5322 `In-Reply-To` / `References` headers,
 * with the subject "Re: " stripping fallback for clients that don't emit
 * proper threading headers (sigh).
 */

export function normalizeMessageId(id: string | undefined | null): string | null {
  if (!id) return null;
  return id.trim().replace(/^<|>$/g, '').toLowerCase() || null;
}

export function normalizeMessageIdList(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : input.split(/\s+/);
  return arr
    .flatMap((id) => id.split(/\s+/))
    .map(normalizeMessageId)
    .filter((v): v is string => Boolean(v));
}

const RE_PREFIX = /^\s*(re|fwd?|aw|sv|tr|wg|antw)\s*(\[\s*\d+\s*\])?\s*:\s*/i;

export function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return '';
  let s = subject.trim();
  // Strip up to 5 chained Re:/Fwd: prefixes.
  for (let i = 0; i < 5; i += 1) {
    const replaced = s.replace(RE_PREFIX, '');
    if (replaced === s) break;
    s = replaced;
  }
  return s.trim();
}

export interface ThreadKeyInput {
  inReplyTo?: string | null;
  references?: string[] | string | null;
  messageId?: string | null;
  subject?: string | null;
  fromAddress: string;
}

/**
 * Build a stable thread key for a message:
 * 1. The first message-id mentioned in `references`/`in-reply-to`, OR
 * 2. The normalized subject + sender domain (best-effort fallback).
 *
 * Multiple messages in the same conversation should produce the same key.
 */
export function deriveThreadKey(input: ThreadKeyInput): string {
  const refs = normalizeMessageIdList(input.references);
  const reply = normalizeMessageId(input.inReplyTo);
  if (reply) refs.unshift(reply);
  if (refs.length > 0) return `mid:${refs[0]}`;
  const domain = input.fromAddress.split('@')[1]?.toLowerCase() ?? 'unknown';
  const subj = normalizeSubject(input.subject) || '(no-subject)';
  return `subj:${domain}:${subj.slice(0, 200)}`;
}
