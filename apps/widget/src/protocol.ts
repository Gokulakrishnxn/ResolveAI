/**
 * Local copy of the chat WS protocol shapes — no zod, no shared deps so the
 * embed bundle stays tiny.
 */

export type ClientToServerMessage =
  | {
      type: 'hello';
      storeKey: string;
      sessionId: string;
      visitor: { email?: string; name?: string };
      pageUrl?: string;
    }
  | { type: 'message'; sessionId: string; body: string }
  | { type: 'typing'; sessionId: string };

export type ServerToClientMessage =
  | { type: 'welcome'; sessionId: string; ticketId?: string }
  | { type: 'message'; role: 'AGENT' | 'AI' | 'SYSTEM'; body: string; at: string }
  | { type: 'typing'; role: 'AGENT' | 'AI' }
  | { type: 'error'; code: string; message: string };
