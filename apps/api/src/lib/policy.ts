import { prisma, type Prisma } from '@resolveai/db';
import { DEFAULT_STORE_POLICY, storePolicySchema, type StorePolicy } from '@resolveai/shared';

/**
 * Loads the store's auto-resolution policy. Returns defaults (auto-refund off)
 * when no policy row exists. The result is always parsed through zod so the
 * worker/api can rely on shape and defaults.
 */
export async function loadStorePolicy(storeId: string): Promise<StorePolicy> {
  const row = await prisma.storePolicy.findUnique({ where: { storeId } });
  if (!row) return DEFAULT_STORE_POLICY;
  const parsed = storePolicySchema.safeParse({
    ...(row.policy as object),
    version: row.version,
  });
  if (!parsed.success) return DEFAULT_STORE_POLICY;
  return parsed.data;
}

export async function saveStorePolicy(opts: {
  storeId: string;
  policy: StorePolicy;
  updatedBy?: string;
}): Promise<StorePolicy> {
  const parsed = storePolicySchema.parse(opts.policy);
  const json = parsed as unknown as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.storePolicy.findUnique({ where: { storeId: opts.storeId } });
    const nextVersion = (existing?.version ?? 0) + 1;

    const updated = await tx.storePolicy.upsert({
      where: { storeId: opts.storeId },
      create: {
        storeId: opts.storeId,
        policy: json,
        version: nextVersion,
        updatedBy: opts.updatedBy,
      },
      update: {
        policy: json,
        version: nextVersion,
        updatedBy: opts.updatedBy,
      },
    });

    await tx.storePolicyRevision.create({
      data: {
        storeId: opts.storeId,
        version: nextVersion,
        policy: json,
        updatedBy: opts.updatedBy,
      },
    });

    return storePolicySchema.parse({ ...(updated.policy as object), version: updated.version });
  });
}
