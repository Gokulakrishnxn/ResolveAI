import { Worker, type Job } from 'bullmq';
import { z } from 'zod';
import { prisma, type TicketIntent } from '@resolveai/db';
import { classifyIntent, recordAICall } from '@resolveai/ai';
import { parseFeatureFlags, v1 } from '@resolveai/shared';
import { getOpenAI } from '../lib/openai.js';
import { getRedis } from '../lib/redis.js';
import { getConfig } from '../config.js';
import { logger } from '../lib/logger.js';
import { runOrderStatusJob } from '../jobs/orderStatus.js';
import { runRefundDraftJob } from '../jobs/refundDraft.js';
import { publishWorkerEvent } from '../lib/api-client.js';
import { checkAndRecordTicketUsage } from '../lib/billing.js';

const { INTENT_PROMPT_VERSION } = v1;

const jobDataSchema = z.object({
  storeId: z.string().min(1),
  ticketId: z.string().min(1),
});

/**
 * Map the public Phase-1 intent enum to our internal TicketIntent enum.
 */
function mapIntent(intent: string): TicketIntent {
  switch (intent) {
    case 'ORDER_STATUS':
      return 'ORDER_STATUS';
    case 'REFUND':
      return 'REFUND';
    case 'REPLACEMENT':
      return 'REPLACEMENT';
    case 'WRONG_ITEM':
      return 'WRONG_ITEM';
    default:
      return 'OTHER';
  }
}

export function startTicketProcessor(): Worker {
  const cfg = getConfig();
  const flags = parseFeatureFlags();
  const ai = getOpenAI();

  const worker = new Worker(
    'ticket-processor',
    async (job: Job) => {
      const { storeId, ticketId } = jobDataSchema.parse(job.data);
      const log = logger.child({ jobId: job.id, storeId, ticketId });

      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, storeId },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 5 },
          customer: true,
        },
      });
      if (!ticket) {
        log.warn('ticket not found, skipping');
        return { ok: false, reason: 'not_found' };
      }
      const firstMessage = ticket.messages[0];
      if (!firstMessage) {
        log.warn('ticket has no messages');
        return { ok: false, reason: 'empty' };
      }

      // 0. Billing gate — block past hard limits before incurring AI cost.
      const billing = await checkAndRecordTicketUsage(storeId, ticketId);
      if (!billing.decision.allowed) {
        log.warn({ reason: billing.decision.reason }, 'ticket blocked by plan limit');
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'AWAITING_HUMAN' },
        });
        await publishWorkerEvent({ type: 'ticket.updated', storeId, ticketId });
        return { ok: false, reason: billing.decision.reason };
      }

      // 1. Classify with Phase-1 prompt.
      const startedAt = Date.now();
      const result = await classifyIntent(ai, {
        subject: ticket.subject ?? '',
        body: firstMessage.body,
        fromEmail: firstMessage.authorEmail ?? ticket.customer?.email ?? undefined,
        receivedAt: firstMessage.createdAt,
        model: cfg.OPENAI_MODEL_CLASSIFIER,
      });

      await recordAICall({
        prisma,
        storeId,
        ticketId,
        operation: 'intent.classify',
        model: result.model,
        promptVersion: INTENT_PROMPT_VERSION,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: result.latencyMs,
        metadata: {
          intent: result.classification.intent,
          confidence: result.classification.confidence,
        },
      });

      const cls = result.classification;
      log.info(
        { intent: cls.intent, confidence: cls.confidence, latencyMs: Date.now() - startedAt },
        'classified',
      );

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          intent: mapIntent(cls.intent),
          intentConfidence: cls.confidence,
          urgency:
            cls.urgency === 'HIGH' ? 'HIGH' : cls.urgency === 'LOW' ? 'LOW' : 'MEDIUM',
          sentiment:
            cls.sentiment === 'POSITIVE'
              ? 'POSITIVE'
              : cls.sentiment === 'NEGATIVE'
                ? 'NEGATIVE'
                : cls.sentiment === 'ANGRY'
                  ? 'ANGRY'
                  : 'NEUTRAL',
          priority: cls.urgency === 'HIGH' ? 'HIGH' : 'NORMAL',
          status: 'IN_PROGRESS',
        },
      });

      await prisma.auditLog.create({
        data: {
          storeId,
          ticketId,
          kind: 'TICKET_CLASSIFIED',
          payload: { ...cls, promptVersion: INTENT_PROMPT_VERSION },
        },
      });

      await publishWorkerEvent({
        type: 'ticket.classified',
        storeId,
        ticketId,
        intent: cls.intent,
        confidence: cls.confidence,
      });

      // 1b. Chat-only handoff trigger: if confidence is low we hand off to
      // a human immediately without invoking the resolver.
      if (ticket.channel === 'CHAT' && cls.confidence < 0.6) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'AWAITING_HUMAN' },
        });
        await prisma.auditLog.create({
          data: {
            storeId,
            ticketId,
            kind: 'CHAT_HANDOFF',
            payload: { reason: 'low_confidence', confidence: cls.confidence },
          },
        });
        await publishWorkerEvent({
          type: 'chat.handoff',
          storeId,
          ticketId,
          reason: 'low_confidence',
        });
        return { ok: true, route: 'handoff', reason: 'low_confidence' };
      }

      // 2. Route by intent.
      try {
        if (cls.intent === 'ORDER_STATUS') {
          const auto = flags.AUTO_RESOLVE_ORDER_STATUS;
          const out = await runOrderStatusJob({
            storeId,
            ticketId,
            classification: cls,
            autoSendEnabled: auto,
          });
          return { ok: true, route: 'order_status', ...out };
        }
        if (cls.intent === 'REFUND') {
          const out = await runRefundDraftJob({ storeId, ticketId, classification: cls });
          return { ok: true, route: 'refund', ...out };
        }
      } catch (err) {
        log.error({ err }, 'phase-1 routing failed; escalating to human');
      }

      // 3. Default: escalate.
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'AWAITING_HUMAN' },
      });
      await prisma.auditLog.create({
        data: {
          storeId,
          ticketId,
          kind: 'TICKET_ESCALATED',
          payload: { reason: 'intent_not_handled_in_phase1', intent: cls.intent },
        },
      });
      await publishWorkerEvent({ type: 'ticket.updated', storeId, ticketId });
      return { ok: true, route: 'escalate', intent: cls.intent };
    },
    {
      connection: getRedis(),
      prefix: cfg.REDIS_QUEUE_PREFIX,
      concurrency: cfg.WORKER_CONCURRENCY,
    },
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, result }, 'ticket-processor completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'ticket-processor failed');
  });

  return worker;
}
