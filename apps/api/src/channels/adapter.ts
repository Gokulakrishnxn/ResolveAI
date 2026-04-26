import type {
  ChannelKind,
  InboundChannelEvent,
  OutboundReply,
} from '@resolveai/shared';

/**
 * A ChannelAdapter encapsulates everything channel-specific:
 *   - Provider webhook/payload → canonical `InboundChannelEvent`.
 *   - Sending an outbound reply through that channel.
 *   - Capability flags (e.g. WhatsApp requires templates outside the 24h window).
 *
 * The Resolution Pipeline (worker) deals only in `InboundChannelEvent` and
 * `OutboundReply`; adapters are the only code that touches provider APIs.
 */
export interface ChannelAdapter<Raw = unknown> {
  readonly kind: ChannelKind;
  /**
   * Convert a provider-specific raw payload into the canonical inbound event.
   * Should throw `ValidationError` on bad payloads so the registry can
   * surface a 400.
   */
  normalize(input: { storeId: string; raw: Raw }): InboundChannelEvent;
  /**
   * Send a reply through this channel. Implementations must be idempotent
   * with respect to `outbound.ticketId + body hash` so retries don't
   * duplicate messages.
   */
  sendReply(reply: OutboundReply): Promise<{ providerMessageId?: string }>;
  /**
   * Optional outbound policy hook (e.g. WhatsApp 24h window enforcement).
   * Returns either null (no objection) or a structured reason for blocking.
   */
  validateOutbound?(reply: OutboundReply): Promise<{ ok: true } | { ok: false; reason: string }>;
}
