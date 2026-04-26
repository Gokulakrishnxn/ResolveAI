# Twitter/X threads (5)

Each thread is 6–10 tweets, ≤ 280 chars per tweet, one image where
noted. Hashtag policy: none, except a single `#shopify` in the final
tweet of threads 1, 2, 5.

---

## Thread 1 — Launch day

**1/** 70% of e-commerce support tickets are the same 5 questions.

We just shipped an AI that answers them — fast, with real Shopify data,
and an audit trail you can actually trust.

It's called ResolveAI. v1.0 ships today.

(Thread ↓)

**2/** Connect Shopify in 30s. Connect your inbox in 90s. Pick
"Conservative / Balanced / Aggressive." Done.

ResolveAI starts replying within 5 minutes. No prompt engineering.

**3/** Real example from a beta user yesterday:

→ Customer: "Where is order #5001? It's been 8 days."
→ ResolveAI (2.1s): "Hi Maria — order shipped via USPS Apr 18,
   currently in Reno, ETA Wednesday. Tracking 9400-XXXX. Anything else?"
→ Merchant: closes laptop, opens Notion, finishes their roadmap.

**4/** "But what about refunds?"

There's a rules engine.
- Under $50? ✓
- Within 30 days? ✓
- No abuse history? ✓
- Photo provided (if required)? ✓

→ Auto-approved. Anything else: one-click human review.

**5/** Pricing is per-ticket, not per-seat:

- $29 / 500 tickets
- $99 / 2,500 tickets
- $299 / 10,000 tickets
- $0.05 each over

14-day free trial. No card required.

**6/** It's also SOC2-ready out of the box. Audit log is hash-chained,
data is encrypted, retention is 90 days by default.

We didn't bolt that on later. We shipped it on day one.

**7/** If you run a Shopify store and you're tired of writing the same
"hi, your order shipped" reply 40 times a day —

resolveai.app

#shopify

---

## Thread 2 — The fraud guards

**1/** "How do you stop your AI from auto-refunding a $5k order to a
serial chargebacker?"

Best question I got at our beta dinner last week. The answer: we
don't trust the AI to make that call.

Here's how the guardrails work ↓

**2/** Step 1: every customer has a risk profile we update in real time.

→ Refund count in the last 30 days
→ $ refunded vs lifetime value ratio
→ Past chargebacks
→ Suspicious patterns flagged manually

**3/** Step 2: the rules engine is what actually approves a refund —
not the AI.

The AI proposes. The rules dispose. Configurable in the dashboard,
versioned, audit-logged. No JSON in your face.

**4/** Step 3: ANY of these escalate to human, no matter what:

- ≥ 3 refunds in last 30 days
- Refund/LTV ratio > 0.4
- Chargeback in last 90 days
- Customer manually flagged

That's the safety floor. Your rules can only be tighter.

**5/** Step 4: every auto-refund is signed and chained in the audit
log. If something goes wrong (it won't, but) you have the full
reasoning chain — including the model version, the prompt, the data
it saw, and the rules that approved it.

**6/** This is what we mean by "human-on-the-loop." You're not
clicking every refund. You're setting the rules and watching the
report.

resolveai.app

#shopify

---

## Thread 3 — Why per-ticket pricing

**1/** SaaS pricing is broken.

You pay $400/seat for a "platform." You add an agent — $400/mo more.
You hit 10k tickets in November — you pay anyway. You drop to 800 in
February — you pay anyway.

We charge by ticket. Here's why ↓

**2/** Tickets are the only unit that actually maps to value.

500 tickets a month? Pay for 500.

10,000? Pay for 10,000.

Holiday spike? Bills go up. January lull? Bills go down. Like utility,
not telecom.

**3/** It also keeps us honest.

If a ticket costs us $0.04 in OpenAI fees and our overage price is
$0.05 — we have one cent of margin. We can't afford to be sloppy with
the prompt or hallucinate citations.

**4/** And it makes the value prop legible:

"You pay $0.05 per resolved ticket. Your CX agent costs $0.42 per
ticket fully loaded. Auto-resolve 60%, save the difference."

That's it. That's the deck.

**5/** We chose this knowing it limits our LTV ceiling. We think the
upside — fast install, no negotiations, no "talk to sales" — more than
makes up for it.

If you've been waiting for SaaS to stop hiding the price → resolveai.app

---

## Thread 4 — Audit log nerdery

**1/** "How do you make sure your AI didn't lie about why it refunded
that order?"

Short answer: every audit log row is HMAC-signed and hash-chained
against the previous one for that store.

A bit of crypto thread for the curious ↓

**2/** Each AuditLog row stores:
- the canonical JSON payload
- a SHA-256 HMAC over (prevDigest || canonical)
- the prevDigest pointer

So row N is cryptographically anchored to rows 1..N-1. You can't
edit, insert, or delete without breaking the chain.

**3/** We ship a verifier. Run `pnpm audit:verify --store <id>` and it
walks every row in createdAt order, recomputes each digest, and tells
you the first index where the chain breaks (if any).

For SOC2 / pen-test review, this is the artifact.

**4/** The signing key is per-environment (`AUDIT_SIGNING_KEY`), held
separately from the database. So even an attacker with full DB access
can't forge a chain — they'd need both.

**5/** Fancy? Sure. But for a system that auto-issues refunds, "I
trust the AI" is not a sufficient answer to "why did this $200
disappear?"

This is. It's also why our enterprise pilots have been so easy.

resolveai.app/security

---

## Thread 5 — TrendCart customer story

**1/** TrendCart's holiday peak almost killed them.

→ 400 tickets/day
→ 1 full-time CX agent
→ 47-minute median first reply
→ Backlog growing 2 days deep

Two weeks after onboarding ResolveAI ↓

**2/** Auto-resolution rate: 78%.

Median first reply: 9 seconds.

Backlog: zero.

Refund disputes: zero.

CX agent reassigned to: VIP returns + Reddit DM management.

**3/** Maya, their CX lead, was the skeptic. Her quote: "I'm not
letting an AI touch our money."

After install, the AI never *did* — the rules engine did. The AI
proposed a refund, the rules engine auto-approved it (under $50,
within 30 days, photo provided).

She trusts it now. Quote: "Honestly, more than I trust myself at 11pm."

**4/** The thing that changed her mind wasn't the speed. It was the
audit log.

Every refund: signed, timestamped, linked to the order, the rule that
matched, the AI's reasoning. She can show her cofounder, her finance
person, her future Shopify Plus rep.

**5/** Total cost in month one: $99.

Cost of agent overtime they would have paid: ~$2,400.

Net: $2,301 saved + 380 hours of CX time recovered.

Full case study →

resolveai.app/customers/trendcart

#shopify
