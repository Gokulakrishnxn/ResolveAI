import type OpenAI from 'openai';
import {
  ValidationError,
  v1,
  type Phase1IntentClassification,
  phase1IntentClassificationSchema,
} from '@resolveai/shared';
import type { ResolveAIOpenAIClient } from './client.js';

const { INTENT_PROMPT_VERSION, INTENT_SYSTEM_PROMPT, buildIntentUserPrompt } = v1;

export interface ClassifyIntentInput {
  subject: string;
  body: string;
  fromEmail?: string;
  receivedAt?: Date;
  /** Override default model if needed. */
  model?: string;
}

export interface ClassifyIntentResult {
  classification: Phase1IntentClassification;
  promptVersion: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  raw: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Phase 1 intent classifier.
 *
 * Strict JSON-mode prompt, validated by zod. If validation fails, throws a
 * `ValidationError` so the caller can decide to escalate to a human.
 */
export async function classifyIntent(
  client: ResolveAIOpenAIClient,
  input: ClassifyIntentInput,
): Promise<ClassifyIntentResult> {
  const model = input.model ?? DEFAULT_MODEL;
  const userPrompt = buildIntentUserPrompt({
    subject: input.subject,
    body: input.body,
    fromEmail: input.fromEmail,
    receivedAt: input.receivedAt,
  });

  const startedAt = Date.now();

  const completion = await client.call('intent.classify', (oai) =>
    oai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  );

  const latencyMs = Date.now() - startedAt;
  const choice = completion.choices[0];
  const raw = choice?.message?.content ?? '';
  if (!raw) {
    throw new ValidationError('Intent classifier returned empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ValidationError(
      `Intent classifier returned invalid JSON: ${(err as Error).message}`,
      { raw },
    );
  }

  const result = phase1IntentClassificationSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('Intent classifier output failed schema', {
      issues: result.error.issues,
      raw,
    });
  }

  const usage = completion.usage as OpenAI.CompletionUsage | null | undefined;

  return {
    classification: result.data,
    promptVersion: INTENT_PROMPT_VERSION,
    model,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    latencyMs,
    raw,
  };
}
