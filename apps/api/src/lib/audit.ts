/**
 * Tamper-evident audit logging — wraps `prisma.auditLog.create` with a
 * per-store hash chain so every signed entry references the digest of
 * the previous one. Designed for SOC2-style integrity assurance.
 *
 * Migration story: existing call-sites that use `prisma.auditLog.create`
 * directly continue to work and produce rows with `digest = NULL`. New
 * (or upgraded) call-sites use `appendAuditLog`, and the verifier walks
 * only the digested subset for that store. Set
 * `AUDIT_SIGNING_KEY` (or fall back to `ENCRYPTION_KEY`) to enable.
 */
import { prisma, type Prisma } from '@resolveai/db';
import { computeChainDigest } from '@resolveai/shared';

export interface AppendAuditOptions {
  storeId: string;
  ticketId?: string | null;
  userId?: string | null;
  kind: Prisma.AuditLogUncheckedCreateInput['kind'];
  payload?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

function getSigningKey(): string {
  return process.env.AUDIT_SIGNING_KEY || process.env.ENCRYPTION_KEY || '';
}

/**
 * Append a single audit log entry for a store, linking it to the
 * previous digested entry for that store. Use a transaction to avoid
 * concurrent writers reading the same `prevDigest` and forking the
 * chain.
 */
export async function appendAuditLog(
  opts: AppendAuditOptions,
): Promise<{ id: string; digest: string | null }> {
  const secret = getSigningKey();
  if (!secret) {
    const created = await prisma.auditLog.create({
      data: {
        storeId: opts.storeId,
        ticketId: opts.ticketId ?? null,
        userId: opts.userId ?? null,
        kind: opts.kind,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
      select: { id: true, digest: true },
    });
    return created;
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
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
        createdAt,
        digest,
        prevDigest,
      },
      select: { id: true, digest: true },
    });
  });
}
