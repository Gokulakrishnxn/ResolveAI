import Link from 'next/link';
import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: 29,
    tickets: 500,
    description: 'Small Shopify stores. Email + chat included.',
    features: [
      '500 AI-resolved tickets / mo',
      'Email + chat',
      'Auto-resolve order status',
      'Human-approved refunds',
      '$0.05 / ticket overage',
    ],
    href: 'https://app.resolveai.app/sign-up?plan=starter',
  },
  {
    name: 'Growth',
    price: 99,
    tickets: 2_500,
    description: 'Most popular. Adds WhatsApp and rule-based auto-refunds.',
    features: [
      '2,500 AI-resolved tickets / mo',
      'WhatsApp Business channel',
      'Rules engine + auto-refunds',
      'Fraud / abuse guards',
      'Knowledge-base RAG',
    ],
    highlighted: true,
    href: 'https://app.resolveai.app/sign-up?plan=growth',
  },
  {
    name: 'Scale',
    price: 299,
    tickets: 10_000,
    description: 'High-volume merchants with custom rules + SLAs.',
    features: [
      '10,000 AI-resolved tickets / mo',
      'Multi-store management',
      'Priority support + 99.9% SLA',
      'OpenTelemetry export',
      'SAML SSO + SCIM',
    ],
    href: 'https://app.resolveai.app/sign-up?plan=scale',
  },
];

export function Pricing(): JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" id="pricing">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Simple, metered pricing</h2>
        <p className="mt-3 text-zinc-600">
          14-day free trial. Cancel any time. Overage is always $0.05 per ticket — no surprises.
        </p>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-xl border p-6 ${
              plan.highlighted
                ? 'border-accent shadow-xl shadow-violet-100'
                : 'border-zinc-200 bg-white'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold">${plan.price}</span>
              <span className="text-sm text-zinc-500">/ month</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Includes {plan.tickets.toLocaleString()} tickets
            </p>
            <p className="mt-4 text-sm text-zinc-600">{plan.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium ${
                plan.highlighted
                  ? 'bg-accent text-white hover:bg-accentHover'
                  : 'border border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Start free trial
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-zinc-500">
        Need higher volumes, custom SLAs, or on-prem hosting? <a className="underline" href="mailto:hello@resolveai.app">Talk to us</a>.
      </p>
    </section>
  );
}
