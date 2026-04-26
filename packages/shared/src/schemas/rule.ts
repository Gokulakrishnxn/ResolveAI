import { z } from 'zod';
import { actionKindSchema } from './action.js';
import { ticketIntentSchema, ticketSentimentSchema } from './ticket.js';

/**
 * Rule conditions are a small DSL the worker evaluates against ticket context.
 * Recursive types in zod are expressed via `z.lazy`.
 */

const comparisonOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'contains',
]);

interface RuleConditionLeaf {
  field: string;
  op: z.infer<typeof comparisonOperatorSchema>;
  value?: unknown;
}

interface RuleConditionGroup {
  all?: RuleCondition[];
  any?: RuleCondition[];
  not?: RuleCondition;
}

export type RuleCondition = RuleConditionLeaf | RuleConditionGroup;

const ruleConditionSchema: z.ZodType<RuleCondition> = z.lazy(() =>
  z.union([
    z.object({
      field: z.string().min(1),
      op: comparisonOperatorSchema,
      value: z.unknown(),
    }),
    z.object({
      all: z.array(ruleConditionSchema).optional(),
      any: z.array(ruleConditionSchema).optional(),
      not: ruleConditionSchema.optional(),
    }),
  ]),
);

export const ruleActionSchema = z.object({
  kind: actionKindSchema,
  /** Template payload merged with runtime ticket context at execution time. */
  payload: z.record(z.string(), z.unknown()).default({}),
  requireApproval: z.boolean().default(false),
});

export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  condition: ruleConditionSchema,
  action: ruleActionSchema,
  priority: z.number().int().min(0).max(1000).default(100),
  isActive: z.boolean().default(true),
});
export type CreateRuleInput = z.infer<typeof createRuleSchema>;

/**
 * The shape we expose to rule conditions. Worker hydrates this before eval.
 */
export const ruleEvaluationContextSchema = z.object({
  ticket: z.object({
    intent: ticketIntentSchema,
    sentiment: ticketSentimentSchema,
    intentConfidence: z.number().min(0).max(1).optional(),
    channel: z.string(),
    language: z.string(),
    subject: z.string().optional(),
  }),
  customer: z
    .object({
      ordersCount: z.number().int().nonnegative(),
      totalSpent: z.number().nonnegative(),
      tags: z.array(z.string()),
    })
    .optional(),
  order: z
    .object({
      status: z.string(),
      totalPrice: z.number().nonnegative(),
      currency: z.string(),
      ageDays: z.number().nonnegative(),
    })
    .optional(),
});
export type RuleEvaluationContext = z.infer<typeof ruleEvaluationContextSchema>;
