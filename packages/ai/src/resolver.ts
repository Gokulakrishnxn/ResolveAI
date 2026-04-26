import {
  RESOLVER_SYSTEM_PROMPT,
  buildResolverUserPrompt,
  resolutionDraftSchema,
  type ResolutionDraft,
  type RagHit,
  ValidationError,
} from '@resolveai/shared';
import type { ResolveAIOpenAIClient } from './client.js';

export interface DraftResolutionArgs {
  ticketSummary: string;
  conversation: { role: 'CUSTOMER' | 'AGENT' | 'AI'; body: string }[];
  ragHits: RagHit[];
  orderContext?: string;
  customerContext?: string;
  storePolicy?: string;
  model?: string;
}

export async function draftResolution(
  ai: ResolveAIOpenAIClient,
  args: DraftResolutionArgs,
): Promise<ResolutionDraft> {
  const model = args.model ?? 'gpt-4o';

  const completion = await ai.call('chat.resolve', (client) =>
    client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RESOLVER_SYSTEM_PROMPT },
        { role: 'user', content: buildResolverUserPrompt(args) },
      ],
    }),
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new ValidationError('Resolver returned empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('Resolver returned non-JSON response', { raw });
  }

  const result = resolutionDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('Resolver output failed schema validation', {
      issues: result.error.issues,
      raw: parsed,
    });
  }
  return result.data;
}
