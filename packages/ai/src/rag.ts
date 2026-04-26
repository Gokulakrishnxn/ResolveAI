import { type PrismaClient } from '@resolveai/db';
import {
  type RagHit,
  type RagRetrievalRequest,
  ragRetrievalRequestSchema,
} from '@resolveai/shared';
import type { ResolveAIOpenAIClient } from './client.js';
import { createEmbeddings } from './embeddings.js';

interface RagRow {
  ownerKind: 'FAQ_DOC' | 'TICKET' | 'MESSAGE' | 'PRODUCT';
  ownerId: string;
  content: string;
  metadata: Record<string, unknown>;
  distance: number;
}

/**
 * Hybrid retrieval — pgvector cosine + simple ownerKind filter.
 * Lower distance = closer match; we surface it as `score = 1 - distance`.
 */
export async function retrieveContext(
  ai: ResolveAIOpenAIClient,
  prisma: PrismaClient,
  request: RagRetrievalRequest,
): Promise<RagHit[]> {
  const parsed = ragRetrievalRequestSchema.parse(request);

  const embed = await createEmbeddings(ai, { input: parsed.query });
  const vector = embed.vectors[0];
  if (!vector) return [];

  const vectorLiteral = `[${vector.join(',')}]`;
  const ownerKindList = parsed.ownerKinds.map((k) => `'${k}'`).join(',');

  const rows = await prisma.$queryRawUnsafe<RagRow[]>(
    `
    SELECT
      "ownerKind",
      "ownerId",
      "content",
      "metadata",
      "vector" <=> $1::vector AS "distance"
    FROM "Embedding"
    WHERE "storeId" = $2
      AND "ownerKind"::text IN (${ownerKindList})
    ORDER BY "vector" <=> $1::vector
    LIMIT $3;
    `,
    vectorLiteral,
    parsed.storeId,
    parsed.topK,
  );

  return rows.map((row) => ({
    ownerKind: row.ownerKind,
    ownerId: row.ownerId,
    content: row.content,
    score: Math.max(0, 1 - row.distance),
    metadata: row.metadata ?? {},
  }));
}
