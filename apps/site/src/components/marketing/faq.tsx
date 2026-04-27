'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SectionHeader } from './features-grid';

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'How secure is ResolveAI? Where does my data live?',
    a: 'Postgres with pgvector, encrypted at rest. SOC2-style hash-chained audit logging on every action. Tokens stored AES-256-GCM. We sign a DPA on request and offer EU data residency on Scale plans.',
  },
  {
    q: 'Which platforms and channels do you support?',
    a: 'Shopify and WooCommerce out of the box, with email (IMAP/SMTP), website chat (a 7KB embeddable widget), and WhatsApp Business. Public REST + webhook API for everything else.',
  },
  {
    q: 'How do you stop refund abuse and protect my margin?',
    a: 'We track per-customer refund count, lifetime value, dispute history, and chargeback flags. Customers above your thresholds always require human review, regardless of rules. You set the rules; we enforce them.',
  },
  {
    q: 'How long does setup actually take?',
    a: 'Five minutes to first AI-resolved ticket. The wizard handles Shopify OAuth, channel connection, policy upload, automation level (Conservative / Balanced / Aggressive), and a synthetic test ticket so you see it work before going live.',
  },
  {
    q: 'What happens when the AI is unsure?',
    a: 'Below a configurable confidence threshold (default 0.6 for chat, 0.8 for email auto-resolution) the ticket is escalated to a human with the AI draft attached. No automated send, no surprises.',
  },
  {
    q: 'How is the metered pricing computed?',
    a: 'One billing event per ticket processed (idempotent on ticket id). You get a generous bundled quota in each plan; anything past it bills at $0.05/ticket. You can switch between hard-stop and soft-overage at any time.',
  },
];

export function Faq(): JSX.Element {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative scroll-mt-24 py-24 sm:py-28"
    >
      <div className="container-marketing">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeader
            eyebrow="FAQ"
            title="Real questions from real merchants."
            description="Short answers. If you want the long version, every footer link goes deeper."
            align="left"
          />
          <div className="surface-glass divide-y divide-line/70 px-2">
            {FAQS.map((f, i) => (
              <FaqRow key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqRow({
  q,
  a,
  defaultOpen = false,
}: {
  q: string;
  a: string;
  defaultOpen?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-text-primary">{q}</span>
        <span
          aria-hidden
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white/[0.04] text-text-secondary transition-transform duration-300',
            open ? 'rotate-45 border-sky-400/40 text-sky-300' : '',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
      </button>
      <div
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out',
          open
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0">
          <p className="pb-5 pr-12 text-[14px] leading-relaxed text-text-secondary">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}
