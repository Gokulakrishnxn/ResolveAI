/**
 * Per-million-tokens pricing (USD) for the models we use in Phase 1.
 * Stored in micro-USD-per-million-tokens so we can multiply by tokens
 * and emit a BigInt for the AICallLog.costMicroUsd column.
 *
 * Source: openai.com/api/pricing as of 2025-Q1. Update with care; the prompt
 * version logged with each call is what gives us reproducibility, NOT this
 * table.
 */

interface ModelPrice {
  /** USD per million prompt tokens. */
  prompt: number;
  /** USD per million completion tokens. */
  completion: number;
}

const PRICES: Record<string, ModelPrice> = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-4o': { prompt: 2.5, completion: 10 },
  'gpt-4-turbo': { prompt: 10, completion: 30 },
  'text-embedding-3-small': { prompt: 0.02, completion: 0 },
  'text-embedding-3-large': { prompt: 0.13, completion: 0 },
};

const MICRO = 1_000_000n;
const TOKENS_PER_DOLLAR_BASE = 1_000_000;

export interface CostInput {
  model: string;
  promptTokens: number;
  completionTokens?: number;
}

export interface CostOutput {
  costMicroUsd: bigint;
  /** Helpful pretty version for humans. */
  costUsd: number;
}

export function computeCost(input: CostInput): CostOutput {
  const price = PRICES[input.model];
  if (!price) {
    return { costMicroUsd: 0n, costUsd: 0 };
  }
  const promptUsd = (input.promptTokens / TOKENS_PER_DOLLAR_BASE) * price.prompt;
  const completionUsd = ((input.completionTokens ?? 0) / TOKENS_PER_DOLLAR_BASE) * price.completion;
  const totalUsd = promptUsd + completionUsd;
  return {
    costUsd: Number(totalUsd.toFixed(8)),
    costMicroUsd: BigInt(Math.round(totalUsd * Number(MICRO))),
  };
}
