import { WebSocketServer, type WebSocket } from 'ws';
import {
  clientToServerMessageSchema,
  type ClientToServerMessage,
  type ServerToClientMessage,
} from './protocol.js';

export interface ChatGatewayOptions {
  port: number;
  host?: string;
  /**
   * Called for every validated inbound message.
   * Return server messages to fan out to the same connection (or reject).
   */
  onMessage: (
    msg: ClientToServerMessage,
    ctx: { sessionId: string },
  ) => Promise<ServerToClientMessage[]>;
}

interface ConnectionState {
  sessionId?: string;
  storeKey?: string;
}

/**
 * Bare-bones WS chat gateway.
 *
 * Production wiring will:
 *  - authenticate `storeKey` against `Integration` (kind=CHAT_WIDGET)
 *  - persist messages via the API (HTTP) instead of directly via Prisma
 *  - track sessions in Redis for fanout to multiple gateway instances
 */
export class ChatGateway {
  private wss?: WebSocketServer;
  private readonly opts: ChatGatewayOptions;
  private readonly conns = new WeakMap<WebSocket, ConnectionState>();

  constructor(opts: ChatGatewayOptions) {
    this.opts = opts;
  }

  start(): void {
    const wss = new WebSocketServer({ port: this.opts.port, host: this.opts.host });
    this.wss = wss;

    wss.on('connection', (ws) => {
      this.conns.set(ws, {});

      ws.on('message', async (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          this.sendError(ws, 'BAD_JSON', 'Invalid JSON');
          return;
        }

        const result = clientToServerMessageSchema.safeParse(parsed);
        if (!result.success) {
          this.sendError(ws, 'BAD_REQUEST', 'Invalid message shape');
          return;
        }

        const state = this.conns.get(ws) ?? {};
        if (result.data.type === 'hello') {
          state.sessionId = result.data.sessionId;
          state.storeKey = result.data.storeKey;
          this.conns.set(ws, state);
        } else if (!state.sessionId) {
          this.sendError(ws, 'NOT_INITIALIZED', 'Send `hello` before messages');
          return;
        }

        try {
          const responses = await this.opts.onMessage(result.data, {
            sessionId: state.sessionId ?? result.data.sessionId,
          });
          for (const out of responses) {
            ws.send(JSON.stringify(out));
          }
        } catch (err) {
          this.sendError(
            ws,
            'INTERNAL',
            err instanceof Error ? err.message : 'Internal error',
          );
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.wss) return;
    const wss = this.wss;
    await new Promise<void>((resolve, reject) =>
      wss.close((err) => (err ? reject(err) : resolve())),
    );
    this.wss = undefined;
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    const out: ServerToClientMessage = { type: 'error', code, message };
    ws.send(JSON.stringify(out));
  }
}
