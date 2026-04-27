'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
      <div className="space-y-1">
        <Label htmlFor="range-from" className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          From
        </Label>
        <Input
          id="range-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="range-to" className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          To
        </Label>
        <Input
          id="range-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
      <Button
        type="button"
        onClick={apply}
        disabled={isPending}
        size="default"
        className="h-9"
      >
        {isPending ? 'Loading…' : 'Apply'}
      </Button>
    </div>
  );
}
