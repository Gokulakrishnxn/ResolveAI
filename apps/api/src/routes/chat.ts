import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ingestInboundEvent } from '../channels/ingest.js';
import { chatAdapter } from '../channels/chat-adapter.js';
import { chatBroadcaster } from '../channels/chat-broadcaster.js';
import { inboxBus } from '../lib/event-bus.js';

/**
 * Chat HTTP surface.
 *
 * - `POST /chat/ingest` — public fallback for environments where the WS
 *   gateway can't be reached (mobile webviews, server-side bots, tests).
 * - `POST /chat/broadcast` — internal-only; the worker calls this when an
 *   AI/agent reply is persisted so connected widget sessions receive it.
 */
export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  const ingestBody = z.object({
    storeId: z.string().min(1),
    sessionId: z.string().min(1),
    body: z.string().min(1).max(20_000),
    visitor: z
      .object({
        email: z.string().email().optional(),
        name: z.string().optional(),
      })
      .optional(),
    pageUrl: z.string().url().optional(),
  });

  app.post('/chat/ingest', async (req, reply) => {
    const data = ingestBody.parse(req.body);
    const inbound = chatAdapter.normalize({
      storeId: data.storeId,
      raw: {
        storeId: data.storeId,
        sessionId: data.sessionId,
        body: data.body,
        visitorEmail: data.visitor?.email,
        visitorName: data.visitor?.name,
        pageUrl: data.pageUrl,
        receivedAt: new Date().toISOString(),
      },
    });
    const result = await ingestInboundEvent(inbound);
    chatBroadcaster.linkTicket(data.sessionId, result.ticketId);
    reply.status(202);
    return { ok: true, ticketId: result.ticketId, messageId: result.messageId };
  });

  const broadcastBody = z.object({
    storeId: z.string().min(1),
    ticketId: z.string().min(1),
    role: z.enum(['AI', 'AGENT', 'SYSTEM']),
    body: z.string().min(1),
    at: z.string().datetime().optional(),
  });

  app.post(
    '/chat/broadcast',
    { preHandler: app.requireInternal },
    async (req) => {
      const data = broadcastBody.parse(req.body);
      const at = data.at ?? new Date().toISOString();
      const delivered = chatBroadcaster.broadcastToTicket(data.ticketId, {
        type: 'message',
        role: data.role,
        body: data.body,
        at,
      });
      inboxBus.publish({
        type: 'chat.message',
        storeId: data.storeId,
        ticketId: data.ticketId,
        messageId: `${data.ticketId}:${at}`,
      });
      return { ok: true, delivered };
    },
  );
}
