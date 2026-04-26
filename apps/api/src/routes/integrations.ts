import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import { sealCredentials } from '../lib/encryption.js';

const upsertSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean().default(false),
  user: z.string().min(1),
  password: z.string().min(1),
  from: z.string().min(1),
  dkim: z
    .object({
      domainName: z.string().min(1),
      keySelector: z.string().min(1),
      privateKey: z.string().min(1),
    })
    .optional(),
});

const upsertImapSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
});

export async function registerIntegrationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get('/integrations', async (req) => {
    const storeId = req.storeId!;
    const items = await prisma.integration.findMany({
      where: { storeId },
      select: {
        id: true,
        kind: true,
        status: true,
        externalId: true,
        scopes: true,
        lastSyncAt: true,
        lastErrorAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  });

  app.put('/integrations/email/smtp', async (req) => {
    const storeId = req.storeId!;
    const body = upsertSmtpSchema.parse(req.body);
    const sealed = sealCredentials(body);
    return prisma.integration.upsert({
      where: {
        storeId_kind_externalId: {
          storeId,
          kind: 'EMAIL_SMTP',
          externalId: body.user,
        },
      },
      create: {
        storeId,
        kind: 'EMAIL_SMTP',
        status: 'ACTIVE',
        externalId: body.user,
        credentials: sealed as unknown as object,
      },
      update: {
        status: 'ACTIVE',
        credentials: sealed as unknown as object,
        lastError: null,
        lastErrorAt: null,
      },
    });
  });

  app.put('/integrations/email/imap', async (req) => {
    const storeId = req.storeId!;
    const body = upsertImapSchema.parse(req.body);
    const sealed = sealCredentials(body);
    return prisma.integration.upsert({
      where: {
        storeId_kind_externalId: {
          storeId,
          kind: 'EMAIL_IMAP',
          externalId: body.user,
        },
      },
      create: {
        storeId,
        kind: 'EMAIL_IMAP',
        status: 'ACTIVE',
        externalId: body.user,
        credentials: sealed as unknown as object,
        config: { mailbox: body.mailbox } as object,
      },
      update: {
        status: 'ACTIVE',
        credentials: sealed as unknown as object,
        config: { mailbox: body.mailbox } as object,
        lastError: null,
        lastErrorAt: null,
      },
    });
  });
}
