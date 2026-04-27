import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Blog — ResolveAI',
};

const posts = [
  {
    slug: 'why-we-bill-per-ticket',
    title: 'Why we bill per ticket, not per seat',
    date: '2026-04-12',
    excerpt:
      'Seat-based pricing is a fossil from a world where humans were the unit of work. We use the actual unit: a resolution.',
  },
  {
    slug: 'auto-refund-without-fraud',
    title: 'How to auto-refund without giving away the store',
    date: '2026-03-05',
    excerpt:
      'Three numbers, two rules, and one customer flag — that\'s all you need to safely auto-refund 80% of legit requests.',
  },
];

export default function BlogIndexPage(): JSX.Element {
  return (
    <section className="container-marketing max-w-3xl py-20 sm:py-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
        Blog
      </p>
      <h1 className="mt-3 text-display-lg font-semibold text-text-primary">
        Notes from the team
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary sm:text-base">
        AI customer support, e-commerce ops, and what we&apos;re building.
      </p>
      <div className="mt-12 divide-y divide-line border-y border-line">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col gap-1.5 py-7 transition-colors hover:text-text-primary"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
              {new Date(p.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              {p.title}
            </h2>
            <p className="text-[15px] text-text-secondary">{p.excerpt}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-sky-300">
              Read article
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
