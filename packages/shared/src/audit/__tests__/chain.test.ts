import { describe, expect, it } from 'vitest';
import { computeChainDigest, verifyChain } from '../chain.js';

const secret = 'test-secret-key';

function row(i: number, payload: Record<string, unknown> = {}) {
  return {
    storeId: 'store_1',
    ticketId: null,
    userId: null,
    kind: 'TICKET_CREATED',
    payload: { i, ...payload },
    createdAt: new Date(`2026-01-01T00:00:0${i}Z`),
  };
}

describe('audit chain', () => {
  it('produces stable digests', () => {
    const a = computeChainDigest(row(1), null, secret);
    const b = computeChainDigest(row(1), null, secret);
    expect(a.digest).toBe(b.digest);
  });

  it('changes when previous digest changes', () => {
    const a = computeChainDigest(row(2), 'aaa', secret);
    const b = computeChainDigest(row(2), 'bbb', secret);
    expect(a.digest).not.toBe(b.digest);
  });

  it('verifies a valid chain', () => {
    let prev: string | null = null;
    const chain = [row(1), row(2), row(3)].map((r) => {
      const { digest } = computeChainDigest(r, prev, secret);
      const out = { ...r, digest, prevDigest: prev };
      prev = digest;
      return out;
    });
    expect(verifyChain(chain, secret)).toEqual({ ok: true });
  });

  it('detects a tampered payload', () => {
    let prev: string | null = null;
    const chain = [row(1), row(2), row(3)].map((r) => {
      const { digest } = computeChainDigest(r, prev, secret);
      const out = { ...r, digest, prevDigest: prev };
      prev = digest;
      return out;
    });
    chain[1] = { ...chain[1]!, payload: { i: 999 } };
    const result = verifyChain(chain, secret);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.brokenAtIndex).toBe(1);
  });

  it('detects a deleted middle row (prev pointer mismatch)', () => {
    let prev: string | null = null;
    const chain = [row(1), row(2), row(3)].map((r) => {
      const { digest } = computeChainDigest(r, prev, secret);
      const out = { ...r, digest, prevDigest: prev };
      prev = digest;
      return out;
    });
    const compromised = [chain[0]!, chain[2]!];
    const result = verifyChain(compromised, secret);
    expect(result.ok).toBe(false);
  });
});
