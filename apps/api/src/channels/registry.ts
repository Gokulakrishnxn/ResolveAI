import type { ChannelKind } from '@resolveai/shared';
import type { ChannelAdapter } from './adapter.js';

const adapters = new Map<ChannelKind, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.kind, adapter);
}

export function getAdapter<K extends ChannelKind>(kind: K): ChannelAdapter | undefined {
  return adapters.get(kind);
}

export function listAdapters(): ChannelAdapter[] {
  return Array.from(adapters.values());
}
