import {
  resolveEncryptionKey,
  decryptJSON,
  isEncryptedPayload,
} from '@resolveai/shared';
import { getConfig } from '../config.js';

let keyCache: Buffer | undefined;

function getKey(): Buffer {
  if (!keyCache) {
    keyCache = resolveEncryptionKey(getConfig().ENCRYPTION_KEY);
  }
  return keyCache;
}

export function openCredentials<T = unknown>(stored: unknown): T {
  if (!isEncryptedPayload(stored)) {
    throw new Error('Stored credentials are not in the expected encrypted format');
  }
  return decryptJSON<T>(stored, getKey());
}
