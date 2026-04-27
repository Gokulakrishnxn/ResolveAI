import { Pricing } from '@/components/marketing/pricing';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';

export const metadata = {
  title: 'Pricing — ResolveAI',
  description:
    'Starter $29 / 500 tickets. Growth $99 / 2,500. Scale $299 / 10,000. $0.05 overage. 14-day free trial.',
};

export default function PricingPage(): JSX.Element {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line py-20 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)',
          }}
        />
        <div className="container-marketing text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
            Pricing
          </p>
          <h1 className="mt-3 text-display-xl font-semibold text-text-primary">
            Pricing tied to outcomes,{' '}
            <span className="text-gradient-sky">not seats.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-text-secondary sm:text-base">
            You pay for tickets the AI actually processes. Real overage is $0.05 / ticket
            — the same regardless of plan.
          </p>
        </div>
      </section>
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
