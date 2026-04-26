'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Subscription {
  tier: string;
  status: string;
  enforcement: 'HARD' | 'SOFT';
  includedTickets: number;
  ticketsUsedCurrentPeriod: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

interface PlansResponse {
  plans: Array<{
    tier: 'STARTER' | 'GROWTH' | 'SCALE';
    name: string;
    description: string;
    priceMonthlyUsd: number;
    includedTickets: number;
    features: string[];
    priceId: string | null;
  }>;
  trialDays: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const STORE_ID = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
const USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';

async function callApi<T>(
  path: string,
  init: RequestInit & { body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': STORE_ID,
      'x-user-id': USER_ID,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function BillingPanel({
  subscription,
  plans,
}: {
  subscription: Subscription | null;
  plans: PlansResponse;
}): JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enforcement, setEnforcement] = useState<'HARD' | 'SOFT'>(
    subscription?.enforcement ?? 'SOFT',
  );

  function startCheckout(tier: 'STARTER' | 'GROWTH' | 'SCALE'): void {
    setError(null);
    startTransition(async () => {
      try {
        const res = await callApi<{ url: string }>('/billing/checkout', {
          method: 'POST',
          body: { tier },
        });
        window.location.href = res.url;
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function openPortal(): void {
    setError(null);
    startTransition(async () => {
      try {
        const res = await callApi<{ url: string }>('/billing/portal', { method: 'POST' });
        window.location.href = res.url;
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function flipEnforcement(value: 'HARD' | 'SOFT'): void {
    setError(null);
    setEnforcement(value);
    startTransition(async () => {
      try {
        await callApi('/billing/enforcement', {
          method: 'PATCH',
          body: { enforcement: value },
        });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const used = subscription?.ticketsUsedCurrentPeriod ?? 0;
  const included = subscription?.includedTickets ?? 0;
  const usagePct = included ? Math.min(100, Math.round((used / included) * 100)) : 0;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Current plan</h2>
            <p className="text-sm text-muted-foreground">
              {subscription
                ? `${subscription.tier} — ${subscription.status}`
                : 'No subscription yet — start a trial below.'}
            </p>
          </div>
          {subscription?.stripeCustomerId && (
            <button
              type="button"
              onClick={openPortal}
              disabled={pending}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Manage in Stripe
            </button>
          )}
        </div>
        {subscription && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Tickets used this period"
              value={`${used.toLocaleString()} / ${included.toLocaleString()}`}
            />
            <Stat
              label="Trial ends"
              value={subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : '—'}
            />
            <Stat
              label="Renews"
              value={
                subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'
              }
            />
          </div>
        )}
        {subscription && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{usagePct}% of included quota used</p>
          </div>
        )}
        {subscription && (
          <div className="mt-6 rounded-md border bg-muted/40 p-4">
            <p className="text-sm font-medium">Plan limit behaviour</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <strong>Hard</strong> blocks ticket processing past the included quota until the
              next billing period. <strong>Soft</strong> keeps processing and bills overage at
              $0.05/ticket.
            </p>
            <div className="mt-3 inline-flex rounded-md border bg-background p-1 text-xs">
              {(['SOFT', 'HARD'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => flipEnforcement(v)}
                  disabled={pending}
                  className={`rounded px-3 py-1 font-medium ${
                    enforcement === v ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.plans.map((plan) => (
            <div key={plan.tier} className="rounded-lg border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <span className="text-2xl font-bold">${plan.priceMonthlyUsd}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">/month</p>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-4 space-y-1 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={pending}
                onClick={() => startCheckout(plan.tier)}
                className="mt-5 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {subscription?.tier === plan.tier ? 'Current plan' : 'Choose plan'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
