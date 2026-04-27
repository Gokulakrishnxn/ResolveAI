'use client';

import { useState, useTransition } from 'react';
import { ArrowUpRight, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  const usageTone =
    usagePct >= 100 ? 'bg-rose-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Current plan */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Current plan</CardTitle>
              <CardDescription>
                {subscription
                  ? 'Your active ResolveAI subscription and quota.'
                  : 'No subscription yet — start your 14-day trial below, no card required.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {subscription ? (
                <>
                  <Badge variant="outline" className="h-6 px-2 capitalize">
                    {subscription.status.toLowerCase()}
                  </Badge>
                  <Badge variant="secondary" className="h-6 px-2">
                    {subscription.tier}
                  </Badge>
                </>
              ) : null}
              {subscription?.stripeCustomerId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={openPortal}
                >
                  Manage in Stripe
                  <ExternalLink className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {subscription ? (
          <CardContent className="space-y-6 pt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Tickets this period"
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

            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground">Usage</span>
                <span className="tabular-nums text-muted-foreground">
                  {usagePct}% of included quota
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full transition-all', usageTone)}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
              <p className="text-sm font-medium text-foreground">Plan limit behaviour</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Hard</strong> blocks ticket processing past
                the included quota until the next period.{' '}
                <strong className="text-foreground">Soft</strong> keeps processing and bills
                overage at $0.05/ticket.
              </p>
              <div className="mt-3 inline-flex items-center rounded-md border border-border/70 bg-background p-0.5 text-xs">
                {(['SOFT', 'HARD'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => flipEnforcement(v)}
                    disabled={pending}
                    className={cn(
                      'rounded-[5px] px-3 py-1 font-medium transition-colors',
                      enforcement === v
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* Plans */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Plans</h2>
            <p className="text-sm text-muted-foreground">
              Pay only for the volume you use. {plans.trialDays}-day free trial on every plan.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.plans.map((plan) => {
            const current = subscription?.tier === plan.tier;
            const featured = plan.tier === 'GROWTH';
            return (
              <Card
                key={plan.tier}
                className={cn(
                  'relative transition-colors',
                  featured && 'border-foreground/40 ring-1 ring-foreground/10',
                )}
              >
                {featured ? (
                  <div className="absolute right-4 top-4">
                    <Badge variant="default" className="gap-1">
                      <Sparkles className="size-3" />
                      Most popular
                    </Badge>
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      ${plan.priceMonthlyUsd}
                    </span>
                    <span className="text-xs text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes {plan.includedTickets.toLocaleString()} tickets/mo
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-foreground/85">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground/70" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    disabled={pending || current}
                    onClick={() => startCheckout(plan.tier)}
                    variant={featured ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {current ? 'Current plan' : 'Choose plan'}
                    {!current ? <ArrowUpRight className="size-4" /> : null}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
