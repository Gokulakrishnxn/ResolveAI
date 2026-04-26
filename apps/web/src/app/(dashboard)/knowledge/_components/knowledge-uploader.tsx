'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function callApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID;
  const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
  if (storeId) headers.set('x-store-id', storeId);
  if (userId) headers.set('x-user-id', userId);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function KnowledgeUploader(): JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, startSubmit] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  const submit = (): void => {
    if (!title.trim() || !body.trim()) {
      setLastResult('Title and body are required.');
      return;
    }
    startSubmit(async () => {
      try {
        const res = await callApi<{ id: string; chunks: number; tokens: number }>(
          `/knowledge/docs`,
          {
            method: 'POST',
            body: JSON.stringify({
              title,
              body,
              url: url || undefined,
              source: 'MANUAL',
            }),
          },
        );
        setLastResult(`Indexed ${res.chunks} chunks (${res.tokens} tokens).`);
        setTitle('');
        setBody('');
        setUrl('');
        router.refresh();
      } catch (err) {
        setLastResult(`Failed: ${(err as Error).message}`);
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="space-y-1">
        <Label htmlFor="kb-title">Title</Label>
        <Input
          id="kb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Shipping policy"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="kb-url">Source URL (optional)</Label>
        <Input
          id="kb-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://store.com/shipping"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="kb-body">Content</Label>
        <Textarea
          id="kb-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="Paste your policy, FAQ, or shipping details..."
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {lastResult ?? 'Documents are chunked into ~800 char windows.'}
        </p>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Indexing...' : 'Add document'}
        </Button>
      </div>
    </div>
  );
}
