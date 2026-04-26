import { z } from 'zod';

/**
 * Environment variable schema shared across services.
 *
 * Use the *parser* helpers (`parseApiEnv`, `parseWorkerEnv`, `parseWebEnv`)
 * to fail-fast at boot when required vars are missing.
 */

const featureBool = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === '') return undefined;
    const normalized = v.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  });

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  REDIS_QUEUE_PREFIX: z.string().default('resolveai'),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_CLASSIFIER: z.string().default('gpt-4o-mini'),
  OPENAI_MODEL_RESOLVER: z.string().default('gpt-4o'),
  OPENAI_MODEL_EMBEDDING: z.string().default('text-embedding-3-small'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  ENCRYPTION_KEY: z
    .string()
    .min(1, 'ENCRYPTION_KEY is required (32-byte base64 or hex)'),
  // Feature flags — read by both api & worker.
  AUTO_RESOLVE_ORDER_STATUS: featureBool,
  AUTO_APPROVE_REFUNDS: featureBool,
  // Observability (OpenTelemetry).
  OTEL_ENABLED: featureBool,
  OTEL_SERVICE_NAME: z.string().default('resolveai'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  // GDPR retention (days). Messages older than this are scrubbed.
  MESSAGE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  // Stripe billing.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_GROWTH: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  STRIPE_METER_STARTER: z.string().default('tickets_processed'),
  STRIPE_METER_GROWTH: z.string().default('tickets_processed'),
  STRIPE_METER_SCALE: z.string().default('tickets_processed'),
  // Observability (Sentry / PostHog).
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
});

const apiEnvSchema = baseEnvSchema.extend({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  API_CORS_ORIGINS: z.string().default('http://localhost:3000'),
  API_BODY_LIMIT: z.coerce.number().int().positive().default(1_048_576),
  API_INTERNAL_TOKEN: z.string().min(8),
  // Public dashboard URL — used for Checkout / Portal redirects.
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  // Shopify OAuth (one app for the whole platform).
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SHOPIFY_APP_URL: z.string().url().optional(),
  SHOPIFY_SCOPES: z.string().default('read_orders,write_orders,read_customers,read_products'),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),
  SHOPIFY_API_VERSION: z.string().default('2024-07'),
  // WhatsApp Business Cloud API.
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
});

const workerEnvSchema = baseEnvSchema.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  API_INTERNAL_TOKEN: z.string().min(8),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  SHOPIFY_API_VERSION: z.string().default('2024-07'),
  WHATSAPP_APP_SECRET: z.string().optional(),
});

// Web env extends baseEnvSchema by virtue of running inside Next.js with
// the same `process.env`. `NEXT_PUBLIC_APP_URL` is the merchant-facing
// dashboard URL the API sometimes needs (e.g. building Stripe Checkout
// success/cancel URLs).

const webEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return apiEnvSchema.parse(env);
}

export function parseWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return workerEnvSchema.parse(env);
}

export function parseWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  return webEnvSchema.parse(env);
}
