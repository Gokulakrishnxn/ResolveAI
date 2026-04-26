'use client';

import { useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Subscribe to the API's inbox SSE channel.
 *
 * Implemented via `fetch` streaming so we can attach the dev auth headers
 * (Clerk's session token / `x-store-id`). Falls back to a polling no-op when
 * `EventSource`/streaming is unavailable.
 */
export function useInboxStream(onEvent: (event: SseEvent) => void): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const ctrl = new AbortController();
    const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';
    if (!storeId || !userId) return undefined;

    let stopped = false;

    const start = async (): Promise<void> => {
      try {
        const res = await fetch(`${API_URL}/inbox/stream`, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'x-store-id': storeId,
            'x-user-id': userId,
          },
          signal: ctrl.signal,
          cache: 'no-store',
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const json = dataLine.slice('data:'.length).trim();
            if (!json) continue;
            try {
              handlerRef.current(JSON.parse(json) as SseEvent);
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      } catch {
        /* aborted or network error */
      }
    };

    void start();
    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, []);
}
