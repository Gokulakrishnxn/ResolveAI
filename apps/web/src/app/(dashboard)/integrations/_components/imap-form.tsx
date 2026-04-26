'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function ImapConnectForm(): JSX.Element {
  const router = useRouter();
  const [host, setHost] = useState('imap.gmail.com');
  const [port, setPort] = useState('993');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [mailbox, setMailbox] = useState('INBOX');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (): void => {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
      const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';
      const res = await fetch(`${API_URL}/integrations/email/imap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          host,
          port: Number.parseInt(port, 10),
          secure: true,
          user,
          password,
          mailbox,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(errBody?.error?.message ?? 'Failed to save IMAP credentials');
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
          <Label htmlFor="imap-host">Host</Label>
          <Input id="imap-host" value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="imap-port">Port</Label>
          <Input id="imap-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="imap-user">User</Label>
        <Input id="imap-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="support@acme.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="imap-password">Password / app password</Label>
        <Input
          id="imap-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="imap-mailbox">Mailbox</Label>
        <Input id="imap-mailbox" value={mailbox} onChange={(e) => setMailbox(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={isPending}>
        Save IMAP
      </Button>
      {ok ? <p className="text-sm text-emerald-600">Saved. Inbox listener will pick this up on next worker restart.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
