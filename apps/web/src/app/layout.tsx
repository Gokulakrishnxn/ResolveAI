import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResolveAI — AI Customer Support',
  description: 'AI-powered customer support auto-resolver for Shopify & WooCommerce.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
