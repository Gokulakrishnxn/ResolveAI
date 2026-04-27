# ResolveAI

> **AI Customer Support Auto-Resolver for Shopify & WooCommerce.**
> Ingest tickets from email/chat, classify intent, retrieve relevant order + FAQ context, and execute (or escalate) refunds, replacements, and answers — autonomously.


---

## Architecture

```
                     ┌──────────────────────┐
                     │ Shopify / WooCommerce │
                     └──────────┬───────────┘
                                │ webhooks
                                ▼
   ┌──────────┐     ┌──────────────────┐     ┌─────────────┐
   │  Email   │────▶│   Fastify API    │────▶│ BullMQ Queue│
   │  IMAP    │     │  (apps/api)      │     │   (Redis)   │
   └──────────┘     └────────┬─────────┘     └──────┬──────┘
                             │                      │
                             ▼                      ▼
                    ┌────────────────┐     ┌──────────────────┐
                    │   Postgres +   │◀────│   Worker         │
                    │   pgvector     │     │  (apps/worker)   │
                    └────────────────┘     └──────┬───────────┘
                             ▲                    │
                             │                    ▼
                    ┌────────┴────────┐  ┌───────────────────┐
                    │ Next.js Web App │  │  OpenAI (gpt-4o /  │
                    │   (apps/web)    │  │   gpt-4o-mini)    │
                    └─────────────────┘  └───────────────────┘
```

### Domain flow

1. **Ingest** — Webhook (Shopify/Woo), IMAP poll, or chat widget creates a `Ticket` + `Message`.
2. **Enqueue** — `apps/api` pushes a `process-ticket` job to BullMQ.
3. **Classify** — `apps/worker` uses `gpt-4o-mini` to detect intent (`refund`, `where-is-order`, `change-address`, `complaint`, …).
4. **Retrieve** — `packages/ai` runs hybrid search over `FAQDoc` + past `Ticket` embeddings (`pgvector`).
5. **Decide** — Per-store `Rule` table gates auto-resolution; otherwise `gpt-4o` drafts a reply + proposed `Action`.
6. **Act** — Approved actions hit Shopify/Woo APIs through typed clients (retry + circuit breaker).
7. **Audit** — Every step lands in `AuditLog`. Merchants approve/override from the dashboard.

---

## Repo layout

```
.
├─ apps/
│  ├─ web/        # Next.js 14 merchant dashboard (Clerk + shadcn/ui)
│  ├─ api/        # Fastify REST + webhook gateway
│  └─ worker/     # BullMQ workers: ticket processor, refund executor
├─ packages/
│  ├─ db/         # Prisma schema + generated client (multi-tenant via storeId)
│  ├─ shared/     # Zod schemas, shared TS types, prompt templates
│  ├─ ai/         # OpenAI client, classifier, RAG retrieval
│  └─ integrations/
│     ├─ shopify/
│     ├─ woocommerce/
│     ├─ email/   # IMAP + SMTP (Nodemailer)
│     └─ chat/    # Widget + WS gateway
├─ docker-compose.yml   # local Postgres (pgvector) + Redis
├─ turbo.json
├─ pnpm-workspace.yaml
└─ .github/workflows/ci.yml
```

---

## Quick start

### Prerequisites

- **Node.js** ≥ 20.11
- **pnpm** ≥ 9
- **Docker** (for local Postgres + Redis)
- **OpenAI** + **Clerk** accounts

### 1. Install

```bash
pnpm install
cp .env.example .env
```

Fill in the keys in `.env` (at minimum: `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).

### 2. Start infra

```bash
docker compose up -d
```

This boots:

- Postgres 16 with `pgvector` on `:5432`
- Redis 7 on `:6379`

### 3. Migrate the database

```bash
pnpm db:generate     # generate Prisma client
pnpm db:migrate      # apply migrations
```

### 4. Seed the demo data

```bash
pnpm --filter @resolveai/db seed
```

This creates `Demo Store`, an owner user, 12 fake customers, 30 fake orders, and 50 fake tickets across every Phase 1 intent. The script prints two IDs at the end — copy them into `.env`:

```
NEXT_PUBLIC_DEMO_STORE_ID=...
NEXT_PUBLIC_DEMO_USER_ID=...
```

(These are used by the dashboard to talk to the API while Clerk's prod auth is being wired up.)

### 5. Run everything

```bash
pnpm dev
```

Turbo will start in parallel:

| App      | URL                       |
| -------- | ------------------------- |
| `web`    | http://localhost:3000     |
| `api`    | http://localhost:4000     |
| `worker` | (background, no port)     |

Visit `http://localhost:3000/inbox` to see the seeded tickets, and `http://localhost:3000/integrations` to install Shopify and connect IMAP/SMTP.

---

## Phase 1 — end-to-end demo

1. **Install Shopify** — open `/integrations`, enter your dev store domain, click *Install*. The app exchanges the OAuth code for an offline access token, encrypts it with AES-256-GCM (`ENCRYPTION_KEY`), persists the `Integration`, and registers the four required webhooks (`orders/create|updated|fulfilled`, `app/uninstalled`).
2. **Connect Gmail** — enter SMTP + IMAP credentials in `/integrations`. The worker's IMAP IDLE listener starts on next worker restart and converts new emails into `Ticket` + first `Message` (threaded via `In-Reply-To` / `References`).
3. **Send a test email** — from any other inbox, send `where is order #1234?` to your support address.
4. **Watch ResolveAI reply** — within ~10s the dashboard's SSE stream will update; if `intent === ORDER_STATUS && confidence >= 0.8`, the worker fetches the order from Shopify, generates an empathetic reply with `gpt-4o`, sends it via SMTP, marks the ticket `auto_resolved`, and logs cost/tokens to `AICallLog`.
5. **Refunds always need a human** — a `REFUND` intent creates a proposed `Action` with eligibility (return-window check) + a draft reply. The merchant clicks *Approve refund $X* in the inbox; the worker then calls `shopify.createRefund` with a deterministic idempotency key.

Phase 1 feature flags (env, see `.env.example`):

- `AUTO_RESOLVE_ORDER_STATUS=true` — toggle the auto-resolver
- `AUTO_APPROVE_REFUNDS=false` — Phase 1 keeps refunds human-approved

---

## Scripts

| Command                              | What it does                                    |
| ------------------------------------ | ----------------------------------------------- |
| `pnpm dev`                           | Start `web`, `api`, `worker` in parallel        |
| `pnpm build`                         | Build every package + app                       |
| `pnpm typecheck`                     | Strict TS check across the monorepo             |
| `pnpm lint`                          | ESLint everywhere                               |
| `pnpm test`                          | Unit tests (intent classifier + Shopify client) |
| `pnpm --filter @resolveai/web test:e2e:install` | One-time install of Playwright browsers |
| `pnpm --filter @resolveai/web test:e2e` | Run Playwright e2e tests against the inbox  |
| `pnpm --filter @resolveai/db seed`   | Seed demo store + 50 fake tickets               |
| `pnpm db:generate`                   | Regenerate Prisma client                        |
| `pnpm db:migrate`                    | Run pending Prisma migrations                   |
| `pnpm db:studio`                     | Open Prisma Studio                              |
| `pnpm format`                        | Prettier-format the repo                        |

---

## Deployment

### Frontend → **Vercel**

1. Import the repo into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Configure env vars from `.env.example` (`NEXT_PUBLIC_*` + Clerk).
4. Vercel detects Next.js automatically; Turborepo cache is supported.

### Backend → **Railway**

Three Railway services, all from the same repo:

| Service         | Root          | Build              | Start                  |
| --------------- | ------------- | ------------------ | ---------------------- |
| `resolveai-api` | `apps/api`    | `pnpm build`       | `pnpm start`           |
| `resolveai-worker` | `apps/worker` | `pnpm build`     | `pnpm start`           |
| `postgres`      | _Plugin_      | —                  | —                      |
| `redis`         | _Plugin_      | —                  | —                      |

Set `DATABASE_URL` and `REDIS_URL` from the plugins; share `OPENAI_API_KEY`, `CLERK_*`, and integration secrets via Railway environment groups.

### Webhooks

After deploying:

- **Shopify** → register `orders/*`, `customers/*`, `app/uninstalled` to `https://<api>/webhooks/shopify`
- **WooCommerce** → register the same to `https://<api>/webhooks/woocommerce`
- **Clerk** → `https://<api>/webhooks/clerk`

---

## Engineering principles

- **100% TypeScript, strict mode.** No `any` without justification.
- **Zod everywhere at the edge.** Every webhook, request body, env var, and LLM response is schema-validated.
- **Typed external clients.** Shopify, Woo, OpenAI, Email all wrapped in clients with `p-retry` (exponential backoff) + `opossum` circuit breakers.
- **Multi-tenant by `storeId`.** Every query is scoped; row-level isolation enforced at the repository layer.
- **Idempotent workers.** All BullMQ jobs are keyed by `(storeId, ticketId, step)` and safe to replay.
- **Audit everything.** Every action — AI-suggested or human-approved — writes an `AuditLog` row.

---

## License

Proprietary © ResolveAI. All rights reserved.
