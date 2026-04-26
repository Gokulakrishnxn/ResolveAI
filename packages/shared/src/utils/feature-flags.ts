import { z } from 'zod';

/**
 * Phase-1 feature flags. We parse from `process.env` once at startup and pass
 * the typed result through. Default is the safest possible value.
 */

const boolFlag = (defaultValue: boolean): z.ZodEffects<z.ZodOptional<z.ZodString>, boolean> =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultValue;
      const normalized = v.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    });

export const featureFlagsSchema = z.object({
  AUTO_RESOLVE_ORDER_STATUS: boolFlag(true),
  AUTO_APPROVE_REFUNDS: boolFlag(false),
  AUTO_REPLY_OUT_OF_HOURS_ONLY: boolFlag(false),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

export function parseFeatureFlags(env: NodeJS.ProcessEnv = process.env): FeatureFlags {
  return featureFlagsSchema.parse(env);
}
