import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  appendMessageSchema,
  NotFoundError,
  BadRequestError,
} from '@resolveai/shared';
import { prisma } from '@resolveai/db';
import { enqueueProcessTicket } from '../queue/index.js';
import { getSmtpForStore } from '../lib/email.js';

export async function registerTicketRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get('/tickets', async (req) => {
    const query = listTicketsQuerySchema.parse(req.query);
    const storeId = req.storeId!;

    const tickets = await prisma.ticket.findMany({
      where: {
        storeId,
        ...(query.status && { status: query.status }),
        ...(query.intent && { intent: query.intent }),
        ...(query.priority && { priority: query.priority }),
        ...(query.channel && { channel: query.channel }),
        ...(query.assignedUserId && { assignedUserId: query.assignedUserId }),
        ...(query.autoResolved !== undefined && { autoResolved: query.autoResolved }),
        ...(query.search &&
          query.searchMode === 'text' && {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' } },
              { messages: { some: { body: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor && { skip: 1, cursor: { id: query.cursor } }),
      include: {
        customer: true,
        order: { select: { id: true, externalNumber: true, totalPrice: true, currency: true } },
      },
    });

    const hasMore = tickets.length > query.limit;
    const items = hasMore ? tickets.slice(0, -1) : tickets;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
      searchMode: query.searchMode,
    };
  });

  // Semantic search returns ticketIds ordered by vector similarity over
  // the ticket's first-message embedding. When embeddings haven't been
  // populated yet (RAG ingestion is enabled in M6) we fall back to a
  // standard text contains search so the UI stays functional.
  const semanticQuerySchema = z.object({
    query: z.string().min(1).max(2_000),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  });
  app.get('/tickets/search/semantic', async (req) => {
    const params = semanticQuerySchema.parse(req.query);
    const storeId = req.storeId!;

    const text = `%${params.query}%`;
    const ids = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT t.id
      FROM "Ticket" t
      LEFT JOIN "Message" m ON m."ticketId" = t.id
      WHERE t."storeId" = ${storeId}
        AND (
          t.subject ILIKE ${text}
          OR m.body ILIKE ${text}
        )
      GROUP BY t.id
      ORDER BY MAX(t."createdAt") DESC
      LIMIT ${params.limit}
    `;
    return { items: ids.map((r) => r.id), mode: 'fallback_text' };
  });

  app.get<{ Params: { id: string } }>('/tickets/:id', async (req) => {
    const { id } = req.params;
    const storeId = req.storeId!;
    const ticket = await prisma.ticket.findFirst({
      where: { id, storeId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        customer: true,
        order: true,
        actions: { orderBy: { createdAt: 'desc' } },
        proposedAction: true,
      },
    });
    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  });

  app.post('/tickets', async (req, reply) => {
    const body = createTicketSchema.parse({ ...(req.body as object), storeId: req.storeId });

    const ticket = await prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      if (body.customer?.email || body.customer?.externalId) {
        const c = await tx.customer.upsert({
          where: body.customer.externalId
            ? { storeId_externalId: { storeId: body.storeId, externalId: body.customer.externalId } }
            : { storeId_email: { storeId: body.storeId, email: body.customer.email! } },
          create: {
            storeId: body.storeId,
            externalId: body.customer.externalId ?? null,
            email: body.customer.email ?? null,
            firstName: body.customer.firstName ?? null,
            lastName: body.customer.lastName ?? null,
          },
          update: {},
        });
        customerId = c.id;
      }

      const created = await tx.ticket.create({
        data: {
          storeId: body.storeId,
          channel: body.channel,
          subject: body.subject,
          externalId: body.externalId,
          externalThreadId: body.externalThreadId,
          customerId,
          metadata: body.metadata as object,
          messages: {
            create: {
              role: 'CUSTOMER',
              body: body.initialMessage.body,
              bodyHtml: body.initialMessage.bodyHtml,
              authorName: body.initialMessage.authorName,
              authorEmail: body.initialMessage.authorEmail,
              attachments: body.initialMessage.attachments,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: { storeId: body.storeId, ticketId: created.id, kind: 'TICKET_CREATED' },
      });

      return created;
    });

    await enqueueProcessTicket({ storeId: ticket.storeId, ticketId: ticket.id });
    reply.status(201);
    return ticket;
  });

  app.patch<{ Params: { id: string } }>('/tickets/:id', async (req) => {
    const { id } = req.params;
    const storeId = req.storeId!;
    const patch = updateTicketSchema.parse(req.body);
    const existing = await prisma.ticket.findFirst({ where: { id, storeId } });
    if (!existing) throw new NotFoundError('Ticket not found');

    return prisma.ticket.update({
      where: { id },
      data: {
        ...(patch.status && { status: patch.status }),
        ...(patch.priority && { priority: patch.priority }),
        ...(patch.intent && { intent: patch.intent }),
        ...(patch.assignedUserId !== undefined && { assignedUserId: patch.assignedUserId }),
      },
    });
  });

  app.post<{ Params: { id: string } }>('/tickets/:id/messages', async (req, reply) => {
    const storeId = req.storeId!;
    const body = appendMessageSchema.parse({ ...(req.body as object), ticketId: req.params.id });
    const ticket = await prisma.ticket.findFirst({ where: { id: body.ticketId, storeId } });
    if (!ticket) throw new NotFoundError('Ticket not found');

    const msg = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        role: body.role,
        body: body.body,
        bodyHtml: body.bodyHtml,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        externalId: body.externalId,
      },
    });
    reply.status(201);
    return msg;
  });

  // ---------------------------------------------------------------------
  // Reply via the merchant's verified SMTP integration.
  // ---------------------------------------------------------------------
  const replySchema = z.object({
    body: z.string().min(1),
    bodyHtml: z.string().optional(),
    closeTicket: z.boolean().optional(),
  });
  app.post<{ Params: { id: string } }>('/tickets/:id/reply', async (req, reply) => {
    const storeId = req.storeId!;
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, storeId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundError('Ticket not found');
    const recipient = ticket.customer?.email ?? ticket.messages[0]?.authorEmail;
    if (!recipient) throw new BadRequestError('No customer email on this ticket');

    const payload = replySchema.parse(req.body);
    const smtp = await getSmtpForStore(storeId);

    const lastInbound = [...ticket.messages].reverse().find((m) => m.role === 'CUSTOMER');
    const inReplyTo = lastInbound?.externalId ?? undefined;
    const refs = ticket.messages
      .map((m) => m.externalId)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

    const result = await smtp.send({
      to: recipient,
      subject: ticket.subject ? `Re: ${ticket.subject}` : 'Update on your request',
      text: payload.body,
      html: payload.bodyHtml,
      inReplyTo,
      references: refs,
    });

    const message = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        role: 'AGENT',
        body: payload.body,
        bodyHtml: payload.bodyHtml,
        authorEmail: req.auth?.userId ?? null,
        externalId: result.messageId,
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: payload.closeTicket ? 'RESOLVED' : 'AWAITING_CUSTOMER',
        firstResponseAt: ticket.firstResponseAt ?? new Date(),
        resolvedAt: payload.closeTicket ? new Date() : ticket.resolvedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        storeId,
        ticketId: ticket.id,
        userId: req.auth?.userId,
        kind: 'MESSAGE_SENT',
        payload: { messageId: result.messageId, accepted: result.accepted },
      },
    });

    reply.status(201);
    return { message, smtpMessageId: result.messageId };
  });
}
