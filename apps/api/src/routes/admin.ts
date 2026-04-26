/**
 * Internal Admin Console — gated by `User.role = SUPER_ADMIN`. Surfaces
 * platform-wide health: store list, MRR, AI cost per store, and a churn
 * heuristic. This is NOT a merchant-facing feature.
 *
 * RBAC strategy: in dev we accept the same `x-user-id`/`x-store-id`
 * headers as the merchant dashboard, but additionally require the user
 * record to have `role = SUPER_ADMIN`. In production this rides on the
 * Clerk session and the same DB role check.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import { ForbiddenError } from '@resolveai/shared';
import {
  PLANS,
  type PaidTier,
  type PlanDefinition,
  type SubscriptionTier,
} from '@resolveai/integrations-stripe';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);
  app.addHook('preHandler', async (req) => {
    const userId = req.auth?.userId;
    if (!userId) throw new ForbiddenError('Auth required');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Super-admin role required');
    }
  });

  /** GET /admin/overview — single-call dashboard summary. */
  app.get('/admin/overview', async () => {
    const [stores, totalTickets, openTickets, aiCostMicroUsd, totalActiveSubs] = await Promise.all([
      prisma.store.count({ where: { isActive: true } }),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['NEW', 'IN_PROGRESS', 'AWAITING_HUMAN'] } } }),
      prisma.aICallLog.aggregate({ _sum: { costMicroUsd: true } }),
      prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } } }),
    ]);

    // MRR: sum of monthly plan price across non-canceled subscriptions.
    const subsByTier = await prisma.subscription.groupBy({
      by: ['tier'],
      where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
      _count: { _all: true },
    });
    let mrrUsd = 0;
    for (const row of subsByTier) {
      if (row.tier === 'FREE') continue;
      const plan = PLANS[row.tier as PaidTier] as PlanDefinition | undefined;
      if (plan) mrrUsd += plan.priceMonthlyUsd * row._count._all;
    }

    return {
      stores,
      totalTickets,
      openTickets,
      activeSubscriptions: totalActiveSubs,
      aiCostUsd: Number(aiCostMicroUsd._sum.costMicroUsd ?? 0n) / 1_000_000,
      mrrUsd,
    };
  });

  const listQuery = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().optional(),
  });

  /**
   * GET /admin/stores — paginated list of stores with billing + cost
   * metrics. Designed for a tabular view in the admin console.
   */
  app.get('/admin/stores', async (req) => {
    const { limit, cursor } = listQuery.parse(req.query);

    const stores = await prisma.store.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        _count: { select: { tickets: true, users: true } },
      },
    });
    const hasMore = stores.length > limit;
    const page = hasMore ? stores.slice(0, limit) : stores;

    // Bulk-fetch AI cost + recent ticket activity for churn heuristic.
    const storeIds = page.map((s) => s.id);
    const [aiCosts, last30dTickets, last30dPriorTickets] = await Promise.all([
      prisma.aICallLog.groupBy({
        by: ['storeId'],
        where: { storeId: { in: storeIds } },
        _sum: { costMicroUsd: true },
      }),
      prisma.ticket.groupBy({
        by: ['storeId'],
        where: {
          storeId: { in: storeIds },
          createdAt: { gte: daysAgo(30) },
        },
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['storeId'],
        where: {
          storeId: { in: storeIds },
          createdAt: { gte: daysAgo(60), lt: daysAgo(30) },
        },
        _count: { _all: true },
      }),
    ]);
    const costMap = new Map(aiCosts.map((r) => [r.storeId, r._sum.costMicroUsd ?? 0n]));
    const recentMap = new Map(last30dTickets.map((r) => [r.storeId, r._count._all]));
    const priorMap = new Map(last30dPriorTickets.map((r) => [r.storeId, r._count._all]));

    const items = page.map((s) => {
      const recent = recentMap.get(s.id) ?? 0;
      const prior = priorMap.get(s.id) ?? 0;
      const churnRisk = computeChurnRisk({ recent, prior, sub: s.subscription });
      return {
        id: s.id,
        name: s.name,
        domain: s.domain,
        platform: s.platform,
        users: s._count.users,
        ticketsTotal: s._count.tickets,
        ticketsLast30d: recent,
        aiCostUsd: Number(costMap.get(s.id) ?? 0n) / 1_000_000,
        plan: s.subscription?.tier ?? 'NONE',
        status: s.subscription?.status ?? 'NONE',
        trialEndsAt: s.subscription?.trialEndsAt,
        churnRisk,
      };
    });
    return { items, nextCursor: hasMore ? page[page.length - 1]?.id : null };
  });

  /** GET /admin/stores/:id — drilldown view (ticket counts, AI cost, billing). */
  app.get('/admin/stores/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        subscription: true,
        users: { select: { id: true, email: true, role: true } },
        integrations: { select: { kind: true, status: true } },
      },
    });
    if (!store) throw new ForbiddenError('Store not found');

    const [aiCost, ticketCount, recent7d, recent30d] = await Promise.all([
      prisma.aICallLog.aggregate({ where: { storeId: id }, _sum: { costMicroUsd: true } }),
      prisma.ticket.count({ where: { storeId: id } }),
      prisma.ticket.count({ where: { storeId: id, createdAt: { gte: daysAgo(7) } } }),
      prisma.ticket.count({ where: { storeId: id, createdAt: { gte: daysAgo(30) } } }),
    ]);
    return {
      store,
      metrics: {
        aiCostUsd: Number(aiCost._sum.costMicroUsd ?? 0n) / 1_000_000,
        ticketCount,
        ticketsLast7d: recent7d,
        ticketsLast30d: recent30d,
      },
    };
  });
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Lightweight churn-risk heuristic. We classify into low/medium/high based
 * on three signals:
 *   1) Activity drop: recent 30d ticket count < 50% of the prior 30d.
 *   2) Subscription health: PAST_DUE → high; CANCELED → already gone.
 *   3) Trial expired without conversion → medium.
 */
function computeChurnRisk(input: {
  recent: number;
  prior: number;
  sub:
    | {
        status: string;
        trialEndsAt: Date | null;
        tier: SubscriptionTier;
      }
    | null;
}): 'low' | 'medium' | 'high' {
  if (!input.sub) return 'medium';
  if (input.sub.status === 'CANCELED') return 'high';
  if (input.sub.status === 'PAST_DUE') return 'high';
  const drop = input.prior > 10 && input.recent < input.prior * 0.5;
  if (drop) return 'high';
  if (input.sub.tier === 'FREE' && input.sub.trialEndsAt && input.sub.trialEndsAt < new Date()) {
    return 'medium';
  }
  return 'low';
}
