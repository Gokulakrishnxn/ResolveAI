'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { TicketDetail } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  ticket: TicketDetail;
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
  const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-store-id', storeId);
  headers.set('x-user-id', userId);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

export function TicketActions({ ticket }: Props): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<string>(ticket.proposedAction?.draftReply ?? '');
  const [error, setError] = useState<string | null>(null);

  const refundAction = ticket.proposedAction;
  const refundEligibility = refundAction?.eligibility as
    | { decision?: string; recommendedAmount?: string; reasons?: { code: string; message: string }[] }
    | null
    | undefined;
  const refundAmount = (refundAction?.payload?.amount as string | undefined) ?? refundEligibility?.recommendedAmount;

  const sendReply = (closeTicket: boolean): void => {
    setError(null);
    startTransition(async () => {
      const res = await call(`/tickets/${ticket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: draft, closeTicket }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(errBody?.error?.message ?? 'Failed to send reply');
        return;
      }
      router.refresh();
    });
  };

  const escalate = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await call(`/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'AWAITING_HUMAN' }),
      });
      if (!res.ok) {
        setError('Failed to escalate');
        return;
      }
      router.refresh();
    });
  };

  const approveRefund = (): void => {
    if (!refundAction) return;
    setError(null);
    startTransition(async () => {
      const res = await call(`/actions/${refundAction.id}/approve-refund`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(errBody?.error?.message ?? 'Failed to approve refund');
        return;
      }
      router.refresh();
    });
  };

  const rejectRefund = (): void => {
    if (!refundAction) return;
    setError(null);
    startTransition(async () => {
      const res = await call(`/actions/${refundAction.id}/reject`, { method: 'POST' });
      if (!res.ok) {
        setError('Failed to reject');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {refundAction && refundAction.kind.startsWith('REFUND') ? (
        <div className="rounded-lg border bg-amber-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="warning">Refund proposed</Badge>
            {refundEligibility?.decision ? (
              <Badge variant={refundEligibility.decision === 'ELIGIBLE' ? 'success' : 'danger'}>
                {refundEligibility.decision}
              </Badge>
            ) : null}
            {refundAmount ? <span className="text-sm font-medium">${refundAmount}</span> : null}
          </div>
          {refundEligibility?.reasons?.length ? (
            <ul className="mb-3 list-disc pl-5 text-xs text-muted-foreground">
              {refundEligibility.reasons.map((r) => (
                <li key={r.code}>{r.message}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={isPending || refundAction.status !== 'PENDING_APPROVAL'}
              onClick={approveRefund}
            >
              Approve refund {refundAmount ? `$${refundAmount}` : ''}
            </Button>
            <Button size="sm" variant="outline" onClick={rejectRefund} disabled={isPending}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI draft</p>
          {ticket.intentConfidence !== null ? (
            <Badge variant="muted">{Math.round(ticket.intentConfidence * 100)}% confidence</Badge>
          ) : null}
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="No AI draft yet — write a reply to the customer..."
          rows={8}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => sendReply(false)} disabled={isPending || draft.trim().length === 0}>
            Send reply
          </Button>
          <Button variant="secondary" onClick={() => sendReply(true)} disabled={isPending || draft.trim().length === 0}>
            Send &amp; resolve
          </Button>
          <Button variant="outline" onClick={escalate} disabled={isPending}>
            Escalate to human
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
