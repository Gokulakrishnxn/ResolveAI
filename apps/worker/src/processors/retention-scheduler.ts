import { runRetentionScrub } from '../jobs/retention.js';
import { logger } from '../lib/logger.js';

const REFRESH_EVERY_MS = 24 * 60 * 60 * 1000; // 24 hours
let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runRetentionScrub();
    logger.debug({ ...result }, 'retention scheduler tick');
  } catch (err) {
    logger.warn({ err }, 'retention scheduler tick failed');
  } finally {
    running = false;
  }
}

export function startRetentionScheduler(): { stop: () => void } {
  if (timer) return { stop: () => stopRetentionScheduler() };
  void tick();
  timer = setInterval(() => void tick(), REFRESH_EVERY_MS);
  timer.unref?.();
  logger.info({ everyMs: REFRESH_EVERY_MS }, 'retention scheduler started');
  return { stop: () => stopRetentionScheduler() };
}

export function stopRetentionScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
