import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildInstallUrl, shopDomainSchema, verifyOAuthHmac } from '../oauth.js';

describe('shopDomainSchema', () => {
  it('accepts valid shop domains', () => {
    expect(shopDomainSchema.parse('Acme.myshopify.com')).toBe('acme.myshopify.com');
    expect(shopDomainSchema.parse('  store-1.myshopify.com  ')).toBe('store-1.myshopify.com');
  });

  it('rejects invalid shop domains', () => {
    expect(() => shopDomainSchema.parse('acme.com')).toThrow();
    expect(() => shopDomainSchema.parse('-bad.myshopify.com')).toThrow();
  });
});

describe('buildInstallUrl', () => {
  it('produces the correct authorize URL with all required params', () => {
    const url = new URL(
      buildInstallUrl({
        shop: 'acme.myshopify.com',
        apiKey: 'ak',
        scopes: 'read_orders,write_refunds',
        redirectUri: 'https://app.example.com/shopify/callback',
        state: 'nonce-123',
      }),
    );

    expect(url.host).toBe('acme.myshopify.com');
    expect(url.pathname).toBe('/admin/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('ak');
    expect(url.searchParams.get('scope')).toBe('read_orders,write_refunds');
    expect(url.searchParams.get('state')).toBe('nonce-123');
  });
});

describe('verifyOAuthHmac', () => {
  const SECRET = 'shopify_app_secret';

  function sign(query: Record<string, string>): Record<string, string> {
    const sortedMessage = Object.keys(query)
      .sort()
      .map((k) => `${k}=${query[k]}`)
      .join('&');
    const hmac = createHmac('sha256', SECRET).update(sortedMessage).digest('hex');
    return { ...query, hmac };
  }

  it('accepts a valid HMAC', () => {
    const query = sign({
      shop: 'acme.myshopify.com',
      code: 'abc',
      state: 'nonce',
      timestamp: '1700000000',
    });
    expect(verifyOAuthHmac(query, SECRET)).toBe(true);
  });

  it('rejects when any param is mutated', () => {
    const query = sign({ shop: 'acme.myshopify.com', code: 'abc', state: 'nonce' });
    query.state = 'tampered';
    expect(verifyOAuthHmac(query, SECRET)).toBe(false);
  });

  it('returns false when the hmac is missing', () => {
    expect(verifyOAuthHmac({ shop: 'acme.myshopify.com' }, SECRET)).toBe(false);
  });
});
