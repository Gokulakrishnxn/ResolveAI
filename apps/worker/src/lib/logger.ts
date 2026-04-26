import pino from 'pino';
import { getConfig } from '../config.js';

const cfg = getConfig();

export const logger = pino({
  level: cfg.LOG_LEVEL,
  transport:
    cfg.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});
