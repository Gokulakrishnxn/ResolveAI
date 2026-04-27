import type { Metadata, Viewport } from 'next';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import './globals.css';

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

export const viewport: Viewport = {
  themeColor: '#05060a',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas text-text-primary antialiased">
        <Navbar />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
