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
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-3 text-zinc-600">
        Notes from the team on AI customer support, e-commerce ops, and what we&apos;re building.
      </p>
      <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="flex flex-col gap-1 py-6 transition hover:opacity-80"
          >
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              {new Date(p.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <h2 className="text-2xl font-semibold">{p.title}</h2>
            <p className="text-zinc-600">{p.excerpt}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
              Read article <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
