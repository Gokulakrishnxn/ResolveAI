import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket as WsWebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { prisma } from '@resolveai/db';
import {
  clientToServerMessageSchema,
  type ServerToClientMessage,
} from '@resolveai/integrations-chat';
import { ingestInboundEvent } from '../channels/ingest.js';
import { chatAdapter } from '../channels/chat-adapter.js';
import { chatBroadcaster } from '../channels/chat-broadcaster.js';

interface WidgetQuery {
  storeKey?: string;
}

const HANDOFF_KEYWORDS = ['human', 'agent', 'representative', 'real person'];

function send(ws: WsWebSocket, msg: ServerToClientMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* dead socket */
  }
}

/**
 * Resolve the store for a widget public key.
 *
 * The merchant-issued `storeKey` is stored as `Integration.externalId`
 * (kind=CHAT_WIDGET). In dev we also accept a raw store ID so end-to-end
 * flows are easy to test without first creating an Integration row.
 */
async function resolveStoreForKey(storeKey: string): Promise<string | null> {
  const integ = await prisma.integration.findFirst({
    where: { kind: 'CHAT_WIDGET', externalId: storeKey, status: 'ACTIVE' },
    select: { storeId: true },
  });
  if (integ) return integ.storeId;
  const direct = await prisma.store.findUnique({
    where: { id: storeKey },
    select: { id: true },
  });
  return direct?.id ?? null;
}

export async function registerChatWebsocket(app: FastifyInstance): Promise<void> {
  await app.register(websocketPlugin, { options: { maxPayload: 1_048_576 } });

  app.get<{ Querystring: WidgetQuery }>(
    '/ws/chat',
    { websocket: true },
    (socket, req) => {
      const ws = socket as unknown as WsWebSocket;
      const storeKey = req.query.storeKey?.trim();
      if (!storeKey) {
        send(ws, { type: 'error', code: 'MISSING_STORE_KEY', message: 'storeKey query required' });
        ws.close();
        return;
      }

      const sessionId = randomUUID();
      let storeId: string | null = null;
      const sink = (msg: ServerToClientMessage): void => send(ws, msg);

      void resolveStoreForKey(storeKey).then((sid) => {
        if (!sid) {
          send(ws, {
            type: 'error',
            code: 'INVALID_STORE_KEY',
            message: 'Unknown storeKey',
          });
          ws.close();
          return;
        }
        storeId = sid;
        chatBroadcaster.register({ sessionId, storeId, ticketId: null, send: sink });
        send(ws, { type: 'welcome', sessionId });
      });

      ws.on('message', async (raw: Buffer) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          send(ws, { type: 'error', code: 'BAD_JSON', message: 'Invalid JSON' });
          return;
        }
        const result = clientToServerMessageSchema.safeParse(parsed);
        if (!result.success) {
          send(ws, {
            type: 'error',
            code: 'BAD_REQUEST',
            message: 'Invalid message shape',
          });
          return;
        }
        const data = result.data;

        if (!storeId) {
          send(ws, {
            type: 'error',
            code: 'NOT_READY',
            message: 'Store key is still resolving',
          });
          return;
        }

        if (data.type === 'hello' || data.type === 'typing') {
          return;
        }

        if (data.type === 'message') {
          try {
            const inbound = chatAdapter.normalize({
              storeId,
              raw: {
                storeId,
                sessionId,
                body: data.body,
                receivedAt: new Date().toISOString(),
              },
            });
            const ingest = await ingestInboundEvent(inbound);
            chatBroadcaster.linkTicket(sessionId, ingest.ticketId);

            const lowered = data.body.toLowerCase();
            if (HANDOFF_KEYWORDS.some((k) => lowered.includes(k))) {
              await prisma.ticket.update({
                where: { id: ingest.ticketId },
                data: { status: 'AWAITING_HUMAN' },
              });
              await prisma.auditLog.create({
                data: {
                  storeId,
                  ticketId: ingest.ticketId,
                  kind: 'CHAT_HANDOFF',
                  payload: { reason: 'keyword' },
                },
              });
              send(ws, {
                type: 'message',
                role: 'SYSTEM',
                body: 'Connecting you with a human teammate. Please hold on...',
                at: new Date().toISOString(),
              });
            }
          } catch (err) {
            req.log.error({ err, storeId, sessionId }, 'chat ingest failed');
            send(ws, {
              type: 'error',
              code: 'INGEST_FAILED',
              message: 'Could not deliver your message',
            });
          }
        }
      });

      ws.on('close', () => {
        chatBroadcaster.unregister(sessionId);
      });
      ws.on('error', () => {
        chatBroadcaster.unregister(sessionId);
      });
    },
  );
}
