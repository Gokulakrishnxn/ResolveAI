import {
  CheckCircle2,
  Clock,
  CreditCard,
  Inbox as InboxIcon,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { PageHeader } from '@/components/page-header';
import { SectionCards, type SectionCardItem } from '@/components/section-cards';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const from = sp.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / (60 * 60_000)).toFixed(1)}h`;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
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
    // Empty state — backend down or store unconfigured.
  }

  const cards: SectionCardItem[] = kpis
    ? [
        {
          label: 'Tickets',
          value: kpis.totals.tickets.toLocaleString(),
          hint: 'across all channels',
          footerLine: 'Email + chat + WhatsApp',
          Icon: InboxIcon,
        },
        {
          label: 'Auto-resolution rate',
          value: `${(kpis.totals.autoResolutionRate * 100).toFixed(1)}%`,
          hint: `${kpis.totals.autoResolved.toLocaleString()} of ${kpis.totals.tickets.toLocaleString()} resolved by AI`,
          delta: {
            pct: kpis.totals.autoResolutionRate * 100,
            trend: kpis.totals.autoResolutionRate >= 0.6 ? 'up' : 'down',
          },
          footerLine: 'Hands-off resolutions',
          Icon: Sparkles,
        },
        {
          label: 'Avg. first response',
          value: formatMs(kpis.latency.avgFirstResponseMs),
          hint: 'creation → first reply',
          footerLine: 'Time to first touch',
          Icon: Clock,
        },
        {
          label: 'Refunded',
          value: formatUsd(kpis.refunds.totalAmountUsd),
          hint: `${kpis.refunds.count.toLocaleString()} refunds executed`,
          footerLine: 'Through Shopify',
          Icon: CreditCard,
        },
        {
          label: 'AI cost',
          value: formatUsd(kpis.ai.costUsd),
          hint: `${kpis.ai.calls.toLocaleString()} model calls`,
          footerLine: 'OpenAI usage',
          Icon: Wallet,
        },
        {
          label: 'Cost saved',
          value: formatUsd(kpis.savings.costSavedUsd),
          hint: `${formatUsd(kpis.savings.hourlyCostUsd)}/hr · ${kpis.savings.avgHumanHandleMinutes}m saved/ticket`,
          footerLine: 'Vs. human handling',
          Icon: CheckCircle2,
        },
      ]
    : [];

  return (
    <>
      <SiteHeader title="Overview" />

      <PageHeader
        eyebrow="Live metrics"
        title="Support pipeline"
        description="Auto-resolution, response times and AI spend across email, chat and WhatsApp."
        actions={
          <>
            <DateRangePicker initialFrom={range.from} initialTo={range.to} />
            <ExportCsvButton from={range.from} to={range.to} />
          </>
        }
      />

      <div className="@container/main flex flex-1 flex-col">
        {kpis ? (
          <div className="flex flex-col gap-6 px-6 py-6 lg:px-10 lg:py-8">
            <SectionCards items={cards} />
            <ChartAreaInteractive data={series} />
            <AnalyticsCharts intents={intents} />
          </div>
        ) : (
          <div className="px-6 py-10 lg:px-10">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No analytics yet</p>
                  <p className="text-sm text-muted-foreground">
                    Connect Shopify and email to start auto-resolving tickets.
                  </p>
                </div>
                <Button asChild size="sm" className="mt-2">
                  <a href="/integrations">Go to Integrations</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
