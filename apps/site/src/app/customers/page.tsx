import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Customer stories — ResolveAI',
};

const stories = [
  {
    slug: 'trendcart',
    name: 'TrendCart',
    summary:
      'Streetwear DTC brand cut response time from 14h to 6m and bumped CSAT from 4.1 to 4.7 in 90 days.',
    tags: ['Shopify', 'Email + Chat', 'Auto-refunds'],
  },
];

export default function CustomersPage(): JSX.Element {
  return (
    <section className="container-marketing py-20 sm:py-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
        Customers
      </p>
      <h1 className="mt-3 text-display-lg font-semibold text-text-primary">
        Real merchants. Real numbers.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary sm:text-base">
        ResolveAI is built for the long tail of e-commerce — not Fortune 500 contact centers.
      </p>
      <div className="mt-12 grid gap-6">
        {stories.map((s) => (
          <Link
            key={s.slug}
            href={`/customers/${s.slug}`}
            className="group surface-glass flex flex-col gap-3 p-8 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover"
          >
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              {s.name}
            </h2>
            <p className="text-[15px] text-text-secondary">{s.summary}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-sky-300">
              Read the story
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
