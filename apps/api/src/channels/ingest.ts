import { prisma, type Prisma, type TicketChannel } from '@resolveai/db';
import {
  inboundChannelEventSchema,
  type InboundChannelEvent,
  type IngestResult,
  type ChannelKind,
} from '@resolveai/shared';
import { enqueueProcessTicket } from '../queue/index.js';
import { inboxBus } from '../lib/event-bus.js';

const CHANNEL_MAP: Record<ChannelKind, TicketChannel> = {
  EMAIL: 'EMAIL',
  CHAT: 'CHAT',
  WHATSAPP: 'WHATSAPP',
  API: 'API',
};

/**
 * Canonical ingest path for ALL channels (email/chat/whatsapp/etc).
 *
 * - Upserts the customer by `author.externalId` (channel-namespaced) and
 *   email when available.
 * - Reuses an existing ticket when `conversationExternalId` matches an
 *   in-flight thread; otherwise creates a new one.
 * - Persists the message with attachments and the raw provider payload.
 * - Enqueues the resolution pipeline so every channel hits the same worker.
 */
export async function ingestInboundEvent(input: InboundChannelEvent): Promise<IngestResult> {
  const evt = inboundChannelEventSchema.parse(input);
  const ticketChannel = CHANNEL_MAP[evt.channel];
  const namespacedExternalId = `${evt.channel}:${evt.author.externalId}`;

  return prisma.$transaction(async (tx) => {
    // 1. Upsert customer (when we have any identifier).
    let customerId: string | null = null;
    const existingCustomer = await tx.customer.findFirst({
      where: {
        storeId: evt.storeId,
        OR: [
          { externalId: namespacedExternalId },
          ...(evt.author.email ? [{ email: evt.author.email }] : []),
        ],
      },
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const created = await tx.customer.create({
        data: {
          storeId: evt.storeId,
          externalId: namespacedExternalId,
          email: evt.author.email,
          phone: evt.author.phone,
          firstName: evt.author.name?.split(' ')[0],
          lastName: evt.author.name?.split(' ').slice(1).join(' ') || undefined,
        },
      });
      customerId = created.id;
    }

    // 2. Find or create ticket — keyed by conversationExternalId per channel.
    const conversationKey = `${evt.channel}:${evt.conversationExternalId}`;
    let ticket = await tx.ticket.findFirst({
      where: {
        storeId: evt.storeId,
        channel: ticketChannel,
        externalThreadId: conversationKey,
      },
    });
    let isNewTicket = false;
    if (!ticket) {
      ticket = await tx.ticket.create({
        data: {
          storeId: evt.storeId,
          channel: ticketChannel,
          status: 'NEW',
          customerId: customerId,
          subject: evt.subject ?? evt.body.split('\n')[0]?.slice(0, 120),
          externalId: evt.messageExternalId,
          externalThreadId: conversationKey,
          metadata: {
            firstAuthor: evt.author,
            ingestedRaw: evt.raw,
          } as Prisma.InputJsonValue,
        },
      });
      isNewTicket = true;
      await tx.auditLog.create({
        data: {
          storeId: evt.storeId,
          ticketId: ticket.id,
          kind: 'TICKET_CREATED',
          payload: { channel: evt.channel, author: evt.author } as Prisma.InputJsonValue,
        },
      });
    }

    // 3. Persist the message.
    const message = await tx.message.create({
      data: {
        ticketId: ticket.id,
        role: 'CUSTOMER',
        body: evt.body,
        bodyHtml: evt.bodyHtml,
        authorName: evt.author.name,
        authorEmail: evt.author.email,
        attachments: evt.attachments as unknown as Prisma.InputJsonValue,
        externalId: evt.messageExternalId,
        createdAt: new Date(evt.receivedAt),
      },
    });

    return {
      storeId: evt.storeId,
      ticketId: ticket.id,
      messageId: message.id,
      isNewTicket,
    };
  }).then(async (res) => {
    // 4. Side-effects (outside the transaction): enqueue + emit SSE.
    await enqueueProcessTicket({ storeId: res.storeId, ticketId: res.ticketId });
    inboxBus.publish({
      type: res.isNewTicket ? 'ticket.created' : 'ticket.updated',
      storeId: res.storeId,
      ticketId: res.ticketId,
    });
    return res;
  });
}
