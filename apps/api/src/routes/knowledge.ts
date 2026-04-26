import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '@resolveai/db';
import { createEmbeddings, retrieveContext } from '@resolveai/ai';
import { getOpenAI } from '../lib/openai.js';

/**
 * Knowledge base routes (Phase 2 RAG).
 *
 *   GET    /knowledge/docs               → list FAQ documents
 *   POST   /knowledge/docs               → upload + chunk + embed a doc
 *   DELETE /knowledge/docs/:id           → remove a doc + its embeddings
 *   POST   /knowledge/search             → ad-hoc retrieval (debug + UI preview)
 */

const createDocSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(200_000),
  url: z.string().url().optional(),
  source: z.enum(['MANUAL', 'HELPDOC_URL', 'POLICY_DOC']).default('MANUAL'),
  tags: z.array(z.string().max(40)).max(50).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(2_000),
  topK: z.number().int().min(1).max(20).optional(),
});

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/**
 * Naive sliding-window chunker, sufficient for help-doc and policy text.
 * Production deployments should swap this for a sentence-aware splitter
 * (LangChain, llamaindex, etc.) once token budgets warrant it.
 */
function chunk(text: string): string[] {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= CHUNK_SIZE) return [trimmed];
  const out: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const end = Math.min(start + CHUNK_SIZE, trimmed.length);
    out.push(trimmed.slice(start, end));
    if (end === trimmed.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return out;
}

function hash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function registerKnowledgeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireUser);

  app.get('/knowledge/docs', async (req) => {
    const storeId = req.storeId!;
    const docs = await prisma.fAQDoc.findMany({
      where: { storeId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        url: true,
        source: true,
        tags: true,
        updatedAt: true,
        _count: { select: { embeddings: true } },
      },
    });
    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      url: d.url,
      source: d.source,
      tags: d.tags,
      chunks: d._count.embeddings,
      updatedAt: d.updatedAt,
    }));
  });

  app.post('/knowledge/docs', async (req) => {
    const storeId = req.storeId!;
    const body = createDocSchema.parse(req.body);
    const ai = getOpenAI();
    const chunks = chunk(body.body);

    const doc = await prisma.fAQDoc.create({
      data: {
        storeId,
        title: body.title,
        url: body.url,
        body: body.body,
        source: body.source,
        tags: body.tags ?? [],
      },
    });

    const embedded = await createEmbeddings(ai, { input: chunks });

    await prisma.$transaction(
      embedded.vectors.map((vector, i) => {
        const content = chunks[i]!;
        const literal = `[${vector.join(',')}]`;
        return prisma.$executeRawUnsafe(
          `INSERT INTO "Embedding" ("id", "storeId", "ownerKind", "ownerId", "faqDocId",
            "vector", "content", "contentHash", "metadata", "createdAt")
           VALUES (gen_random_uuid(), $1, 'FAQ_DOC', $2, $2, $3::vector, $4, $5, $6::jsonb, NOW())
           ON CONFLICT ("storeId", "ownerKind", "ownerId", "contentHash") DO NOTHING`,
          storeId,
          doc.id,
          literal,
          content,
          hash(content),
          JSON.stringify({ title: doc.title, url: doc.url, chunkIndex: i }),
        );
      }),
    );

    return { id: doc.id, chunks: chunks.length, tokens: embedded.totalTokens };
  });

  app.delete<{ Params: { id: string } }>('/knowledge/docs/:id', async (req) => {
    const storeId = req.storeId!;
    const id = req.params.id;
    await prisma.fAQDoc.deleteMany({ where: { id, storeId } });
    return { ok: true };
  });

  app.post('/knowledge/search', async (req) => {
    const storeId = req.storeId!;
    const body = searchSchema.parse(req.body);
    const ai = getOpenAI();
    const hits = await retrieveContext(ai, prisma, {
      storeId,
      query: body.query,
      topK: body.topK ?? 5,
      ownerKinds: ['FAQ_DOC', 'TICKET'],
    });
    return { hits };
  });
}
