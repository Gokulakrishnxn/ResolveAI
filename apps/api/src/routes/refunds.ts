import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  BadRequestError,
  NotFoundError,
  refundEligibilitySchema,
  buildIdempotencyKey,
} from '@resolveai/shared';
import { prisma, type Prisma as P } from '@resolveai/db';
import { computeRefundEligibility } from '../lib/refund-eligibility.js';
import { enqueueExecuteAction } from '../queue/index.js';

/**
 * Refund-specific endpoints layered on top of `/actions`.
 *
 *   GET  /tickets/:id/refund/eligibility   — re-compute on demand
 *   POST /actions/:id/approve-refund       — approve + enqueue execution
 */
export async function registerRefundRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get<{ Params: { id: string } }>('/tickets/:id/refund/eligibility', async (req) => {
    const storeId = req.storeId!;
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, storeId },
      include: { order: true, store: true },
    });
    if (!ticket) throw new NotFoundError('Ticket not found');
    if (!ticket.order) {
      throw new BadRequestError('Ticket has no linked order; cannot compute eligibility');
    }
    const settings =
      (ticket.store?.settings as { refunds?: Record<string, unknown> } | null)?.refunds ?? {};
    const eligibility = computeRefundEligibility({
      order: ticket.order,
      settings: settings as { refundWindowDays?: number; refundShipping?: boolean },
    });
    return refundEligibilitySchema.parse(eligibility);
  });

  app.post<{
    Params: { id: string };
    Body: { amount?: string; notify?: boolean };
  }>('/actions/:id/approve-refund', async (req) => {
    const storeId = req.storeId!;
    const body = z
      .object({ amount: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(), notify: z.boolean().optional() })
      .parse(req.body ?? {});
    const action = await prisma.action.findFirst({
      where: { id: req.params.id, storeId },
      include: { ticket: { include: { order: true } } },
    });
    if (!action) throw new NotFoundError('Action not found');
    if (action.kind !== 'REFUND_FULL' && action.kind !== 'REFUND_PARTIAL') {
      throw new BadRequestError('Action is not a refund');
    }
    if (action.status !== 'PENDING_APPROVAL' && action.status !== 'PROPOSED') {
      throw new BadRequestError(`Cannot approve action in status ${action.status}`);
    }
    const order = action.ticket.order;
    if (!order) throw new BadRequestError('Action has no linked order');

    const existingPayload = (action.payload as Record<string, unknown>) ?? {};
    const finalAmount = body.amount ?? (existingPayload.amount as string | undefined);
    if (!finalAmount) throw new BadRequestError('Refund amount required');

    // Stable idempotency key for the outbound mutation.
    const idempotencyKey = buildIdempotencyKey('shopify.refund', {
      storeId,
      orderExternalId: order.externalId,
      amount: finalAmount,
      currency: order.currency,
      ticketId: action.ticketId,
    });

    const updated = await prisma.action.update({
      where: { id: action.id },
      data: {
        status: 'APPROVED',
        approvedById: req.auth?.userId,
        idempotencyKey,
        payload: {
          ...existingPayload,
          amount: finalAmount,
          currency: order.currency,
          notify: body.notify ?? true,
          orderExternalId: order.externalId,
        } as P.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId,
        ticketId: action.ticketId,
        userId: req.auth?.userId,
        kind: 'ACTION_APPROVED',
        payload: { actionId: action.id, kind: action.kind, amount: finalAmount },
      },
    });

    await enqueueExecuteAction({ storeId, actionId: action.id });
    return updated;
  });
}
