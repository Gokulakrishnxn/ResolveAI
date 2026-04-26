'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function ShopifyConnectForm({ currentShop }: { currentShop: string | null }): JSX.Element {
  const [shop, setShop] = useState<string>(currentShop ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connect = (): void => {
    setError(null);
    const trimmed = shop.trim().toLowerCase();
    if (!trimmed.endsWith('.myshopify.com')) {
      setError('Shop must look like example.myshopify.com');
      return;
    }
    startTransition(async () => {
      const url = new URL(`${API_URL}/shopify/install`);
      url.searchParams.set('shop', trimmed);
      window.location.href = url.toString();
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="shop">Shop domain</Label>
        <Input
          id="shop"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="acme.myshopify.com"
          autoComplete="off"
        />
      </div>
      <Button onClick={connect} disabled={isPending || shop.length === 0}>
        {currentShop ? 'Reinstall app' : 'Install on Shopify'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
