import { Redis } from 'ioredis';
import { getConfig } from '../config.js';

let client: Redis | undefined;

export function getRedis(): Redis {
  if (client) return client;
  const next = new Redis(getConfig().REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  client = next;
  return next;
}

export type { Redis };
