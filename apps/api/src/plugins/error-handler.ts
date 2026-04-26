import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError, isAppError, captureException } from '@resolveai/shared';

export const errorHandler = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      req.log.warn({ issues: err.issues }, 'validation error');
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues },
      });
    }

    if (isAppError(err)) {
      const level = err.statusCode >= 500 ? 'error' : 'warn';
      req.log[level]({ err }, err.message);
      return reply.status(err.statusCode).send(err.toJSON());
    }

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(err.toJSON());
    }

    req.log.error({ err }, 'unhandled error');
    captureException(err);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
});
