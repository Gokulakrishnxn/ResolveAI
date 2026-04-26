import nodemailer, { type Transporter } from 'nodemailer';
import { CircuitBreaker, IntegrationError, retry } from '@resolveai/shared';

export interface SmtpClientOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** Default From header (e.g. `"Acme Support <support@acme.com>"`). */
  from: string;
  /**
   * Optional DKIM signing config. When set, every outbound message is signed
   * with this private key + selector. The merchant publishes the public DNS
   * record under <selector>._domainkey.<domainName>.
   */
  dkim?: {
    domainName: string;
    keySelector: string;
    privateKey: string;
  };
}

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  replyTo?: string;
  headers?: Record<string, string>;
  /** Override default From per-send if needed (e.g. shop-specific). */
  from?: string;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

function ensureBracketedMessageId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed;
  return `<${trimmed.replace(/^<|>$/g, '')}>`;
}

export class SmtpClient {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly breaker: CircuitBreaker;

  constructor(opts: SmtpClientOptions) {
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      auth: { user: opts.user, pass: opts.password },
      ...(opts.dkim
        ? {
            dkim: {
              domainName: opts.dkim.domainName,
              keySelector: opts.dkim.keySelector,
              privateKey: opts.dkim.privateKey,
            },
          }
        : {}),
    });
    this.from = opts.from;
    this.breaker = new CircuitBreaker({
      name: `smtp:${opts.host}`,
      failureThreshold: 5,
      resetTimeoutMs: 60_000,
    });
  }

  async send(args: SendEmailArgs): Promise<SendEmailResult> {
    const inReplyTo = args.inReplyTo ? ensureBracketedMessageId(args.inReplyTo) : undefined;
    const references = (args.references ?? []).map(ensureBracketedMessageId);

    return this.breaker.execute(() =>
      retry(
        async () => {
          try {
            const info = await this.transporter.sendMail({
              from: args.from ?? this.from,
              to: args.to,
              subject: args.subject,
              text: args.text,
              html: args.html,
              inReplyTo,
              references: references.length > 0 ? references : undefined,
              replyTo: args.replyTo,
              headers: args.headers,
            });
            return {
              messageId: info.messageId,
              accepted: info.accepted.map(String),
              rejected: info.rejected.map(String),
            };
          } catch (err) {
            throw new IntegrationError(
              `SMTP send failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        },
        { retries: 2, minTimeoutMs: 1_000, maxTimeoutMs: 5_000 },
      ),
    );
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.transporter.close();
  }
}
