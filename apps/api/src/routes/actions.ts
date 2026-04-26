import type { FastifyInstance } from 'fastify';
import { proposeActionSchema, NotFoundError, BadRequestError } from '@resolveai/shared';
import { prisma } from '@resolveai/db';
import { enqueueExecuteAction } from '../queue/index.js';

export async function registerActionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.post('/actions/propose', async (req, reply) => {
    const storeId = req.storeId!;
    const body = proposeActionSchema.parse(req.body);

    const ticket = await prisma.ticket.findFirst({
      where: { id: body.ticketId, storeId },
      select: { id: true, orderId: true },
    });
    if (!ticket) throw new NotFoundError('Ticket not found');

    const action = await prisma.action.create({
      data: {
        storeId,
        ticketId: ticket.id,
        orderId: ticket.orderId,
        kind: body.action.kind,
        payload: body.action.payload as object,
        reasoning: body.reasoning,
        proposedById: req.auth?.userId,
        status: 'PENDING_APPROVAL',
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId,
        ticketId: ticket.id,
        userId: req.auth?.userId,
        kind: 'ACTION_PROPOSED',
        payload: { actionId: action.id, kind: action.kind },
      },
    });

    reply.status(201);
    return action;
  });

  app.post<{ Params: { id: string } }>('/actions/:id/approve', async (req) => {
    const storeId = req.storeId!;
    const action = await prisma.action.findFirst({
      where: { id: req.params.id, storeId },
    });
    if (!action) throw new NotFoundError('Action not found');
    if (action.status !== 'PENDING_APPROVAL' && action.status !== 'PROPOSED') {
      throw new BadRequestError(`Cannot approve action in status ${action.status}`);
    }

    const updated = await prisma.action.update({
      where: { id: action.id },
      data: { status: 'APPROVED', approvedById: req.auth?.userId },
    });

    await prisma.auditLog.create({
      data: {
        storeId,
        ticketId: action.ticketId,
        userId: req.auth?.userId,
        kind: 'ACTION_APPROVED',
        payload: { actionId: action.id },
      },
    });

    await enqueueExecuteAction({ storeId, actionId: action.id });
    return updated;
  });

  app.post<{ Params: { id: string } }>('/actions/:id/reject', async (req) => {
    const storeId = req.storeId!;
    const action = await prisma.action.findFirst({
      where: { id: req.params.id, storeId },
    });
    if (!action) throw new NotFoundError('Action not found');

    return prisma.action.update({
      where: { id: action.id },
      data: { status: 'REJECTED' },
    });
  });
}
