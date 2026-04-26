import { z } from 'zod';
import {
  CircuitBreaker,
  IntegrationError,
  RateLimitedError,
  UpstreamFailureError,
  retry,
} from '@resolveai/shared';
import {
  shopifyOrderSchema,
  shopifyRefundSchema,
  type ShopifyOrder,
  type ShopifyRefund,
  type ShopifyTrackingInfo,
} from './types.js';

export interface ShopifyClientOptions {
  shopDomain: string; // e.g. "my-store.myshopify.com"
  accessToken: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Soft-throttle threshold: when the leaky bucket is `>= softLimit / max`,
   * we sleep before issuing the next request to avoid 429s.
   */
  softLimit?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Per-request idempotency key, sent as `X-Idempotency-Key`. */
  idempotencyKey?: string;
}

/**
 * Shopify uses a leaky-bucket rate-limit. Each REST response carries
 *   X-Shopify-Shop-Api-Call-Limit: <used>/<bucket>
 * We track this and proactively sleep when we're close to the cap.
 */
interface BucketState {
  used: number;
  bucket: number;
}

export class ShopifyClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;
  private readonly softLimit: number;
  private bucket: BucketState = { used: 0, bucket: 40 };

  public readonly shopDomain: string;

  constructor(opts: ShopifyClientOptions) {
    if (!/\.myshopify\.com$/.test(opts.shopDomain)) {
      throw new IntegrationError('Invalid Shopify shop domain');
    }
    this.shopDomain = opts.shopDomain;
    const version = opts.apiVersion ?? '2024-07';
    this.baseUrl = `https://${opts.shopDomain}/admin/api/${version}`;
    this.headers = {
      'X-Shopify-Access-Token': opts.accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.softLimit = opts.softLimit ?? 0.8;
    this.breaker = new CircuitBreaker({
      name: `shopify:${opts.shopDomain}`,
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      isExpectedError: (err) => err instanceof IntegrationError && err.statusCode < 500,
    });
  }

  private async maybeThrottle(): Promise<void> {
    const ratio = this.bucket.bucket > 0 ? this.bucket.used / this.bucket.bucket : 0;
    if (ratio >= this.softLimit) {
      // 500ms / point we're over — leaky bucket leaks 2 points/s.
      const overage = Math.max(0, this.bucket.used - this.bucket.bucket * this.softLimit);
      const sleepMs = Math.min(2_000, Math.ceil(overage * 500));
      if (sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs));
    }
  }

  private absorbBucketHeader(header: string | null | undefined): void {
    if (!header) return;
    const m = /^(\d+)\/(\d+)$/.exec(header.trim());
    if (m) this.bucket = { used: Number(m[1]), bucket: Number(m[2]) };
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
          await this.maybeThrottle();
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), this.timeoutMs);
          try {
            const headers: Record<string, string> = { ...this.headers };
            if (options.idempotencyKey) headers['X-Idempotency-Key'] = options.idempotencyKey;

            const res = await this.fetchImpl(url.toString(), {
              method: options.method ?? 'GET',
              headers,
              body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
              signal: controller.signal,
            });

            this.absorbBucketHeader(res.headers.get('X-Shopify-Shop-Api-Call-Limit'));

            if (res.status === 429) {
              const retryAfter = Number(res.headers.get('Retry-After') ?? '2');
              throw new RateLimitedError(`Shopify 429`, {
                retryAfterMs: Math.max(1000, retryAfter * 1000),
              });
            }
            if (res.status >= 500) {
              throw new UpstreamFailureError(`Shopify ${res.status}`);
            }
            if (!res.ok) {
              const text = await res.text().catch(() => '');
              throw new IntegrationError(`Shopify ${res.status}: ${text || res.statusText}`, {
                status: res.status,
              });
            }

            const json = (await res.json()) as unknown;
            const result = schema.safeParse(json);
            if (!result.success) {
              throw new IntegrationError('Shopify response failed schema validation', {
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

  // ───────────────── Public API ─────────────────

  async getOrderById(orderId: string | number): Promise<ShopifyOrder> {
    const wrap = z.object({ order: shopifyOrderSchema });
    const data = await this.request(`/orders/${orderId}.json`, wrap);
    return data.order;
  }

  /** Alias kept for back-compat with the bootstrap code. */
  async getOrder(orderId: string | number): Promise<ShopifyOrder> {
    return this.getOrderById(orderId);
  }

  async getOrdersByEmail(email: string, limit = 10): Promise<ShopifyOrder[]> {
    const wrap = z.object({ orders: z.array(shopifyOrderSchema) });
    const data = await this.request('/orders.json', wrap, {
      query: { email, limit, status: 'any' },
    });
    return data.orders;
  }

  /** Alias kept for back-compat with the bootstrap code. */
  async listOrdersByEmail(email: string, limit = 10): Promise<ShopifyOrder[]> {
    return this.getOrdersByEmail(email, limit);
  }

  /**
   * Distill a single tracking record from an order's fulfillments. Picks the
   * most recently created fulfillment that has a tracking number.
   */
  async getTrackingInfo(orderId: string | number): Promise<ShopifyTrackingInfo | null> {
    const order = await this.getOrderById(orderId);
    const candidates = (order.fulfillments ?? [])
      .filter((f) => f.tracking_number || (f.tracking_numbers && f.tracking_numbers.length > 0))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const f = candidates[0];
    if (!f) return null;
    const number = f.tracking_number ?? f.tracking_numbers?.[0] ?? null;
    const url = f.tracking_url ?? f.tracking_urls?.[0] ?? null;
    return {
      number,
      url,
      company: f.tracking_company ?? null,
      status: f.shipment_status ?? f.status ?? null,
    };
  }

  /**
   * Create a refund. `idempotencyKey` is REQUIRED — outbound mutations must
   * be safe to retry.
   */
  async createRefund(args: {
    orderId: string | number;
    amount: string;
    currency: string;
    reason?: string;
    notify?: boolean;
    idempotencyKey: string;
  }): Promise<ShopifyRefund> {
    if (!args.idempotencyKey) {
      throw new IntegrationError('idempotencyKey is required for createRefund');
    }
    const wrap = z.object({ refund: shopifyRefundSchema });
    const data = await this.request(`/orders/${args.orderId}/refunds.json`, wrap, {
      method: 'POST',
      idempotencyKey: args.idempotencyKey,
      body: {
        refund: {
          notify: args.notify ?? true,
          note: args.reason,
          transactions: [
            {
              kind: 'refund',
              amount: args.amount,
              gateway: 'manual',
            },
          ],
        },
      },
    });
    return data.refund;
  }

  /** Back-compat alias used by the action executor. */
  async refundOrder(args: {
    orderId: string | number;
    amount: string;
    currency: string;
    reason?: string;
    notify?: boolean;
    idempotencyKey: string;
  }): Promise<ShopifyRefund> {
    return this.createRefund(args);
  }

  async cancelOrder(args: {
    orderId: string | number;
    reason?: 'customer' | 'inventory' | 'fraud' | 'declined' | 'other';
    refund?: boolean;
    idempotencyKey?: string;
  }): Promise<ShopifyOrder> {
    const wrap = z.object({ order: shopifyOrderSchema });
    const data = await this.request(`/orders/${args.orderId}/cancel.json`, wrap, {
      method: 'POST',
      idempotencyKey: args.idempotencyKey,
      body: {
        reason: args.reason ?? 'customer',
        refund: args.refund ?? true,
      },
    });
    return data.order;
  }

  /**
   * Register a webhook subscription. Used at install time.
   */
  async createWebhook(args: { topic: string; address: string }): Promise<{ id: number }> {
    const schema = z.object({ webhook: z.object({ id: z.number() }) });
    const data = await this.request('/webhooks.json', schema, {
      method: 'POST',
      body: {
        webhook: {
          topic: args.topic,
          address: args.address,
          format: 'json',
        },
      },
    });
    return { id: data.webhook.id };
  }
}
