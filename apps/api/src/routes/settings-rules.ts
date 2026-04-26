import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import {
  autoRefundDecisionInputSchema,
  evaluateAutoRefund,
  storePolicySchema,
} from '@resolveai/shared';
import { loadStorePolicy, saveStorePolicy } from '../lib/policy.js';

const updatePolicyInputSchema = storePolicySchema.partial({ version: true });

const simulateBodySchema = z.object({
  policy: storePolicySchema.optional(),
  input: autoRefundDecisionInputSchema,
});

/**
 * Settings → Rules surface (Phase 2).
 *
 *   GET  /settings/rules
 *   PUT  /settings/rules
 *   POST /settings/rules/validate
 *   POST /settings/rules/simulate
 *   GET  /settings/rules/history
 */
export async function registerSettingsRulesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get('/settings/rules', async (req) => {
    const storeId = req.storeId!;
    const policy = await loadStorePolicy(storeId);
    return { policy };
  });

  app.put('/settings/rules', async (req) => {
    const storeId = req.storeId!;
    const userId = req.auth?.userId;
    const body = updatePolicyInputSchema.parse(req.body);

    const next = storePolicySchema.parse({ ...body, version: 0 });
    const saved = await saveStorePolicy({
      storeId,
      policy: next,
      updatedBy: userId ?? undefined,
    });

    await prisma.auditLog.create({
      data: {
        storeId,
        userId: userId ?? null,
        kind: 'POLICY_UPDATED',
        payload: { version: saved.version, policy: saved as unknown as object },
      },
    });

    return { policy: saved };
  });

  app.post('/settings/rules/validate', async (req) => {
    const parsed = storePolicySchema.safeParse(req.body);
    if (!parsed.success) {
      return { ok: false, errors: parsed.error.flatten() };
    }
    return { ok: true, policy: parsed.data };
  });

  app.post('/settings/rules/simulate', async (req) => {
    const storeId = req.storeId!;
    const body = simulateBodySchema.parse(req.body ?? {});
    const policy = body.policy ?? (await loadStorePolicy(storeId));
    const result = evaluateAutoRefund({ policy, input: body.input });
    return { policy, result };
  });

  app.get('/settings/rules/history', async (req) => {
    const storeId = req.storeId!;
    const items = await prisma.storePolicyRevision.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  });
}
