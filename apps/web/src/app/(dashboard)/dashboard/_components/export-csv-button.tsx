'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function ExportCsvButton({ from, to }: { from: string; to: string }): JSX.Element {
  const onClick = async (): Promise<void> => {
    const headers = new Headers();
    const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID;
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    if (storeId) headers.set('x-store-id', storeId);
    if (userId) headers.set('x-user-id', userId);

    const res = await fetch(
      `${API_URL}/analytics/export.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers },
    );
    if (!res.ok) {
      alert(`Export failed: ${res.status}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolveai-tickets-${from.slice(0, 10)}_${to.slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" size="default" onClick={onClick} className="h-9">
      <Download />
      Export CSV
    </Button>
  );
}
