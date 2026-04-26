import { ShopifyClient } from '@resolveai/integrations-shopify';
import { prisma, type Integration, type OrderStatus, Prisma } from '@resolveai/db';
import { NotFoundError, IntegrationError } from '@resolveai/shared';
import { getConfig } from '../config.js';
import { openCredentials } from './encryption.js';

export interface ShopifyCredentials {
  accessToken: string;
  scope: string[];
}

export async function getShopifyIntegrationForStore(storeId: string): Promise<Integration> {
  const integration = await prisma.integration.findFirst({
    where: { storeId, kind: 'SHOPIFY', status: 'ACTIVE' },
  });
  if (!integration) throw new NotFoundError('Shopify integration not connected for this store');
  return integration;
}

export async function getShopifyClientForStore(storeId: string): Promise<ShopifyClient> {
  const integration = await getShopifyIntegrationForStore(storeId);
  const creds = openCredentials<ShopifyCredentials>(integration.credentials);
  if (!integration.externalId) throw new IntegrationError('Integration missing shop domain');
  return new ShopifyClient({
    shopDomain: integration.externalId,
    accessToken: creds.accessToken,
    apiVersion: getConfig().SHOPIFY_API_VERSION,
  });
}

/**
 * Best-effort mapping from Shopify financial / fulfillment status to our
 * internal `OrderStatus` enum.
 */
export function mapShopifyStatus(args: {
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
}): OrderStatus {
  if (args.cancelled_at) return 'CANCELLED';
  if (args.financial_status === 'refunded') return 'REFUNDED';
  if (args.financial_status === 'partially_refunded') return 'PARTIALLY_REFUNDED';
  if (args.fulfillment_status === 'fulfilled') return 'FULFILLED';
  if (args.fulfillment_status === 'partial') return 'PARTIALLY_FULFILLED';
  if (args.financial_status === 'paid') return 'PAID';
  return 'PENDING';
}

export interface ShopifyOrderWebhookPayload {
  id: number;
  email?: string | null;
  name?: string;
  order_number?: number;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  currency: string;
  total_price: string;
  subtotal_price?: string;
  total_tax?: string;
  created_at: string;
  customer?: {
    id?: number;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  line_items?: Array<unknown>;
  fulfillments?: Array<{
    tracking_number?: string | null;
    tracking_url?: string | null;
    tracking_numbers?: string[];
    tracking_urls?: string[];
  }>;
  shipping_address?: unknown;
  billing_address?: unknown;
}

export async function upsertOrderFromShopifyPayload(args: {
  storeId: string;
  payload: ShopifyOrderWebhookPayload;
}): Promise<void> {
  const { storeId, payload } = args;
  const externalId = String(payload.id);
  const externalNumber = payload.name ?? (payload.order_number ? `#${payload.order_number}` : undefined);
  const status = mapShopifyStatus({
    financial_status: payload.financial_status,
    fulfillment_status: payload.fulfillment_status,
    cancelled_at: payload.cancelled_at,
  });

  // Upsert customer if we have one.
  let customerId: string | null = null;
  const cust = payload.customer;
  if (cust && (cust.email || cust.id)) {
    const upserted = await prisma.customer.upsert({
      where: cust.id
        ? { storeId_externalId: { storeId, externalId: String(cust.id) } }
        : { storeId_email: { storeId, email: (cust.email ?? '').toLowerCase() } },
      create: {
        storeId,
        externalId: cust.id ? String(cust.id) : null,
        email: cust.email ?? null,
        firstName: cust.first_name ?? null,
        lastName: cust.last_name ?? null,
      },
      update: {
        email: cust.email ?? undefined,
        firstName: cust.first_name ?? undefined,
        lastName: cust.last_name ?? undefined,
      },
    });
    customerId = upserted.id;
  }

  // Pull tracking from fulfillments.
  let trackingNumber: string | null = null;
  let trackingUrl: string | null = null;
  for (const f of payload.fulfillments ?? []) {
    if (!trackingNumber) {
      trackingNumber = f.tracking_number ?? f.tracking_numbers?.[0] ?? null;
    }
    if (!trackingUrl) {
      trackingUrl = f.tracking_url ?? f.tracking_urls?.[0] ?? null;
    }
  }

  await prisma.order.upsert({
    where: { storeId_externalId: { storeId, externalId } },
    create: {
      storeId,
      customerId,
      externalId,
      externalNumber,
      status,
      currency: payload.currency,
      totalPrice: new Prisma.Decimal(payload.total_price),
      subtotalPrice: new Prisma.Decimal(payload.subtotal_price ?? payload.total_price),
      taxPrice: new Prisma.Decimal(payload.total_tax ?? '0'),
      shippingPrice: new Prisma.Decimal('0'),
      trackingNumber,
      trackingUrl,
      lineItems: (payload.line_items ?? []) as unknown as Prisma.InputJsonValue,
      shippingAddress: (payload.shipping_address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      billingAddress: (payload.billing_address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      placedAt: new Date(payload.created_at),
      fulfilledAt: payload.fulfillment_status === 'fulfilled' ? new Date() : null,
    },
    update: {
      status,
      customerId: customerId ?? undefined,
      currency: payload.currency,
      totalPrice: new Prisma.Decimal(payload.total_price),
      subtotalPrice: new Prisma.Decimal(payload.subtotal_price ?? payload.total_price),
      taxPrice: new Prisma.Decimal(payload.total_tax ?? '0'),
      trackingNumber: trackingNumber ?? undefined,
      trackingUrl: trackingUrl ?? undefined,
      lineItems: (payload.line_items ?? []) as unknown as Prisma.InputJsonValue,
      fulfilledAt: payload.fulfillment_status === 'fulfilled' ? new Date() : undefined,
    },
  });
}
