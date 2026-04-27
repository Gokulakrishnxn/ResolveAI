import {
  BookLock,
  GitBranch,
  MessageSquareText,
  PackageSearch,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';

type Feature = {
  icon: typeof PackageSearch;
  title: string;
  body: string;
  span?: 'wide';
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: PackageSearch,
    title: 'Order Status Automation',
    body:
      'Pulls live tracking from Shopify, WooCommerce, and your 3PL. Drafts an empathetic reply with a citation and ships it in seconds.',
    span: 'wide',
  },
  {
    icon: ShieldCheck,
    title: 'Refund & Replacement Automation',
    body:
      'Rules-based auto-approve under your thresholds. Photo required for damage. Every action signed and logged.',
  },
  {
    icon: ScanLine,
    title: 'Smart Intent Detection',
    body:
      'gpt-4o-mini classifies intent, urgency, and sentiment. Only high-confidence resolutions go automated.',
  },
  {
    icon: MessageSquareText,
    title: 'Multi-Channel Support',
    body:
      'Email, website chat, WhatsApp, and API. One pipeline, one inbox, one billing meter.',
  },
  {
    icon: GitBranch,
    title: 'Human Escalation Controls',
    body:
      'Confidence thresholds, fraud guards, and per-store policies. Hand off cleanly with full context.',
  },
  {
    icon: BookLock,
    title: 'Audit Logs + Safety Rules',
    body:
      'SOC2-style hash-chained audit log. Tamper-evident reasoning chain on every resolution and refund.',
  },
];

export function FeaturesGrid(): JSX.Element {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative scroll-mt-24 py-24 sm:py-28"
    >
      <div className="container-marketing">
        <SectionHeader
          eyebrow="Features"
          title={
            <>
              Everything support agents copy-paste,
              <br className="hidden sm:block" /> automated and audit-trailed.
            </>
          }
          description="Not a chatbot. A complete resolution engine with policy grounding, human approvals, and metered billing tied to outcomes."
        />

        <div className="mt-16 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delayMs={i * 50} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  delayMs,
}: {
  feature: Feature;
  delayMs: number;
}): JSX.Element {
  const wide = feature.span === 'wide';
  return (
    <article
      className={`group surface-glass relative isolate overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover sm:p-7 ${
        wide ? 'lg:col-span-2' : ''
      }`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-sky opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 -z-10 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-sky-soft opacity-50 blur-2xl"
      />
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.04] text-sky-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <feature.icon className="h-4.5 w-4.5" />
      </span>
      <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-text-primary">
        {feature.title}
      </h3>
      <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-text-secondary">
        {feature.body}
      </p>
    </article>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'center' | 'left';
}): JSX.Element {
  return (
    <header
      className={`mx-auto max-w-2xl ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-display-lg font-semibold text-text-primary">{title}</h2>
      {description && (
        <p className="mt-4 text-[15px] leading-relaxed text-text-secondary sm:text-base">
          {description}
        </p>
      )}
    </header>
  );
}
