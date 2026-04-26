import { CircuitOpenError } from '../errors/index.js';

/**
 * Minimal in-process circuit breaker.
 *
 *  closed   → half_open (after `resetTimeoutMs` post-trip)
 *  half_open → closed   (on first success)
 *           → open      (on failure)
 *  closed   → open      (after `failureThreshold` consecutive failures)
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  /** Errors matching this predicate do NOT count as failures. */
  isExpectedError?: (err: unknown) => boolean;
  onStateChange?: (state: CircuitState, name: string) => void;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private nextAttemptAt = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly isExpectedError: (err: unknown) => boolean;
  private readonly onStateChange?: (state: CircuitState, name: string) => void;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.isExpectedError = options.isExpectedError ?? (() => false);
    this.onStateChange = options.onStateChange;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptAt) {
        throw new CircuitOpenError(`Circuit "${this.name}" is open`);
      }
      this.transition('half_open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state !== 'closed') this.transition('closed');
  }

  private onFailure(err: unknown): void {
    if (this.isExpectedError(err)) return;
    this.failures += 1;
    if (this.state === 'half_open' || this.failures >= this.failureThreshold) {
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
      this.transition('open');
    }
  }

  private transition(next: CircuitState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next, this.name);
  }
}
