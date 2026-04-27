import { Link2, ShieldCheck, Sparkles } from 'lucide-react';

const STEPS: ReadonlyArray<{
  icon: typeof Link2;
  step: string;
  title: string;
  body: string;
  chips: ReadonlyArray<string>;
}> = [
  {
    icon: Link2,
    step: '1',
    title: 'Connect your store',
    body:
      'Install the Shopify or WooCommerce app, point your inbox, drop the chat snippet. Five minutes, no engineer needed.',
    chips: ['Shopify', 'WooCommerce', 'Email · Chat · WhatsApp'],
  },
  {
    icon: Sparkles,
    step: '2',
    title: 'AI resolves the repetitive 70%',
    body:
      'Order status, tracking, refunds within rules — answered in under 10 seconds, in your brand voice, with policy citations.',
    chips: ['Sub-10s replies', 'Policy-grounded', 'Multi-channel'],
  },
  {
    icon: ShieldCheck,
    step: '3',
    title: 'Humans handle the edge cases',
    body:
      'Low-confidence tickets, fraud-flagged customers, and out-of-rule refunds are handed off cleanly with full context.',
    chips: ['Confidence gates', 'Fraud guards', 'Audit trail'],
  },
];

export function HowItWorks(): JSX.Element {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative scroll-mt-24 py-24 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px hairline-x"
      />
      <div className="container-marketing">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
            How it Works
          </p>
          <h2
            id="how-heading"
            className="mt-3 text-display-lg font-semibold text-text-primary"
          >
            Three steps from sign-up to your first auto-resolved{' '}
            <span className="text-gradient-sky">ticket</span>.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary sm:text-base">
            No CRM rip-and-replace. No ML team required. Live in five minutes,
            resolving tickets in ten.
          </p>
        </header>

        <ol className="relative mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {/* Connector line behind step circles */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[8%] right-[8%] top-[58px] hidden h-px lg:block"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(56,189,248,0.3) 12%, rgba(56,189,248,0.3) 88%, transparent)',
            }}
          />

          {STEPS.map((s, i) => (
            <li
              key={s.step}
              className="surface-glass group relative flex flex-col p-7 sm:p-8"
              style={{ animation: `fade-up 0.7s ${i * 80}ms cubic-bezier(0.21,0.61,0.35,1) both` }}
            >
              {/* Big numbered circle */}
              <div className="relative mb-2 flex items-center justify-between">
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full blur-md opacity-70"
                    style={{
                      background:
                        'radial-gradient(50% 50% at 50% 50%, rgba(56,189,248,0.55) 0%, transparent 70%)',
                    }}
                  />
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-sky text-canvas shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(56,189,248,0.6),0_0_0_4px_rgba(5,6,10,1)]">
                    <span className="text-[20px] font-semibold tracking-tight">
                      {s.step}
                    </span>
                  </div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.04] text-text-secondary">
                  <s.icon className="h-4 w-4" />
                </span>
              </div>

              <h3 className="mt-6 text-[18px] font-semibold tracking-tight text-text-primary">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                {s.body}
              </p>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {s.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-line bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-text-secondary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
