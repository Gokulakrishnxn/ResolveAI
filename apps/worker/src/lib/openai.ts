import { createOpenAIClient, type ResolveAIOpenAIClient } from '@resolveai/ai';
import { getConfig } from '../config.js';

let client: ResolveAIOpenAIClient | undefined;

export function getOpenAI(): ResolveAIOpenAIClient {
  if (client) return client;
  const cfg = getConfig();
  client = createOpenAIClient({
    apiKey: cfg.OPENAI_API_KEY,
    timeoutMs: cfg.OPENAI_TIMEOUT_MS,
  });
  return client;
}
