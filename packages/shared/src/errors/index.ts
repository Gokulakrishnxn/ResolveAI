/**
 * Typed application errors. All public-facing API responses should map
 * to one of these classes so the HTTP layer can serialize them consistently.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_FAILURE'
  | 'CIRCUIT_OPEN'
  | 'INTERNAL_ERROR'
  | 'INTEGRATION_ERROR'
  | 'VALIDATION_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean = true;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  public toJSON(): {
    error: { code: ErrorCode; message: string; details?: unknown };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

export class RateLimitedError extends AppError {
  public readonly retryAfterMs?: number;
  constructor(message = 'Too many requests', opts?: { retryAfterMs?: number }) {
    super('RATE_LIMITED', message, 429, opts);
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

export class UpstreamFailureError extends AppError {
  constructor(message = 'Upstream provider failed', details?: unknown) {
    super('UPSTREAM_FAILURE', message, 502, details);
  }
}

export class CircuitOpenError extends AppError {
  constructor(message = 'Circuit breaker open') {
    super('CIRCUIT_OPEN', message, 503);
  }
}

export class IntegrationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('INTEGRATION_ERROR', message, 502, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
