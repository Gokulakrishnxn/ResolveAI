import { ImapIdleListener, type InboundEmailWithThread } from '@resolveai/integrations-email';
import { prisma, type Prisma as P } from '@resolveai/db';
import { openCredentials } from '../lib/encryption.js';
import { logger } from '../lib/logger.js';
import { enqueueProcessTicket } from '../queue/index.js';

interface ImapCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

interface ActiveListener {
  integrationId: string;
  storeId: string;
  listener: ImapIdleListener;
}

const active: ActiveListener[] = [];

async function startOne(integrationId: string): Promise<ActiveListener | null> {
  const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
  if (!integration || integration.status !== 'ACTIVE' || integration.kind !== 'EMAIL_IMAP') return null;
  const creds = openCredentials<ImapCreds>(integration.credentials);
  const config = (integration.config as { mailbox?: string } | null) ?? {};
  const cursor = (integration.cursor as { lastSeenUid?: number } | null) ?? {};

  const listener = new ImapIdleListener({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    user: creds.user,
    password: creds.password,
    mailbox: creds.mailbox ?? config.mailbox ?? 'INBOX',
    lastSeenUid: cursor.lastSeenUid,
    logger: {
      info: (msg) => logger.info({ integrationId, storeId: integration.storeId }, msg),
      warn: (msg) => logger.warn({ integrationId, storeId: integration.storeId }, msg),
      error: (msg) => logger.error({ integrationId, storeId: integration.storeId }, msg),
    },
  });

  await listener.start(async (email: InboundEmailWithThread) => {
    await ingestEmail(integration.storeId, email);
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        cursor: { ...(integration.cursor as object), lastSeenUid: email.uid } as P.InputJsonValue,
        lastSyncAt: new Date(),
      },
    });
  });

  return { integrationId, storeId: integration.storeId, listener };
}

async function ingestEmail(storeId: string, email: InboundEmailWithThread): Promise<void> {
  const customerEmail = email.from.toLowerCase();
  const customer = await prisma.customer.upsert({
    where: { storeId_email: { storeId, email: customerEmail } },
    update: {},
    create: { storeId, email: customerEmail },
  });

  // Match an existing ticket by external thread key first.
  const existing = await prisma.ticket.findFirst({
    where: { storeId, channel: 'EMAIL', externalThreadId: email.threadKey },
    select: { id: true },
  });

  if (existing) {
    await prisma.message.create({
      data: {
        ticketId: existing.id,
        role: 'CUSTOMER',
        body: email.text,
        bodyHtml: email.html,
        authorEmail: customerEmail,
        externalId: email.rawMessageId ?? email.messageId,
      },
    });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      storeId,
      customerId: customer.id,
      channel: 'EMAIL',
      subject: email.subject,
      externalId: email.rawMessageId ?? email.messageId,
      externalThreadId: email.threadKey,
      messages: {
        create: {
          role: 'CUSTOMER',
          body: email.text,
          bodyHtml: email.html,
          authorEmail: customerEmail,
          externalId: email.rawMessageId ?? email.messageId,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: { storeId, ticketId: ticket.id, kind: 'TICKET_CREATED' },
  });

  await enqueueProcessTicket({ storeId, ticketId: ticket.id });
}

/**
 * Start IMAP IDLE listeners for every active EMAIL_IMAP integration.
 *
 * This is intentionally fire-and-forget: connection failures bubble into the
 * listener's reconnect loop, and the worker stays up.
 */
export async function startInboxListeners(): Promise<{ stopAll: () => Promise<void> }> {
  const integrations = await prisma.integration.findMany({
    where: { kind: 'EMAIL_IMAP', status: 'ACTIVE' },
    select: { id: true },
  });

  for (const i of integrations) {
    try {
      const handle = await startOne(i.id);
      if (handle) active.push(handle);
    } catch (err) {
      logger.error({ err, integrationId: i.id }, 'failed to start IMAP listener');
    }
  }

  logger.info({ count: active.length }, 'IMAP listeners started');

  return {
    stopAll: async () => {
      await Promise.allSettled(active.map((a) => a.listener.stop()));
      active.length = 0;
    },
  };
}
