import { Pricing } from '../_components/pricing';
import { Faq } from '../_components/faq';

export const metadata = {
  title: 'Pricing — ResolveAI',
  description: 'Starter $29 / 500 tickets. Growth $99 / 2,500. Scale $299 / 10,000. $0.05 overage.',
};

export default function PricingPage(): JSX.Element {
  return (
    <>
      <section className="border-b border-zinc-100 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Pricing tied to outcomes, not seats.
          </h1>
          <p className="mt-4 text-zinc-600">
            You pay for tickets the AI actually processes. Real overage is $0.05/ticket — the
            same regardless of plan.
          </p>
        </div>
      </section>
      <Pricing />
      <Faq />
    </>
  );
}
