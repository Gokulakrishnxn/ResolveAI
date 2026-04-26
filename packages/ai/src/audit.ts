import { type PrismaClient } from '@resolveai/db';
import { computeCost } from './cost.js';

/**
 * Persist a single AI call to the AICallLog table. Idempotent in spirit:
 * each invocation is a write-once row.
 */

export interface RecordAICallInput {
  prisma: PrismaClient;
  storeId: string;
  ticketId?: string;
  operation: string;
  model: string;
  promptVersion: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status?: 'success' | 'error';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAICall(input: RecordAICallInput): Promise<void> {
  const { costMicroUsd } = computeCost({
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
  });

  await input.prisma.aICallLog.create({
    data: {
      storeId: input.storeId,
      ticketId: input.ticketId,
      operation: input.operation,
      model: input.model,
      promptVersion: input.promptVersion,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.promptTokens + input.completionTokens,
      costMicroUsd,
      latencyMs: input.latencyMs,
      status: input.status ?? 'success',
      errorMessage: input.errorMessage,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}
