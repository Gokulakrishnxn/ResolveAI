import { EventEmitter } from 'node:events';

/**
 * In-process event bus used to fan out per-store inbox updates to SSE
 * subscribers. We bridge BullMQ events into this bus from the worker via the
 * internal webhook callback, so SSE listeners stay in-process and the worker
 * can run on a separate node.
 */

export type InboxEvent =
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

class InboxBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(evt: InboxEvent): void {
    this.emitter.emit(evt.storeId, evt);
  }

  subscribe(storeId: string, handler: (evt: InboxEvent) => void): () => void {
    this.emitter.on(storeId, handler);
    return () => this.emitter.off(storeId, handler);
  }
}

export const inboxBus = new InboxBus();
