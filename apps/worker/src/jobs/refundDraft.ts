import { z } from 'zod';
import { prisma, type Prisma } from '@resolveai/db';
import {
  ValidationError,
  v1,
  type Phase1IntentClassification,
  refundEligibilitySchema,
  type RefundEligibility,
  evaluateAutoRefund,
  evaluateFraudGuards,
  composeWithFraud,
  mapReasonText,
  signAuditPayload,
  buildIdempotencyKey,
  type PolicyDecisionResult,
  type StorePolicy,
  type CustomerRiskFlag,
} from '@resolveai/shared';
import { recordAICall } from '@resolveai/ai';
import { getOpenAI } from '../lib/openai.js';
import { getShopifyForStore } from '../lib/integrations.js';
import { computeRefundEligibility } from './refund-eligibility.js';
import { loadStorePolicy } from '../lib/policy.js';
import { publishWorkerEvent } from '../lib/api-client.js';
import { enqueueExecuteAction } from '../queue/index.js';
import { logger } from '../lib/logger.js';

const { REFUND_DRAFT_PROMPT_VERSION, REFUND_DRAFT_SYSTEM_PROMPT, buildRefundDraftUserPrompt } = v1;

const replySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z.enum(['apologetic', 'professional', 'friendly']).default('professional'),
  confidence: z.number().min(0).max(1),
});

export interface RefundDraftJobInput {
  storeId: string;
  ticketId: string;
  classification: Phase1IntentClassification;
}

export interface RefundDraftJobResult {
  outcome: 'proposed' | 'auto_approved' | 'rejected' | 'escalated';
  reason: string;
  actionId?: string;
  policyDecision?: PolicyDecisionResult['decision'];
}

interface MessageAttachment {
  contentType?: string;
  filename?: string;
  url?: string;
}

function detectPhoto(attachments: unknown): boolean {
  if (!Array.isArray(attachments)) return false;
  for (const raw of attachments as MessageAttachment[]) {
    const ct = (raw?.contentType ?? '').toLowerCase();
    const fn = (raw?.filename ?? '').toLowerCase();
    if (ct.startsWith('image/')) return true;
    if (/\.(jpe?g|png|gif|heic|webp|bmp)$/i.test(fn)) return true;
  }
  return false;
}

export async function runRefundDraftJob(
  input: RefundDraftJobInput,
): Promise<RefundDraftJobResult> {
  const { storeId, ticketId, classification } = input;
  const log = logger.child({ job: 'refundDraft', storeId, ticketId });

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, storeId },
    include: {
      store: true,
      customer: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 5 },
      order: true,
    },
  });
  if (!ticket) return escalate(storeId, ticketId, 'ticket_not_found');
  const firstMessage = ticket.messages[0];
  if (!firstMessage) return escalate(storeId, ticketId, 'no_first_message');

  // 1. Resolve the order if we don't have one linked yet.
  let order = ticket.order;
  if (!order) {
    const shopify = await getShopifyForStore(storeId).catch(() => null);
    if (!shopify) return escalate(storeId, ticketId, 'shopify_not_connected');

    const orderIdGuess = (classification.extracted.orderId ?? '').replace(/^#/, '').trim();
    if (orderIdGuess) {
      try {
        const o = await shopify.getOrderById(orderIdGuess);
        const externalId = String(o.id);
        const upserted = await prisma.order.upsert({
          where: { storeId_externalId: { storeId, externalId } },
          create: {
            storeId,
            externalId,
            externalNumber: o.name ?? (o.order_number ? `#${o.order_number}` : undefined),
            currency: o.currency,
            totalPrice: o.total_price,
            subtotalPrice: o.subtotal_price ?? o.total_price,
            taxPrice: o.total_tax ?? '0',
            shippingPrice: '0',
            placedAt: new Date(o.created_at),
          },
          update: {},
        });
        order = upserted;
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { orderId: order.id },
        });
      } catch (err) {
        log.warn({ err, orderIdGuess }, 'order lookup by id failed');
      }
    }
  }
  if (!order) return escalate(storeId, ticketId, 'order_not_found');

  // 2. Compute eligibility.
  const settings =
    (ticket.store.settings as { refunds?: Record<string, unknown> } | null)?.refunds ?? {};
  const eligibility: RefundEligibility = computeRefundEligibility({
    order,
    settings: settings as { refundWindowDays?: number; refundShipping?: boolean },
  });

  // 3. Generate a draft reply.
  const customerFirstName = ticket.customer?.firstName ?? undefined;
  const ai = getOpenAI();
  const userPrompt = buildRefundDraftUserPrompt({
    customerName: customerFirstName ?? undefined,
    brandName: ticket.store.name,
    agentSignoff: `${ticket.store.name} Customer Support`,
    emailSubject: ticket.subject ?? '',
    emailBody: firstMessage.body,
    order: {
      externalNumber: order.externalNumber ?? order.externalId,
      status: order.status,
      placedAt: order.placedAt?.toISOString() ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
      daysSincePlaced: Math.floor(
        (Date.now() - (order.placedAt ?? order.createdAt).getTime()) / 86_400_000,
      ),
      currency: order.currency,
      totalPrice: order.totalPrice.toFixed(2),
      refundedAmount: order.refundedAmount.toFixed(2),
    },
    eligibility,
  });

  const startedAt = Date.now();
  const completion = await ai.call('refund.draft', (oai) =>
    oai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REFUND_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  );
  const latencyMs = Date.now() - startedAt;
  const usage = completion.usage;
  const raw = completion.choices[0]?.message?.content ?? '';

  await recordAICall({
    prisma,
    storeId,
    ticketId,
    operation: 'refund.draft',
    model: 'gpt-4o',
    promptVersion: REFUND_DRAFT_PROMPT_VERSION,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    latencyMs,
    metadata: {
      decision: eligibility.decision,
      reasonCode: eligibility.reasonCode,
    },
  });

  let parsed: z.infer<typeof replySchema>;
  try {
    parsed = replySchema.parse(JSON.parse(raw));
  } catch (err) {
    throw new ValidationError('refund-draft reply did not match schema', { raw, err });
  }

  // 4. Evaluate fraud guards + auto-refund policy.
  const policy: StorePolicy = await loadStorePolicy(storeId);
  const reasonCode =
    mapReasonText(`${ticket.subject ?? ''} ${firstMessage.body}`) ?? undefined;
  const hasPhoto = detectPhoto(firstMessage.attachments);
  const requestedUsd = Number(eligibility.refundableAmount);

  const customerFlags = (ticket.customer?.riskFlags ?? []) as CustomerRiskFlag[];
  const fraud = evaluateFraudGuards({
    input: {
      refundCount30d: ticket.customer?.refundCount30d ?? 0,
      refundTotal30dUsd: Number(ticket.customer?.refundTotal30dUsd ?? 0),
      lifetimeValueUsd: Number(ticket.customer?.lifetimeValueUsd ?? 0),
      existingFlags: customerFlags,
      disputeCount: ticket.customer?.disputeCount ?? 0,
    },
  });

  const policyDecisionRaw = evaluateAutoRefund({
    policy,
    input: {
      reasonCode,
      hasPhoto,
      requestedAmountUsd: requestedUsd,
      order: {
        ageDays: Math.max(
          0,
          Math.floor(
            (Date.now() - (order.placedAt ?? order.createdAt).getTime()) / 86_400_000,
          ),
        ),
        currency: order.currency,
        totalAmountUsd: Number(order.totalPrice.toFixed(2)),
      },
      customer: { flags: customerFlags },
      eligibility,
    },
  });
  const decision = composeWithFraud(policyDecisionRaw, fraud);
  log.info(
    {
      policyDecision: policyDecisionRaw.decision,
      composedDecision: decision.decision,
      fraud: fraud.decision,
      reasons: decision.reasons.map((r) => r.code),
    },
    'auto-refund decision composed',
  );

  // 5. Persist proposed action + draft + policy decision.
  const isAutoApprove = decision.decision === 'AUTO_APPROVE';
  const isReject = decision.decision === 'REJECT';

  const idempotencyKey = isAutoApprove
    ? buildIdempotencyKey('shopify.refund', {
        storeId,
        orderExternalId: order.externalId,
        amount: eligibility.refundableAmount,
        currency: eligibility.currency,
        ticketId,
      })
    : null;

  const eligibilityWithDecision = {
    ...refundEligibilitySchema.parse(eligibility),
    policyDecision: decision,
    reasonCodeExtracted: reasonCode ?? null,
    hasPhoto,
  };

  const action = await prisma.action.create({
    data: {
      storeId,
      ticketId,
      orderId: order.id,
      kind: eligibility.decision === 'PARTIAL' ? 'REFUND_PARTIAL' : 'REFUND_FULL',
      status: isAutoApprove ? 'APPROVED' : isReject ? 'REJECTED' : 'PENDING_APPROVAL',
      payload: {
        amount: eligibility.refundableAmount,
        currency: eligibility.currency,
        reason: reasonCode ?? 'customer_request',
        notify: true,
        orderExternalId: order.externalId,
      } as Prisma.InputJsonValue,
      reasoning: eligibility.reasonHumanReadable,
      eligibility: eligibilityWithDecision as unknown as Prisma.InputJsonValue,
      draftReply: parsed.body,
      idempotencyKey: idempotencyKey,
    },
  });

  // Ticket transitions: AUTO_APPROVE → IN_PROGRESS (worker continues),
  // REJECT → AWAITING_HUMAN (human re-routes), REQUIRE_HUMAN → AWAITING_HUMAN.
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: isAutoApprove ? 'IN_PROGRESS' : 'AWAITING_HUMAN',
      proposedActionId: action.id,
      firstResponseAt: ticket.firstResponseAt ?? new Date(),
    },
  });

  await prisma.message.create({
    data: {
      ticketId,
      role: 'AI',
      body: parsed.body,
      authorName: ticket.store.name,
      llmMeta: {
        operation: 'refund.draft',
        promptVersion: REFUND_DRAFT_PROMPT_VERSION,
        modelConfidence: parsed.confidence,
        eligibility: eligibility.decision,
        policyDecision: decision.decision,
      } as Prisma.InputJsonValue,
    },
  });

  // Signed, immutable audit payload for the composed decision.
  const signed = signAuditPayload({
    actionId: action.id,
    storeId,
    ticketId,
    orderExternalId: order.externalId,
    eligibility: refundEligibilitySchema.parse(eligibility),
    policy,
    fraud,
    policyDecisionRaw,
    decision,
    inputs: {
      reasonCode: reasonCode ?? null,
      hasPhoto,
      requestedAmountUsd: requestedUsd,
      orderCurrency: order.currency,
      orderTotal: order.totalPrice.toFixed(2),
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId,
      ticketId,
      kind: 'POLICY_DECISION',
      payload: signed as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId,
      ticketId,
      kind: isAutoApprove ? 'ACTION_AUTO_APPROVED' : isReject ? 'ACTION_REJECTED' : 'ACTION_PROPOSED',
      payload: {
        actionId: action.id,
        kind: action.kind,
        eligibility: eligibility.decision,
        amount: eligibility.refundableAmount,
        policyDecision: decision.decision,
      },
    },
  });

  await publishWorkerEvent({
    type: isAutoApprove ? 'action.auto_approved' : 'action.proposed',
    storeId,
    ticketId,
    actionId: action.id,
    kind: action.kind,
  });

  if (isAutoApprove) {
    await enqueueExecuteAction({ storeId, actionId: action.id });
    return {
      outcome: 'auto_approved',
      reason: 'policy_auto_approve',
      actionId: action.id,
      policyDecision: decision.decision,
    };
  }
  if (isReject) {
    return {
      outcome: 'rejected',
      reason: decision.reasons.map((r) => r.code).join(','),
      actionId: action.id,
      policyDecision: decision.decision,
    };
  }
  return {
    outcome: 'proposed',
    reason: eligibility.decision,
    actionId: action.id,
    policyDecision: decision.decision,
  };
}

async function escalate(
  storeId: string,
  ticketId: string,
  reason: string,
): Promise<RefundDraftJobResult> {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'AWAITING_HUMAN' },
  });
  await prisma.auditLog.create({
    data: {
      storeId,
      ticketId,
      kind: 'TICKET_ESCALATED',
      payload: { reason },
    },
  });
  await publishWorkerEvent({ type: 'ticket.updated', storeId, ticketId });
  return { outcome: 'escalated', reason };
}
