import OpenAI from 'openai';
import { CircuitBreaker, retry, UpstreamFailureError } from '@resolveai/shared';

export interface OpenAIClientOptions {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ResolveAIOpenAIClient {
  raw: OpenAI;
  /** Wrap an OpenAI call with retry + circuit breaker. */
  call<T>(label: string, fn: (client: OpenAI) => Promise<T>): Promise<T>;
}

export function createOpenAIClient(options: OpenAIClientOptions): ResolveAIOpenAIClient {
  const raw = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? 30_000,
    maxRetries: 0, // we handle retries ourselves
  });

  const breaker = new CircuitBreaker({
    name: 'openai',
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    isExpectedError: (err) => {
      if (err instanceof OpenAI.APIError) {
        // 4xx that aren't rate-limit are caller errors; don't trip breaker.
        return err.status >= 400 && err.status < 500 && err.status !== 429;
      }
      return false;
    },
  });

  return {
    raw,
    async call<T>(label: string, fn: (client: OpenAI) => Promise<T>): Promise<T> {
      return breaker.execute(() =>
        retry(() => fn(raw), {
          retries: options.maxRetries ?? 2,
          minTimeoutMs: 500,
          maxTimeoutMs: 5_000,
          shouldRetry: (err) => {
            if (err instanceof OpenAI.APIError) {
              return err.status === 429 || err.status >= 500;
            }
            return true;
          },
        }).catch((err: unknown) => {
          if (err instanceof OpenAI.APIError) {
            throw new UpstreamFailureError(`OpenAI ${label} failed: ${err.message}`, {
              status: err.status,
              code: err.code,
            });
          }
          throw err;
        }),
      );
    },
  };
}
