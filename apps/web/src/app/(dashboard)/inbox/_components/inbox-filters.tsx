'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
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
      <div className="space-y-1">
        <Label htmlFor="filter-channel">Channel</Label>
        <select
          id="filter-channel"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
      <div className="space-y-1">
        <Label htmlFor="filter-status">Status</Label>
        <select
          id="filter-status"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
      <div className="space-y-1">
        <Label htmlFor="filter-intent">Intent</Label>
        <select
          id="filter-intent"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="filter-search">Search</Label>
        <div className="flex gap-2">
          <Input
            id="filter-search"
            placeholder="Order #, name, keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') update({ search });
            }}
          />
          <select
            aria-label="Search mode"
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
        {isPending && <p className="text-xs text-muted-foreground">Updating...</p>}
      </div>
    </div>
  );
}
