import {
  inboundChannelEventSchema,
  type InboundChannelEvent,
  type OutboundReply,
} from '@resolveai/shared';
import {
  WhatsappClient,
  evaluateWhatsappWindow,
  type WhatsappWebhookPayload,
} from '@resolveai/integrations-whatsapp';
import { prisma } from '@resolveai/db';
import { openCredentials } from '../lib/encryption.js';
import type { ChannelAdapter } from './adapter.js';

export interface WhatsappRawPayload {
  payload: WhatsappWebhookPayload;
  /** Pre-resolved by the webhook route. */
  storeId: string;
  /** Already-normalized event chosen for this adapter call. */
  event: InboundChannelEvent;
}

interface WhatsappCredentials {
  phoneNumberId: string;
  accessToken: string;
}

async function getClient(storeId: string): Promise<{
  client: WhatsappClient;
  credentials: WhatsappCredentials;
} | null> {
  const integ = await prisma.integration.findFirst({
    where: { storeId, kind: 'WEBHOOK', status: 'ACTIVE' },
  });
  // We piggy-back on the generic WEBHOOK kind for WhatsApp so existing
  // schema doesn't need extending. The `config.provider === 'whatsapp'`
  // marker disambiguates.
  if (!integ) return null;
  const config = (integ.config ?? {}) as Record<string, unknown>;
  if (config.provider !== 'whatsapp') return null;
  const phoneNumberId = String(config.phoneNumberId ?? '');
  if (!phoneNumberId) return null;
  const parsed = openCredentials<{ accessToken: string }>(integ.credentials);
  return {
    client: new WhatsappClient({
      phoneNumberId,
      accessToken: parsed.accessToken,
    }),
    credentials: { phoneNumberId, accessToken: parsed.accessToken },
  };
}

export const whatsappAdapter: ChannelAdapter<WhatsappRawPayload> = {
  kind: 'WHATSAPP',

  normalize({ raw }) {
    return inboundChannelEventSchema.parse(raw.event);
  },

  async validateOutbound(reply: OutboundReply) {
    if (reply.templateId) return { ok: true };
    const ticket = await prisma.ticket.findFirst({
      where: { id: reply.ticketId, storeId: reply.storeId },
      select: { id: true },
    });
    if (!ticket) return { ok: false, reason: 'ticket_not_found' };
    const lastInbound = await prisma.message.findFirst({
      where: { ticketId: reply.ticketId, role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const decision = evaluateWhatsappWindow({
      lastInboundAt: lastInbound?.createdAt ?? null,
      isTemplate: false,
    });
    return decision.allowed ? { ok: true } : { ok: false, reason: decision.reason };
  },

  async sendReply(reply: OutboundReply) {
    const c = await getClient(reply.storeId);
    if (!c) {
      throw new Error('WhatsApp integration not configured for store');
    }
    const ticket = await prisma.ticket.findFirst({
      where: { id: reply.ticketId, storeId: reply.storeId },
      include: { customer: { select: { phone: true } } },
    });
    const to = ticket?.customer?.phone;
    if (!to) {
      throw new Error('No customer phone number on ticket; cannot send WhatsApp reply');
    }

    if (reply.templateId) {
      const sent = await c.client.sendTemplate({
        to,
        templateName: reply.templateId,
        languageCode: 'en_US',
      });
      return { providerMessageId: sent.providerMessageId };
    }

    const sent = await c.client.sendText({ to, body: reply.body });
    return { providerMessageId: sent.providerMessageId };
  },
};
