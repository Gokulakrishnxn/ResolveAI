/* eslint-disable no-console */
import {
  PrismaClient,
  Platform,
  SubscriptionTier,
  TicketChannel,
  TicketIntent,
  TicketStatus,
  TicketUrgency,
  TicketSentiment,
  ActionKind,
  ActionStatus,
  OrderStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

interface FakeEmail {
  intent: TicketIntent;
  subject: string;
  body: string;
  urgency: TicketUrgency;
  sentiment: TicketSentiment;
  hasOrder: boolean;
}

const FAKE_NAMES = [
  ['Olivia', 'Reed'],
  ['Mason', 'Park'],
  ['Ava', 'Singh'],
  ['Noah', 'Garcia'],
  ['Mia', 'Brown'],
  ['Liam', 'Khan'],
  ['Sophia', 'Nguyen'],
  ['Lucas', 'Patel'],
  ['Isabella', 'Chen'],
  ['Ethan', 'Diaz'],
  ['Aria', 'Rossi'],
  ['Logan', 'Bauer'],
];

const ORDER_STATUS_TEMPLATES: FakeEmail[] = [
  {
    intent: 'ORDER_STATUS',
    subject: 'Where is my order?',
    body: 'Hi! I placed order #1234 last week and have not received any tracking yet. Can you check?',
    urgency: 'MEDIUM',
    sentiment: 'NEUTRAL',
    hasOrder: true,
  },
  {
    intent: 'ORDER_STATUS',
    subject: 'Order tracking question',
    body: 'Order #1235 has been "in transit" for 5 days. Is there an update?',
    urgency: 'MEDIUM',
    sentiment: 'NEGATIVE',
    hasOrder: true,
  },
  {
    intent: 'ORDER_STATUS',
    subject: 'Hasn\'t arrived',
    body: 'My package was supposed to arrive yesterday and still no sign of it. Order #1236.',
    urgency: 'HIGH',
    sentiment: 'ANGRY',
    hasOrder: true,
  },
  {
    intent: 'ORDER_STATUS',
    subject: 'Quick shipping question',
    body: 'Hello, when do you expect order #1237 to ship? No rush, just curious.',
    urgency: 'LOW',
    sentiment: 'POSITIVE',
    hasOrder: true,
  },
];

const REFUND_TEMPLATES: FakeEmail[] = [
  {
    intent: 'REFUND',
    subject: 'Refund request',
    body: 'I need a refund for order #1240 — the product arrived broken.',
    urgency: 'HIGH',
    sentiment: 'NEGATIVE',
    hasOrder: true,
  },
  {
    intent: 'REFUND',
    subject: 'Want my money back',
    body: 'Order #1241 is not what I expected, please refund the full amount.',
    urgency: 'MEDIUM',
    sentiment: 'ANGRY',
    hasOrder: true,
  },
  {
    intent: 'REFUND',
    subject: 'Refund please',
    body: 'Hi, can I get a refund for order #1242? It does not fit.',
    urgency: 'MEDIUM',
    sentiment: 'NEUTRAL',
    hasOrder: true,
  },
];

const REPLACEMENT_TEMPLATES: FakeEmail[] = [
  {
    intent: 'REPLACEMENT',
    subject: 'Defective item',
    body: 'Order #1245 came with a defective screen. Can you ship a replacement?',
    urgency: 'HIGH',
    sentiment: 'NEGATIVE',
    hasOrder: true,
  },
  {
    intent: 'REPLACEMENT',
    subject: 'Need replacement',
    body: 'The mug from order #1246 was cracked. Could you send another one?',
    urgency: 'MEDIUM',
    sentiment: 'NEUTRAL',
    hasOrder: true,
  },
];

const WRONG_ITEM_TEMPLATES: FakeEmail[] = [
  {
    intent: 'WRONG_ITEM',
    subject: 'Wrong product',
    body: 'I ordered a blue mug but received a green one. Order #1250.',
    urgency: 'MEDIUM',
    sentiment: 'NEGATIVE',
    hasOrder: true,
  },
  {
    intent: 'WRONG_ITEM',
    subject: 'Mix-up in order',
    body: 'Order #1251 contained the wrong size. Help!',
    urgency: 'MEDIUM',
    sentiment: 'NEGATIVE',
    hasOrder: true,
  },
];

const OTHER_TEMPLATES: FakeEmail[] = [
  {
    intent: 'GENERAL',
    subject: 'Do you ship to Canada?',
    body: 'Hi, just wondering if you ship internationally. Thanks!',
    urgency: 'LOW',
    sentiment: 'POSITIVE',
    hasOrder: false,
  },
  {
    intent: 'PRODUCT_QUESTION',
    subject: 'Material question',
    body: 'What is the material of the new tote bag? Allergic to wool.',
    urgency: 'LOW',
    sentiment: 'NEUTRAL',
    hasOrder: false,
  },
  {
    intent: 'COMPLAINT',
    subject: 'Disappointed',
    body: 'This is the third issue I have had this month. Very frustrating!',
    urgency: 'HIGH',
    sentiment: 'ANGRY',
    hasOrder: false,
  },
];

const TEMPLATE_GROUPS = [
  ...ORDER_STATUS_TEMPLATES,
  ...REFUND_TEMPLATES,
  ...REPLACEMENT_TEMPLATES,
  ...WRONG_ITEM_TEMPLATES,
  ...OTHER_TEMPLATES,
];

async function main(): Promise<void> {
  console.info('Seeding ResolveAI demo data…');

  const demoStore = await prisma.store.upsert({
    where: { domain: 'demo.resolveai.app' },
    update: { name: 'Demo Store' },
    create: {
      name: 'Demo Store',
      domain: 'demo.resolveai.app',
      platform: Platform.STANDALONE,
      subscriptionTier: SubscriptionTier.STARTER,
      settings: { refunds: { refundWindowDays: 30, refundShipping: false } },
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { storeId_email: { storeId: demoStore.id, email: 'owner@demo.resolveai.app' } },
    update: {},
    create: {
      storeId: demoStore.id,
      clerkUserId: `user_demo_${demoStore.id}`,
      email: 'owner@demo.resolveai.app',
      firstName: 'Demo',
      lastName: 'Owner',
      role: 'OWNER',
    },
  });

  await prisma.fAQDoc.upsert({
    where: { id: `seed-faq-${demoStore.id}` },
    update: {},
    create: {
      id: `seed-faq-${demoStore.id}`,
      storeId: demoStore.id,
      title: 'Refund policy',
      body: 'We offer full refunds within 30 days of purchase for unused items in original packaging.',
      tags: ['refunds', 'policy'],
    },
  });

  // Customers + orders pool.
  const customers = [];
  for (let i = 0; i < FAKE_NAMES.length; i += 1) {
    const [first, last] = FAKE_NAMES[i]!;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const customer = await prisma.customer.upsert({
      where: { storeId_email: { storeId: demoStore.id, email } },
      update: {},
      create: {
        storeId: demoStore.id,
        email,
        firstName: first,
        lastName: last,
        externalId: `cust-${i}-${randomUUID().slice(0, 8)}`,
      },
    });
    customers.push(customer);
  }

  const orders = [];
  for (let i = 0; i < 30; i += 1) {
    const customer = customers[i % customers.length]!;
    const externalId = `gid://shopify/Order/${1234 + i}`;
    const placedAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
    const status: OrderStatus =
      i % 7 === 0 ? 'PENDING' : i % 5 === 0 ? 'PAID' : i % 3 === 0 ? 'FULFILLED' : 'PAID';
    const isShipped: boolean = status === 'FULFILLED';
    const order = await prisma.order.upsert({
      where: { storeId_externalId: { storeId: demoStore.id, externalId } },
      update: {},
      create: {
        storeId: demoStore.id,
        customerId: customer.id,
        externalId,
        externalNumber: String(1234 + i),
        status,
        currency: 'USD',
        totalPrice: 49.99 + i,
        subtotalPrice: 44.99 + i,
        taxPrice: 5,
        shippingPrice: 0,
        trackingNumber: isShipped ? `1Z${100000 + i}` : null,
        trackingUrl: isShipped
          ? `https://wwwapps.ups.com/tracking/tracking.cgi?tracknum=1Z${100000 + i}`
          : null,
        placedAt,
      },
    });
    orders.push(order);
  }

  // 50 fake tickets across intents.
  const totalTickets = 50;
  for (let i = 0; i < totalTickets; i += 1) {
    const tpl = TEMPLATE_GROUPS[i % TEMPLATE_GROUPS.length]!;
    const customer = customers[i % customers.length]!;
    const order = tpl.hasOrder ? orders[i % orders.length] ?? null : null;

    const status: TicketStatus =
      tpl.intent === 'ORDER_STATUS' && i % 4 === 0
        ? 'RESOLVED'
        : tpl.intent === 'REFUND'
          ? 'AWAITING_HUMAN'
          : i % 3 === 0
            ? 'IN_PROGRESS'
            : 'NEW';

    const confidence = 0.6 + Math.random() * 0.4;
    const externalId = `<seed-${randomUUID()}@demo.resolveai.app>`;

    const ticket = await prisma.ticket.create({
      data: {
        storeId: demoStore.id,
        customerId: customer.id,
        orderId: order?.id ?? null,
        channel: TicketChannel.EMAIL,
        status,
        intent: tpl.intent,
        intentConfidence: confidence,
        urgency: tpl.urgency,
        sentiment: tpl.sentiment,
        subject: tpl.subject,
        externalId,
        autoResolved: status === 'RESOLVED' && tpl.intent === 'ORDER_STATUS',
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        firstResponseAt: status === 'RESOLVED' ? new Date() : null,
        messages: {
          create: {
            role: 'CUSTOMER',
            authorEmail: customer.email,
            authorName: `${customer.firstName} ${customer.lastName}`.trim(),
            body: tpl.body,
            externalId,
          },
        },
      },
    });

    if (status === 'RESOLVED' && tpl.intent === 'ORDER_STATUS') {
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          role: 'AI',
          body: `Hi ${customer.firstName ?? 'there'}, your order #${order?.externalNumber ?? ''} is on its way! Tracking: ${order?.trackingUrl ?? 'pending'}.`,
          llmMeta: { model: 'gpt-4o', tokens: { in: 350, out: 90 } } as object,
        },
      });
    }

    if (tpl.intent === 'REFUND' && order) {
      const action = await prisma.action.create({
        data: {
          storeId: demoStore.id,
          ticketId: ticket.id,
          orderId: order.id,
          kind: ActionKind.REFUND_FULL,
          status: ActionStatus.PENDING_APPROVAL,
          payload: {
            amount: order.totalPrice.toString(),
            currency: order.currency,
            orderExternalId: order.externalId,
          } as object,
          eligibility: {
            decision: 'ELIGIBLE',
            recommendedAmount: order.totalPrice.toString(),
            reasons: [{ code: 'WITHIN_WINDOW', message: 'Order placed within 30-day refund window' }],
          } as object,
          draftReply: `Hi ${customer.firstName ?? 'there'},\n\nI'm sorry about the issue with order #${order.externalNumber}. I've prepared a full refund of $${order.totalPrice.toString()} for your approval.\n\nLet me know if there's anything else I can do.\n\nThanks,\nResolveAI`,
        },
      });
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { proposedActionId: action.id },
      });
    }

    await prisma.auditLog.create({
      data: {
        storeId: demoStore.id,
        ticketId: ticket.id,
        kind: 'TICKET_CLASSIFIED',
        payload: { intent: tpl.intent, confidence } as object,
      },
    });
  }

  console.info(
    `Seeded store=${demoStore.id} user=${demoUser.id} customers=${customers.length} orders=${orders.length} tickets=${totalTickets}`,
  );
  console.info('Use these to run the dashboard locally:');
  console.info(`  NEXT_PUBLIC_DEMO_STORE_ID=${demoStore.id}`);
  console.info(`  NEXT_PUBLIC_DEMO_USER_ID=${demoUser.id}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
