import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { type InboundEmail, IntegrationError } from '@resolveai/shared';

export interface ImapClientOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

/**
 * Polls a mailbox for unseen messages, parses them, and yields normalized
 * `InboundEmail` records. Each message is marked Seen on successful yield.
 */
export class ImapPoller {
  private readonly opts: ImapClientOptions;

  constructor(opts: ImapClientOptions) {
    this.opts = opts;
  }

  async *poll(): AsyncGenerator<InboundEmail, void, void> {
    const client = new ImapFlow({
      host: this.opts.host,
      port: this.opts.port,
      secure: this.opts.secure,
      auth: { user: this.opts.user, pass: this.opts.password },
      logger: false,
    });

    try {
      await client.connect();
    } catch (err) {
      throw new IntegrationError(
        `IMAP connect failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const lock = await client.getMailboxLock(this.opts.mailbox ?? 'INBOX');
    try {
      const seqs = await client.search({ seen: false }, { uid: true });
      if (!seqs || seqs.length === 0) return;

      for (const uid of seqs) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!msg || !msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const fromAddr = parsed.from?.value[0]?.address;
        if (!fromAddr) continue;

        const toAddrs = (() => {
          const t = parsed.to;
          if (!t) return [];
          const arr = Array.isArray(t) ? t : [t];
          return arr.flatMap(
            (a) => a.value.map((v: { address?: string }) => v.address).filter(Boolean) as string[],
          );
        })();

        const inbound: InboundEmail = {
          messageId: parsed.messageId ?? `<${uid}@${this.opts.host}>`,
          from: fromAddr,
          to: toAddrs.length ? toAddrs : [this.opts.user],
          subject: parsed.subject ?? '',
          text: parsed.text ?? '',
          html: typeof parsed.html === 'string' ? parsed.html : undefined,
          inReplyTo: parsed.inReplyTo,
          references: Array.isArray(parsed.references)
            ? parsed.references
            : parsed.references
              ? [parsed.references]
              : [],
          receivedAt: parsed.date ?? new Date(),
        };

        yield inbound;
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
      await client.logout().catch(() => undefined);
    }
  }
}
