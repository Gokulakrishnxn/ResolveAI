'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  initialFrom: string;
  initialTo: string;
}

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export function DateRangePicker({ initialFrom, initialTo }: Props): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(toInputDate(initialFrom));
  const [to, setTo] = useState(toInputDate(initialTo));

  const apply = (): void => {
    const sp = new URLSearchParams(params.toString());
    sp.set('from', new Date(from).toISOString());
    sp.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
    startTransition(() => router.push(`/dashboard?${sp.toString()}`));
  };

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label className="text-xs" htmlFor="range-from">
          From
        </Label>
        <Input
          id="range-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="range-to">
          To
        </Label>
        <Input id="range-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={isPending}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {isPending ? 'Loading...' : 'Apply'}
      </button>
    </div>
  );
}
