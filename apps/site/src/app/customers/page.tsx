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
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Customer stories</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">
        Real merchants, real numbers. ResolveAI is built for the long tail of e-commerce — not
        Fortune 500 contact centers.
      </p>
      <div className="mt-10 grid gap-6">
        {stories.map((s) => (
          <Link
            key={s.slug}
            href={`/customers/${s.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-8 transition hover:border-accent"
          >
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-semibold">{s.name}</h2>
            <p className="text-zinc-600">{s.summary}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent">
              Read the story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
