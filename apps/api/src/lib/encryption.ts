import {
  resolveEncryptionKey,
  encryptJSON,
  decryptJSON,
  isEncryptedPayload,
  type EncryptedPayload,
} from '@resolveai/shared';
import { getConfig } from '../config.js';

let keyCache: Buffer | undefined;

function getKey(): Buffer {
  if (!keyCache) {
    keyCache = resolveEncryptionKey(getConfig().ENCRYPTION_KEY);
  }
  return keyCache;
}

export function sealCredentials<T>(value: T): EncryptedPayload {
  return encryptJSON(value, getKey());
}

export function openCredentials<T = unknown>(stored: unknown): T {
  if (!isEncryptedPayload(stored)) {
    throw new Error('Stored credentials are not in the expected encrypted format');
  }
  return decryptJSON<T>(stored, getKey());
}
