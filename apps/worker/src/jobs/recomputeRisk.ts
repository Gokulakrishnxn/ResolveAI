import { prisma, type Prisma } from '@resolveai/db';
import { evaluateFraudGuards, type CustomerRiskFlag } from '@resolveai/shared';
import { logger } from '../lib/logger.js';

const WINDOW_DAYS = 30;

interface RecomputeOptions {
  storeId: string;
  customerId: string;
}

/**
 * Recomputes the per-customer fraud aggregates from primary tables (orders +
 * actions). Designed to be called periodically (cron) and after each refund
 * execution. Updates the Customer row + emits audit if flags changed.
 */
export async function recomputeCustomerRisk(opts: RecomputeOptions): Promise<{
  changed: boolean;
  flags: CustomerRiskFlag[];
}> {
  const { storeId, customerId } = opts;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  });
  if (!customer) return { changed: false, flags: [] };

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  // Refund metrics in window: count + sum of executed refund actions on this customer's orders.
  const recentActions = await prisma.action.findMany({
    where: {
      storeId,
      kind: { in: ['REFUND_FULL', 'REFUND_PARTIAL'] },
      status: 'EXECUTED',
      executedAt: { gte: since },
      order: { customerId },
    },
    select: { payload: true, executedAt: true },
  });
  const refundCount30d = recentActions.length;
  const refundTotal30dUsd = recentActions.reduce((sum, a) => {
    const p = a.payload as { amount?: string; currency?: string } | null;
    if (!p?.amount) return sum;
    if ((p.currency ?? 'USD').toUpperCase() !== 'USD') return sum;
    const n = Number(p.amount);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  // Lifetime value: prefer Order.totalPrice sum (only USD orders).
  const lifetimeAgg = await prisma.order.aggregate({
    where: { storeId, customerId, currency: 'USD' },
    _sum: { totalPrice: true },
  });
  const lifetimeValueUsd = Number(lifetimeAgg._sum.totalPrice?.toFixed(2) ?? 0);

  const fraud = evaluateFraudGuards({
    input: {
      refundCount30d,
      refundTotal30dUsd,
      lifetimeValueUsd,
      disputeCount: customer.disputeCount,
      existingFlags: (customer.riskFlags ?? []) as CustomerRiskFlag[],
    },
  });

  const previousFlags = new Set<string>(customer.riskFlags ?? []);
  const nextFlags = new Set<string>(fraud.flags);
  const changed =
    previousFlags.size !== nextFlags.size ||
    [...previousFlags].some((f) => !nextFlags.has(f));

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      refundCount30d,
      refundTotal30dUsd: refundTotal30dUsd.toFixed(2),
      lifetimeValueUsd: lifetimeValueUsd.toFixed(2),
      riskFlags: Array.from(nextFlags),
      riskRecomputedAt: new Date(),
    },
  });

  if (changed) {
    const added = [...nextFlags].filter((f) => !previousFlags.has(f));
    const removed = [...previousFlags].filter((f) => !nextFlags.has(f));
    if (added.length) {
      await prisma.auditLog.create({
        data: {
          storeId,
          kind: 'FRAUD_FLAG_ADDED',
          payload: {
            customerId: customer.id,
            flags: added,
            signals: fraud.signals,
          } as Prisma.InputJsonValue,
        },
      });
    }
    if (removed.length) {
      await prisma.auditLog.create({
        data: {
          storeId,
          kind: 'FRAUD_FLAG_REMOVED',
          payload: { customerId: customer.id, flags: removed } as Prisma.InputJsonValue,
        },
      });
    }
    logger.info(
      { storeId, customerId, added, removed },
      'customer risk flags updated',
    );
  }

  return { changed, flags: Array.from(nextFlags) as CustomerRiskFlag[] };
}

/**
 * Recompute risk for every customer in a store. Used by the periodic refresh
 * job. Walks paginated to avoid loading the full customer list at once.
 */
export async function recomputeStoreRisk(storeId: string, batchSize = 100): Promise<number> {
  let cursor: string | undefined;
  let total = 0;
  while (true) {
    const batch: Array<{ id: string }> = await prisma.customer.findMany({
      where: { storeId },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });
    if (batch.length === 0) break;
    for (const c of batch) {
      await recomputeCustomerRisk({ storeId, customerId: c.id });
      total += 1;
    }
    const last = batch[batch.length - 1];
    cursor = last?.id;
    if (batch.length < batchSize) break;
  }
  return total;
}
