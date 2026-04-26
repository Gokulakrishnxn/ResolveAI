import { Redis } from 'ioredis';
import { getConfig } from '../config.js';

let client: Redis | undefined;

/**
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
 * for the connection it uses for blocking commands.
 */
export function getRedis(): Redis {
  if (client) return client;
  const cfg = getConfig();
  const next = new Redis(cfg.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  client = next;
  return next;
}

export type { Redis };
