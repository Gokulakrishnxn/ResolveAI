# Demo video script — 90 seconds

**Format:** 90s screencast, voice-over, captioned. 1080p, MP4, < 30MB.
**Tone:** confident, low-key, founder-narrated. No music after 0:05.

---

### 0:00 — 0:05 — Cold open
**Visual:** ResolveAI logo on white. Cursor types into the chat widget on
a demo Shopify store: *"Where is my order #5001? It's been 8 days."*
**VO:** _(silence)_

### 0:05 — 0:15 — The reply
**Visual:** The widget shows the AI reply within 2 seconds:
> *"Hi Maria — order #5001 shipped via USPS on Apr 18 and is currently
> in transit, arriving Wednesday. Tracking: 9400-XXXX. Anything else?"*
**VO:** "That reply was written by ResolveAI — in two seconds, with the
real tracking, in your brand voice."

### 0:15 — 0:30 — The merchant view
**Visual:** Cut to `/inbox`. The same ticket appears at the top with
"Auto-resolved" badge. Hover reveals: AI confidence 0.94, model gpt-4o,
sources: tracking + shipping policy.
**VO:** "Every reply is logged with the data it used, the model it
called, and a tamper-evident audit signature. Your customers get a
faster answer. Your team stays out of the loop."

### 0:30 — 0:50 — The hard ones
**Visual:** Click a ticket: *"My laptop arrived broken. I want a refund."*
The Rules panel appears: under $50? ✓ within 30 days? ✓ photo provided?
✗ — escalated to human. The merchant clicks **Approve refund $42.99**.
A confirmation lands in the chat in real time, with an email receipt.
**VO:** "When the rules say it's not safe to auto-approve — we don't.
You stay one click away, but the work is already done for you."

### 0:50 — 1:10 — Channels & RAG
**Visual:** Quick montage: same ticket flow in WhatsApp, then email.
Cut to settings → upload "shipping-policy.pdf" → AI cites it next reply.
**VO:** "Email, website chat, WhatsApp — one inbox. Drop in your
policies and the AI cites them, every time."

### 1:10 — 1:25 — Numbers
**Visual:** `/dashboard` analytics: auto-resolution rate climbs from
12% to 78% over a 30-day chart. KPI tile: "$4,210 saved this month."
**VO:** "Most stores hit 70%+ auto-resolution in the first week, and
save the cost of one full-time agent per thousand monthly tickets."

### 1:25 — 1:30 — CTA
**Visual:** ResolveAI logo + URL `resolveai.app`. Subtitle: "14-day
free trial · No credit card · Connect Shopify in 30 seconds."
**VO:** "Try it on your store at resolveai.app."

---

## Production notes
- Record with **OBS** at 1080p60, downsample to 1080p30.
- Use a real demo store (`demo.resolveai.app`) seeded via `pnpm seed`.
- Captions: burn in via Descript so they play in muted feeds.
- Open rate (LinkedIn / Twitter) is best when the first 3s show the
  reply, not the typing — consider also rendering a 30s teaser with that
  framing.
