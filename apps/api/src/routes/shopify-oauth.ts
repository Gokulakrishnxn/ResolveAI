import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import {
  BadRequestError,
  ForbiddenError,
  IntegrationError,
  ValidationError,
} from '@resolveai/shared';
import {
  ShopifyClient,
  buildInstallUrl,
  exchangeCodeForToken,
  shopDomainSchema,
  verifyOAuthHmac,
  SHOPIFY_PHASE1_WEBHOOK_TOPICS,
} from '@resolveai/integrations-shopify';
import { getRedis } from '../lib/redis.js';
import { sealCredentials } from '../lib/encryption.js';
import { getConfig } from '../config.js';

const installQuerySchema = z.object({
  shop: shopDomainSchema,
  /** Optional: associate the install with a known store. */
  storeId: z.string().optional(),
});

const callbackQuerySchema = z.object({
  shop: shopDomainSchema,
  code: z.string().min(1),
  state: z.string().min(1),
  hmac: z.string().min(1),
  host: z.string().optional(),
  timestamp: z.string().optional(),
});

interface NoncePayload {
  storeId?: string;
  createdAt: number;
}

const NONCE_TTL_S = 600;

function nonceKey(state: string): string {
  return `shopify:install:${state}`;
}

export async function registerShopifyOAuthRoutes(app: FastifyInstance): Promise<void> {
  const cfg = getConfig();

  app.get('/shopify/install', async (req, reply) => {
    if (!cfg.SHOPIFY_API_KEY || !cfg.SHOPIFY_API_SECRET || !cfg.SHOPIFY_APP_URL) {
      throw new IntegrationError('Shopify app credentials are not configured');
    }
    const query = installQuerySchema.parse(req.query);
    const state = randomBytes(24).toString('base64url');
    const noncePayload: NoncePayload = {
      storeId: query.storeId,
      createdAt: Date.now(),
    };
    await getRedis().set(
      nonceKey(state),
      JSON.stringify(noncePayload),
      'EX',
      NONCE_TTL_S,
    );

    const redirectUri = new URL('/shopify/callback', cfg.SHOPIFY_APP_URL).toString();
    const url = buildInstallUrl({
      shop: query.shop,
      apiKey: cfg.SHOPIFY_API_KEY,
      scopes: cfg.SHOPIFY_SCOPES,
      redirectUri,
      state,
    });
    return reply.redirect(url);
  });

  app.get('/shopify/callback', async (req, reply) => {
    if (!cfg.SHOPIFY_API_KEY || !cfg.SHOPIFY_API_SECRET || !cfg.SHOPIFY_APP_URL) {
      throw new IntegrationError('Shopify app credentials are not configured');
    }

    const query = callbackQuerySchema.parse(req.query);

    if (
      !verifyOAuthHmac(
        req.query as Record<string, string | string[] | undefined>,
        cfg.SHOPIFY_API_SECRET,
      )
    ) {
      throw new ForbiddenError('Invalid Shopify OAuth HMAC');
    }

    // Validate nonce / state.
    const stateRaw = await getRedis().get(nonceKey(query.state));
    if (!stateRaw) throw new BadRequestError('OAuth state expired or unknown');
    await getRedis().del(nonceKey(query.state));

    let nonce: NoncePayload;
    try {
      nonce = JSON.parse(stateRaw) as NoncePayload;
    } catch {
      throw new BadRequestError('OAuth state is corrupt');
    }

    // Exchange code for the offline token.
    const token = await exchangeCodeForToken({
      shop: query.shop,
      code: query.code,
      apiKey: cfg.SHOPIFY_API_KEY,
      apiSecret: cfg.SHOPIFY_API_SECRET,
    });

    // Resolve / create the Store record.
    const store = await prisma.store.upsert({
      where: { domain: query.shop },
      create: {
        id: nonce.storeId ?? undefined,
        name: query.shop.replace(/\.myshopify\.com$/, ''),
        domain: query.shop,
        platform: 'SHOPIFY',
      },
      update: {
        platform: 'SHOPIFY',
      },
    });

    // Encrypt and persist the integration.
    const sealed = sealCredentials({
      accessToken: token.accessToken,
      scope: token.scope,
    });

    const integration = await prisma.integration.upsert({
      where: {
        storeId_kind_externalId: {
          storeId: store.id,
          kind: 'SHOPIFY',
          externalId: query.shop,
        },
      },
      create: {
        storeId: store.id,
        kind: 'SHOPIFY',
        status: 'ACTIVE',
        credentials: sealed as unknown as object,
        externalId: query.shop,
        scopes: token.scope,
        lastSyncAt: new Date(),
      },
      update: {
        status: 'ACTIVE',
        credentials: sealed as unknown as object,
        scopes: token.scope,
        lastError: null,
        lastErrorAt: null,
        lastSyncAt: new Date(),
      },
    });

    // Subscribe to webhooks (idempotent on Shopify side; ignore failures so
    // OAuth still succeeds even if webhook reg has a transient issue).
    try {
      const client = new ShopifyClient({
        shopDomain: query.shop,
        accessToken: token.accessToken,
        apiVersion: cfg.SHOPIFY_API_VERSION,
      });
      const webhookUrl = new URL('/webhooks/shopify', cfg.SHOPIFY_APP_URL).toString();
      for (const topic of SHOPIFY_PHASE1_WEBHOOK_TOPICS) {
        await client.createWebhook({ topic, address: webhookUrl }).catch((err) => {
          app.log.warn({ err, topic }, 'shopify webhook create failed (continuing)');
        });
      }
    } catch (err) {
      app.log.warn({ err }, 'shopify webhook subscription failed');
    }

    await prisma.auditLog.create({
      data: {
        storeId: store.id,
        kind: 'INTEGRATION_CONNECTED',
        payload: {
          provider: 'shopify',
          shop: query.shop,
          integrationId: integration.id,
          scopes: token.scope,
        },
      },
    });

    // Redirect back to the dashboard.
    const dashboardUrl = new URL(
      '/integrations?connected=shopify',
      cfg.API_CORS_ORIGINS.split(',')[0]?.trim() || cfg.SHOPIFY_APP_URL,
    ).toString();
    return reply.redirect(dashboardUrl);
  });
}

export async function buildShopifyClientForRoute(_storeId: string): Promise<never> {
  throw new ValidationError('use lib/shopify.ts:getShopifyClientForStore');
}
