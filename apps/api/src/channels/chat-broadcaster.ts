import type { ServerToClientMessage } from '@resolveai/integrations-chat';

/**
 * In-process chat broadcaster for the WS gateway.
 *
 * Each connected widget session registers itself here keyed by `sessionId`.
 * The worker (and other API code paths) emit `chat.message` events through
 * the inbox bus; we resolve the session(s) attached to that ticketId and
 * forward the AI reply to the open WebSocket.
 *
 * NOTE: Single-process today. To horizontally scale the API, swap this for
 *       a Redis pub/sub channel keyed by ticketId.
 */
export type ChatSink = (msg: ServerToClientMessage) => void;

export interface ChatSession {
  sessionId: string;
  storeId: string;
  ticketId: string | null;
  send: ChatSink;
}

class ChatBroadcaster {
  private readonly sessions = new Map<string, ChatSession>();
  private readonly byTicket = new Map<string, Set<string>>();

  register(session: ChatSession): void {
    this.sessions.set(session.sessionId, session);
    if (session.ticketId) {
      this.linkTicket(session.sessionId, session.ticketId);
    }
  }

  linkTicket(sessionId: string, ticketId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.ticketId = ticketId;
    let set = this.byTicket.get(ticketId);
    if (!set) {
      set = new Set();
      this.byTicket.set(ticketId, set);
    }
    set.add(sessionId);
  }

  unregister(sessionId: string): void {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    this.sessions.delete(sessionId);
    if (s.ticketId) {
      const set = this.byTicket.get(s.ticketId);
      set?.delete(sessionId);
      if (set && set.size === 0) this.byTicket.delete(s.ticketId);
    }
  }

  send(sessionId: string, msg: ServerToClientMessage): void {
    this.sessions.get(sessionId)?.send(msg);
  }

  broadcastToTicket(ticketId: string, msg: ServerToClientMessage): number {
    const set = this.byTicket.get(ticketId);
    if (!set || set.size === 0) return 0;
    let n = 0;
    for (const id of set) {
      const s = this.sessions.get(id);
      if (s) {
        try {
          s.send(msg);
          n += 1;
        } catch {
          /* dead socket; will be cleaned up on close */
        }
      }
    }
    return n;
  }

  getStoreForSession(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.storeId;
  }
}

export const chatBroadcaster = new ChatBroadcaster();
