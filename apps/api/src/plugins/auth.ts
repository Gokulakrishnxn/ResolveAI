import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError, safeEqualString } from '@resolveai/shared';
import { getConfig } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    storeId?: string;
    auth?: { userId: string; storeId: string };
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  /**
   * `requireInternal` — used by routes the worker calls back into.
   * Verifies a static bearer token (`API_INTERNAL_TOKEN`).
   */
  app.decorate('requireInternal', async (req: FastifyRequest) => {
    const cfg = getConfig();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!safeEqualString(token, cfg.API_INTERNAL_TOKEN)) {
      throw new ForbiddenError('Invalid internal token');
    }
  });

  /**
   * `requireUser` — verifies a Clerk session token.
   * Stub: a real implementation calls `clerkClient.verifyToken`.
   * For the foundation we accept `x-store-id` + `x-user-id` headers in
   * non-production envs. Production deploy MUST swap this for Clerk SDK.
   */
  app.decorate('requireUser', async (req: FastifyRequest) => {
    const cfg = getConfig();
    if (cfg.NODE_ENV === 'production') {
      throw new UnauthorizedError('Clerk verification not configured');
    }
    const userId = req.headers['x-user-id'];
    const storeId = req.headers['x-store-id'];
    if (typeof userId !== 'string' || typeof storeId !== 'string') {
      throw new UnauthorizedError('Missing dev auth headers');
    }
    req.auth = { userId, storeId };
    req.storeId = storeId;
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireInternal: (req: FastifyRequest) => Promise<void>;
    requireUser: (req: FastifyRequest) => Promise<void>;
  }
}
