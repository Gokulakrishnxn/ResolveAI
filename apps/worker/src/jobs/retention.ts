import { prisma, type Prisma } from '@resolveai/db';
import { logger } from '../lib/logger.js';
import { getConfig } from '../config.js';

const log = logger.child({ job: 'retention' });

const SCRUB_PLACEHOLDER = '[redacted by retention policy]';

/**
 * GDPR-friendly soft-delete + scrub for messages.
 *
 *   1. Find messages older than `retentionDays` that haven't been
 *      redacted yet (`deletedAt IS NULL`).
 *   2. Scrub the body / html / attachments / author email so no PII
 *      survives, leaving only the row + metadata for audit history.
 *   3. Mark `deletedAt = now()`.
 *
 * Returns `{ scanned, scrubbed }` for observability/tests.
 */
export async function runRetentionScrub(opts?: {
  retentionDays?: number;
  batchSize?: number;
  now?: Date;
}): Promise<{ scanned: number; scrubbed: number }> {
  const cfg = getConfig();
  const retentionDays = opts?.retentionDays ?? cfg.MESSAGE_RETENTION_DAYS;
  const batchSize = opts?.batchSize ?? 1_000;
  const now = opts?.now ?? new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  let scrubbed = 0;
  let scanned = 0;

  while (true) {
    const candidates = await prisma.message.findMany({
      where: {
        createdAt: { lt: cutoff },
        deletedAt: null,
      },
      select: { id: true },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });
    if (candidates.length === 0) break;
    scanned += candidates.length;

    const ids = candidates.map((c) => c.id);
    const result = await prisma.message.updateMany({
      where: { id: { in: ids } },
      data: {
        body: SCRUB_PLACEHOLDER,
        bodyHtml: null,
        authorEmail: null,
        attachments: [] as unknown as Prisma.InputJsonValue,
        deletedAt: now,
      },
    });
    scrubbed += result.count;

    if (candidates.length < batchSize) break;
  }

  if (scrubbed > 0) {
    log.info({ scanned, scrubbed, retentionDays, cutoff }, 'retention scrub completed');
  }
  return { scanned, scrubbed };
}
