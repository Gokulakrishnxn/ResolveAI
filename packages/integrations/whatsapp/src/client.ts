import { retry, IntegrationError, UpstreamFailureError } from '@resolveai/shared';
import type { WhatsappOutboundTemplate, WhatsappOutboundText } from './types.js';

const DEFAULT_BASE = 'https://graph.facebook.com/v20.0';

export interface WhatsappClientOptions {
  /** WhatsApp Business phone number ID (NOT the display phone number). */
  phoneNumberId: string;
  /** App-level access token for the phone number. */
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface WhatsappSendResponse {
  messages?: Array<{ id: string }>;
  error?: { code: number; message: string };
}

/**
 * Lightweight WhatsApp Business Cloud API client.
 *
 * Outbound messaging has two paths:
 *  - `sendText` — freeform replies allowed only inside the 24h customer
 *    service window. Caller is responsible for window enforcement; this
 *    client merely surfaces 4xx errors from Meta when out of window.
 *  - `sendTemplate` — proactive notifications. Templates must be
 *    pre-approved in WhatsApp Manager.
 */
export class WhatsappClient {
  private readonly base: string;
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: WhatsappClientOptions) {
    this.base = opts.baseUrl ?? DEFAULT_BASE;
    this.token = opts.accessToken;
    this.phoneNumberId = opts.phoneNumberId;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async post(path: string, body: unknown): Promise<WhatsappSendResponse> {
    const url = `${this.base}/${this.phoneNumberId}/${path}`;
    const res = await retry(
      async () => {
        const r = await this.fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });
        if (r.status >= 500) {
          throw new UpstreamFailureError(`WhatsApp ${r.status}`);
        }
        return r;
      },
      { retries: 3, minTimeoutMs: 250 },
    );

    const json = (await res.json().catch(() => ({}))) as WhatsappSendResponse;
    if (!res.ok) {
      throw new IntegrationError(
        json.error?.message ?? `WhatsApp ${res.status}`,
        { error: json.error, status: res.status },
      );
    }
    return json;
  }

  async sendText(input: WhatsappOutboundText): Promise<{ providerMessageId: string }> {
    const json = await this.post('messages', {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'text',
      text: { body: input.body, preview_url: false },
    });
    return { providerMessageId: json.messages?.[0]?.id ?? '' };
  }

  async sendTemplate(input: WhatsappOutboundTemplate): Promise<{ providerMessageId: string }> {
    const json = await this.post('messages', {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components: input.components ?? [],
      },
    });
    return { providerMessageId: json.messages?.[0]?.id ?? '' };
  }
}
