import { z } from 'zod';

export const actionKindSchema = z.enum([
  'REFUND_FULL',
  'REFUND_PARTIAL',
  'REPLACEMENT',
  'CANCEL_ORDER',
  'UPDATE_ADDRESS',
  'RESEND_TRACKING',
  'ESCALATE_HUMAN',
  'REPLY',
  'TAG_CUSTOMER',
  'CLOSE_TICKET',
]);
export type ActionKind = z.infer<typeof actionKindSchema>;

export const actionStatusSchema = z.enum([
  'PROPOSED',
  'PENDING_APPROVAL',
  'APPROVED',
  'EXECUTING',
  'EXECUTED',
  'FAILED',
  'REJECTED',
  'CANCELLED',
]);
export type ActionStatus = z.infer<typeof actionStatusSchema>;

const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});

export const refundFullPayloadSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(500),
  notifyCustomer: z.boolean().default(true),
});

export const refundPartialPayloadSchema = z.object({
  orderId: z.string().min(1),
  amount: moneySchema,
  reason: z.string().max(500),
  lineItemIds: z.array(z.string()).optional(),
  notifyCustomer: z.boolean().default(true),
});

export const replacementPayloadSchema = z.object({
  orderId: z.string().min(1),
  lineItemIds: z.array(z.string()).min(1),
  reason: z.string().max(500),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
});

export const cancelOrderPayloadSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(500),
  refund: z.boolean().default(true),
});

export const updateAddressPayloadSchema = z.object({
  orderId: z.string().min(1),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().length(2),
  }),
});

export const resendTrackingPayloadSchema = z.object({
  orderId: z.string().min(1),
});

export const escalatePayloadSchema = z.object({
  reason: z.string().max(500),
  assignToUserId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('HIGH'),
});

export const replyPayloadSchema = z.object({
  body: z.string().min(1).max(20_000),
  bodyHtml: z.string().optional(),
  closeAfter: z.boolean().default(false),
});

export const tagCustomerPayloadSchema = z.object({
  tags: z.array(z.string()).min(1),
});

export const closeTicketPayloadSchema = z.object({
  reason: z.string().optional(),
});

/** Discriminated union — `kind` selects the payload shape. */
export const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('REFUND_FULL'), payload: refundFullPayloadSchema }),
  z.object({ kind: z.literal('REFUND_PARTIAL'), payload: refundPartialPayloadSchema }),
  z.object({ kind: z.literal('REPLACEMENT'), payload: replacementPayloadSchema }),
  z.object({ kind: z.literal('CANCEL_ORDER'), payload: cancelOrderPayloadSchema }),
  z.object({ kind: z.literal('UPDATE_ADDRESS'), payload: updateAddressPayloadSchema }),
  z.object({ kind: z.literal('RESEND_TRACKING'), payload: resendTrackingPayloadSchema }),
  z.object({ kind: z.literal('ESCALATE_HUMAN'), payload: escalatePayloadSchema }),
  z.object({ kind: z.literal('REPLY'), payload: replyPayloadSchema }),
  z.object({ kind: z.literal('TAG_CUSTOMER'), payload: tagCustomerPayloadSchema }),
  z.object({ kind: z.literal('CLOSE_TICKET'), payload: closeTicketPayloadSchema }),
]);
export type ActionUnion = z.infer<typeof actionSchema>;

export const proposeActionSchema = z.object({
  ticketId: z.string().min(1),
  reasoning: z.string().max(2000).optional(),
  action: actionSchema,
});
export type ProposeActionInput = z.infer<typeof proposeActionSchema>;
