'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How does ResolveAI know what to say about my orders?',
    a: 'It pulls live order, fulfillment, and tracking data directly from Shopify (or WooCommerce) using a read-only token. Replies are grounded in real data plus the policy docs you upload — never invented.',
  },
  {
    q: 'Can it actually issue refunds, or just suggest them?',
    a: 'Both. By default it drafts a refund and waits for your approval. If you turn on auto-refund and configure rules (e.g. up to $50, within 30 days), it executes the Shopify refund and sends the customer email. Every action is signed and logged.',
  },
  {
    q: 'What happens if the AI is unsure?',
    a: 'Below a configurable confidence threshold (default 0.6 for chat, 0.8 for email auto-resolution) the ticket is escalated to a human with the AI draft attached. No automated send, no surprises.',
  },
  {
    q: 'How do you stop refund abuse?',
    a: 'We track per-customer refund count, lifetime value, dispute history, and chargeback flags. Customers above your thresholds always require human review, regardless of rules.',
  },
  {
    q: 'How is the metered pricing computed?',
    a: 'One billing event per ticket processed (idempotent on ticket id). You get a generous bundled quota in each plan; anything past it bills at $0.05/ticket. You can switch between hard-stop and soft-overage at any time.',
  },
  {
    q: 'Where is data stored? Are you GDPR-compliant?',
    a: 'Postgres with pgvector hosted on Railway/AWS, encrypted at rest. We sign a DPA on request. Messages are PII-scrubbed and soft-deleted after 90 days by default; you can shorten that retention window per store.',
  },
  {
    q: 'How long does setup take?',
    a: 'Five minutes to first AI-resolved ticket. The wizard handles Shopify OAuth, channel connection, policy upload, automation level, and a synthetic test ticket so you can see it work before going live.',
  },
];

export function Faq(): JSX.Element {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20" id="faq">
      <h2 className="text-3xl font-semibold tracking-tight">Frequently asked</h2>
      <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
        {FAQS.map((f) => (
          <FaqRow key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}

function FaqRow({ q, a }: { q: string; a: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-medium">{q}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="pb-4 text-sm text-zinc-600">{a}</p>}
    </div>
  );
}
