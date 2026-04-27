import Link from 'next/link';
import { ArrowRight, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import { ROUTES } from './theme';

const METRICS: ReadonlyArray<{
  icon: typeof Clock;
  value: string;
  label: string;
}> = [
  {
    icon: Users,
    value: '67%',
    label: 'Tickets auto-resolved',
  },
  {
    icon: Clock,
    value: '<10s',
    label: 'Median first reply',
  },
  {
    icon: DollarSign,
    value: '$1,000+',
    label: 'Saved per month',
  },
];

/**
 * "Unlock the power of your support data" strip.
 *
 * Headline left, primary CTA right (mirrors reference). Below: a row of three
 * horizontal pill-shaped stat cards — circular sky-gradient icon tile + big
 * value + caption. Inverts the reference's white pills onto the dark canvas.
 */
export function MetricsStrip(): JSX.Element {
  return (
    <section
      aria-labelledby="metrics-heading"
      className="relative py-20 sm:py-24"
    >
      <div className="container-marketing">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <h2
            id="metrics-heading"
            className="max-w-2xl text-display-lg font-semibold text-text-primary"
          >
            Unlock the power of your{' '}
            <span className="text-gradient-sky">support data</span>.
          </h2>
          <Link
            href={ROUTES.signUp}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-gradient-sky px-5 py-2.5 text-[13px] font-medium text-canvas shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_14px_40px_-12px_rgba(56,189,248,0.55)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow sm:self-auto"
          >
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {METRICS.map((m, i) => (
            <article
              key={m.label}
              className="surface-glass group flex items-center gap-4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover sm:p-6"
              style={{ animation: `fade-up 0.7s ${i * 80}ms cubic-bezier(0.21,0.61,0.35,1) both` }}
            >
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full blur-md opacity-70"
                  style={{
                    background:
                      'radial-gradient(50% 50% at 50% 50%, rgba(56,189,248,0.55) 0%, transparent 70%)',
                  }}
                />
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-sky text-canvas shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(56,189,248,0.6)]">
                  <m.icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="text-[28px] font-semibold tracking-tightest text-text-primary sm:text-[32px]">
                    {m.value}
                  </span>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300">
                    <TrendingUp className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                    live
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">{m.label}</p>
              </div>

              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
                {String(i + 1).padStart(2, '0')}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
