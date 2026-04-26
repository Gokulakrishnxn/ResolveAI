import {
  enableTracing,
  enableSentry,
  enablePostHog,
  captureException,
} from '@resolveai/shared';
import { getConfig } from './config.js';
import { startTicketProcessor } from './processors/ticket-processor.js';
import { startActionExecutor } from './processors/action-executor.js';
import { startInboxListeners } from './processors/inbox-listener.js';
import { startRiskScheduler } from './processors/risk-scheduler.js';
import { startRetentionScheduler } from './processors/retention-scheduler.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  const cfg = getConfig();
  enableTracing({ serviceName: 'resolveai-worker' });
  enableSentry({
    dsn: cfg.SENTRY_DSN,
    environment: cfg.NODE_ENV,
    serviceName: 'resolveai-worker',
  });
  enablePostHog({ apiKey: cfg.POSTHOG_API_KEY, host: cfg.POSTHOG_HOST });

  process.on('uncaughtException', (err) => {
    captureException(err);
    logger.error({ err }, 'uncaughtException');
  });
  process.on('unhandledRejection', (err) => {
    captureException(err);
    logger.error({ err }, 'unhandledRejection');
  });
  const ticketWorker = startTicketProcessor();
  const actionWorker = startActionExecutor();
  const inbox = await startInboxListeners();
  const risk = startRiskScheduler();
  const retention = startRetentionScheduler();
  logger.info('worker started');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`received ${signal}, shutting down`);
    risk.stop();
    retention.stop();
    await Promise.allSettled([ticketWorker.close(), actionWorker.close(), inbox.stopAll()]);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main().catch((err: unknown) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
