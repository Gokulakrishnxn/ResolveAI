'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CHANNELS = ['', 'EMAIL', 'CHAT', 'WHATSAPP', 'API', 'SHOPIFY_INBOX'];
const STATUSES = [
  '',
  'NEW',
  'IN_PROGRESS',
  'AWAITING_CUSTOMER',
  'AWAITING_HUMAN',
  'RESOLVED',
  'CLOSED',
];
const INTENTS = [
  '',
  'ORDER_STATUS',
  'REFUND',
  'REPLACEMENT',
  'WRONG_ITEM',
  'CHANGE_ADDRESS',
  'CANCEL_ORDER',
  'COMPLAINT',
  'PRODUCT_QUESTION',
  'OTHER',
];
const SEARCH_MODES: Array<{ value: string; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'semantic', label: 'Semantic' },
];

interface InboxFiltersProps {
  values: {
    channel?: string;
    status?: string;
    intent?: string;
    search?: string;
    searchMode?: string;
  };
}

const SELECT_CLASS =
  'h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ' +
  "bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999692' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")] bg-[length:12px_12px] bg-[right_0.6rem_center] bg-no-repeat";

const FIELD_LABEL_CLASS =
  'text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground';

export function InboxFilters({ values }: InboxFiltersProps): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(values.search ?? '');

  const update = useCallback(
    (next: Partial<InboxFiltersProps['values']>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === '') sp.delete(k);
        else sp.set(k, v);
      }
      startTransition(() => {
        router.push(`/inbox?${sp.toString()}`);
      });
    },
    [params, router],
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <div className="space-y-1.5">
        <Label htmlFor="filter-channel" className={FIELD_LABEL_CLASS}>
          Channel
        </Label>
        <select
          id="filter-channel"
          className={SELECT_CLASS}
          value={values.channel ?? ''}
          onChange={(e) => update({ channel: e.target.value })}
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c || 'All channels'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-status" className={FIELD_LABEL_CLASS}>
          Status
        </Label>
        <select
          id="filter-status"
          className={SELECT_CLASS}
          value={values.status ?? ''}
          onChange={(e) => update({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace('_', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-intent" className={FIELD_LABEL_CLASS}>
          Intent
        </Label>
        <select
          id="filter-intent"
          className={SELECT_CLASS}
          value={values.intent ?? ''}
          onChange={(e) => update({ intent: e.target.value })}
        >
          {INTENTS.map((i) => (
            <option key={i} value={i}>
              {i ? i.replace('_', ' ') : 'All intents'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="filter-search" className={FIELD_LABEL_CLASS}>
          Search
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              id="filter-search"
              placeholder="Order #, name, keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') update({ search });
              }}
              className="pl-8"
            />
          </div>
          <select
            aria-label="Search mode"
            className={SELECT_CLASS + ' w-[110px] flex-none'}
            value={values.searchMode ?? 'text'}
            onChange={(e) => update({ searchMode: e.target.value })}
          >
            {SEARCH_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {isPending ? (
          <p className="text-[11px] text-muted-foreground">Updating…</p>
        ) : null}
      </div>
    </div>
  );
}
