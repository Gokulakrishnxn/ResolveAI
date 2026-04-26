import type { FastifyInstance } from 'fastify';
import { inboxBus, type InboxEvent } from '../lib/event-bus.js';

/**
 * Server-Sent Events for real-time inbox updates.
 *
 * Auth uses the same dev/header convention as the rest of the API; in
 * production, swap for the Clerk session check.
 */
export async function registerSseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/inbox/stream', { preHandler: app.requireUser }, async (req, reply) => {
    const storeId = req.storeId!;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send a hello event so clients know the channel is open.
    reply.raw.write(`event: hello\n`);
    reply.raw.write(`data: {"ok":true}\n\n`);

    const send = (evt: InboxEvent): void => {
      try {
        reply.raw.write(`event: ${evt.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
      } catch {
        /* socket closed */
      }
    };

    const unsubscribe = inboxBus.subscribe(storeId, send);

    // Heartbeat every 25s to keep proxies happy.
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`: heartbeat\n\n`);
      } catch {
        /* socket closed */
      }
    }, 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
