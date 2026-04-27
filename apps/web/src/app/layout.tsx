import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResolveAI — AI Customer Support',
  description: 'AI-powered customer support auto-resolver for Shopify & WooCommerce.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#fafafa',
          colorBackground: '#000000',
          colorInputBackground: '#0a0a0a',
          colorText: '#fafafa',
          colorTextSecondary: '#a3a3a3',
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans text-foreground antialiased">
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
