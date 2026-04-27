import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MinusCircle, PlusCircle } from 'lucide-react';
import { SectionHeader } from './features-grid';

type Pair = {
  metric: string;
  before: string;
  after: string;
  delta: string;
};

const PAIRS: ReadonlyArray<Pair> = [
  { metric: 'First response time', before: '14h', after: '6 min', delta: '-99%' },
  { metric: 'Refund cycle', before: '3 days', after: '1.5 hours', delta: '-95%' },
  { metric: 'CSAT score', before: '4.1', after: '4.7', delta: '+15%' },
  { metric: 'Support cost / ticket', before: '$1.10', after: '$0.18', delta: '-84%' },
];

export function CaseStudy(): JSX.Element {
  return (
    <section
      id="case-study"
      aria-labelledby="case-heading"
      className="relative scroll-mt-24 py-24 sm:py-28"
    >
      <div className="container-marketing">
        <SectionHeader
          eyebrow="Case Study · TrendCart"
          title={
            <>
              From 14-hour replies to 6 minutes.{' '}
              <span className="text-gradient-sky">Without hiring.</span>
            </>
          }
          description="A 40k-customers/month streetwear brand auto-resolved 71% of email tickets in their first week with ResolveAI."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Before / After table card */}
          <div className="surface-glass overflow-hidden p-0">
            <div className="grid grid-cols-3 border-b border-line text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
              <div className="px-6 py-4">Metric</div>
              <div className="border-l border-line px-6 py-4 text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <MinusCircle className="h-3 w-3 text-rose-400/80" />
                  Before
                </span>
              </div>
              <div className="border-l border-line px-6 py-4 text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <PlusCircle className="h-3 w-3 text-sky-400" />
                  After
                </span>
              </div>
            </div>
            {PAIRS.map((p, i) => (
              <div
                key={p.metric}
                className={`grid grid-cols-3 items-center text-sm ${
                  i !== PAIRS.length - 1 ? 'border-b border-line/60' : ''
                }`}
              >
                <div className="px-6 py-5 font-medium text-text-primary">{p.metric}</div>
                <div className="border-l border-line/60 px-6 py-5 text-text-tertiary line-through decoration-rose-400/40">
                  {p.before}
                </div>
                <div className="flex items-center justify-between gap-3 border-l border-line/60 px-6 py-5">
                  <span className="text-base font-semibold text-text-primary">{p.after}</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    {p.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quote / outcomes card */}
          <div className="surface-glass relative overflow-hidden p-7 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-sky-soft blur-2xl"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sky-400/90">
              Outcome · 90 days in
            </p>
            <p className="mt-5 text-[18px] leading-relaxed text-text-primary">
              &ldquo;We installed it on Tuesday. By Friday, 71% of email tickets were
              auto-resolved. I cancelled my Zendesk seat upgrade.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-sky text-canvas font-semibold">
                MP
              </span>
              <div>
                <p className="text-[13px] font-medium text-text-primary">Maya Patel</p>
                <p className="text-[12px] text-text-tertiary">Head of CX, TrendCart</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-line pt-6">
              <Mini stat="71%" label="auto-resolution rate" />
              <Mini stat="$28k" label="annual savings" />
              <Mini stat="0" label="new support hires" />
              <Mini stat="+0.6" label="CSAT lift" />
            </div>

            <Link
              href="/customers/trendcart"
              className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-sky-300 hover:text-sky-200"
            >
              Read the full story
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            See more customer stories
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Mini({ stat, label }: { stat: string; label: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-line bg-canvas-elevated/60 p-3">
      <p className="text-2xl font-semibold tracking-tight text-text-primary">{stat}</p>
      <p className="mt-0.5 text-[12px] text-text-tertiary">{label}</p>
    </div>
  );
}
