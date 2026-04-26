import type { InboundChannelEvent } from '@resolveai/shared';
import { inboundChannelEventSchema } from '@resolveai/shared';
import type { WhatsappMessage, WhatsappWebhookPayload } from './types.js';

/**
 * Convert a WhatsApp Cloud API webhook payload into one or more canonical
 * inbound channel events. We treat each `messages[]` entry as a separate
 * inbound message and group by `wa_id` (the contact phone number) to form
 * the conversation thread ID.
 */
export function normalizeWhatsappPayload(opts: {
  storeId: string;
  payload: WhatsappWebhookPayload;
}): InboundChannelEvent[] {
  const out: InboundChannelEvent[] = [];
  for (const entry of opts.payload.entry) {
    for (const change of entry.changes) {
      const v = change.value;
      const messages = v.messages ?? [];
      const contactsByWaId = new Map<string, string | undefined>();
      for (const c of v.contacts ?? []) {
        contactsByWaId.set(c.wa_id, c.profile?.name);
      }
      for (const msg of messages) {
        const evt = messageToEvent({
          storeId: opts.storeId,
          msg,
          authorName: contactsByWaId.get(msg.from),
          phoneNumberId: v.metadata.phone_number_id,
        });
        if (evt) out.push(evt);
      }
    }
  }
  return out;
}

function messageToEvent(opts: {
  storeId: string;
  msg: WhatsappMessage;
  authorName: string | undefined;
  phoneNumberId: string;
}): InboundChannelEvent | null {
  const { msg } = opts;
  let body: string | null = null;
  if (msg.type === 'text' && msg.text) {
    body = msg.text.body;
  } else if (msg.type === 'image' && msg.image) {
    body = msg.image.caption?.length ? msg.image.caption : '[image]';
  } else if (msg.type === 'audio' || msg.type === 'video' || msg.type === 'document') {
    body = `[${msg.type}]`;
  } else if (msg.type === 'reaction' || msg.type === 'sticker') {
    return null;
  } else {
    body = `[${msg.type}]`;
  }
  if (!body) return null;
  const event: InboundChannelEvent = {
    storeId: opts.storeId,
    channel: 'WHATSAPP',
    conversationExternalId: msg.from,
    messageExternalId: msg.id,
    body,
    attachments:
      msg.type === 'image' && msg.image
        ? [
            {
              contentType: msg.image.mime_type ?? 'image/jpeg',
              filename: `${msg.image.id}.jpg`,
            },
          ]
        : [],
    author: {
      externalId: msg.from,
      phone: msg.from,
      name: opts.authorName,
    },
    receivedAt: new Date(Number(msg.timestamp) * 1000).toISOString(),
    raw: {
      type: msg.type,
      phoneNumberId: opts.phoneNumberId,
    },
  };
  return inboundChannelEventSchema.parse(event);
}
