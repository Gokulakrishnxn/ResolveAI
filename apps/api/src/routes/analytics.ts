import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';

/**
 * Analytics surface (Phase 2).
 *
 *   GET /analytics/kpis            → headline numbers for the dashboard.
 *   GET /analytics/timeseries      → daily ticket volume + auto-resolution counts.
 *   GET /analytics/by-intent       → ticket counts grouped by intent.
 *   GET /analytics/refunds         → $ refunded grouped by day.
 *   GET /analytics/export.csv      → flat CSV export of resolved tickets in range.
 *
 * All endpoints accept `from` and `to` ISO timestamps; defaults to the last
 * 30 days. The store scope comes from the auth plugin (`req.storeId`).
 */
const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const DEFAULT_RANGE_DAYS = 30;
const AVG_HUMAN_HANDLE_MINUTES = 6; // time saved per auto-resolved ticket
const HOURLY_COST_USD = 25;

function resolveRange(q: z.infer<typeof rangeSchema>): { from: Date; to: Date } {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from
    ? new Date(q.from)
    : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function registerAnalyticsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get('/analytics/kpis', async (req) => {
    const storeId = req.storeId!;
    const { from, to } = resolveRange(rangeSchema.parse(req.query));

    const [
      totalTickets,
      autoResolved,
      avgFirstResponseMs,
      refundsAgg,
      aiCostAgg,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { storeId, createdAt: { gte: from, lte: to } },
      }),
      prisma.ticket.count({
        where: {
          storeId,
          autoResolved: true,
          resolvedAt: { gte: from, lte: to },
        },
      }),
      prisma.$queryRaw<Array<{ avg_ms: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) * 1000)::float AS avg_ms
        FROM "Ticket"
        WHERE "storeId" = ${storeId}
          AND "firstResponseAt" IS NOT NULL
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
      `,
      prisma.$queryRaw<Array<{ count: bigint; total: number | null }>>`
        SELECT COUNT(*)::bigint AS count,
               COALESCE(SUM((("payload"->>'amount')::numeric)), 0)::float AS total
        FROM "Action"
        WHERE "storeId" = ${storeId}
          AND "kind" = 'REFUND'
          AND "status" = 'EXECUTED'
          AND "executedAt" >= ${from}
          AND "executedAt" <= ${to}
      `,
      prisma.aICallLog.aggregate({
        where: { storeId, createdAt: { gte: from, lte: to } },
        _sum: { costMicroUsd: true },
        _count: { _all: true },
      }),
    ]);

    const autoResolutionRate =
      totalTickets > 0 ? autoResolved / totalTickets : 0;
    const costSavedUsd =
      autoResolved * (AVG_HUMAN_HANDLE_MINUTES / 60) * HOURLY_COST_USD;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        tickets: totalTickets,
        autoResolved,
        autoResolutionRate,
      },
      latency: {
        avgFirstResponseMs: avgFirstResponseMs[0]?.avg_ms ?? null,
      },
      refunds: {
        count: Number(refundsAgg[0]?.count ?? 0),
        totalAmountUsd: Number(refundsAgg[0]?.total ?? 0),
      },
      ai: {
        calls: aiCostAgg._count._all,
        costUsd: Number(aiCostAgg._sum.costMicroUsd ?? 0n) / 1_000_000,
      },
      savings: {
        costSavedUsd,
        avgHumanHandleMinutes: AVG_HUMAN_HANDLE_MINUTES,
        hourlyCostUsd: HOURLY_COST_USD,
      },
    };
  });

  app.get('/analytics/timeseries', async (req) => {
    const storeId = req.storeId!;
    const { from, to } = resolveRange(rangeSchema.parse(req.query));

    const rows = await prisma.$queryRaw<
      Array<{ day: Date; total: bigint; auto_resolved: bigint }>
    >`
      SELECT
        date_trunc('day', "createdAt") AS day,
        COUNT(*)::bigint AS total,
        SUM(CASE WHEN "autoResolved" THEN 1 ELSE 0 END)::bigint AS auto_resolved
      FROM "Ticket"
      WHERE "storeId" = ${storeId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      total: Number(r.total),
      autoResolved: Number(r.auto_resolved),
    }));
  });

  app.get('/analytics/by-intent', async (req) => {
    const storeId = req.storeId!;
    const { from, to } = resolveRange(rangeSchema.parse(req.query));

    const rows = await prisma.ticket.groupBy({
      by: ['intent'],
      where: { storeId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ intent: r.intent ?? 'UNKNOWN', count: r._count._all }));
  });

  app.get('/analytics/refunds', async (req) => {
    const storeId = req.storeId!;
    const { from, to } = resolveRange(rangeSchema.parse(req.query));
    const rows = await prisma.$queryRaw<
      Array<{ day: Date; count: bigint; total: number | null }>
    >`
      SELECT
        date_trunc('day', "executedAt") AS day,
        COUNT(*)::bigint AS count,
        COALESCE(SUM((("payload"->>'amount')::numeric)), 0)::float AS total
      FROM "Action"
      WHERE "storeId" = ${storeId}
        AND "kind" = 'REFUND'
        AND "status" = 'EXECUTED'
        AND "executedAt" >= ${from}
        AND "executedAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
      totalUsd: Number(r.total ?? 0),
    }));
  });

  app.get('/analytics/export.csv', async (req, reply) => {
    const storeId = req.storeId!;
    const { from, to } = resolveRange(rangeSchema.parse(req.query));

    const tickets = await prisma.ticket.findMany({
      where: { storeId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        channel: true,
        intent: true,
        intentConfidence: true,
        status: true,
        autoResolved: true,
        firstResponseAt: true,
        resolvedAt: true,
        createdAt: true,
        customer: { select: { email: true } },
      },
      take: 10_000,
    });

    const header = [
      'ticket_id',
      'channel',
      'intent',
      'intent_confidence',
      'status',
      'auto_resolved',
      'customer_email',
      'created_at',
      'first_response_at',
      'resolved_at',
    ];
    const rows = tickets.map((t) =>
      [
        t.id,
        t.channel,
        t.intent ?? '',
        t.intentConfidence ?? '',
        t.status,
        t.autoResolved ? 'true' : 'false',
        t.customer?.email ?? '',
        t.createdAt.toISOString(),
        t.firstResponseAt?.toISOString() ?? '',
        t.resolvedAt?.toISOString() ?? '',
      ]
        .map(csvField)
        .join(','),
    );
    const body = [header.join(','), ...rows].join('\n');
    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="resolveai-tickets-${from.toISOString().slice(0, 10)}-${to
          .toISOString()
          .slice(0, 10)}.csv"`,
      );
    return body;
  });
}

function csvField(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
