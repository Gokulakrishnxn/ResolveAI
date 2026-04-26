import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { AnalyticsCharts } from './_components/analytics-charts';
import { DateRangePicker } from './_components/date-range-picker';
import { ExportCsvButton } from './_components/export-csv-button';

export const dynamic = 'force-dynamic';

interface KpiResponse {
  range: { from: string; to: string };
  totals: { tickets: number; autoResolved: number; autoResolutionRate: number };
  latency: { avgFirstResponseMs: number | null };
  refunds: { count: number; totalAmountUsd: number };
  ai: { calls: number; costUsd: number };
  savings: { costSavedUsd: number; avgHumanHandleMinutes: number; hourlyCostUsd: number };
}

interface TimeseriesPoint {
  day: string;
  total: number;
  autoResolved: number;
}

interface IntentRow {
  intent: string;
  count: number;
}

function rangeFromSearchParams(sp: { from?: string; to?: string }): { from: string; to: string } {
  const to = sp.to ?? new Date().toISOString();
  const from =
    sp.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / (60 * 60_000)).toFixed(1)}h`;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  const range = rangeFromSearchParams(searchParams);
  const qs = new URLSearchParams(range).toString();

  let kpis: KpiResponse | null = null;
  let series: TimeseriesPoint[] = [];
  let intents: IntentRow[] = [];
  try {
    [kpis, series, intents] = await Promise.all([
      apiFetch<KpiResponse>(`/analytics/kpis?${qs}`, { storeId, userId }),
      apiFetch<TimeseriesPoint[]>(`/analytics/timeseries?${qs}`, { storeId, userId }),
      apiFetch<IntentRow[]>(`/analytics/by-intent?${qs}`, { storeId, userId }),
    ]);
  } catch {
    // swallow — show empty state
  }

  const stats = kpis
    ? [
        {
          label: 'Tickets',
          value: kpis.totals.tickets.toLocaleString(),
          hint: 'across all channels',
        },
        {
          label: 'Auto-resolved',
          value: `${(kpis.totals.autoResolutionRate * 100).toFixed(1)}%`,
          hint: `${kpis.totals.autoResolved.toLocaleString()} of ${kpis.totals.tickets.toLocaleString()}`,
        },
        {
          label: 'Avg. first response',
          value: formatMs(kpis.latency.avgFirstResponseMs),
          hint: 'creation → first reply',
        },
        {
          label: 'Refunded',
          value: formatUsd(kpis.refunds.totalAmountUsd),
          hint: `${kpis.refunds.count.toLocaleString()} refunds executed`,
        },
        {
          label: 'AI cost',
          value: formatUsd(kpis.ai.costUsd),
          hint: `${kpis.ai.calls.toLocaleString()} model calls`,
        },
        {
          label: 'Cost saved',
          value: formatUsd(kpis.savings.costSavedUsd),
          hint: `@ ${formatUsd(kpis.savings.hourlyCostUsd)}/hr · ${kpis.savings.avgHumanHandleMinutes}m saved/ticket`,
        },
      ]
    : [];

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Live metrics for your support pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker initialFrom={range.from} initialTo={range.to} />
          <ExportCsvButton from={range.from} to={range.to} />
        </div>
      </header>

      {kpis ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{stat.hint}</CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-8">
            <AnalyticsCharts series={series} intents={intents} />
          </section>
        </>
      ) : (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No analytics yet. Connect Shopify and email under{' '}
            <a className="ml-1 underline" href="/integrations">
              Integrations
            </a>
            .
          </CardContent>
        </Card>
      )}
    </div>
  );
}
