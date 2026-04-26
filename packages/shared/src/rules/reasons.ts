import { z } from 'zod';
import { refundReasonCodeEnum, type RefundReasonCode } from './types.js';

/**
 * Maps free-form natural-language reason terms (e.g. extracted from emails or
 * chat) to the structured `RefundReasonCode` taxonomy used by the rules engine.
 *
 * The mapping is intentionally conservative: when no mapping is found we
 * return `undefined` and the rules engine surfaces `MISSING_REASON_CODE`.
 */

const KEYWORD_MAP: Array<[string[], RefundReasonCode]> = [
  [['not received', 'never arrived', 'never received', 'never came', 'didnt arrive', "didn't arrive", 'lost in transit', 'package lost'], 'not_received'],
  [['damaged', 'broken', 'cracked', 'shattered', 'arrived damaged', 'dented'], 'damaged'],
  [['wrong item', 'wrong product', 'incorrect item', 'wrong color', 'wrong size', 'not what i ordered', 'received the wrong'], 'wrong_item'],
  [['changed my mind', 'changed mind', 'change of mind', 'no longer want', 'do not want', "don't want it", 'dont need'], 'changed_mind'],
  [['late', 'too late', 'arrived late', 'not on time', 'past the date'], 'late_delivery'],
  [['duplicate', 'charged twice', 'double charged', 'two orders'], 'duplicate_order'],
];

export function mapReasonText(input: string | undefined | null): RefundReasonCode | undefined {
  if (!input) return undefined;
  const text = input.toLowerCase();
  for (const [keywords, code] of KEYWORD_MAP) {
    if (keywords.some((k) => text.includes(k))) return code;
  }
  return undefined;
}

export const reasonExtractionSchema = z.object({
  reasonCode: refundReasonCodeEnum.optional(),
  hasPhoto: z.boolean().default(false),
});
export type ReasonExtraction = z.infer<typeof reasonExtractionSchema>;
