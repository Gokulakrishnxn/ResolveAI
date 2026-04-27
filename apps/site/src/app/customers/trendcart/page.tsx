import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/components/marketing/theme';

export const metadata = {
  title: 'TrendCart — Customer story',
};

export default function TrendCartCaseStudyPage(): JSX.Element {
  return (
    <article className="container-marketing max-w-3xl py-20 sm:py-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/90">
        Case study · TrendCart
      </p>
      <h1 className="mt-3 text-display-lg font-semibold text-text-primary">
        From 14h response time to 6 minutes — without hiring a single new agent.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-text-secondary sm:text-base">
        How a 40k-customers/month streetwear brand auto-resolved 71% of email tickets in
        their first week with ResolveAI.
      </p>

      <div className="prose mt-12">
        <h2>The problem</h2>
        <p>
          Coming out of Black Friday, TrendCart was sitting on 3,500 unanswered tickets. Most of
          them were &quot;where is my order?&quot; emails — the same five lines copy-pasted by
          a five-person support team that was burning out.
        </p>
        <p>
          CSAT had dropped from 4.8 to 4.1. Refund requests sat for 3 days before a human even
          opened them. Their two best agents quit in the same week.
        </p>

        <h2>What we changed</h2>
        <p>
          ResolveAI installed on a Tuesday. We connected Shopify (read-only token), the Gmail
          inbox, and uploaded their shipping &amp; returns docs.
        </p>
        <p>We turned on:</p>
        <ul>
          <li>Auto-resolve for <code>ORDER_STATUS</code> at confidence ≥ 0.85.</li>
          <li>Refund draft mode (human approves) for the first two weeks.</li>
          <li>Auto-refund up to $50 for <code>not_received</code> and <code>damaged</code>, photo required for damage.</li>
        </ul>

        <h2>The result, after 90 days</h2>
        <ul>
          <li><strong>71% auto-resolution rate</strong> on email tickets.</li>
          <li>Average first response time: <strong>14h → 6 minutes</strong>.</li>
          <li>Refund cycle time: <strong>3 days → 1.5 hours</strong>.</li>
          <li>CSAT recovered to <strong>4.7</strong>.</li>
          <li>Support headcount unchanged — they redirected one agent to ops/QA.</li>
        </ul>

        <h2>What surprised them</h2>
        <p>
          Maya P., Head of CX, said the audit log was their favorite part: every auto-refund
          comes with a signed reasoning chain (rule that fired, customer flags, photo URL),
          which made their finance team comfortable raising the auto-refund cap from $50 to
          $80 without losing sleep.
        </p>
      </div>

      <Link
        href={ROUTES.signUp}
        className="mt-12 inline-flex items-center gap-2 rounded-full bg-gradient-sky px-5 py-3 text-[13px] font-medium text-canvas shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
      >
        Try it on your store
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
