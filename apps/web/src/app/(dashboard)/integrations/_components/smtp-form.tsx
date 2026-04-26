'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function SmtpConnectForm(): JSX.Element {
  const router = useRouter();
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState('465');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [from, setFrom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (): void => {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
      const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';
      const res = await fetch(`${API_URL}/integrations/email/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          host,
          port: Number.parseInt(port, 10),
          secure: Number.parseInt(port, 10) === 465,
          user,
          password,
          from: from || `${user}`,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(errBody?.error?.message ?? 'Failed to save SMTP credentials');
        return;
      }
      setOk(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="smtp-host">Host</Label>
          <Input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="smtp-port">Port</Label>
          <Input id="smtp-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="smtp-user">User</Label>
        <Input id="smtp-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="support@acme.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="smtp-password">Password / app password</Label>
        <Input
          id="smtp-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="smtp-from">From header (optional)</Label>
        <Input
          id="smtp-from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder='"Acme Support" <support@acme.com>'
        />
      </div>
      <Button onClick={submit} disabled={isPending}>
        Save SMTP
      </Button>
      {ok ? <p className="text-sm text-emerald-600">Saved. Outbound replies are now live.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
