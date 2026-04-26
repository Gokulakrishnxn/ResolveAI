import { getConfig } from '../config.js';
import { logger } from './logger.js';

export type WorkerEvent =
  | { type: 'ticket.created'; storeId: string; ticketId: string }
  | { type: 'ticket.updated'; storeId: string; ticketId: string }
  | {
      type: 'ticket.classified';
      storeId: string;
      ticketId: string;
      intent: string;
      confidence: number;
    }
  | {
      type: 'action.proposed';
      storeId: string;
      ticketId: string;
      actionId: string;
      kind: string;
    }
  | {
      type: 'action.auto_approved';
      storeId: string;
      ticketId: string;
      actionId: string;
      kind: string;
    }
  | { type: 'action.executed'; storeId: string; ticketId: string; actionId: string }
  | { type: 'action.auto_refund_completed'; storeId: string; ticketId: string; actionId: string }
  | { type: 'chat.message'; storeId: string; ticketId: string; messageId: string }
  | { type: 'chat.handoff'; storeId: string; ticketId: string; reason: string };

export interface ChatBroadcast {
  storeId: string;
  ticketId: string;
  role: 'AI' | 'AGENT' | 'SYSTEM';
  body: string;
}

/**
 * Push an outbound chat message through the API gateway so connected widget
 * sessions for the ticket receive it in realtime.
 */
export async function broadcastChatMessage(msg: ChatBroadcast): Promise<void> {
  const cfg = getConfig();
  try {
    await fetch(new URL('/chat/broadcast', cfg.API_PUBLIC_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.API_INTERNAL_TOKEN}`,
      },
      body: JSON.stringify({ ...msg, at: new Date().toISOString() }),
    });
  } catch (err) {
    logger.warn({ err, ticketId: msg.ticketId }, 'failed to broadcast chat message');
  }
}

/**
 * Best-effort event push to the API. Failures are logged but do not stop
 * job processing — SSE is not authoritative.
 */
export async function publishWorkerEvent(evt: WorkerEvent): Promise<void> {
  const cfg = getConfig();
  try {
    await fetch(new URL('/webhooks/internal/publish', cfg.API_PUBLIC_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.API_INTERNAL_TOKEN}`,
      },
      body: JSON.stringify(evt),
    });
  } catch (err) {
    logger.warn({ err, evt }, 'failed to publish worker event');
  }
}
