import { prisma } from '@resolveai/db';
import { recomputeStoreRisk } from '../jobs/recomputeRisk.js';
import { logger } from '../lib/logger.js';

const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours
let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    let total = 0;
    for (const s of stores) {
      try {
        const n = await recomputeStoreRisk(s.id);
        total += n;
      } catch (err) {
        logger.warn({ err, storeId: s.id, name: s.name }, 'store risk recompute failed');
      }
    }
    logger.info({ totalCustomers: total, stores: stores.length }, 'risk recompute tick complete');
  } finally {
    running = false;
  }
}

export function startRiskScheduler(): { stop: () => void } {
  if (timer) return { stop: () => stopRiskScheduler() };
  // Kick once on boot, then every refresh window.
  void tick();
  timer = setInterval(() => void tick(), REFRESH_EVERY_MS);
  // Don't keep the process alive solely on this timer.
  timer.unref?.();
  logger.info({ everyMs: REFRESH_EVERY_MS }, 'risk scheduler started');
  return { stop: () => stopRiskScheduler() };
}

export function stopRiskScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
