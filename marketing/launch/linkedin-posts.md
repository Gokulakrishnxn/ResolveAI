# LinkedIn launch posts (5)

Long-form, founder-narrated. Each post stands alone — they're spaced
across launch week (M, W, F, M, W). Aim for ~1,300 chars (LinkedIn
sweet spot) and one CTA at the bottom.

---

## Post 1 — Launch day

70% of e-commerce support tickets are the same five questions:

→ "Where is my order?"
→ "When will it arrive?"
→ "Can I get a refund?"
→ "I got the wrong item."
→ "Cancel my order."

We've watched CX teams lose hundreds of hours a month to tickets a
script could have answered in 2 seconds.

So we built **ResolveAI**.

It reads your inbox. Looks up the order in Shopify. Writes the reply
in your voice, with the real tracking. Auto-refunds the safe ones,
escalates the rest. Logs every decision with a signed audit trail.

Today we're shipping v1.0. Try it on your Shopify store in 5 minutes
— 14-day free trial, no credit card.

→ resolveai.app

---

## Post 2 — Day 3 — The fraud guard

A friend asked me yesterday: "How do you stop the AI from auto-refunding
a $4,000 order from someone who's already had three refunds this
month?"

The answer is: **we don't trust the AI to make that call.**

ResolveAI's rules engine has hard limits — under $50, within 30 days,
no chargeback history, no flagged customer. Anything outside that lane
goes to a human, no exceptions.

The auto-approve lane is intentionally small. That's the point. AI
should make the boring decisions, not the risky ones.

Here's the rules editor (no JSON, plain English):
[screenshot of `/settings/rules`]

→ resolveai.app

---

## Post 3 — Day 5 — How we price it

The SaaS playbook says: charge by seat, hide the price, "talk to sales."

We charge by ticket. $29 for 500. $99 for 2,500. $299 for 10,000.
$0.05 per ticket over your plan.

Why? Because:

1. Your support volume is the only thing that actually maps to the
   value we deliver.
2. We hate quote-only pricing as much as you do.
3. It forces us to keep the AI cheap and accurate. If a single ticket
   costs us $0.04 to resolve, we have one cent to spare.

If you're paying $400/seat for a "platform" right now, do the math.

→ resolveai.app

---

## Post 4 — Day 7 — The audit trail nobody asked for

Most AI support tools store a transcript and call it a day.

ResolveAI's audit log is **hash-chained**. Every entry's digest is
HMAC'd against the previous entry's digest, per store. You can't
edit, insert, or delete a row without breaking the chain — and we
ship a verifier you can run yourself.

Why does this matter? Because the moment your AI auto-issues a refund,
you're going to want a way to prove what it saw, what it decided, and
why — to your finance team, to your auditor, and (eventually) to a
chargeback dispute.

This is what SOC2 readiness on day one looks like. Not a checkbox.

→ resolveai.app/security

---

## Post 5 — Day 10 — Customer story

TrendCart — a 2-person DTC brand selling kids' apparel — was drowning
in support during their holiday peak. 400 tickets a day. One full-time
agent. Two-day reply backlog.

We onboarded them in an afternoon. Two weeks later:

- 78% auto-resolution rate
- Median first-reply time: 9 seconds (was 47 minutes)
- Refund disputes: 0
- One agent, now able to focus on returns and VIP escalations

Their CX lead Maya said the part that scared her — "I won't trust an
AI with refunds" — turned out to be the part she ended up trusting
the most, because the rules made the decision, not the AI.

Read the case study →

→ resolveai.app/customers/trendcart
