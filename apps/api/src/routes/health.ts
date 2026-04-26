import type { FastifyInstance } from 'fastify';
import { prisma } from '@resolveai/db';
import { getRedis } from '../lib/redis.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  app.get('/ready', async (_req, reply) => {
    const checks: Record<string, 'ok' | 'fail'> = {};
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'fail';
    }
    try {
      const pong = await getRedis().ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'fail';
    } catch {
      checks.redis = 'fail';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    reply.status(allOk ? 200 : 503).send({ status: allOk ? 'ok' : 'degraded', checks });
  });
}
