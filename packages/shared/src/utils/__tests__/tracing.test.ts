import { describe, expect, it } from 'vitest';
import { withSpan } from '../tracing.js';

describe('withSpan (no-op tracer)', () => {
  it('returns the result of the wrapped function', async () => {
    const out = await withSpan('test.span', () => 42);
    expect(out).toBe(42);
  });

  it('propagates errors thrown inside the span', async () => {
    await expect(
      withSpan('test.span.error', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('exposes a span object with the expected no-op surface', async () => {
    await withSpan('test.span.shape', (span) => {
      expect(typeof span.setAttribute).toBe('function');
      expect(typeof span.recordException).toBe('function');
      expect(typeof span.setStatus).toBe('function');
      expect(typeof span.end).toBe('function');
    });
  });
});
