import { Worker, type Job } from 'bullmq';
import { z } from 'zod';
import { prisma, type ActionKind, type Action, type Order, type Prisma } from '@resolveai/db';
import { ShopifyClient } from '@resolveai/integrations-shopify';
import { WooCommerceClient } from '@resolveai/integrations-woocommerce';
import { actionSchema, buildIdempotencyKey, signAuditPayload } from '@resolveai/shared';
import { getRedis } from '../lib/redis.js';
import { getConfig } from '../config.js';
import { logger } from '../lib/logger.js';
import { openCredentials } from '../lib/encryption.js';
import { publishWorkerEvent } from '../lib/api-client.js';
import { recomputeCustomerRisk } from '../jobs/recomputeRisk.js';
import { appendAuditLog } from '../lib/audit.js';

const jobDataSchema = z.object({
  storeId: z.string().min(1),
  actionId: z.string().min(1),
});

interface ResolvedClients {
  shopify?: ShopifyClient;
  woo?: WooCommerceClient;
}

async function resolvePlatformClient(storeId: string): Promise<ResolvedClients> {
  const cfg = getConfig();
  const integrations = await prisma.integration.findMany({
    where: { storeId, status: 'ACTIVE', kind: { in: ['SHOPIFY', 'WOOCOMMERCE'] } },
  });
  const result: ResolvedClients = {};

  for (const integration of integrations) {
    try {
      if (integration.kind === 'SHOPIFY' && integration.externalId) {
        const creds = openCredentials<{ accessToken: string }>(integration.credentials);
        result.shopify = new ShopifyClient({
          shopDomain: integration.externalId,
          accessToken: creds.accessToken,
          apiVersion: cfg.SHOPIFY_API_VERSION,
        });
      } else if (integration.kind === 'WOOCOMMERCE') {
        const creds = openCredentials<{
          baseUrl: string;
          consumerKey: string;
          consumerSecret: string;
        }>(integration.credentials);
        result.woo = new WooCommerceClient(creds);
      }
    } catch (err) {
      logger.warn({ err, kind: integration.kind }, 'failed to instantiate integration client');
    }
  }
  return result;
}

export function startActionExecutor(): Worker {
  const cfg = getConfig();

  const worker = new Worker(
    'action-executor',
    async (job: Job) => {
      const { storeId, actionId } = jobDataSchema.parse(job.data);
      const log = logger.child({ jobId: job.id, storeId, actionId });

      const action = await prisma.action.findFirst({
        where: { id: actionId, storeId },
        include: {
          order: true,
          ticket: { select: { id: true, externalThreadId: true, customerId: true } },
        },
      });
      if (!action) return { ok: false, reason: 'not_found' };
      if (action.status !== 'APPROVED') {
        log.warn({ status: action.status }, 'action not approved, skipping');
        return { ok: false, reason: 'not_approved' };
      }

      const validated = actionSchema.safeParse({ kind: action.kind, payload: action.payload });
      if (!validated.success) {
        await prisma.action.update({
          where: { id: action.id },
          data: { status: 'FAILED', error: 'Invalid payload at exec time' },
        });
        return { ok: false, reason: 'invalid_payload' };
      }

      await prisma.action.update({ where: { id: action.id }, data: { status: 'EXECUTING' } });

      const { shopify, woo } = await resolvePlatformClient(storeId);
      let result: unknown = null;

      try {
        result = await executeAction({
          action,
          order: action.order,
          shopify,
          woo,
        });

        const elig = action.eligibility as
          | { policyDecision?: { decision?: string } }
          | null;
        const wasAutoApproved =
          (action.kind === 'REFUND_FULL' || action.kind === 'REFUND_PARTIAL') &&
          action.approvedById == null &&
          elig?.policyDecision?.decision === 'AUTO_APPROVE';

        const signedExec = signAuditPayload({
          actionId: action.id,
          storeId,
          ticketId: action.ticketId,
          kind: action.kind,
          autoApproved: wasAutoApproved,
          payload: action.payload,
          eligibility: action.eligibility,
          result: result as unknown,
          executedAt: new Date().toISOString(),
        });

        await prisma.action.update({
          where: { id: action.id },
          data: { status: 'EXECUTED', executedAt: new Date(), result: result as object },
        });
        await appendAuditLog({
          storeId,
          ticketId: action.ticketId,
          kind: 'ACTION_EXECUTED',
          payload: signedExec as unknown as Prisma.InputJsonValue,
        });

        if (wasAutoApproved) {
          await appendAuditLog({
            storeId,
            ticketId: action.ticketId,
            kind: 'AUTO_REFUND_COMPLETED',
            payload: signedExec as unknown as Prisma.InputJsonValue,
          });
          await publishWorkerEvent({
            type: 'action.auto_refund_completed',
            storeId,
            ticketId: action.ticketId,
            actionId: action.id,
          });
        }

        // Recompute fraud aggregates after every refund execution.
        if (
          (action.kind === 'REFUND_FULL' || action.kind === 'REFUND_PARTIAL') &&
          action.ticket?.customerId
        ) {
          try {
            await recomputeCustomerRisk({ storeId, customerId: action.ticket.customerId });
          } catch (err) {
            log.warn({ err }, 'recompute risk failed (non-fatal)');
          }
        }

        await publishWorkerEvent({
          type: 'action.executed',
          storeId,
          ticketId: action.ticketId,
          actionId: action.id,
        });

        return { ok: true, autoApproved: wasAutoApproved };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err }, 'action execution failed');
        await prisma.$transaction([
          prisma.action.update({
            where: { id: action.id },
            data: { status: 'FAILED', error: message },
          }),
          prisma.auditLog.create({
            data: {
              storeId,
              ticketId: action.ticketId,
              kind: 'ACTION_FAILED',
              payload: { actionId: action.id, error: message },
            },
          }),
        ]);
        throw err;
      }
    },
    {
      connection: getRedis(),
      prefix: cfg.REDIS_QUEUE_PREFIX,
      concurrency: cfg.WORKER_CONCURRENCY,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'action-executor failed');
  });

  return worker;
}

interface ExecuteCtx {
  action: Action & { ticket: { id: string; externalThreadId: string | null } };
  order: Order | null;
  shopify?: ShopifyClient;
  woo?: WooCommerceClient;
}

async function executeAction(ctx: ExecuteCtx): Promise<unknown> {
  const { action } = ctx;
  const payload = (action.payload as Record<string, unknown>) ?? {};
  const kind = action.kind as ActionKind;

  switch (kind) {
    case 'REFUND_FULL':
    case 'REFUND_PARTIAL': {
      if (!ctx.order) throw new Error('Order missing for refund');
      const amount = String(payload.amount ?? ctx.order.totalPrice);
      const currency = String(payload.currency ?? ctx.order.currency);
      const reason = String(payload.reason ?? 'Customer request');
      const idempotencyKey =
        action.idempotencyKey ??
        buildIdempotencyKey('shopify.refund', {
          actionId: action.id,
          orderExternalId: ctx.order.externalId,
          amount,
          currency,
        });

      if (ctx.shopify) {
        const refund = await ctx.shopify.createRefund({
          orderId: ctx.order.externalId,
          amount,
          currency,
          reason,
          notify: payload.notify === false ? false : true,
          idempotencyKey,
        });
        // Track the refunded amount on our local order copy.
        await prisma.order.update({
          where: { id: ctx.order.id },
          data: {
            refundedAmount: ctx.order.refundedAmount.add(amount),
            status: kind === 'REFUND_FULL' ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          },
        });
        return refund;
      }
      if (ctx.woo) {
        return ctx.woo.refundOrder({
          orderId: ctx.order.externalId,
          amount,
          reason,
        });
      }
      throw new Error('No e-commerce integration configured');
    }
    case 'CANCEL_ORDER': {
      if (!ctx.order) throw new Error('Order missing for cancel');
      const idempotencyKey =
        action.idempotencyKey ??
        buildIdempotencyKey('shopify.cancel', { orderExternalId: ctx.order.externalId });
      if (ctx.shopify) {
        return ctx.shopify.cancelOrder({
          orderId: ctx.order.externalId,
          reason: 'customer',
          idempotencyKey,
        });
      }
      if (ctx.woo) return ctx.woo.cancelOrder(ctx.order.externalId);
      throw new Error('No e-commerce integration configured');
    }
    case 'REPLY':
    case 'CLOSE_TICKET':
    case 'TAG_CUSTOMER':
    case 'ESCALATE_HUMAN':
    case 'RESEND_TRACKING':
    case 'REPLACEMENT':
    case 'UPDATE_ADDRESS':
      return { kind, status: 'noop' };
  }
}
