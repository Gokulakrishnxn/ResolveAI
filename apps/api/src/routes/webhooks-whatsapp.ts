import type { FastifyInstance } from 'fastify';
import {
  handleVerificationChallenge,
  normalizeWhatsappPayload,
  verifyWhatsappWebhook,
  whatsappWebhookPayloadSchema,
} from '@resolveai/integrations-whatsapp';
import { prisma } from '@resolveai/db';
import { ForbiddenError, BadRequestError } from '@resolveai/shared';
import { getConfig } from '../config.js';
import { ingestInboundEvent } from '../channels/ingest.js';
import { whatsappAdapter } from '../channels/whatsapp-adapter.js';
import { registerAdapter } from './../channels/registry.js';

interface WhatsappVerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

/**
 * Resolve the store an inbound WhatsApp payload belongs to by matching on
 * `phone_number_id`. The merchant stores this as `Integration.externalId`
 * on a row of kind WEBHOOK + config.provider=whatsapp.
 */
async function resolveStoreForPhoneId(phoneNumberId: string): Promise<string | null> {
  const integ = await prisma.integration.findFirst({
    where: {
      kind: 'WEBHOOK',
      externalId: phoneNumberId,
      status: 'ACTIVE',
    },
    select: { storeId: true, config: true },
  });
  if (!integ) return null;
  const cfg = (integ.config ?? {}) as Record<string, unknown>;
  if (cfg.provider !== 'whatsapp') return null;
  return integ.storeId;
}

export async function registerWhatsappWebhookRoutes(app: FastifyInstance): Promise<void> {
  registerAdapter(whatsappAdapter);

  app.get<{ Querystring: WhatsappVerifyQuery }>('/webhooks/whatsapp', async (req, reply) => {
    const cfg = getConfig();
    const expectedToken = cfg.WHATSAPP_VERIFY_TOKEN;
    if (!expectedToken) {
      throw new ForbiddenError('WhatsApp webhooks not configured');
    }
    const result = handleVerificationChallenge({
      mode: req.query['hub.mode'],
      token: req.query['hub.verify_token'],
      challenge: req.query['hub.challenge'],
      expectedToken,
    });
    if (!result.ok) {
      throw new ForbiddenError(`WhatsApp verification failed: ${result.reason}`);
    }
    reply.status(200).type('text/plain');
    return result.challenge;
  });

  app.post('/webhooks/whatsapp', async (req, reply) => {
    const cfg = getConfig();
    const secret = cfg.WHATSAPP_APP_SECRET;
    if (!secret) {
      throw new ForbiddenError('WhatsApp webhooks not configured');
    }
    const raw = (req as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    const sig = req.headers['x-hub-signature-256'];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    if (!verifyWhatsappWebhook(raw, sigStr, secret)) {
      throw new ForbiddenError('Invalid WhatsApp signature');
    }

    const parsed = whatsappWebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid WhatsApp payload', parsed.error.flatten());
    }

    let processed = 0;
    for (const entry of parsed.data.entry) {
      for (const change of entry.changes) {
        const phoneNumberId = change.value.metadata.phone_number_id;
        const storeId = await resolveStoreForPhoneId(phoneNumberId);
        if (!storeId) {
          req.log.warn({ phoneNumberId }, 'no store mapped for whatsapp phone_number_id');
          continue;
        }
        const events = normalizeWhatsappPayload({
          storeId,
          payload: { object: parsed.data.object, entry: [{ id: entry.id, changes: [change] }] },
        });
        for (const evt of events) {
          await ingestInboundEvent(evt);
          processed += 1;
        }
      }
    }

    reply.status(202);
    return { ok: true, processed };
  });
}
