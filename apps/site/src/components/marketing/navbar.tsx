'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROUTES } from './theme';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#case-study', label: 'Case Study' },
  { href: '#faq', label: 'FAQ' },
];

export function Navbar(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background,backdrop-filter,border-color] duration-300',
        scrolled
          ? 'border-b border-line bg-canvas/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
      role="banner"
    >
      <div className="container-marketing flex h-16 items-center justify-between gap-4">
        {/* Logo lockup */}
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary"
          aria-label="ResolveAI home"
        >
          <span className="relative grid h-7 w-7 place-items-center rounded-md bg-gradient-sky shadow-glow-soft">
            <span className="text-[11px] font-bold text-canvas">R</span>
          </span>
          <span className="text-[15px]">
            Resolve<span className="text-text-primary/70">AI</span>
          </span>
        </Link>

        {/* Centered nav pill */}
        <nav
          className="hidden items-center rounded-full border border-line bg-canvas-raised/40 p-1 backdrop-blur-xl md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary focus-visible:bg-white/[0.05] focus-visible:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={ROUTES.signIn}
            className="rounded-full px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Log in
          </Link>
          <CtaPill href={ROUTES.signUp}>Start Free Trial</CtaPill>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-text-primary transition-colors hover:bg-white/5"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          'md:hidden overflow-hidden border-b border-line bg-canvas/95 backdrop-blur-xl transition-[max-height,opacity] duration-300',
          open ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
        )}
        aria-hidden={!open}
      >
        <div className="container-marketing flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] font-medium text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
            <Link
              href={ROUTES.signIn}
              className="text-[13px] font-medium text-text-secondary"
            >
              Log in
            </Link>
            <CtaPill href={ROUTES.signUp} className="flex-1 justify-center">
              Start Free Trial
            </CtaPill>
          </div>
        </div>
      </div>
    </header>
  );
}

function CtaPill({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        'group relative inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-sky px-4 py-2 text-[13px] font-medium text-canvas shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_8px_24px_-8px_rgba(56,189,248,0.6)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60',
        className,
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
