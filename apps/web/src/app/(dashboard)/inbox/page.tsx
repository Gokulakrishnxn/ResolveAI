import Link from 'next/link';
import { Inbox as InboxIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import type { TicketListItem } from '@/lib/types';
import { InboxFilters } from './_components/inbox-filters';
import { InboxRealtime } from './_components/inbox-realtime';

interface ListResponse {
  items: TicketListItem[];
  nextCursor: string | null;
  searchMode?: string;
}

const INTENT_TONE: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted' | 'outline'
> = {
  ORDER_STATUS: 'success',
  REFUND: 'warning',
  REPLACEMENT: 'warning',
  WRONG_ITEM: 'warning',
  COMPLAINT: 'danger',
  GENERAL: 'muted',
  OTHER: 'muted',
  UNKNOWN: 'muted',
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export const dynamic = 'force-dynamic';

interface InboxSearchParams {
  channel?: string;
  status?: string;
  intent?: string;
  search?: string;
  searchMode?: string;
}

function buildQuery(params: InboxSearchParams): string {
  const sp = new URLSearchParams();
  sp.set('limit', '50');
  if (params.channel) sp.set('channel', params.channel);
  if (params.status) sp.set('status', params.status);
  if (params.intent) sp.set('intent', params.intent);
  if (params.search) sp.set('search', params.search);
  if (params.searchMode) sp.set('searchMode', params.searchMode);
  return sp.toString();
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: InboxSearchParams;
}): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  const qs = buildQuery(searchParams);
  let data: ListResponse;
  try {
    data = await apiFetch<ListResponse>(`/tickets?${qs}`, { storeId, userId });
  } catch {
    data = { items: [], nextCursor: null };
  }

  return (
    <>
      <SiteHeader title="Inbox" />

      <PageHeader
        eyebrow="Conversations"
        title="Inbox"
        description="Customer conversations classified and drafted by ResolveAI."
        actions={<InboxRealtime />}
      />

      <div className="border-b border-border/60 bg-background/60 px-6 py-4 lg:px-10">
        <InboxFilters values={searchParams} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        {data.items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <InboxIcon className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No tickets yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Connect Shopify and email under{' '}
                <Link href="/integrations" className="text-foreground underline underline-offset-4">
                  Integrations
                </Link>{' '}
                to start auto-resolving customer conversations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
            {data.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/inbox/${t.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {t.customer?.email ?? 'Unknown sender'}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {t.channel}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {t.subject ?? '(no subject)'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <Badge variant={INTENT_TONE[t.intent] ?? 'outline'}>{t.intent}</Badge>
                    {t.intentConfidence !== null ? (
                      <Badge variant="muted">{Math.round(t.intentConfidence * 100)}%</Badge>
                    ) : null}
                    <Badge variant={t.status === 'AWAITING_HUMAN' ? 'warning' : 'muted'}>
                      {t.status.replace('_', ' ')}
                    </Badge>
                    <span className="w-16 text-right tabular-nums text-muted-foreground">
                      {formatRelative(t.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
