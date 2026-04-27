'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROUTES } from './theme';
import { SectionHeader } from './features-grid';

type Plan = {
  name: string;
  monthly: number;
  yearly: number; // per month, billed annually
  tickets: number;
  description: string;
  features: ReadonlyArray<string>;
  highlighted?: boolean;
  href: string;
};

const PLANS: ReadonlyArray<Plan> = [
  {
    name: 'Starter',
    monthly: 29,
    yearly: 24,
    tickets: 500,
    description: 'For small Shopify stores. Email + chat included.',
    features: [
      '500 AI-resolved tickets / mo',
      'Email + website chat',
      'Auto-resolve order status',
      'Human-approved refunds',
      '$0.05 / ticket overage',
    ],
    href: `${ROUTES.signUp}?plan=starter`,
  },
  {
    name: 'Growth',
    monthly: 99,
    yearly: 79,
    tickets: 2_500,
    description: 'Most popular. Adds WhatsApp and rule-based auto-refunds.',
    features: [
      '2,500 AI-resolved tickets / mo',
      'WhatsApp Business channel',
      'Rules engine + auto-refunds',
      'Fraud / abuse guards',
      'Knowledge-base RAG',
      'Slack + Discord alerts',
    ],
    highlighted: true,
    href: `${ROUTES.signUp}?plan=growth`,
  },
  {
    name: 'Scale',
    monthly: 299,
    yearly: 239,
    tickets: 10_000,
    description: 'High-volume merchants with custom rules and SLAs.',
    features: [
      '10,000 AI-resolved tickets / mo',
      'Multi-store management',
      'Priority support · 99.9% SLA',
      'OpenTelemetry export',
      'SAML SSO + SCIM',
      'Dedicated success manager',
    ],
    href: `${ROUTES.signUp}?plan=scale`,
  },
];

type Cycle = 'monthly' | 'yearly';

export function Pricing(): JSX.Element {
  const [cycle, setCycle] = useState<Cycle>('yearly');

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative scroll-mt-24 py-24 sm:py-28"
    >
      <div className="container-marketing">
        <SectionHeader
          eyebrow="Pricing"
          title={
            <>
              Pricing tied to outcomes,{' '}
              <span className="text-gradient-sky">not seats.</span>
            </>
          }
          description="14-day free trial. Cancel any time. Overage is always $0.05 per ticket — no surprises, no rate-card games."
        />

        <BillingToggle value={cycle} onChange={setCycle} />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} cycle={cycle} delayMs={i * 60} />
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-text-tertiary">
          Need higher volumes, custom SLAs, or on-prem hosting?{' '}
          <Link
            href={ROUTES.contact}
            className="font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
          >
            Talk to us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: Cycle;
  onChange: (next: Cycle) => void;
}): JSX.Element {
  return (
    <div className="mt-9 flex items-center justify-center">
      <div
        role="tablist"
        aria-label="Billing cycle"
        className="relative inline-flex items-center rounded-full border border-line bg-white/[0.04] p-1 backdrop-blur-xl"
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-sky shadow-glow transition-transform duration-300 ease-out',
            value === 'yearly' ? 'translate-x-full' : 'translate-x-0',
          )}
        />
        {(['monthly', 'yearly'] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={value === c}
            onClick={() => onChange(c)}
            className={cn(
              'relative z-10 inline-flex h-9 items-center gap-2 rounded-full px-5 text-[13px] font-medium transition-colors',
              value === c
                ? 'text-canvas'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <span className="capitalize">{c}</span>
            {c === 'yearly' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
                  value === 'yearly'
                    ? 'bg-canvas/30 text-canvas'
                    : 'bg-sky-400/15 text-sky-300',
                )}
              >
                –20%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  cycle,
  delayMs,
}: {
  plan: Plan;
  cycle: Cycle;
  delayMs: number;
}): JSX.Element {
  const price = cycle === 'monthly' ? plan.monthly : plan.yearly;
  return (
    <article
      className={cn(
        'group relative isolate flex flex-col overflow-hidden rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5',
        plan.highlighted
          ? 'border border-sky-400/40 bg-canvas-raised/80 shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_30px_80px_-20px_rgba(56,189,248,0.4)]'
          : 'surface-glass hover:border-line-strong hover:shadow-card-hover',
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {plan.highlighted && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
            style={{
              background:
                'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, transparent 70%)',
            }}
          />
          <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-gradient-sky px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-canvas">
            Most popular
          </span>
        </>
      )}

      <h3 className="text-[15px] font-medium text-text-secondary">{plan.name}</h3>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[44px] font-semibold tracking-tightest text-text-primary">
          ${price}
        </span>
        <span className="text-[13px] text-text-tertiary">/ month</span>
      </div>
      <p className="mt-1 text-[12px] text-text-tertiary">
        {cycle === 'yearly' ? 'Billed annually · ' : ''}
        Includes {plan.tickets.toLocaleString()} tickets
      </p>
      <p className="mt-5 text-[14px] text-text-secondary">{plan.description}</p>

      <ul className="mt-6 space-y-3 text-[14px] text-text-primary">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sky-400/15 text-sky-300">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span className="text-text-secondary">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={cn(
          'mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[13px] font-medium transition-all duration-200 hover:-translate-y-0.5',
          plan.highlighted
            ? 'bg-gradient-sky text-canvas shadow-glow hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_20px_60px_-12px_rgba(56,189,248,0.7)]'
            : 'border border-line bg-white/[0.03] text-text-primary hover:border-line-strong hover:bg-white/[0.07]',
        )}
      >
        Start free trial
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
