import { ImapFlow, type ImapFlowOptions } from 'imapflow';
import { simpleParser } from 'mailparser';
import { type InboundEmail, IntegrationError } from '@resolveai/shared';
import { deriveThreadKey, normalizeMessageId } from './threading.js';

export interface ImapListenerOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string;
  /** Reconnect delay on disconnect / error. */
  reconnectDelayMs?: number;
  /** Max time we hold IDLE before refreshing — RFC suggests 29 min. */
  idleRefreshMs?: number;
  /** Optional cursor: only emit messages with UID > lastSeenUid. */
  lastSeenUid?: number;
  logger?: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
}

export interface InboundEmailWithThread extends InboundEmail {
  uid: number;
  threadKey: string;
  rawMessageId: string | null;
}

export type InboundHandler = (msg: InboundEmailWithThread) => Promise<void> | void;

/**
 * Long-lived per-mailbox IMAP IDLE listener.
 *
 * Usage:
 *   const listener = new ImapIdleListener(opts);
 *   await listener.start(handler);
 *   // ... later ...
 *   await listener.stop();
 *
 * Reconnects automatically on transient errors. Tracks the last seen UID
 * via `lastSeenUid` so we don't reprocess on restart (caller persists it).
 */
export class ImapIdleListener {
  private readonly opts: Required<Omit<ImapListenerOptions, 'logger' | 'lastSeenUid'>> & {
    logger?: ImapListenerOptions['logger'];
    lastSeenUid?: number;
  };
  private client: ImapFlow | null = null;
  private running = false;
  private stopRequested = false;
  private handler: InboundHandler | null = null;

  constructor(opts: ImapListenerOptions) {
    this.opts = {
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      user: opts.user,
      password: opts.password,
      mailbox: opts.mailbox ?? 'INBOX',
      reconnectDelayMs: opts.reconnectDelayMs ?? 5_000,
      idleRefreshMs: opts.idleRefreshMs ?? 25 * 60_000,
      logger: opts.logger,
      lastSeenUid: opts.lastSeenUid,
    };
  }

  get lastSeenUid(): number | undefined {
    return this.opts.lastSeenUid;
  }

  async start(handler: InboundHandler): Promise<void> {
    if (this.running) throw new IntegrationError('ImapIdleListener already running');
    this.handler = handler;
    this.running = true;
    this.stopRequested = false;
    void this.runForever();
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    if (this.client) {
      await this.client.logout().catch(() => undefined);
      this.client = null;
    }
    this.running = false;
  }

  private log(level: 'info' | 'warn' | 'error', msg: string): void {
    this.opts.logger?.[level]?.(msg);
  }

  private async runForever(): Promise<void> {
    while (!this.stopRequested) {
      try {
        await this.connectAndIdle();
      } catch (err) {
        this.log(
          'error',
          `imap-idle: error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (!this.stopRequested) {
        await new Promise((r) => setTimeout(r, this.opts.reconnectDelayMs));
      }
    }
  }

  private async connectAndIdle(): Promise<void> {
    const config: ImapFlowOptions = {
      host: this.opts.host,
      port: this.opts.port,
      secure: this.opts.secure,
      auth: { user: this.opts.user, pass: this.opts.password },
      logger: false,
    };
    const client = new ImapFlow(config);
    this.client = client;

    await client.connect();
    const lock = await client.getMailboxLock(this.opts.mailbox);
    try {
      this.log('info', `imap-idle: connected ${this.opts.user}/${this.opts.mailbox}`);

      // 1) Drain anything new since lastSeenUid.
      await this.drain(client);

      // 2) Subscribe to new mail events.
      const onExists = (): void => {
        // Schedule a drain — we may be inside an event loop tick.
        void this.drain(client).catch((err) => {
          this.log('error', `imap-idle: drain failed: ${(err as Error).message}`);
        });
      };
      client.on('exists', onExists);

      // 3) IDLE loop with periodic refresh.
      while (!this.stopRequested) {
        const refreshTimer = setTimeout(() => {
          // ImapFlow auto-refreshes IDLE, but we still set a max bound.
        }, this.opts.idleRefreshMs);
        try {
          await client.idle();
        } finally {
          clearTimeout(refreshTimer);
        }
      }

      client.off('exists', onExists);
    } finally {
      lock.release();
      await client.logout().catch(() => undefined);
      if (this.client === client) this.client = null;
    }
  }

  private async drain(client: ImapFlow): Promise<void> {
    if (!this.handler) return;
    const since = this.opts.lastSeenUid ?? 0;
    const range = `${since + 1}:*`;
    const search = await client.search({ uid: range, seen: false }, { uid: true });
    if (!search || search.length === 0) return;

    for (const uid of search) {
      // Defensive: search with `range` may return UIDs <= since on edge cases.
      if (uid <= since) continue;
      const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);

      const fromAddr = parsed.from?.value[0]?.address;
      if (!fromAddr) {
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(() => undefined);
        this.opts.lastSeenUid = uid;
        continue;
      }

      const toAddrs = (() => {
        const t = parsed.to;
        if (!t) return [];
        const arr = Array.isArray(t) ? t : [t];
        return arr.flatMap(
          (a) => a.value.map((v: { address?: string }) => v.address).filter(Boolean) as string[],
        );
      })();

      const refsList = Array.isArray(parsed.references)
        ? parsed.references
        : parsed.references
          ? [parsed.references]
          : [];

      const inbound: InboundEmailWithThread = {
        messageId: parsed.messageId ?? `<${uid}@${this.opts.host}>`,
        rawMessageId: normalizeMessageId(parsed.messageId),
        from: fromAddr,
        to: toAddrs.length ? toAddrs : [this.opts.user],
        subject: parsed.subject ?? '',
        text: parsed.text ?? '',
        html: typeof parsed.html === 'string' ? parsed.html : undefined,
        inReplyTo: parsed.inReplyTo,
        references: refsList,
        receivedAt: parsed.date ?? new Date(),
        uid,
        threadKey: deriveThreadKey({
          inReplyTo: parsed.inReplyTo,
          references: refsList,
          messageId: parsed.messageId,
          subject: parsed.subject,
          fromAddress: fromAddr,
        }),
      };

      try {
        await this.handler(inbound);
      } catch (err) {
        this.log(
          'error',
          `imap-idle: handler failed for UID ${uid}: ${(err as Error).message}`,
        );
        // Don't mark as seen — we'll try again next pass.
        continue;
      }
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(() => undefined);
      this.opts.lastSeenUid = uid;
    }
  }
}
