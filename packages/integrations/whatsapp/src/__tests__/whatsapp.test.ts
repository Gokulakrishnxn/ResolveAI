import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  evaluateWhatsappWindow,
  handleVerificationChallenge,
  normalizeWhatsappPayload,
  verifyWhatsappWebhook,
  whatsappWebhookPayloadSchema,
} from '../index.js';

describe('verifyWhatsappWebhook', () => {
  it('accepts a valid signature', () => {
    const secret = 'app-secret';
    const body = Buffer.from('{"hello":"world"}');
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWhatsappWebhook(body, sig, secret)).toBe(true);
  });

  it('rejects a bad signature', () => {
    const secret = 'app-secret';
    const body = Buffer.from('{"hello":"world"}');
    expect(verifyWhatsappWebhook(body, 'sha256=deadbeef', secret)).toBe(false);
  });

  it('rejects when no signature is supplied', () => {
    expect(verifyWhatsappWebhook(Buffer.alloc(0), undefined, 'k')).toBe(false);
  });
});

describe('handleVerificationChallenge', () => {
  it('echoes the challenge when the verify token matches', () => {
    const r = handleVerificationChallenge({
      mode: 'subscribe',
      token: 'TOKEN',
      challenge: '1234',
      expectedToken: 'TOKEN',
    });
    expect(r).toEqual({ ok: true, challenge: '1234' });
  });

  it('rejects on token mismatch', () => {
    const r = handleVerificationChallenge({
      mode: 'subscribe',
      token: 'WRONG',
      challenge: '1',
      expectedToken: 'TOKEN',
    });
    expect(r.ok).toBe(false);
  });
});

describe('normalizeWhatsappPayload', () => {
  it('emits one canonical event per inbound text message', () => {
    const payload = whatsappWebhookPayloadSchema.parse({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'biz1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '+1', phone_number_id: 'PNID' },
                contacts: [{ wa_id: '15551234567', profile: { name: 'Alice' } }],
                messages: [
                  {
                    from: '15551234567',
                    id: 'wamid.1',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'where is my order?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const events = normalizeWhatsappPayload({ storeId: 'store_x', payload });
    expect(events).toHaveLength(1);
    const evt = events[0]!;
    expect(evt.channel).toBe('WHATSAPP');
    expect(evt.body).toBe('where is my order?');
    expect(evt.author.phone).toBe('15551234567');
    expect(evt.author.name).toBe('Alice');
    expect(evt.conversationExternalId).toBe('15551234567');
  });

  it('represents image messages with a placeholder body and attachment', () => {
    const payload = whatsappWebhookPayloadSchema.parse({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'biz1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '+1', phone_number_id: 'PNID' },
                messages: [
                  {
                    from: '15551234567',
                    id: 'wamid.2',
                    timestamp: '1700000000',
                    type: 'image',
                    image: { id: 'media1', mime_type: 'image/jpeg', caption: 'broken!' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const [evt] = normalizeWhatsappPayload({ storeId: 'store_x', payload });
    expect(evt?.body).toBe('broken!');
    expect(evt?.attachments).toHaveLength(1);
  });
});

describe('evaluateWhatsappWindow', () => {
  it('always allows templates', () => {
    const r = evaluateWhatsappWindow({ lastInboundAt: null, isTemplate: true });
    expect(r.allowed).toBe(true);
  });

  it('blocks freeform when no inbound exists', () => {
    const r = evaluateWhatsappWindow({ lastInboundAt: null, isTemplate: false });
    expect(r).toEqual({ allowed: false, reason: 'NO_PRIOR_INBOUND' });
  });

  it('blocks freeform outside the 24h window', () => {
    const r = evaluateWhatsappWindow({
      lastInboundAt: new Date('2026-01-01T00:00:00Z'),
      isTemplate: false,
      now: new Date('2026-01-02T01:00:00Z'),
    });
    expect(r).toEqual({ allowed: false, reason: 'OUTSIDE_24H_WINDOW' });
  });

  it('allows freeform inside the window', () => {
    const r = evaluateWhatsappWindow({
      lastInboundAt: new Date('2026-01-01T00:00:00Z'),
      isTemplate: false,
      now: new Date('2026-01-01T12:00:00Z'),
    });
    expect(r.allowed).toBe(true);
  });
});
