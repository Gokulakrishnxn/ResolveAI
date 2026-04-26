import { z } from 'zod';
import { prisma, type Prisma } from '@resolveai/db';
import {
  ValidationError,
  v1,
  withSpan,
  type Phase1IntentClassification,
  type RagHit,
} from '@resolveai/shared';
import { recordAICall, retrieveContext } from '@resolveai/ai';
import { getOpenAI } from '../lib/openai.js';
import {
  getShopifyForStore,
  getSmtpForStore,
  getWhatsappForStore,
} from '../lib/integrations.js';
import { evaluateWhatsappWindow } from '@resolveai/integrations-whatsapp';
import { broadcastChatMessage, publishWorkerEvent } from '../lib/api-client.js';
import { logger } from '../lib/logger.js';

const { ORDER_STATUS_PROMPT_VERSION, ORDER_STATUS_SYSTEM_PROMPT, buildOrderStatusUserPrompt } = v1;

const replySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export interface OrderStatusJobInput {
  storeId: string;
  ticketId: string;
  classification: Phase1IntentClassification;
  /** When false, we skip auto-send and only persist the draft + escalate. */
  autoSendEnabled: boolean;
}

export interface OrderStatusJobResult {
  outcome: 'auto_resolved' | 'escalated';
  reason: string;
}

const AUTO_CONFIDENCE = 0.8;

export async function runOrderStatusJob(
  input: OrderStatusJobInput,
): Promise<OrderStatusJobResult> {
  const { storeId, ticketId, classification, autoSendEnabled } = input;
  const log = logger.child({ job: 'orderStatus', storeId, ticketId });

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, storeId },
    include: {
      store: true,
      customer: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 5 },
    },
  });
  if (!ticket) return { outcome: 'escalated', reason: 'ticket_not_found' };

  const firstMessage = ticket.messages[0];
  if (!firstMessage) {
    return escalate(storeId, ticketId, 'no_first_message');
  }

  // 1. Find an order — either by extracted orderId or by sender email.
  const shopify = await getShopifyForStore(storeId).catch(() => null);
  if (!shopify) {
    return escalate(storeId, ticketId, 'shopify_not_connected');
  }

  let order = null;
  const orderIdGuess = (classification.extracted.orderId ?? '').replace(/^#/, '').trim();
  if (orderIdGuess) {
    try {
      order = await shopify.getOrderById(orderIdGuess);
    } catch (err) {
      log.warn({ err, orderIdGuess }, 'order lookup by id failed');
    }
  }
  if (!order) {
    const senderEmail =
      classification.extracted.email ?? firstMessage.authorEmail ?? ticket.customer?.email ?? null;
    if (senderEmail) {
      try {
        const orders = await shopify.getOrdersByEmail(senderEmail, 5);
        order = orders[0] ?? null;
      } catch (err) {
        log.warn({ err }, 'order lookup by email failed');
      }
    }
  }
  if (!order) {
    return escalate(storeId, ticketId, 'order_not_found');
  }

  // 2. Pull tracking.
  const tracking = await shopify.getTrackingInfo(order.id).catch(() => null);

  // 3. Draft a reply with gpt-4o.
  const ai = getOpenAI();
  const customerFirstName =
    ticket.customer?.firstName ?? order.customer?.first_name ?? undefined;

  // RAG: pull store FAQs / shipping policy snippets for grounding.
  const ragHits: RagHit[] = await withSpan('rag.retrieve', async () => {
    try {
      return await retrieveContext(ai, prisma, {
        storeId,
        query: `${ticket.subject ?? ''}\n${firstMessage.body}`.slice(0, 2_000),
        topK: 3,
        ownerKinds: ['FAQ_DOC'],
      });
    } catch (err) {
      log.warn({ err }, 'rag retrieval failed; continuing without sources');
      return [];
    }
  });
  const policySnippets = ragHits.map((h, i) => ({
    id: `kb${i + 1}:${h.ownerId}`,
    content: h.content.slice(0, 600),
  }));

  const userPrompt = buildOrderStatusUserPrompt({
    customerName: customerFirstName ?? undefined,
    brandName: ticket.store.name,
    agentSignoff: `${ticket.store.name} Customer Support`,
    emailSubject: ticket.subject ?? '',
    emailBody: firstMessage.body,
    order: {
      externalNumber: order.name ?? `#${order.order_number ?? order.id}`,
      status: order.fulfillment_status ?? order.financial_status ?? 'unknown',
      placedAt: order.created_at,
      fulfilledAt:
        (order.fulfillments ?? [])[0]?.created_at ?? null,
      trackingNumber: tracking?.number ?? null,
      trackingUrl: tracking?.url ?? null,
      estimatedDelivery: null,
      currency: order.currency,
      totalPrice: order.total_price,
      lineItems: (order.line_items ?? []).map((li) => ({
        title: li.title,
        quantity: li.quantity,
      })),
    },
    policySnippets: policySnippets.length > 0 ? policySnippets : undefined,
  });

  const startedAt = Date.now();
  const completion = await withSpan('ai.orderStatus.draft', () =>
    ai.call('orderStatus.draft', (oai) =>
      oai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ORDER_STATUS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    ),
  );
  const latencyMs = Date.now() - startedAt;
  const usage = completion.usage;
  const raw = completion.choices[0]?.message?.content ?? '';

  await recordAICall({
    prisma,
    storeId,
    ticketId,
    operation: 'orderStatus.draft',
    model: 'gpt-4o',
    promptVersion: ORDER_STATUS_PROMPT_VERSION,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    latencyMs,
    metadata: {
      confidence: classification.confidence,
      intent: classification.intent,
      ragSources: policySnippets.map((s) => s.id),
    },
  });

  let parsed: z.infer<typeof replySchema>;
  try {
    parsed = replySchema.parse(JSON.parse(raw));
  } catch (err) {
    log.warn({ err }, 'order-status draft failed schema validation');
    throw new ValidationError('order-status reply did not match schema', { raw });
  }

  const recipient =
    firstMessage.authorEmail ?? ticket.customer?.email ?? order.email ?? undefined;
  const shouldAutoSend =
    autoSendEnabled &&
    classification.confidence >= AUTO_CONFIDENCE &&
    parsed.confidence >= AUTO_CONFIDENCE &&
    Boolean(recipient);

  // Persist the AI draft as a message regardless of send.
  const aiMessage = await prisma.message.create({
    data: {
      ticketId,
      role: 'AI',
      body: parsed.body,
      authorName: ticket.store.name,
      llmMeta: {
        operation: 'orderStatus.draft',
        promptVersion: ORDER_STATUS_PROMPT_VERSION,
        modelConfidence: parsed.confidence,
        classifierConfidence: classification.confidence,
      } as Prisma.InputJsonValue,
    },
  });

  const isChat = ticket.channel === 'CHAT';
  const isWhatsapp = ticket.channel === 'WHATSAPP';
  const shouldAutoSendChannel = isChat || isWhatsapp
    ? autoSendEnabled &&
      classification.confidence >= AUTO_CONFIDENCE &&
      parsed.confidence >= AUTO_CONFIDENCE
    : shouldAutoSend;

  if (!shouldAutoSendChannel) {
    return escalate(storeId, ticketId, 'low_confidence_or_no_recipient');
  }

  // 4. Deliver the reply through the appropriate channel.
  if (isChat) {
    await broadcastChatMessage({
      storeId,
      ticketId,
      role: 'AI',
      body: parsed.body,
    });
  } else if (isWhatsapp) {
    const phone = ticket.customer?.phone;
    if (!phone) {
      return escalate(storeId, ticketId, 'no_phone_for_whatsapp');
    }
    const lastInbound = ticket.messages.find((m) => m.role === 'CUSTOMER');
    const window = evaluateWhatsappWindow({
      lastInboundAt: lastInbound?.createdAt ?? null,
      isTemplate: false,
    });
    if (!window.allowed) {
      log.warn({ reason: window.reason }, 'whatsapp window closed; escalating');
      return escalate(storeId, ticketId, `whatsapp_${window.reason.toLowerCase()}`);
    }
    try {
      const wa = await getWhatsappForStore(storeId);
      await wa.client.sendText({ to: phone, body: parsed.body });
    } catch (err) {
      log.error({ err }, 'whatsapp send failed');
      return escalate(storeId, ticketId, 'whatsapp_send_failed');
    }
  } else {
    const smtp = await getSmtpForStore(storeId).catch(() => null);
    if (!smtp) {
      return escalate(storeId, ticketId, 'smtp_not_connected');
    }

    try {
      await smtp.send({
        to: recipient!,
        subject: parsed.subject,
        text: parsed.body,
        inReplyTo: ticket.externalId ?? undefined,
        references: ticket.externalThreadId ? [ticket.externalThreadId] : undefined,
      });
    } catch (err) {
      log.error({ err }, 'smtp send failed');
      return escalate(storeId, ticketId, 'smtp_failed');
    }
  }

  // 5. Mark resolved.
  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        autoResolved: true,
        resolvedAt: new Date(),
        firstResponseAt: ticket.firstResponseAt ?? new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        storeId,
        ticketId,
        kind: 'TICKET_AUTO_RESOLVED',
        payload: {
          messageId: aiMessage.id,
          orderExternalId: String(order.id),
          confidence: parsed.confidence,
          promptVersion: ORDER_STATUS_PROMPT_VERSION,
          citations: policySnippets.map((s) => s.id),
        },
      },
    }),
  ]);

  await publishWorkerEvent({ type: 'ticket.updated', storeId, ticketId });
  return { outcome: 'auto_resolved', reason: 'ok' };
}

async function escalate(
  storeId: string,
  ticketId: string,
  reason: string,
): Promise<OrderStatusJobResult> {
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
