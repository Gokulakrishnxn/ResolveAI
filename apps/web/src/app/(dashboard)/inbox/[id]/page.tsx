import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, ApiError } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import type { TicketDetail } from '@/lib/types';
import { TicketActions } from '../_components/ticket-actions';

export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default async function TicketDetailPage({ params }: Params): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  let ticket: TicketDetail;
  try {
    ticket = await apiFetch<TicketDetail>(`/tickets/${params.id}`, { storeId, userId });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col overflow-y-auto border-r">
        <header className="border-b px-8 py-6">
          <Link href="/inbox" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Inbox
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{ticket.subject ?? '(no subject)'}</h1>
              <p className="text-sm text-muted-foreground">
                {ticket.customer?.email ?? 'Unknown customer'} · {ticket.channel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ticket.intent}</Badge>
              <Badge variant={ticket.status === 'AWAITING_HUMAN' ? 'warning' : 'muted'}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge variant={ticket.urgency === 'HIGH' ? 'danger' : ticket.urgency === 'MEDIUM' ? 'warning' : 'muted'}>
                {ticket.urgency}
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-8 py-6">
          {ticket.messages.map((m) => (
            <Card key={m.id} className={m.role === 'CUSTOMER' ? '' : 'bg-accent/30'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {m.role}
                    {m.authorEmail ? <span className="ml-2 text-xs text-muted-foreground">{m.authorEmail}</span> : null}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{fmt(m.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-6 overflow-y-auto bg-muted/30 px-6 py-6">
        {ticket.order ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order #{ticket.order.externalNumber ?? ticket.order.externalId}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>Status: {ticket.order.status}</p>
              <p>
                Total: {ticket.order.totalPrice} {ticket.order.currency}
              </p>
              {ticket.order.trackingNumber ? (
                <p>
                  Tracking:{' '}
                  {ticket.order.trackingUrl ? (
                    <a className="underline" href={ticket.order.trackingUrl} target="_blank" rel="noreferrer">
                      {ticket.order.trackingNumber}
                    </a>
                  ) : (
                    ticket.order.trackingNumber
                  )}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <TicketActions ticket={ticket} />
      </aside>
    </div>
  );
}
