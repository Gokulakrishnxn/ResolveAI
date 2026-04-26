import { z } from 'zod';
import {
  CircuitBreaker,
  IntegrationError,
  RateLimitedError,
  UpstreamFailureError,
  retry,
} from '@resolveai/shared';
import { wooOrderSchema, wooRefundSchema, type WooOrder, type WooRefund } from './types.js';

export interface WooCommerceClientOptions {
  baseUrl: string; // e.g. "https://store.example.com"
  consumerKey: string;
  consumerSecret: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export class WooCommerceClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(opts: WooCommerceClientOptions) {
    let normalized: URL;
    try {
      normalized = new URL(opts.baseUrl);
    } catch {
      throw new IntegrationError('Invalid WooCommerce base URL');
    }
    const version = opts.apiVersion ?? 'wc/v3';
    this.baseUrl = `${normalized.origin}/wp-json/${version}`;
    const credentials = Buffer.from(`${opts.consumerKey}:${opts.consumerSecret}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.breaker = new CircuitBreaker({
      name: `woocommerce:${normalized.hostname}`,
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      isExpectedError: (err) => err instanceof IntegrationError && err.statusCode < 500,
    });
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [key, val] of Object.entries(options.query)) {
        if (val !== undefined) url.searchParams.set(key, String(val));
      }
    }

    return this.breaker.execute(() =>
      retry(
        async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), this.timeoutMs);
          try {
            const res = await this.fetchImpl(url.toString(), {
              method: options.method ?? 'GET',
              headers: {
                Authorization: this.authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
              signal: controller.signal,
            });

            if (res.status === 429) throw new RateLimitedError('WooCommerce rate limit hit');
            if (res.status >= 500) throw new UpstreamFailureError(`WooCommerce ${res.status}`);
            if (!res.ok) {
              const text = await res.text().catch(() => '');
              throw new IntegrationError(`WooCommerce ${res.status}: ${text || res.statusText}`, {
                status: res.status,
              });
            }

            const json = (await res.json()) as unknown;
            const result = schema.safeParse(json);
            if (!result.success) {
              throw new IntegrationError('WooCommerce response failed schema validation', {
                issues: result.error.issues,
              });
            }
            return result.data;
          } finally {
            clearTimeout(timer);
          }
        },
        {
          retries: 3,
          minTimeoutMs: 500,
          maxTimeoutMs: 4_000,
          shouldRetry: (err) =>
            err instanceof RateLimitedError ||
            err instanceof UpstreamFailureError ||
            (err instanceof Error && err.name === 'AbortError'),
        },
      ),
    );
  }

  async getOrder(orderId: number | string): Promise<WooOrder> {
    return this.request(`/orders/${orderId}`, wooOrderSchema);
  }

  async listOrdersByEmail(email: string, perPage = 10): Promise<WooOrder[]> {
    return this.request('/orders', z.array(wooOrderSchema), {
      query: { search: email, per_page: perPage },
    });
  }

  async refundOrder(args: {
    orderId: number | string;
    amount: string;
    reason?: string;
    apiRefund?: boolean;
  }): Promise<WooRefund> {
    return this.request(`/orders/${args.orderId}/refunds`, wooRefundSchema, {
      method: 'POST',
      body: {
        amount: args.amount,
        reason: args.reason,
        api_refund: args.apiRefund ?? true,
      },
    });
  }

  async cancelOrder(orderId: number | string): Promise<WooOrder> {
    return this.request(`/orders/${orderId}`, wooOrderSchema, {
      method: 'PUT',
      body: { status: 'cancelled' },
    });
  }
}
