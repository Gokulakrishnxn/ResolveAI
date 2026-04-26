import { z } from 'zod';

export const wooOrderSchema = z.object({
  id: z.number(),
  number: z.string().optional(),
  status: z.string(),
  currency: z.string(),
  total: z.string(),
  subtotal: z.string().optional(),
  date_created: z.string().optional(),
  date_modified: z.string().optional(),
  customer_id: z.number().optional(),
  billing: z
    .object({
      email: z.string().email().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .optional(),
});
export type WooOrder = z.infer<typeof wooOrderSchema>;

export const wooRefundSchema = z.object({
  id: z.number(),
  amount: z.string(),
  reason: z.string().optional(),
  date_created: z.string().optional(),
});
export type WooRefund = z.infer<typeof wooRefundSchema>;
