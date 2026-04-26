import { parseWorkerEnv, type WorkerEnv } from '@resolveai/shared';

let cached: WorkerEnv | undefined;
export function getConfig(): WorkerEnv {
  if (!cached) cached = parseWorkerEnv();
  return cached;
}
