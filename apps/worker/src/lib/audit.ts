/**
 * Worker-side mirror of `apps/api/src/lib/audit.ts`. See that file for
 * the contract; the implementation is duplicated rather than shared
 * because both apps need to import their own `prisma` client.
 */
import { prisma, type Prisma } from '@resolveai/db';
import { computeChainDigest } from '@resolveai/shared';

export interface AppendAuditOptions {
  storeId: string;
  ticketId?: string | null;
  userId?: string | null;
  kind: Prisma.AuditLogUncheckedCreateInput['kind'];
  payload?: Prisma.InputJsonValue;
}

function getSigningKey(): string {
  return process.env.AUDIT_SIGNING_KEY || process.env.ENCRYPTION_KEY || '';
}

export async function appendAuditLog(
  opts: AppendAuditOptions,
): Promise<{ id: string; digest: string | null }> {
  const secret = getSigningKey();
  if (!secret) {
    return prisma.auditLog.create({
      data: {
        storeId: opts.storeId,
        ticketId: opts.ticketId ?? null,
        userId: opts.userId ?? null,
        kind: opts.kind,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true, digest: true },
    });
  }

  return prisma.$transaction(async (tx) => {
    const prev = await tx.auditLog.findFirst({
      where: { storeId: opts.storeId, digest: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { digest: true },
    });
    const prevDigest = prev?.digest ?? null;
    const createdAt = new Date();
    const { digest } = computeChainDigest(
      {
        storeId: opts.storeId,
        ticketId: opts.ticketId ?? null,
        userId: opts.userId ?? null,
        kind: String(opts.kind),
        payload: opts.payload ?? {},
        createdAt,
      },
      prevDigest,
      secret,
    );
    return tx.auditLog.create({
      data: {
        storeId: opts.storeId,
        ticketId: opts.ticketId ?? null,
        userId: opts.userId ?? null,
        kind: opts.kind,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
        createdAt,
        digest,
        prevDigest,
      },
      select: { id: true, digest: true },
    });
  });
}
