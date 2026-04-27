import Link from 'next/link';
import { Github, Linkedin, Twitter } from 'lucide-react';
import { ROUTES } from './theme';

const COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it Works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Case studies', href: '/customers' },
      { label: 'Changelog', href: '/blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#case-study' },
      { label: 'Blog', href: '/blog' },
      { label: 'Customers', href: '/customers' },
      { label: 'Contact', href: ROUTES.contact },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'DPA', href: '/legal/dpa' },
      { label: 'Security', href: '/security' },
    ],
  },
];

const SOCIALS: ReadonlyArray<{
  href: string;
  label: string;
  Icon: typeof Twitter;
}> = [
  { href: 'https://twitter.com/resolveai', label: 'Twitter', Icon: Twitter },
  { href: 'https://www.linkedin.com/company/resolveai', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://github.com/resolveai', label: 'GitHub', Icon: Github },
];

export function Footer(): JSX.Element {
  return (
    <footer className="relative border-t border-line bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px hairline-x"
      />
      <div className="container-marketing py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-sky shadow-glow-soft">
                <span className="text-[11px] font-bold text-canvas">R</span>
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-text-primary">
                Resolve<span className="text-text-secondary">AI</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-text-secondary">
              AI customer support for e-commerce. Cut cost in half. Reply in seconds.
              Keep humans on the hard ones.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  rel="noreferrer"
                  target="_blank"
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.03] text-text-secondary transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-text-primary"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-8 sm:flex-row sm:items-center">
          <p className="text-[12px] text-text-tertiary">
            © {new Date().getFullYear()} ResolveAI, Inc. All rights reserved.
          </p>
          <p className="text-[12px] text-text-tertiary">
            Made for merchants who&apos;d rather ship than answer the same email twice.
          </p>
        </div>
      </div>
    </footer>
  );
}
