import { prisma } from '@resolveai/db';
import { DEFAULT_STORE_POLICY, storePolicySchema, type StorePolicy } from '@resolveai/shared';

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
