import Link from 'next/link';
import { ArrowRight, Bot, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { RoiCalculator } from './_components/roi-calculator';
import { Pricing } from './_components/pricing';
import { Faq } from './_components/faq';

export default function HomePage(): JSX.Element {
  return (
    <>
      <Hero />
      <SocialProof />
      <Problem />
      <Features />
      <CaseStudy />
      <RoiSection />
      <Pricing />
      <Testimonials />
      <Faq />
      <CtaBand />
    </>
  );
}

function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-violet-50 via-white to-white" />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" /> New: WhatsApp + auto-refunds
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              AI customer support that{' '}
              <span className="text-accent">pays for itself.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-600">
              ResolveAI auto-answers &quot;where is my order?&quot;, drafts refunds, and lets your
              team focus on the 5% of tickets that actually need a human. Built for Shopify and
              WooCommerce.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="https://app.resolveai.app/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accentHover"
              >
                Start 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#roi"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50"
              >
                See ROI in 30 seconds
              </Link>
            </div>
            <p className="mt-3 text-xs text-zinc-500">No credit card. 5-minute setup.</p>
          </div>
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview(): JSX.Element {
  return (
    <div className="relative">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl shadow-violet-100">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 text-xs font-medium text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-auto">Inbox · auto-resolved · 12s ago</span>
        </div>
        <div className="space-y-3 pt-4 text-sm">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs font-semibold text-zinc-500">Customer · Tina K.</p>
            <p className="mt-1 text-zinc-900">
              Hey! Where is my order #1234? Placed it 5 days ago and haven&apos;t heard
              anything.
            </p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
            <p className="text-xs font-semibold text-accent">ResolveAI · auto-resolved</p>
            <p className="mt-1 text-zinc-900">
              Hi Tina! Your order shipped yesterday with USPS — tracking{' '}
              <code>9405 5118 9956 0000</code>. Estimated arrival is Thursday. I&apos;ll keep
              an eye on it and let you know if anything changes.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              <span className="rounded bg-white px-1.5 py-0.5">intent: order_status</span>
              <span className="rounded bg-white px-1.5 py-0.5">confidence 0.94</span>
              <span className="rounded bg-white px-1.5 py-0.5">$0.0007</span>
              <span className="rounded bg-white px-1.5 py-0.5">2.1s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof(): JSX.Element {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          Trusted by fast-growing Shopify &amp; WooCommerce brands
        </p>
        <div className="mt-5 grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-3 text-sm font-medium text-zinc-400 sm:grid-cols-4 md:grid-cols-6">
          <span>TrendCart</span>
          <span>Lumina</span>
          <span>Northwind</span>
          <span>BloomCo</span>
          <span>RiverRun</span>
          <span>Atlas Goods</span>
        </div>
      </div>
    </section>
  );
}

function Problem(): JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" id="problem">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            70% of support tickets are the same 5 questions.
          </h2>
          <p className="mt-4 text-zinc-600">
            Order status. Refund requests. &quot;I got the wrong size.&quot; &quot;Where&apos;s
            my tracking?&quot; You hire support agents. They burn out copy-pasting. CSAT
            slides. And the actually-hard tickets sit in queue for 12+ hours.
          </p>
          <p className="mt-4 text-zinc-600">
            ResolveAI plugs into Shopify, your inbox, your chat widget, and WhatsApp — and
            quietly closes the easy 70% with policy-grounded AI replies. Your humans handle
            what matters.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stat title="70%" body="of e-commerce tickets are repeats — fully auto-resolvable." />
          <Stat title="$1.10" body="cost of a tier-1 ticket the human way (avg. ~6 min)." />
          <Stat title="$0.05" body="our overage rate. AI handles the same ticket in 2s." />
          <Stat title="6×" body="faster CSAT recovery on damage / wrong-item refunds." />
        </div>
      </div>
    </section>
  );
}

function Stat({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-3xl font-semibold tracking-tight text-accent">{title}</p>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
    </div>
  );
}

function Features(): JSX.Element {
  const features = [
    {
      icon: Bot,
      title: 'Auto-resolve order status',
      body:
        'Pulls live order, fulfillment, and tracking from Shopify. Drafts an empathetic reply with policy citations and ships it.',
    },
    {
      icon: ShieldCheck,
      title: 'Rules-based auto-refunds',
      body:
        'Auto-approve under $50 within 30 days. Photo required for damage. Fraud-flagged customers always escalate.',
    },
    {
      icon: Clock,
      title: '24/7 multi-channel',
      body:
        'Email + chat + WhatsApp + API. Same pipeline. p95 chat reply under 3 seconds, email under 30 seconds.',
    },
    {
      icon: Sparkles,
      title: 'Knowledge-grounded',
      body:
        'Upload your shipping & returns docs. Replies cite real policy snippets — no hallucinations on the merchant of record.',
    },
  ];
  return (
    <section className="bg-zinc-50 py-20" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built for the realities of running a store.
          </h2>
          <p className="mt-3 text-zinc-600">
            Not a chatbot. A complete resolution engine with audit trails, human approvals, and
            metered billing tied to outcomes.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-zinc-200 bg-white p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CaseStudy(): JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" id="case-study">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Case study · TrendCart
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          From 14h response time to 6 minutes — without hiring.
        </h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-zinc-600">
            <p>
              TrendCart sells streetwear to ~40k DTC customers a month. They were drowning in
              order-status emails after Black Friday, and CSAT had dropped from 4.8 to 4.1.
            </p>
            <p>
              They installed ResolveAI on a Tuesday. By Friday, 71% of email tickets were being
              auto-resolved with cited tracking info, and their support team was doing what
              support teams should do — calming down the angry ones and surfacing patterns to
              ops.
            </p>
            <p>
              90 days in: avg first response down from 14h to 6m. Refund cycle time down from 3
              days to 1.5 hours. CSAT climbed back to 4.7.
            </p>
            <Link
              href="/customers/trendcart"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent"
            >
              Read the full story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat title="71%" body="auto-resolution rate (email)" />
            <Stat title="14h → 6m" body="first response time" />
            <Stat title="3d → 1.5h" body="refund cycle time" />
            <Stat title="4.7" body="CSAT (up from 4.1)" />
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiSection(): JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" id="roi">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Calculate your ROI</h2>
          <p className="mt-3 text-zinc-600">
            Plug in your monthly tickets and rough cost per human handle. We&apos;ll tell you
            what ResolveAI saves at typical 70% auto-resolution.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-zinc-600">
            <li>• Pricing tier picked automatically.</li>
            <li>• Includes overage at $0.05/ticket past the included quota.</li>
            <li>• Conservative — assumes 70% auto-resolution, not 90%.</li>
          </ul>
        </div>
        <RoiCalculator />
      </div>
    </section>
  );
}

function Testimonials(): JSX.Element {
  const items = [
    {
      quote:
        '"We installed it on Tuesday, by Friday 71% of tickets were auto-resolved. I cancelled my Zendesk seat upgrade."',
      author: 'Maya P. — Head of CX, TrendCart',
    },
    {
      quote:
        '"The audit log is what sold our compliance team. Every refund has a signed reasoning chain."',
      author: 'Dario L. — COO, Lumina',
    },
    {
      quote:
        '"It quietly handles WhatsApp now. Customers don\'t even know they\'re talking to AI until I tell them."',
      author: 'Priya N. — Owner, BloomCo',
    },
  ];
  return (
    <section className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-semibold tracking-tight">What merchants say</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.author}
              className="rounded-lg border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700"
            >
              <blockquote>{t.quote}</blockquote>
              <figcaption className="mt-4 text-xs font-medium text-zinc-500">
                {t.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand(): JSX.Element {
  return (
    <section className="bg-ink py-16 text-white">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          See your first ticket auto-resolved in under 5 minutes.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-zinc-300">
          14-day free trial. No credit card. No legacy CRM rip-and-replace.
        </p>
        <Link
          href="https://app.resolveai.app/sign-up"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accentHover"
        >
          Start free trial <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
