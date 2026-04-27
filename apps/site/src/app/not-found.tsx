import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound(): JSX.Element {
  return (
    <section className="container-marketing max-w-xl py-32 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
        404
      </p>
      <h1 className="mt-3 text-display-lg font-semibold text-text-primary">
        Page not found.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-sky px-5 py-3 text-[13px] font-medium text-canvas shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
      >
        Go home <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
