/**
 * Tiny dependency-free exponential-backoff retry helper.
 * For more advanced needs, use `p-retry` directly in a leaf package.
 */

export interface RetryOptions {
  retries?: number;
  minTimeoutMs?: number;
  maxTimeoutMs?: number;
  factor?: number;
  /** Return false to stop retrying. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    minTimeoutMs = 200,
    maxTimeoutMs = 5_000,
    factor = 2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !shouldRetry(err, attempt)) {
        throw err;
      }
      const delay = Math.min(maxTimeoutMs, minTimeoutMs * Math.pow(factor, attempt));
      onRetry?.(err, attempt);
      await sleep(delay);
      attempt += 1;
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
