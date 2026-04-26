import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClientToServerMessage, ServerToClientMessage } from './protocol.js';
import { STYLES } from './styles.js';

interface WidgetConfig {
  apiUrl: string;
  storeKey: string;
}

type ChatRow =
  | { id: string; role: 'user' | 'ai' | 'agent' | 'system'; body: string };

const ID = 'r-w-root';

function uuid(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getOrCreateSessionId(): string {
  try {
    let sid = localStorage.getItem('r-w-session');
    if (!sid) {
      sid = uuid();
      localStorage.setItem('r-w-session', sid);
    }
    return sid;
  } catch {
    return uuid();
  }
}

function buildWsUrl(apiUrl: string, storeKey: string): string {
  const u = new URL(apiUrl);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = u.pathname.replace(/\/$/, '') + '/ws/chat';
  u.searchParams.set('storeKey', storeKey);
  return u.toString();
}

function App({ apiUrl, storeKey }: WidgetConfig) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ChatRow[]>([
    {
      id: 'welcome',
      role: 'ai',
      body: "Hi! I'm your support assistant. How can I help today?",
    },
  ]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const streamRef = useRef<HTMLDivElement | null>(null);

  const ensureSocket = (): WebSocket => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    const ws = new WebSocket(buildWsUrl(apiUrl, storeKey));
    wsRef.current = ws;
    ws.addEventListener('open', () => {
      setConnected(true);
      const hello: ClientToServerMessage = {
        type: 'hello',
        storeKey,
        sessionId: sessionIdRef.current,
        visitor: {},
        pageUrl: location.href,
      };
      ws.send(JSON.stringify(hello));
    });
    ws.addEventListener('close', () => setConnected(false));
    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data) as ServerToClientMessage;
        if (msg.type === 'message') {
          setRows((prev) => [
            ...prev,
            {
              id: uuid(),
              role: msg.role.toLowerCase() as ChatRow['role'],
              body: msg.body,
            },
          ]);
        } else if (msg.type === 'error') {
          setRows((prev) => [
            ...prev,
            { id: uuid(), role: 'system', body: msg.message },
          ]);
        }
      } catch {
        /* ignore */
      }
    });
    return ws;
  };

  useEffect(() => {
    if (open) ensureSocket();
    return () => {
      // Keep the socket open while the page is alive so reconnects aren't needed.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [rows.length]);

  const send = (): void => {
    const body = draft.trim();
    if (!body) return;
    const ws = ensureSocket();
    const msg: ClientToServerMessage = {
      type: 'message',
      sessionId: sessionIdRef.current,
      body,
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      ws.addEventListener('open', () => ws.send(JSON.stringify(msg)), { once: true });
    }
    setRows((prev) => [...prev, { id: uuid(), role: 'user', body }]);
    setDraft('');
  };

  return (
    <div class="r-w-root">
      {open && (
        <div class="r-w-panel" role="dialog" aria-label="Customer support chat">
          <div class="r-w-header">
            <h3>Customer support</h3>
            <p>{connected ? 'We typically reply in under a minute.' : 'Connecting...'}</p>
          </div>
          <div class="r-w-stream" ref={streamRef}>
            {rows.map((r) => (
              <div key={r.id} class={`r-w-msg ${r.role}`}>
                {r.body}
              </div>
            ))}
          </div>
          <div class="r-w-input">
            <input
              type="text"
              value={draft}
              placeholder="Type a message..."
              aria-label="Message"
              onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
            <button type="button" onClick={send} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
      <button
        class="r-w-launcher"
        type="button"
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </div>
  );
}

export function mountWidget(cfg: WidgetConfig): void {
  let host = document.getElementById(ID);
  if (!host) {
    host = document.createElement('div');
    host.id = ID;
    document.body.appendChild(host);
  }
  if (!document.getElementById('r-w-styles')) {
    const style = document.createElement('style');
    style.id = 'r-w-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }
  render(<App {...cfg} />, host);
}
