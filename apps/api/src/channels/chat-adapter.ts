import {
  inboundChannelEventSchema,
  type InboundChannelEvent,
  type OutboundReply,
} from '@resolveai/shared';
import type { ChannelAdapter } from './adapter.js';
import { chatBroadcaster } from './chat-broadcaster.js';

/**
 * Chat widget adapter.
 *
 * - `normalize` accepts the raw payload that came in over the WS gateway
 *   and returns the canonical `InboundChannelEvent`.
 * - `sendReply` fans the AI/agent message out to all sessions currently
 *   bound to the ticket via the in-process broadcaster.
 */
export interface ChatRawPayload {
  storeId: string;
  sessionId: string;
  body: string;
  visitorEmail?: string;
  visitorName?: string;
  pageUrl?: string;
  receivedAt?: string;
}

export const chatAdapter: ChannelAdapter<ChatRawPayload> = {
  kind: 'CHAT',

  normalize({ storeId, raw }) {
    const event: InboundChannelEvent = {
      storeId,
      channel: 'CHAT',
      conversationExternalId: raw.sessionId,
      messageExternalId: `${raw.sessionId}:${Date.now()}`,
      body: raw.body,
      attachments: [],
      author: {
        externalId: raw.sessionId,
        email: raw.visitorEmail,
        name: raw.visitorName,
      },
      receivedAt: raw.receivedAt ?? new Date().toISOString(),
      raw: {
        pageUrl: raw.pageUrl,
      },
    };
    return inboundChannelEventSchema.parse(event);
  },

  async sendReply(reply: OutboundReply) {
    const delivered = chatBroadcaster.broadcastToTicket(reply.ticketId, {
      type: 'message',
      role: 'AI',
      body: reply.body,
      at: new Date().toISOString(),
    });
    return { providerMessageId: delivered > 0 ? `chat:${reply.ticketId}:${Date.now()}` : undefined };
  },
};
