import { test, expect, type Route } from '@playwright/test';
import type { TicketDetail, TicketListItem } from '../src/lib/types';

/**
 * E2E coverage for the inbox surface. We mock the Fastify API entirely so the
 * test runs without a database/Redis. The real network plumbing is exercised
 * by the API/worker integration tests.
 */

const TICKET_LIST: TicketListItem[] = [
  {
    id: 't_order_status',
    subject: 'Where is my order?',
    status: 'NEW',
    intent: 'ORDER_STATUS',
    intentConfidence: 0.92,
    urgency: 'MEDIUM',
    sentiment: 'NEUTRAL',
    channel: 'EMAIL',
    customer: { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    proposedActionId: null,
  },
  {
    id: 't_refund',
    subject: 'Refund please',
    status: 'AWAITING_HUMAN',
    intent: 'REFUND',
    intentConfidence: 0.88,
    urgency: 'HIGH',
    sentiment: 'NEGATIVE',
    channel: 'EMAIL',
    customer: { email: 'mark@example.com', firstName: 'Mark', lastName: 'Lee' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    proposedActionId: 'a_refund',
  },
];

const REFUND_DETAIL: TicketDetail = {
  ...TICKET_LIST[1]!,
  messages: [
    {
      id: 'm1',
      role: 'CUSTOMER',
      body: 'Order #1241 is not what I expected, please refund the full amount.',
      authorEmail: 'mark@example.com',
      authorName: 'Mark Lee',
      createdAt: new Date().toISOString(),
    },
  ],
  proposedAction: {
    id: 'a_refund',
    kind: 'REFUND_FULL',
    status: 'PENDING_APPROVAL',
    payload: { amount: '49.99', currency: 'USD' },
    eligibility: {
      decision: 'ELIGIBLE',
      recommendedAmount: '49.99',
      reasons: [{ code: 'WITHIN_WINDOW', message: 'Order placed within 30-day refund window' }],
    },
    draftReply: 'Hi Mark, I have prepared a full refund of $49.99 for your approval.',
  },
  order: {
    id: 'o1',
    externalId: 'gid://shopify/Order/1241',
    externalNumber: '1241',
    status: 'PAID',
    currency: 'USD',
    totalPrice: '49.99',
    trackingNumber: null,
    trackingUrl: null,
  },
};

async function mockApi(page: import('@playwright/test').Page): Promise<void> {
  let approveCalls = 0;
  await page.route('**/tickets?limit=50', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: TICKET_LIST, nextCursor: null }),
    }),
  );
  await page.route('**/tickets/t_refund', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(REFUND_DETAIL),
    }),
  );
  await page.route('**/actions/a_refund/approve-refund', (route: Route) => {
    approveCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'a_refund', status: 'APPROVED' }),
    });
  });
  await page.route('**/inbox/stream', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: hello\ndata: {"ok":true}\n\n',
    }),
  );
  // Expose the counter so tests can assert.
  await page.exposeFunction('__getApproveCalls', () => approveCalls);
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('inbox lists classified tickets with intent + confidence', async ({ page }) => {
  await page.goto('/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Where is my order?')).toBeVisible();
  await expect(page.getByText('Refund please')).toBeVisible();
  await expect(page.getByText('ORDER_STATUS')).toBeVisible();
  await expect(page.getByText('REFUND').first()).toBeVisible();
  await expect(page.getByText('92%')).toBeVisible();
  await expect(page.getByText('88%')).toBeVisible();
});

test('refund detail shows the AI draft + Approve refund button', async ({ page }) => {
  await page.goto('/inbox/t_refund');
  await expect(page.getByText('Refund proposed')).toBeVisible();
  await expect(page.getByText('ELIGIBLE')).toBeVisible();
  await expect(page.getByRole('button', { name: /Approve refund/i })).toBeEnabled();
  await expect(page.getByText('I have prepared a full refund of $49.99')).toBeVisible();

  await page.getByRole('button', { name: /Approve refund/i }).click();
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __getApproveCalls: () => number }).__getApproveCalls())).toBe(1);
});
