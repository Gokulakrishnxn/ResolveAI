import { z } from 'zod';

export const shopifyMoneySchema = z.object({
  amount: z.string(),
  currency_code: z.string(),
});

export const shopifyAddressSchema = z
  .object({
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    address1: z.string().nullish(),
    address2: z.string().nullish(),
    city: z.string().nullish(),
    province: z.string().nullish(),
    country: z.string().nullish(),
    zip: z.string().nullish(),
    phone: z.string().nullish(),
  })
  .partial();

export const shopifyLineItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  quantity: z.number(),
  price: z.string().optional(),
  sku: z.string().nullish(),
  variant_title: z.string().nullish(),
  product_id: z.number().nullish(),
});
export type ShopifyLineItem = z.infer<typeof shopifyLineItemSchema>;

export const shopifyFulfillmentSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  status: z.string().nullish(),
  shipment_status: z.string().nullish(),
  tracking_number: z.string().nullish(),
  tracking_numbers: z.array(z.string()).optional(),
  tracking_url: z.string().nullish(),
  tracking_urls: z.array(z.string()).optional(),
  tracking_company: z.string().nullish(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type ShopifyFulfillment = z.infer<typeof shopifyFulfillmentSchema>;

export const shopifyCustomerSchema = z
  .object({
    id: z.number(),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    orders_count: z.number().optional(),
    total_spent: z.string().optional(),
  })
  .partial();
export type ShopifyCustomer = z.infer<typeof shopifyCustomerSchema>;

export const shopifyOrderSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  order_number: z.number().optional(),
  number: z.number().optional(),
  email: z.string().email().nullable().optional(),
  financial_status: z.string().nullable().optional(),
  fulfillment_status: z.string().nullable().optional(),
  cancelled_at: z.string().nullable().optional(),
  cancel_reason: z.string().nullable().optional(),
  currency: z.string(),
  total_price: z.string(),
  subtotal_price: z.string().optional(),
  total_tax: z.string().optional(),
  total_shipping_price_set: z
    .object({
      shop_money: shopifyMoneySchema.optional(),
      presentment_money: shopifyMoneySchema.optional(),
    })
    .optional(),
  total_discounts: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  processed_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  customer: shopifyCustomerSchema.nullish(),
  line_items: z.array(shopifyLineItemSchema).optional(),
  fulfillments: z.array(shopifyFulfillmentSchema).optional(),
  shipping_address: shopifyAddressSchema.nullish(),
  billing_address: shopifyAddressSchema.nullish(),
  refunds: z
    .array(
      z.object({
        id: z.number(),
        order_id: z.number(),
        created_at: z.string(),
        transactions: z
          .array(
            z.object({
              amount: z.string().optional(),
              currency: z.string().optional(),
              kind: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
export type ShopifyOrder = z.infer<typeof shopifyOrderSchema>;

export const shopifyRefundSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  note: z.string().nullable().optional(),
  created_at: z.string(),
  transactions: z
    .array(
      z.object({
        id: z.number().optional(),
        amount: z.string().optional(),
        currency: z.string().optional(),
        kind: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .optional(),
});
export type ShopifyRefund = z.infer<typeof shopifyRefundSchema>;

export interface ShopifyTrackingInfo {
  number: string | null;
  url: string | null;
  company: string | null;
  status: string | null;
}
