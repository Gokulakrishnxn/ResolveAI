import Link from 'next/link';
import { ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { HeroCardComposition } from './dashboard-mock';
import { ROUTES } from './theme';

/**
 * Centered, panel-driven hero modeled after the reference layout —
 * inverted to the dark canvas + sky-blue brand identity.
 *
 *   [Eyebrow chip]
 *   [Centered display headline ending in a colored phrase]
 *   [Centered subheadline]
 *   [Pill CTA · "Start Free Trial — It's Free"]
 *   [Fanned 3-card dashboard composition spilling out of the panel]
 *   [Trust badges row]
 */
export function Hero(): JSX.Element {
  return (
    <section
      className="relative isolate overflow-hidden pt-12 sm:pt-16 lg:pt-20"
      aria-labelledby="hero-heading"
    >
      <FullBleedBackdrop />

      <div className="container-marketing">
        {/* Hero panel */}
        <div className="relative">
          <PanelBackdrop />

          <div className="relative pb-44 pt-16 text-center sm:pb-56 sm:pt-20 lg:pb-64 lg:pt-24">
            <div className="animate-fade-up">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-canvas/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary backdrop-blur">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-sky text-canvas">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
                Now resolving 67% of e-commerce tickets — without humans.
              </div>

              <h1
                id="hero-heading"
                className="mx-auto mt-7 max-w-4xl text-display-2xl font-semibold text-text-primary"
              >
                Cut support cost in half.{' '}
                <span className="block sm:inline">
                  <span className="text-gradient-sky">
                    Reply in seconds, not days.
                  </span>
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
                ResolveAI auto-resolves order-status questions, drafts
                policy-grounded refunds, and escalates only the tickets a human
                should actually touch — across email, chat, and WhatsApp.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <PrimaryCta href={ROUTES.signUp}>
                  Start Free Trial — It&apos;s Free
                </PrimaryCta>
                <SecondaryCta href={ROUTES.bookDemo}>Book Demo</SecondaryCta>
              </div>
              <p className="mt-3 text-[13px] text-text-tertiary">
                14-day free trial. No credit card. 5-minute setup.
              </p>
            </div>
          </div>

          {/* Fanned card composition — pinned to bottom of panel, spills below */}
          <div className="absolute inset-x-0 bottom-0 translate-y-[55%] sm:translate-y-[42%] lg:translate-y-[35%]">
            <div className="px-4 sm:px-8 lg:px-12">
              <HeroCardComposition />
            </div>
          </div>
        </div>

        {/* Spacer for the cards that overflow the panel */}
        <div className="h-[260px] sm:h-[300px] lg:h-[340px]" aria-hidden />

        <TrustBadges />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Backdrops                                                                   */
/* -------------------------------------------------------------------------- */

function FullBleedBackdrop(): JSX.Element {
  return (
    <>
      {/* Top sky beam glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)',
        }}
      />
      {/* Top hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(56,189,248,0.4) 50%, transparent)',
        }}
      />
      {/* Faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(ellipse 60% 50% at 50% 20%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 50% at 50% 20%, black 30%, transparent 80%)',
        }}
      />
    </>
  );
}

function PanelBackdrop(): JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem] border border-line bg-canvas-raised/60 backdrop-blur-xl sm:rounded-[2.5rem]"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.02) 30%, transparent 60%)',
        }}
      >
        {/* Inner radial halo */}
        <div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 0%, rgba(56,189,248,0.22) 0%, rgba(59,130,246,0.10) 35%, transparent 70%)',
          }}
        />
        {/* Subtle noise / grid */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 80%)',
          }}
        />
        {/* Highlight ring */}
        <div
          className="absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow:
              'inset 0 1px 0 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(56,189,248,0.08)',
          }}
        />
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* CTA primitives — re-exported for use in other sections                      */
/* -------------------------------------------------------------------------- */

export function PrimaryCta({
  href,
  children,
  size = 'default',
}: {
  href: string;
  children: React.ReactNode;
  size?: 'default' | 'lg';
}): JSX.Element {
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center gap-2 rounded-full bg-gradient-sky font-medium text-canvas shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_14px_40px_-12px_rgba(56,189,248,0.6)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
        size === 'lg'
          ? 'px-7 py-3.5 text-[14.5px]'
          : 'px-6 py-3 text-[14px]'
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-6 py-3 text-[14px] font-medium text-text-primary transition-colors hover:border-line-strong hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40"
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust badges                                                                */
/* -------------------------------------------------------------------------- */

function TrustBadges(): JSX.Element {
  const items = [
    { icon: ShoppingBag, label: 'Shopify-ready' },
    { icon: ShieldCheck, label: 'SOC 2 audit-logged' },
    { icon: Zap, label: '24/7 AI · multi-channel' },
  ];
  return (
    <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="inline-flex items-center gap-2 text-[12.5px] text-text-secondary"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-white/[0.03] text-sky-400">
            <item.icon className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-text-secondary">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
