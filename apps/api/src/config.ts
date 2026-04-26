import { parseApiEnv, type ApiEnv } from '@resolveai/shared';

let cached: ApiEnv | undefined;

export function getConfig(): ApiEnv {
  if (!cached) {
    cached = parseApiEnv();
  }
  return cached;
}
