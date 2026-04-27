import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from './theme';

export function FinalCta(): JSX.Element {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative isolate scroll-mt-24 py-24 sm:py-28"
    >
      <div className="container-marketing">
        <div className="surface-glass relative overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-20">
          <BackdropGlow />

          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
            Ready when you are
          </p>
          <h2
            id="final-cta-heading"
            className="mx-auto mt-3 max-w-3xl text-display-xl font-semibold text-text-primary"
          >
            See your first ticket{' '}
            <span className="text-gradient-sky">auto-resolved in 5 minutes.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-text-secondary sm:text-base">
            14-day free trial. No credit card. No legacy CRM rip-and-replace.
            Cancel any time.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ROUTES.signUp}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-sky px-7 py-3.5 text-[14px] font-medium text-canvas shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_24px_60px_-16px_rgba(56,189,248,0.65)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={ROUTES.bookDemo}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-7 py-3.5 text-[14px] font-medium text-text-primary transition-colors hover:border-line-strong hover:bg-white/[0.06]"
            >
              Book a 20-min demo
            </Link>
          </div>

          <p className="mt-5 text-[12px] text-text-tertiary">
            Used by Shopify and WooCommerce brands across 12 countries.
          </p>
        </div>
      </div>
    </section>
  );
}

function BackdropGlow(): JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px hairline-x"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%)',
        }}
      />
    </>
  );
}
