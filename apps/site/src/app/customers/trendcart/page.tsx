import Link from 'next/link';

export const metadata = {
  title: 'TrendCart — Customer story',
};

export default function TrendCartCaseStudyPage(): JSX.Element {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        Case study · TrendCart
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        From 14h response time to 6 minutes — without hiring a single new agent.
      </h1>
      <p className="mt-4 text-zinc-600">
        How a 40k-customers/month streetwear brand auto-resolved 71% of email tickets in their
        first week with ResolveAI.
      </p>

      <div className="prose mt-12 text-zinc-800">
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
        <p>
          We turned on:
        </p>
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
        href="https://app.resolveai.app/sign-up"
        className="mt-12 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-white"
      >
        Try it on your store
      </Link>
    </article>
  );
}
