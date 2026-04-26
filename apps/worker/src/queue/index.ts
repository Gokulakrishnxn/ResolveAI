import { Queue, type JobsOptions } from 'bullmq';
import { getRedis } from '../lib/redis.js';
import { getConfig } from '../config.js';

export const QUEUE_NAMES = {
  ticketProcessor: 'ticket-processor',
  actionExecutor: 'action-executor',
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    const cfg = getConfig();
    q = new Queue(name, {
      connection: getRedis(),
      prefix: cfg.REDIS_QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 3_600, count: 1_000 },
        removeOnFail: { age: 24 * 3_600, count: 5_000 },
      },
    });
    queues.set(name, q);
  }
  return q;
}

export async function enqueueProcessTicket(
  data: { storeId: string; ticketId: string },
  opts?: JobsOptions,
): Promise<void> {
  const q = getQueue(QUEUE_NAMES.ticketProcessor);
  await q.add(`ticket:${data.ticketId}`, data, {
    jobId: `ticket:${data.storeId}:${data.ticketId}`,
    ...opts,
  });
}

export async function enqueueExecuteAction(
  data: { storeId: string; actionId: string },
  opts?: JobsOptions,
): Promise<void> {
  const q = getQueue(QUEUE_NAMES.actionExecutor);
  await q.add(`action:${data.actionId}`, data, {
    jobId: `action:${data.storeId}:${data.actionId}`,
    ...opts,
  });
}
