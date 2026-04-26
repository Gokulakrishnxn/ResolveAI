import { describe, expect, it } from 'vitest';
import { chatAdapter } from '../chat-adapter.js';

describe('chatAdapter.normalize', () => {
  it('produces a canonical inbound channel event', () => {
    const evt = chatAdapter.normalize({
      storeId: 'store_1',
      raw: {
        storeId: 'store_1',
        sessionId: 'sess_1',
        body: 'hello',
        visitorEmail: 'a@b.com',
        visitorName: 'Alex',
        receivedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(evt.channel).toBe('CHAT');
    expect(evt.conversationExternalId).toBe('sess_1');
    expect(evt.author.email).toBe('a@b.com');
    expect(evt.author.externalId).toBe('sess_1');
    expect(evt.body).toBe('hello');
    expect(evt.attachments).toEqual([]);
  });

  it('rejects empty bodies', () => {
    expect(() =>
      chatAdapter.normalize({
        storeId: 'store_1',
        raw: { storeId: 'store_1', sessionId: 'sess_1', body: '' },
      }),
    ).toThrow();
  });
});
