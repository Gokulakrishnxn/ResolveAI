import { autoRefundPolicySchema, type StorePolicy } from './types.js';

/**
 * Three opinionated automation presets surfaced in the onboarding wizard
 * (and in `/settings/rules` as quick-set buttons). They map directly to
 * the underlying `StorePolicy` shape so a merchant can pick one and
 * immediately see the resulting rules.
 *
 * - **Conservative** — auto-refund disabled. AI drafts replies; humans approve.
 * - **Balanced**     — auto-refund up to $50, < 30 days, photo required for
 *                       damage/wrong-item. Recommended default for stores
 *                       with up to ~2k tickets/month.
 * - **Aggressive**   — auto-refund up to $200, < 60 days, no photo
 *                       requirement, broader allowed reasons. Designed for
 *                       brands that prioritize CSAT over per-ticket margin.
 */

export const AUTOMATION_PRESET_IDS = ['conservative', 'balanced', 'aggressive'] as const;
export type AutomationPresetId = (typeof AUTOMATION_PRESET_IDS)[number];

interface AutomationPreset {
  id: AutomationPresetId;
  name: string;
  description: string;
  policy: StorePolicy;
}

function basePolicy(autoRefund: Partial<StorePolicy['autoRefund']>): StorePolicy {
  return {
    version: 0,
    autoRefund: autoRefundPolicySchema.parse(autoRefund),
  };
}

export const AUTOMATION_PRESETS: Record<AutomationPresetId, AutomationPreset> = {
  conservative: {
    id: 'conservative',
    name: 'Conservative',
    description:
      'AI drafts every reply, but a human approves before anything goes out. Best for newcomers.',
    policy: basePolicy({ enabled: false }),
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description:
      'Auto-refund up to $50 within 30 days. Photo required for damage / wrong item.',
    policy: basePolicy({
      enabled: true,
      maxAmountUsd: 50,
      maxOrderAgeDays: 30,
      allowedReasons: ['not_received', 'damaged', 'wrong_item'],
      requirePhotoFor: ['damaged', 'wrong_item'],
      blocklistCustomerFlags: ['fraud_suspected', 'chargeback_history'],
    }),
  },
  aggressive: {
    id: 'aggressive',
    name: 'Aggressive',
    description:
      'Auto-refund up to $200 within 60 days. Broader reason coverage, no photo required.',
    policy: basePolicy({
      enabled: true,
      maxAmountUsd: 200,
      maxOrderAgeDays: 60,
      allowedReasons: [
        'not_received',
        'damaged',
        'wrong_item',
        'late_delivery',
        'duplicate_order',
      ],
      requirePhotoFor: [],
      blocklistCustomerFlags: ['fraud_suspected', 'chargeback_history'],
    }),
  },
};

export function presetForId(id: AutomationPresetId): AutomationPreset {
  return AUTOMATION_PRESETS[id];
}
