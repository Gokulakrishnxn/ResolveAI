import { describe, expect, it, vi } from 'vitest';
import { ShopifyClient } from '../client.js';
import { RateLimitedError } from '@resolveai/shared';

interface FakeResponseInit {
  status?: number;
  headers?: Record<string, string>;
  json?: unknown;
  text?: string;
}

function mockResponse(init: FakeResponseInit): Response {
  const status = init.status ?? 200;
  const body = init.json !== undefined ? JSON.stringify(init.json) : init.text ?? '';
  const headers = new Headers(init.headers);
  return new Response(body, { status, headers });
}

const ORDER_FIXTURE = {
  id: 1234567890,
  name: '#1001',
  order_number: 1001,
  email: 'jane@example.com',
  financial_status: 'paid',
  fulfillment_status: 'fulfilled',
  currency: 'USD',
  total_price: '49.99',
  created_at: '2026-01-01T00:00:00Z',
  fulfillments: [
    {
      id: 999,
      order_id: 1234567890,
      status: 'success',
      tracking_number: '1Z999',
      tracking_url: 'https://ups.com/1Z999',
      tracking_company: 'UPS',
      created_at: '2026-01-02T00:00:00Z',
    },
  ],
};

function makeClient(fetchImpl: ReturnType<typeof vi.fn>): ShopifyClient {
  return new ShopifyClient({
    shopDomain: 'demo.myshopify.com',
    accessToken: 'shpat_test',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

describe('ShopifyClient', () => {
  it('rejects an invalid shop domain', () => {
    expect(() => new ShopifyClient({ shopDomain: 'bad.example.com', accessToken: 'x' })).toThrow();
  });

  it('getOrderById parses a Shopify response and forwards the access token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ json: { order: ORDER_FIXTURE } }));
    const client = makeClient(fetchImpl);
    const order = await client.getOrderById(1234567890);

    expect(order.id).toBe(1234567890);
    expect(order.email).toBe('jane@example.com');
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_test');
  });

  it('getOrdersByEmail forwards the email + status=any query string', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ json: { orders: [ORDER_FIXTURE] } }));
    const client = makeClient(fetchImpl);
    const orders = await client.getOrdersByEmail('jane@example.com', 5);

    expect(orders).toHaveLength(1);
    const [url] = fetchImpl.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get('email')).toBe('jane@example.com');
    expect(parsed.searchParams.get('limit')).toBe('5');
    expect(parsed.searchParams.get('status')).toBe('any');
  });

  it('getTrackingInfo returns the most recent tracking record', async () => {
    const order = {
      ...ORDER_FIXTURE,
      fulfillments: [
        { ...ORDER_FIXTURE.fulfillments[0]!, created_at: '2026-01-01T00:00:00Z', tracking_number: 'OLD' },
        { ...ORDER_FIXTURE.fulfillments[0]!, created_at: '2026-01-05T00:00:00Z', tracking_number: 'NEW' },
      ],
    };
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ json: { order } }));
    const client = makeClient(fetchImpl);
    const info = await client.getTrackingInfo(order.id);
    expect(info?.number).toBe('NEW');
  });

  it('createRefund POSTs with idempotency key', async () => {
    const refund = {
      id: 7777,
      order_id: 1234567890,
      created_at: '2026-01-06T00:00:00Z',
      transactions: [{ id: 1, amount: '49.99', currency: 'USD', kind: 'refund' }],
    };
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ json: { refund } }));
    const client = makeClient(fetchImpl);
    const out = await client.createRefund({
      orderId: 1234567890,
      amount: '49.99',
      currency: 'USD',
      reason: 'damaged',
      idempotencyKey: 'abc-123',
    });

    expect(out.id).toBe(7777);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain('/orders/1234567890/refunds.json');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Idempotency-Key']).toBe('abc-123');
  });

  it('createRefund refuses to send without an idempotency key', async () => {
    const fetchImpl = vi.fn();
    const client = makeClient(fetchImpl);
    await expect(
      client.createRefund({
        orderId: 1,
        amount: '1',
        currency: 'USD',
        idempotencyKey: '',
      }),
    ).rejects.toThrow(/idempotencyKey is required/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retries on 429 and surfaces RateLimitedError when retries are exhausted', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse({ status: 429, headers: { 'Retry-After': '0' }, text: 'rate limited' }));
    const client = makeClient(fetchImpl);
    await expect(client.getOrderById(1)).rejects.toBeInstanceOf(RateLimitedError);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('throws for malformed responses (zod validation failure)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ json: { order: { id: 'not-a-number' } } }));
    const client = makeClient(fetchImpl);
    await expect(client.getOrderById(1)).rejects.toThrow(/schema validation/);
  });
});
