import type { ResolveAIOpenAIClient } from './client.js';

export interface EmbedArgs {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResult {
  vectors: number[][];
  model: string;
  totalTokens: number;
}

export async function createEmbeddings(
  ai: ResolveAIOpenAIClient,
  args: EmbedArgs,
): Promise<EmbeddingResult> {
  const model = args.model ?? 'text-embedding-3-small';
  const input = Array.isArray(args.input) ? args.input : [args.input];

  const response = await ai.call('embeddings', (client) =>
    client.embeddings.create({
      model,
      input,
    }),
  );

  return {
    vectors: response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding),
    model: response.model,
    totalTokens: response.usage.total_tokens,
  };
}
