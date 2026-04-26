/**
 * Onboarding wizard backend. The merchant-facing wizard lives in
 * `apps/web/(onboarding)/onboarding/*`; this module is the single
 * authoritative API used to:
 *
 *   - report wizard progress so the dashboard can resume mid-flow
 *   - list integration connection state across channels
 *   - apply an automation preset (Conservative / Balanced / Aggressive)
 *   - send a synthetic test ticket so the merchant sees AI live
 *
 * The wizard's "5 minutes to first resolution" target depends on this
 * surface short-circuiting around already-installed integrations.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@resolveai/db';
import {
  AUTOMATION_PRESET_IDS,
  presetForId,
  storePolicySchema,
  type AutomationPresetId,
} from '@resolveai/shared';
import { saveStorePolicy } from '../lib/policy.js';
import { enqueueProcessTicket } from '../queue/index.js';

const presetSchema = z.object({
  preset: z.enum(AUTOMATION_PRESET_IDS),
});

const testTicketSchema = z.object({
  scenario: z.enum(['order_status', 'refund', 'wrong_item']).default('order_status'),
});

export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  /** GET /onboarding/state — single round-trip status for the wizard. */
  app.get('/onboarding/state', async (req) => {
    const storeId = req.storeId!;
    const [store, integrations, faqDocCount, ticketCount] = await Promise.all([
      prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true, settings: true, subscription: true },
      }),
      prisma.integration.findMany({
        where: { storeId },
        select: { kind: true, status: true },
      }),
      prisma.fAQDoc.count({ where: { storeId } }),
      prisma.ticket.count({ where: { storeId } }),
    ]);

    const byKind = Object.fromEntries(integrations.map((i) => [i.kind, i.status]));
    const completedSteps: string[] = [];
    if (byKind.SHOPIFY === 'ACTIVE' || byKind.WOOCOMMERCE === 'ACTIVE') {
      completedSteps.push('platform');
    }
    if (byKind.EMAIL_IMAP || byKind.EMAIL_SMTP || byKind.WHATSAPP_CLOUD || byKind.CHAT) {
      completedSteps.push('channel');
    }
    if (faqDocCount > 0) completedSteps.push('knowledge');
    const settings = (store?.settings ?? {}) as Record<string, unknown>;
    if (settings.automationPreset) completedSteps.push('automation');
    if (ticketCount > 0) completedSteps.push('test');

    return {
      store,
      integrations: byKind,
      completedSteps,
      knowledgeDocCount: faqDocCount,
      ticketCount,
      automationPreset: settings.automationPreset ?? null,
    };
  });

  /** POST /onboarding/automation-preset — apply Conservative / Balanced / Aggressive. */
  app.post('/onboarding/automation-preset', async (req) => {
    const storeId = req.storeId!;
    const userId = req.auth?.userId;
    const { preset } = presetSchema.parse(req.body);

    const tpl = presetForId(preset as AutomationPresetId);
    const next = storePolicySchema.parse(tpl.policy);

    await saveStorePolicy({ storeId, policy: next, updatedBy: userId });
    await prisma.store.update({
      where: { id: storeId },
      data: {
        settings: {
          ...((await prisma.store.findUnique({ where: { id: storeId } }))?.settings as object ??
            {}),
          automationPreset: preset,
        },
      },
    });
    return { ok: true, preset, policy: next };
  });

  /**
   * POST /onboarding/test-ticket — synthesize a realistic test ticket and
   * enqueue it for processing. The wizard polls for the resulting reply.
   */
  app.post('/onboarding/test-ticket', async (req) => {
    const storeId = req.storeId!;
    const { scenario } = testTicketSchema.parse(req.body);

    const message = scenarioMessage(scenario);
    const ticket = await prisma.ticket.create({
      data: {
        storeId,
        channel: 'API',
        status: 'NEW',
        subject: message.subject,
        priority: 'NORMAL',
        intent: 'OTHER',
        messages: {
          create: [
            {
              role: 'CUSTOMER',
              authorName: 'Test Customer',
              authorEmail: 'demo+test@resolveai.app',
              body: message.body,
            },
          ],
        },
      },
      select: { id: true },
    });
    await enqueueProcessTicket({ storeId, ticketId: ticket.id });
    return { ticketId: ticket.id };
  });
}

function scenarioMessage(scenario: 'order_status' | 'refund' | 'wrong_item'): {
  subject: string;
  body: string;
} {
  switch (scenario) {
    case 'refund':
      return {
        subject: 'Need a refund — order arrived damaged',
        body: "Hi, my order #1234 arrived broken. Photo attached. Please refund the order. Thanks!",
      };
    case 'wrong_item':
      return {
        subject: 'You sent me the wrong product',
        body: "Order #5678 — I ordered a blue shirt size M but received a red shirt size L. Can you sort this out?",
      };
    case 'order_status':
    default:
      return {
        subject: 'Where is my order?',
        body: "Hi team, just checking on order #1001 — placed it 5 days ago, hasn't shipped yet. When can I expect it?",
      };
  }
}
