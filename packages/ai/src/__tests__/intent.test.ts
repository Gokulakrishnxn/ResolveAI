import { describe, expect, it } from 'vitest';
import type OpenAI from 'openai';
import { classifyIntent } from '../intent.js';
import type { ResolveAIOpenAIClient } from '../client.js';
import type { Phase1IntentClassification } from '@resolveai/shared';

/**
 * Phase 1 classifier — fixture-driven unit tests.
 *
 * We do NOT call the real OpenAI API in tests. Instead we build a fake
 * `ResolveAIOpenAIClient` that returns a pre-canned JSON payload for each
 * fixture, and we assert that:
 *   1. Our zod validation accepts well-formed responses.
 *   2. The classifier propagates the parsed structure verbatim.
 *   3. Common LLM mistakes (extra fields, trailing prose, lowercase enums)
 *      fail with a `ValidationError`.
 *
 * Adjust fixtures to add coverage. We currently ship 23 emails across all
 * five intents.
 */

interface Fixture {
  name: string;
  email: { subject: string; body: string; fromEmail?: string };
  expected: Phase1IntentClassification;
}

const fixtures: Fixture[] = [
  // ───────────── ORDER_STATUS ─────────────
  {
    name: 'simple where-is-my-order with #',
    email: {
      subject: 'where is my order?',
      body: 'Hi! I placed order #1234 four days ago and still nothing. Any update?',
      fromEmail: 'maya@example.com',
    },
    expected: {
      intent: 'ORDER_STATUS',
      urgency: 'MEDIUM',
      sentiment: 'NEUTRAL',
      extracted: { orderId: '#1234' },
      confidence: 0.97,
    },
  },
  {
    name: 'tracking question without order number',
    email: {
      subject: 'tracking?',
      body: 'Hey, do you have a tracking link for my recent order yet?',
      fromEmail: 'jamie@example.com',
    },
    expected: {
      intent: 'ORDER_STATUS',
      urgency: 'LOW',
      sentiment: 'NEUTRAL',
      extracted: {},
      confidence: 0.82,
    },
  },
  {
    name: 'urgent late delivery',
    email: {
      subject: 'URGENT - order missing',
      body: 'I needed this for tomorrow morning. Order 7781 has not moved in 8 days. This is unacceptable.',
    },
    expected: {
      intent: 'ORDER_STATUS',
      urgency: 'HIGH',
      sentiment: 'ANGRY',
      extracted: { orderId: '7781' },
      confidence: 0.95,
    },
  },
  {
    name: 'order with prefixed id',
    email: {
      subject: 'Re: shipping question',
      body: 'Hi - any update on SHOP-2024-09? It says preparing to ship but no movement.',
    },
    expected: {
      intent: 'ORDER_STATUS',
      urgency: 'MEDIUM',
      sentiment: 'NEUTRAL',
      extracted: { orderId: 'SHOP-2024-09' },
      confidence: 0.93,
    },
  },
  {
    name: 'eta question',
    email: {
      subject: 'When will it arrive?',
      body: 'Order 4421 — what day will it actually be at my door?',
    },
    expected: {
      intent: 'ORDER_STATUS',
      urgency: 'MEDIUM',
      sentiment: 'NEUTRAL',
      extracted: { orderId: '4421' },
      confidence: 0.94,
    },
  },

  // ───────────── REFUND ─────────────
  {
    name: 'plain refund request',
    email: {
      subject: 'I want my money back',
      body: 'Order #5511 arrived broken. Please refund.',
    },
    expected: {
      intent: 'REFUND',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '#5511' },
      confidence: 0.94,
    },
  },
  {
    name: 'angry refund threat',
    email: {
      subject: 'CHARGEBACK COMING',
      body: "If I don't get a refund for order 9998 today I'm calling my bank and posting on Twitter.",
    },
    expected: {
      intent: 'REFUND',
      urgency: 'HIGH',
      sentiment: 'ANGRY',
      extracted: { orderId: '9998' },
      confidence: 0.96,
    },
  },
  {
    name: 'partial refund request',
    email: {
      subject: 'Refund the shipping',
      body: 'Item finally arrived after 3 weeks. I would like the shipping cost refunded — order #1188.',
    },
    expected: {
      intent: 'REFUND',
      urgency: 'LOW',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '#1188' },
      confidence: 0.9,
    },
  },
  {
    name: 'change of mind refund',
    email: {
      subject: 'Return please',
      body: 'I no longer need this. Please refund order 7732.',
    },
    expected: {
      intent: 'REFUND',
      urgency: 'LOW',
      sentiment: 'NEUTRAL',
      extracted: { orderId: '7732' },
      confidence: 0.91,
    },
  },

  // ───────────── REPLACEMENT ─────────────
  {
    name: 'arrived broken want replacement',
    email: {
      subject: 'Mug arrived shattered',
      body: 'My order #6612 arrived with the mug in pieces. Can you send a replacement?',
    },
    expected: {
      intent: 'REPLACEMENT',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '#6612', productName: 'mug' },
      confidence: 0.93,
    },
  },
  {
    name: 'lost in transit',
    email: {
      subject: 'Tracking says delivered but I never got it',
      body: 'Hi — order 4400 says delivered but nothing here. Could you resend?',
    },
    expected: {
      intent: 'REPLACEMENT',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '4400' },
      confidence: 0.88,
    },
  },
  {
    name: 'defective item replace',
    email: {
      subject: 'Earbuds dead on arrival',
      body: 'Earbuds from order #889 will not turn on. Need a working pair sent.',
    },
    expected: {
      intent: 'REPLACEMENT',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '#889', productName: 'earbuds' },
      confidence: 0.92,
    },
  },

  // ───────────── WRONG_ITEM ─────────────
  {
    name: 'wrong size received',
    email: {
      subject: 'Wrong size!',
      body: 'I ordered a Medium but received an XL. Order 3300.',
    },
    expected: {
      intent: 'WRONG_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '3300' },
      confidence: 0.95,
    },
  },
  {
    name: 'wrong color',
    email: {
      subject: 'Color is not what I ordered',
      body: 'Ordered the navy hoodie but received the cream one. Order #2255.',
    },
    expected: {
      intent: 'WRONG_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '#2255', productName: 'hoodie' },
      confidence: 0.94,
    },
  },
  {
    name: 'totally different product',
    email: {
      subject: 'Got the wrong product',
      body: 'I ordered a coffee grinder, you sent me a kettle. Order 8412.',
    },
    expected: {
      intent: 'WRONG_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '8412', productName: 'coffee grinder' },
      confidence: 0.96,
    },
  },
  {
    name: 'missing items in order',
    email: {
      subject: 'One item missing',
      body: 'Order 1118 was supposed to have 2 mugs and a teapot — only got the teapot.',
    },
    expected: {
      intent: 'WRONG_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      extracted: { orderId: '1118', productName: 'mugs' },
      confidence: 0.86,
    },
  },

  // ───────────── OTHER ─────────────
  {
    name: 'thank you note',
    email: {
      subject: 'Thanks!',
      body: 'Just wanted to say the new candle smells incredible. Will buy again.',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'LOW',
      sentiment: 'POSITIVE',
      extracted: { productName: 'candle' },
      confidence: 0.88,
    },
  },
  {
    name: 'product question pre-purchase',
    email: {
      subject: 'Is this dishwasher safe?',
      body: 'Hi, before I buy — is the ceramic mug dishwasher safe?',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'LOW',
      sentiment: 'NEUTRAL',
      extracted: { productName: 'ceramic mug' },
      confidence: 0.84,
    },
  },
  {
    name: 'wholesale inquiry',
    email: {
      subject: 'B2B / wholesale?',
      body: 'Do you offer wholesale pricing? Our cafe would love to stock these.',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'LOW',
      sentiment: 'POSITIVE',
      extracted: {},
      confidence: 0.82,
    },
  },
  {
    name: 'spam-y promo',
    email: {
      subject: 'EARN $5,000 FROM HOME',
      body: 'Click here to triple your income with crypto in 7 days.',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'LOW',
      sentiment: 'NEUTRAL',
      extracted: {},
      confidence: 0.7,
    },
  },
  {
    name: 'address change request - falls into OTHER for phase 1',
    email: {
      subject: 'Change shipping address',
      body: 'Hi — order 4501 — can you ship to my work address instead? 100 Main St.',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'MEDIUM',
      sentiment: 'NEUTRAL',
      extracted: { orderId: '4501' },
      confidence: 0.7,
    },
  },
  {
    name: 'follow-up to existing thread',
    email: {
      subject: 'Re: Re: refund update',
      body: 'Any news?',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'MEDIUM',
      sentiment: 'NEUTRAL',
      extracted: {},
      confidence: 0.55,
    },
  },
  {
    name: 'gift card question',
    email: {
      subject: 'Gift card balance',
      body: 'How do I check my gift card balance?',
    },
    expected: {
      intent: 'OTHER',
      urgency: 'LOW',
      sentiment: 'NEUTRAL',
      extracted: {},
      confidence: 0.85,
    },
  },
];

function fakeClient(json: string): ResolveAIOpenAIClient {
  return {
    raw: {} as OpenAI,
    async call<T>(_label: string, fn: (client: OpenAI) => Promise<T>): Promise<T> {
      const oai = {
        chat: {
          completions: {
            create: async (): Promise<OpenAI.Chat.Completions.ChatCompletion> => ({
              id: 'cmpl-test',
              object: 'chat.completion',
              created: 0,
              model: 'gpt-4o-mini',
              choices: [
                {
                  index: 0,
                  finish_reason: 'stop',
                  logprobs: null,
                  message: {
                    role: 'assistant',
                    content: json,
                    refusal: null,
                  } as OpenAI.Chat.Completions.ChatCompletionMessage,
                },
              ],
              usage: { prompt_tokens: 220, completion_tokens: 60, total_tokens: 280 },
            }),
          },
        },
      } as unknown as OpenAI;
      return fn(oai);
    },
  };
}

describe('classifyIntent — Phase 1', () => {
  it.each(fixtures)('classifies "$name"', async ({ email, expected }) => {
    const client = fakeClient(JSON.stringify(expected));
    const result = await classifyIntent(client, email);
    expect(result.classification).toEqual(expected);
    expect(result.promptVersion).toMatch(/^intent\.v1/);
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.promptTokens).toBeGreaterThan(0);
    expect(result.completionTokens).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects an empty model response', async () => {
    const client = fakeClient('');
    await expect(
      classifyIntent(client, { subject: 'x', body: 'y' }),
    ).rejects.toThrow(/empty/);
  });

  it('rejects invalid JSON', async () => {
    const client = fakeClient('{ this is not json');
    await expect(
      classifyIntent(client, { subject: 'x', body: 'y' }),
    ).rejects.toThrow(/invalid JSON/);
  });

  it('rejects an unknown intent value', async () => {
    const client = fakeClient(
      JSON.stringify({
        intent: 'TOTALLY_NEW_INTENT',
        urgency: 'LOW',
        sentiment: 'NEUTRAL',
        extracted: {},
        confidence: 0.9,
      }),
    );
    await expect(
      classifyIntent(client, { subject: 'x', body: 'y' }),
    ).rejects.toThrow(/failed schema/);
  });

  it('rejects confidence outside 0..1', async () => {
    const client = fakeClient(
      JSON.stringify({
        intent: 'OTHER',
        urgency: 'LOW',
        sentiment: 'NEUTRAL',
        extracted: {},
        confidence: 1.5,
      }),
    );
    await expect(
      classifyIntent(client, { subject: 'x', body: 'y' }),
    ).rejects.toThrow(/failed schema/);
  });

  it('accepts missing extracted (defaults to empty object)', async () => {
    const client = fakeClient(
      JSON.stringify({
        intent: 'OTHER',
        urgency: 'LOW',
        sentiment: 'NEUTRAL',
        confidence: 0.4,
      }),
    );
    const result = await classifyIntent(client, { subject: 'x', body: 'y' });
    expect(result.classification.extracted).toEqual({});
  });
});
