import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://resolveai.app'),
  title: {
    default: 'ResolveAI — AI customer support that pays for itself',
    template: '%s · ResolveAI',
  },
  description:
    'Auto-resolve "Where is my order?" tickets, draft refunds, and escalate the hard ones. Built for Shopify and WooCommerce.',
  openGraph: {
    title: 'ResolveAI — AI customer support that pays for itself',
    description:
      'Auto-resolve "Where is my order?" tickets, draft refunds, and escalate the hard ones.',
    url: 'https://resolveai.app',
    siteName: 'ResolveAI',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          Resolve<span className="text-accent">AI</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium md:flex">
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="https://app.resolveai.app/sign-in"
            className="hidden text-sm font-medium md:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="https://app.resolveai.app/sign-up"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accentHover"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter(): JSX.Element {
  return (
    <footer className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-4">
        <div>
          <p className="text-base font-semibold">
            Resolve<span className="text-accent">AI</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            AI-first customer support for e-commerce.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Product</p>
          <ul className="space-y-1 text-sm text-zinc-600">
            <li>
              <Link href="/#features">Features</Link>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
            <li>
              <Link href="/customers">Case studies</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Resources</p>
          <ul className="space-y-1 text-sm text-zinc-600">
            <li>
              <Link href="/blog">Blog</Link>
            </li>
            <li>
              <Link href="/legal/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/legal/terms">Terms</Link>
            </li>
            <li>
              <Link href="/legal/dpa">DPA</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Company</p>
          <ul className="space-y-1 text-sm text-zinc-600">
            <li>
              <a href="mailto:hello@resolveai.app">hello@resolveai.app</a>
            </li>
            <li>
              <Link href="/security">Security</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500">
        © {new Date().getFullYear()} ResolveAI, Inc. All rights reserved.
      </div>
    </footer>
  );
}
