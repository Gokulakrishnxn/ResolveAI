import type { FastifyInstance } from 'fastify';
import {
  shopifyOrderWebhookSchema,
  woocommerceOrderWebhookSchema,
  ForbiddenError,
} from '@resolveai/shared';
import { prisma } from '@resolveai/db';
import { verifyShopifyWebhook } from '@resolveai/integrations-shopify';
import { verifyWooWebhook } from '@resolveai/integrations-woocommerce';
import { getConfig } from '../config.js';
import { enqueueProcessTicket } from '../queue/index.js';
import {
  upsertOrderFromShopifyPayload,
  type ShopifyOrderWebhookPayload,
} from '../lib/shopify.js';
import { inboxBus, type InboxEvent } from '../lib/event-bus.js';

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Capture raw body for signature verification.
   * Fastify already parses JSON, so we install a `preParsing` capture.
   */
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const buf = body as Buffer;
        (req as { rawBody?: Buffer }).rawBody = buf;
        const json = buf.length ? JSON.parse(buf.toString('utf8')) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post('/webhooks/shopify', async (req, reply) => {
    const cfg = getConfig();
    const secret = cfg.SHOPIFY_WEBHOOK_SECRET ?? cfg.SHOPIFY_API_SECRET;
    if (!secret) {
      throw new ForbiddenError('Shopify webhooks not configured');
    }
    const raw = (req as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    const sig = req.headers['x-shopify-hmac-sha256'];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    if (!verifyShopifyWebhook(raw, sigStr, secret)) {
      throw new ForbiddenError('Invalid Shopify signature');
    }

    const shopDomain = req.headers['x-shopify-shop-domain'];
    const shopDomainStr = Array.isArray(shopDomain) ? shopDomain[0] : shopDomain;
    if (typeof shopDomainStr !== 'string') {
      throw new ForbiddenError('Missing shop domain header');
    }

    const integration = await prisma.integration.findFirst({
      where: { kind: 'SHOPIFY', externalId: shopDomainStr },
      include: { store: { select: { id: true } } },
    });
    if (!integration) {
      reply.status(202);
      return { ok: true, ignored: true };
    }

    const topic = req.headers['x-shopify-topic'];
    const topicStr = (Array.isArray(topic) ? topic[0] : topic) ?? '';

    try {
      if (
        topicStr === 'orders/create' ||
        topicStr === 'orders/updated' ||
        topicStr === 'orders/fulfilled'
      ) {
        const parsed = shopifyOrderWebhookSchema.safeParse(req.body);
        if (parsed.success) {
          await upsertOrderFromShopifyPayload({
            storeId: integration.storeId,
            payload: req.body as ShopifyOrderWebhookPayload,
          });
        }
      } else if (topicStr === 'app/uninstalled') {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { status: 'DISCONNECTED', lastError: 'app/uninstalled', lastErrorAt: new Date() },
        });
        await prisma.auditLog.create({
          data: {
            storeId: integration.storeId,
            kind: 'INTEGRATION_DISCONNECTED',
            payload: { provider: 'shopify', shop: shopDomainStr },
          },
        });
      }
    } catch (err) {
      app.log.error({ err, topic: topicStr }, 'shopify webhook handler failed');
    }

    await prisma.auditLog.create({
      data: {
        storeId: integration.storeId,
        kind: 'WEBHOOK_RECEIVED',
        payload: { provider: 'shopify', topic: topicStr },
      },
    });

    reply.status(202);
    return { ok: true };
  });

  app.post('/webhooks/woocommerce', async (req, reply) => {
    const sig = req.headers['x-wc-webhook-signature'];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    const sourceUrl = req.headers['x-wc-webhook-source'];
    const sourceUrlStr = Array.isArray(sourceUrl) ? sourceUrl[0] : sourceUrl;
    if (typeof sourceUrlStr !== 'string') {
      throw new ForbiddenError('Missing source header');
    }

    const integration = await prisma.integration.findFirst({
      where: { kind: 'WOOCOMMERCE', externalId: sourceUrlStr, status: 'ACTIVE' },
    });
    if (!integration) {
      reply.status(202);
      return { ok: true, ignored: true };
    }

    const creds = integration.credentials as { secret?: string };
    const secret = creds.secret;
    const raw = (req as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    if (!secret || !verifyWooWebhook(raw, sigStr, secret)) {
      throw new ForbiddenError('Invalid WooCommerce signature');
    }

    const parsed = woocommerceOrderWebhookSchema.safeParse(req.body);
    await prisma.auditLog.create({
      data: {
        storeId: integration.storeId,
        kind: 'WEBHOOK_RECEIVED',
        payload: { provider: 'woocommerce', ok: parsed.success },
      },
    });

    reply.status(202);
    return { ok: true };
  });

  /**
   * Internal callback used by the worker after a fresh ticket is created via
   * the email/chat ingestion paths. Triggers the AI pipeline.
   */
  app.post<{ Body: { storeId: string; ticketId: string } }>(
    '/webhooks/internal/process-ticket',
    { preHandler: app.requireInternal },
    async (req, reply) => {
      const { storeId, ticketId } = req.body;
      await enqueueProcessTicket({ storeId, ticketId });
      reply.status(202);
      return { ok: true };
    },
  );

  /**
   * Internal event publish endpoint — the worker POSTs here so SSE
   * subscribers in the API process see updates.
   */
  app.post<{ Body: InboxEvent }>(
    '/webhooks/internal/publish',
    { preHandler: app.requireInternal },
    async (req, reply) => {
      inboxBus.publish(req.body);
      reply.status(202);
      return { ok: true };
    },
  );
}
