import { mountWidget } from './widget';

/**
 * Embed entry point.
 *
 * Discover configuration from the <script> tag that loaded us:
 *   <script src="…/widget.js" data-store="<storeKey>" data-api="https://api.resolveai.app"></script>
 *
 * If `data-api` is omitted we fall back to the same origin as the script.
 *
 * Resolution order:
 *   1. `document.currentScript` — works for classic IIFE bundles in
 *      production. Returns `null` when the script is loaded as
 *      `type="module"` (e.g. the Vite dev preview), so we fall back.
 *   2. `script[data-store][src*="widget"]` — production CDN URL match.
 *   3. `script[data-store]` — any script with the data attribute. Covers
 *      the dev preview (src = `/src/embed.ts`) and self-hosted bundles
 *      whose filename doesn't contain "widget".
 *   4. `script[data-resolveai-store]` — long-form attribute we also
 *      accept to avoid clashing with other vendors' `data-store`.
 *
 * When multiple tags match, prefer the last one (lexical load order).
 */
function findConfigTag(): HTMLScriptElement | null {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current && (current.dataset.store || current.dataset.resolveaiStore)) {
    return current;
  }
  const selectors = [
    'script[data-store][src*="widget"]',
    'script[data-resolveai-store]',
    'script[data-store]',
  ];
  for (const sel of selectors) {
    const matches = document.querySelectorAll<HTMLScriptElement>(sel);
    if (matches.length > 0) return matches[matches.length - 1] ?? null;
  }
  return null;
}

function findConfig(): { apiUrl: string; storeKey: string } | null {
  const tag = findConfigTag();
  if (!tag) return null;
  const storeKey = (tag.dataset.store ?? tag.dataset.resolveaiStore)?.trim();
  if (!storeKey) return null;
  let apiUrl = (tag.dataset.api ?? tag.dataset.resolveaiApi)?.trim();
  if (!apiUrl) {
    try {
      apiUrl = new URL(tag.src).origin;
    } catch {
      apiUrl = location.origin;
    }
  }
  return { apiUrl, storeKey };
}

(function bootstrap(): void {
  if (typeof window === 'undefined') return;
  const cfg = findConfig();
  if (!cfg) {
    console.warn(
      '[ResolveAI] widget embed: could not find a <script> tag with `data-store="<key>"`. ' +
        'Add `data-store` to the script tag that loaded /widget.js. ' +
        'See https://resolveai.app/docs/widget#embed for examples.',
    );
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountWidget(cfg), { once: true });
  } else {
    mountWidget(cfg);
  }
})();
