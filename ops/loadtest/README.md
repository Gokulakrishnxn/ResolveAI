# Load testing ResolveAI

The launch-readiness SLA is **1,000 concurrent tickets at p95 < 30s** for
end-to-end resolution (create → AI classify → AI draft / reply).

## Tooling

We use [k6](https://k6.io/) — install with `brew install k6`.

## Pre-requisites

1. A staging environment with the worker scaled to ≥3 replicas and the
   API behind a real load balancer.
2. A sandbox `Subscription` on the test store with `enforcement = SOFT`
   and a high `includedTickets` cap so the billing gate doesn't kick in.
3. An OpenAI key with sufficient quota — these tests intentionally
   exercise the LLM. Use `gpt-4o-mini` everywhere by setting
   `OPENAI_MODEL_RESOLVER=gpt-4o-mini` to keep the cost bounded.
4. Database connection pool sized for the load (≥200 connections).

## Running

```bash
API_URL=https://api.staging.resolveai.app \
STORE_ID=cuid... \
AUTH_HEADER='Bearer <internal-token>' \
k6 run ops/loadtest/k6-tickets.js
```

## What we measure

| Metric                          | Target            | Why                       |
| ------------------------------- | ----------------- | ------------------------- |
| `ticket_resolve_latency_ms` p95 | < 30,000          | The product SLA           |
| `http_req_failed{status:201}`   | < 1%              | Submission success rate   |
| Worker queue depth              | drains within 60s | Capacity headroom         |
| OpenAI 429 rate                 | < 0.5%            | Concurrency vs rate limit |

## Capacity findings (from May 2026 dry-run)

- 1 worker replica @ concurrency=5 → sustains ~250 RPM (limited by AI).
- 4 worker replicas → 1,000 RPM with p95 ≈ 22s.
- Postgres connection pool ≥150 prevents queue back-pressure.

If you're under-spec'd, scale the worker first — the API is rarely the
bottleneck.
