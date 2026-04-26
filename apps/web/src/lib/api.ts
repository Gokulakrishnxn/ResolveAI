/**
 * Tiny typed wrapper around the Fastify API.
 * In Server Components we forward Clerk's session token via the `Authorization` header
 * (replace with Clerk's `auth().getToken()` once wired to a JWT template).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  storeId?: string;
  userId?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set('Content-Type', 'application/json');
  if (opts.storeId) headers.set('x-store-id', opts.storeId);
  if (opts.userId) headers.set('x-user-id', opts.userId);

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const errorObj = (data as { error?: { message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, errorObj?.message ?? res.statusText, errorObj?.details);
  }
  return data as T;
}
