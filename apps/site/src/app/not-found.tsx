import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Page not found.</h1>
      <p className="mt-3 text-zinc-600">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Go home
      </Link>
    </section>
  );
}
