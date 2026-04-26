import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { enableTracing, enableSentry, enablePostHog, captureException } from '@resolveai/shared';
import { getConfig } from './config.js';
import { errorHandler } from './plugins/error-handler.js';
import { authPlugin } from './plugins/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTicketRoutes } from './routes/tickets.js';
import { registerActionRoutes } from './routes/actions.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerShopifyOAuthRoutes } from './routes/shopify-oauth.js';
import { registerSseRoutes } from './routes/sse.js';
import { registerRefundRoutes } from './routes/refunds.js';
import { registerIntegrationsRoutes } from './routes/integrations.js';
import { registerSettingsRulesRoutes } from './routes/settings-rules.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerChatWebsocket } from './ws/gateway.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerWhatsappWebhookRoutes } from './routes/webhooks-whatsapp.js';
import { registerBillingRoutes } from './routes/billing.js';
import { registerStripeWebhookRoutes } from './routes/webhooks-stripe.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerAdapter } from './channels/registry.js';
import { chatAdapter } from './channels/chat-adapter.js';

export async function buildServer(): Promise<FastifyInstance> {
  const cfg = getConfig();

  const app = Fastify({
    logger: {
      level: cfg.LOG_LEVEL,
      transport:
        cfg.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
    bodyLimit: cfg.API_BODY_LIMIT,
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: cfg.API_CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });
  await app.register(sensible);
  await app.register(errorHandler);
  await app.register(authPlugin);

  registerAdapter(chatAdapter);

  await app.register(async (api) => {
    await registerHealthRoutes(api);
    await registerWebhookRoutes(api);
    await registerWhatsappWebhookRoutes(api);
    await registerStripeWebhookRoutes(api);
    await registerChatRoutes(api);
    await registerChatWebsocket(api);
    await api.register(async (scope) => {
      await registerShopifyOAuthRoutes(scope);
    });
    await api.register(async (scope) => {
      await registerTicketRoutes(scope);
      await registerActionRoutes(scope);
      await registerRefundRoutes(scope);
      await registerSseRoutes(scope);
      await registerIntegrationsRoutes(scope);
      await registerSettingsRulesRoutes(scope);
      await registerAnalyticsRoutes(scope);
      await registerKnowledgeRoutes(scope);
      await registerBillingRoutes(scope);
      await registerOnboardingRoutes(scope);
      await registerAdminRoutes(scope);
    });
  });

  return app;
}

async function main(): Promise<void> {
  const cfg = getConfig();
  enableTracing({ serviceName: 'resolveai-api' });
  enableSentry({
    dsn: cfg.SENTRY_DSN,
    environment: cfg.NODE_ENV,
    serviceName: 'resolveai-api',
  });
  enablePostHog({ apiKey: cfg.POSTHOG_API_KEY, host: cfg.POSTHOG_HOST });

  process.on('uncaughtException', (err) => {
    captureException(err);
    // Re-throw via process default after capturing.
    console.error('uncaughtException', err);
  });
  process.on('unhandledRejection', (err) => {
    captureException(err);
    console.error('unhandledRejection', err);
  });

  const app = await buildServer();
  try {
    await app.listen({ host: cfg.API_HOST, port: cfg.API_PORT });
  } catch (err) {
    app.log.error({ err }, 'failed to start');
    captureException(err);
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info(`received ${signal}, shutting down`);
      await app.close();
      process.exit(0);
    });
  }
}

const isEntry = (() => {
  try {
    const mainModule = process.argv[1];
    if (!mainModule) return false;
    return import.meta.url === new URL(`file://${mainModule}`).href;
  } catch {
    return false;
  }
})();

if (isEntry) {
  void main();
}
