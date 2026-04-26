import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
  intentClassificationSchema,
  type IntentClassification,
  ValidationError,
} from '@resolveai/shared';
import type { ResolveAIOpenAIClient } from './client.js';

export interface ClassifyTicketArgs {
  subject?: string | null;
  body: string;
  model?: string;
}

export async function classifyTicket(
  ai: ResolveAIOpenAIClient,
  args: ClassifyTicketArgs,
): Promise<IntentClassification> {
  const model = args.model ?? 'gpt-4o-mini';

  const completion = await ai.call('chat.classify', (client) =>
    client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
        { role: 'user', content: buildClassifierUserPrompt(args) },
      ],
    }),
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new ValidationError('Classifier returned empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('Classifier returned non-JSON response', { raw });
  }

  const result = intentClassificationSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('Classifier output failed schema validation', {
      issues: result.error.issues,
      raw: parsed,
    });
  }
  return result.data;
}
