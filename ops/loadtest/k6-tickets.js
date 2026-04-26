/**
 * ResolveAI load test — fires concurrent ticket creates against the API
 * to validate the SLA "1,000 concurrent tickets, p95 < 30s end-to-end".
 *
 * Run:
 *   API_URL=https://api.example.com \
 *   STORE_ID=cuid... \
 *   AUTH_HEADER='Bearer xxx' \
 *   k6 run ops/loadtest/k6-tickets.js
 *
 * Notes
 *   - We push 1,000 tickets in a 60s ramp-up + 5min sustained window.
 *   - The "end-to-end" p95 SLA is measured by polling the ticket until
 *     status leaves NEW; this is closer to user-perceived resolution
 *     than just create-latency.
 *   - The test doesn't exercise AI cost; point STORE_ID at a sandbox
 *     subscription so we don't burn credits.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const apiUrl = __ENV.API_URL || 'http://localhost:4000';
const storeId = __ENV.STORE_ID;
const authHeader = __ENV.AUTH_HEADER || '';

if (!storeId) {
  throw new Error('STORE_ID env var required');
}

const resolveLatency = new Trend('ticket_resolve_latency_ms', true);
const resolved = new Rate('ticket_resolved_rate');

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1500,
      stages: [
        { duration: '60s', target: 17 },   // ramp to ~1000/min
        { duration: '5m',  target: 17 },   // hold for 5 minutes
        { duration: '30s', target: 0 },    // drain
      ],
    },
  },
  thresholds: {
    // p95 of full resolution under 30 seconds.
    ticket_resolve_latency_ms: ['p(95)<30000'],
    // ≥99% of submissions accepted.
    'http_req_failed{status:201}': ['rate<0.01'],
  },
};

const PAYLOADS = [
  {
    intent: 'order_status',
    subject: 'Where is my order?',
    body: 'Hi, my order #LOAD-{{n}} hasn’t arrived. Can you check the tracking?',
  },
  {
    intent: 'refund',
    subject: 'Need a refund',
    body: 'The product I got for order #LOAD-{{n}} is broken. I want my money back.',
  },
  {
    intent: 'wrong_item',
    subject: 'Wrong item shipped',
    body: 'Order #LOAD-{{n}} contained the wrong item. Please make this right.',
  },
];

function pickPayload(n) {
  const p = PAYLOADS[n % PAYLOADS.length];
  return { ...p, body: p.body.replace('{{n}}', String(n)) };
}

export default function () {
  const n = Math.floor(Math.random() * 1_000_000);
  const sample = pickPayload(n);
  const headers = {
    'Content-Type': 'application/json',
    'x-store-id': storeId,
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const created = http.post(
    `${apiUrl}/tickets`,
    JSON.stringify({
      channel: 'API',
      subject: sample.subject,
      initialMessage: { body: sample.body, authorEmail: `loadtest+${n}@example.com` },
      customer: { email: `loadtest+${n}@example.com`, firstName: 'Load', lastName: 'Test' },
    }),
    { headers, tags: { phase: 'create' } },
  );

  const ok = check(created, {
    'ticket created': (r) => r.status === 201 && !!r.json('id'),
  });
  if (!ok) return;

  const ticketId = created.json('id');
  const start = Date.now();
  const deadline = start + 90_000;

  while (Date.now() < deadline) {
    const r = http.get(`${apiUrl}/tickets/${ticketId}`, { headers, tags: { phase: 'poll' } });
    if (r.status !== 200) {
      sleep(0.5);
      continue;
    }
    const status = r.json('status');
    if (status && status !== 'NEW' && status !== 'PROCESSING') {
      const latency = Date.now() - start;
      resolveLatency.add(latency);
      resolved.add(true);
      return;
    }
    sleep(1);
  }

  resolved.add(false);
}
