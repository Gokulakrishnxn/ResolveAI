# ResolveAI v1.0 — Launch Checklist

This file is the single-source go/no-go gate. Don't tag a release
until **every required box** is checked. Owner names are placeholders;
fill in before the launch huddle.

Legend: ✅ complete · 🔄 in progress · ⏳ blocked · ⬜ not started

---

## 1. Legal

| Item                                    | Owner | Status |
| --------------------------------------- | ----- | ------ |
| Privacy policy (`/legal/privacy`)        | TBD   | ✅ stub committed at `apps/site/src/app/legal/privacy/page.mdx` — final review by counsel before launch |
| Terms of Service (`/legal/terms`)        | TBD   | ✅ stub committed — counsel review pending |
| DPA (`/legal/dpa`)                       | TBD   | ✅ stub committed — counsel review pending |
| Cookie banner (consent for PostHog)      | TBD   | 🔄 needs implementation in `apps/web` and `apps/site` |
| GDPR data export endpoint (`/me/export`) | TBD   | ⬜ design doc only |
| Right-to-deletion endpoint               | TBD   | ✅ message soft-delete + 90-day retention scheduler in `apps/worker/src/processors/retention-scheduler.ts` |
| Sub-processor list published             | TBD   | ⬜ — list: OpenAI, Stripe, Vercel, Railway, AWS S3, Sentry, PostHog, Better Stack, Clerk |
| EU representative appointed              | TBD   | ⬜ |
| US "do not sell my information" page     | TBD   | ⬜ |
| Trademark filed for "ResolveAI"          | TBD   | ⬜ |

**Pre-launch ask of counsel:** review privacy/ToS/DPA against current
data flows: OpenAI prompt logging, Sentry error capture, PostHog
analytics, S3 backups. The technical surface is stable; the legal
text is the unknown.

---

## 2. Security

### 2.1 Pen-test checklist (run before launch)

| Test                                                    | Expected result                              | Owner | Status |
| ------------------------------------------------------- | -------------------------------------------- | ----- | ------ |
| OWASP ZAP baseline scan against `api.resolveai.app`     | 0 highs, ≤2 mediums (informational)          | TBD   | ⬜ |
| Authenticated multi-tenancy fuzz (Burp Repeater)        | All cross-tenant requests return 403/404     | TBD   | ⬜ |
| Rate-limit smoke (1k rps anon → `/tickets`)             | 429 within 200 req                           | TBD   | ⬜ |
| Webhook signature bypass (Shopify, WhatsApp, Stripe)    | All forged requests rejected                 | TBD   | ⬜ |
| AES-256-GCM token decryption with wrong key             | Hard error, no plaintext leak in logs        | TBD   | ✅ verified in unit tests (`packages/shared/src/utils/__tests__`) |
| Audit log tamper attempt (edit row, re-verify chain)    | Verifier reports `brokenAtIndex`             | TBD   | ✅ unit-tested in `packages/shared/src/audit/__tests__/chain.test.ts` |
| Stripe webhook replay (24h-old event)                   | Idempotency-safe (no double subscription)    | TBD   | ⬜ |
| Clerk session revocation propagates within 60s          | Yes                                          | TBD   | ⬜ |
| WebSocket gateway flood (10k connections, no auth)      | Connection limit + 401                       | TBD   | ⬜ |
| Shopify install flow CSRF (no `state` param)            | Rejected                                     | TBD   | ✅ implemented |
| SQL injection probe across all `req.query` & `req.body` | Zod validation rejects                       | TBD   | ✅ Zod is everywhere; verify with sqlmap |
| Dependency CVE scan (`pnpm audit`)                      | 0 highs at launch time                       | TBD   | ⬜ |
| `helmet` headers + HSTS preload                         | All present in prod                          | TBD   | ✅ helmet registered |

### 2.2 SOC2 readiness

| Control                                                  | Status |
| -------------------------------------------------------- | ------ |
| RBAC enforced at the API layer                           | ✅ `packages/shared/src/utils/rbac.ts` |
| Tamper-evident audit log (hash chain)                    | ✅ `packages/shared/src/audit/chain.ts`, `apps/api/src/lib/audit.ts` |
| Encryption at rest (DB-level + AES-256-GCM for secrets)  | ✅ |
| Encryption in transit (TLS, HSTS preload)                | ⬜ confirm at edge |
| Key rotation procedure documented                        | ⬜ |
| Backup + restore drill (quarterly)                       | ⬜ — see `ops/backups/pg_dump_to_s3.sh` |
| Access reviews (quarterly)                               | ⬜ |
| Change-management log (CI green required to merge)       | ✅ `.github/workflows/ci.yml` |
| Incident response runbook                                | ⬜ |
| Vendor risk assessments for sub-processors               | ⬜ |
| SSO-ready                                                | ✅ Clerk supports SAML on Enterprise plan; no app changes needed |
| MFA required for admin console                           | ✅ enforced at Clerk org level for `SUPER_ADMIN` role |

### 2.3 Pre-launch security spike (1 day)

1. Run `pnpm audit --prod` and resolve every High.
2. Run OWASP ZAP baseline + ZAP authenticated scan against staging.
3. Walk the **Authenticated multi-tenancy fuzz** matrix: log in as
   tenant A, replay every request with tenant B's IDs in the params /
   body, confirm 403 or 404 every time.
4. Run `k6 run ops/loadtest/k6-tickets.js` against staging — 1,000
   concurrent tickets, must hit p95 < 30s.
5. Run the audit log verifier against the staging DB and a deliberately
   tampered copy.

---

## 3. Pricing experiments

We launch with **public list pricing** (Starter $29 / Growth $99 /
Scale $299, $0.05 overage). Once we have 100 paying merchants, run
these experiments **in this order** — only one live at a time, each
for ≥ 2 weeks, n ≥ 50 sign-ups per arm.

| # | Hypothesis                                                            | Variant                                  | Primary metric            | Secondary             |
| - | --------------------------------------------------------------------- | ---------------------------------------- | ------------------------- | --------------------- |
| 1 | Starter is too cheap → leaves margin                                   | Starter at **$49** (vs $29 control)      | Trial → paid conversion   | ARPU, churn @ 30d     |
| 2 | Trial length affects conversion non-linearly                          | **7-day** vs 14-day vs 30-day            | Conversion rate           | Time-to-first-resolve |
| 3 | Per-ticket overage scares power users                                 | **Pure flat** Scale plan ($499 unlimited) | % choosing Scale          | Gross margin          |
| 4 | "No credit card" hurts qualified leads                                | Trial **with card-on-file**              | Trial → paid              | Drop-off rate         |
| 5 | Annual prepay (15% off) increases LTV                                 | Add annual toggle on `/pricing`           | % annual @ checkout       | LTV at 6mo            |
| 6 | Add-on for "human-on-the-loop" SLA at +$199/mo                        | Premium tier with 1h response guarantee   | Attach rate               | Revenue lift          |

**Logging:** every variant sets a Stripe `metadata.pricing_experiment`
on the subscription so we can join through to product events in
PostHog.

**Stop conditions:** any experiment that drops trial→paid conversion
by > 25% week-over-week is killed within 48h, regardless of n.

---

## 4. Operations

| Item                                                 | Status |
| ---------------------------------------------------- | ------ |
| Sentry project + DSN configured for api/worker/web   | ✅ wired in code, env vars to be set |
| PostHog project + API key configured                 | ✅ wired in code, env vars to be set |
| Better Stack uptime monitor for api + web + site     | ⬜ create after deploy |
| Better Stack incident webhook → Slack `#alerts`      | ⬜ |
| Nightly Postgres dump → S3, 30d retention            | ✅ `ops/backups/pg_dump_to_s3.sh` (cron via Railway) |
| Restore drill from yesterday's dump                  | ⬜ pre-launch |
| Status page (status.resolveai.app)                   | ⬜ — Better Stack has it free |
| Runbooks committed (`ops/runbooks/`)                 | ⬜ |
| On-call rotation set up                              | ⬜ |
| Load test passing 1,000 concurrent @ p95 < 30s       | ⬜ run via `ops/loadtest/k6-tickets.js` |

---

## 5. Product readiness

| Item                                                  | Status |
| ----------------------------------------------------- | ------ |
| All 6 Phase 2 milestones merged & green               | ✅ |
| Stripe billing: plans, trial, metered usage           | ✅ |
| Onboarding wizard, time-to-first-resolution < 5min   | ✅ |
| Marketing site (`apps/site`)                          | ✅ |
| Admin / super-admin console                           | ✅ |
| RBAC + signed audit log                               | ✅ |
| Demo store seeded                                     | ⬜ run `pnpm seed` against demo env |
| Lighthouse score ≥ 95 on `apps/site`                  | ⬜ measure & confirm pre-launch |
| All E2E tests passing                                 | ⬜ run `pnpm test` |

---

## 6. Launch assets

| Item                                  | Path                                          |
| ------------------------------------- | --------------------------------------------- |
| Shopify App Store listing copy        | `marketing/launch/shopify-app-store.md`       |
| Screenshots spec                      | `marketing/launch/screenshots-spec.md`        |
| Demo video script (90s)               | `marketing/launch/demo-video-script.md`       |
| Product Hunt launch copy              | `marketing/launch/producthunt.md`             |
| LinkedIn posts (5)                    | `marketing/launch/linkedin-posts.md`          |
| Twitter/X threads (5)                 | `marketing/launch/twitter-threads.md`         |
| Cold email template                   | `marketing/launch/cold-email.md`              |

All committed. Final visual assets (screenshots, logo, video MP4) are
binary and tracked outside this repo.

---

## 7. Day-of launch (T-0)

- [ ] All checks above are ✅.
- [ ] Tag `v1.0.0` (`git tag -a v1.0.0 -m "ResolveAI v1.0 — public launch"`).
- [ ] Push tag to origin (`git push origin v1.0.0`).
- [ ] Promote `main` → production (Vercel `apps/web`, `apps/site`;
      Railway `apps/api`, `apps/worker`).
- [ ] Verify Sentry receives a synthetic exception within 5 minutes.
- [ ] Verify a real ticket flows end-to-end on a real store.
- [ ] Publish Product Hunt launch at 12:01 AM PT.
- [ ] Post LinkedIn #1 + Twitter Thread #1 at 9:00 AM PT.
- [ ] Sweep comments and DMs every 30 minutes until 11 PM PT.
- [ ] Send beta-list announcement email at 8:00 AM PT.

## 8. Day-after (T+1)

- [ ] Triage Sentry issues — fix any P0 within 24h.
- [ ] Review PostHog funnel: trial signup → connect Shopify → first
      resolved ticket. If any step is < 60% conversion, file a bug.
- [ ] Read every Product Hunt comment, reply within 4 hours.
- [ ] Schedule retro for the team — what broke, what didn't, what's next.
