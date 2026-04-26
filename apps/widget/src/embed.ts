import { mountWidget } from './widget';

/**
 * Embed entry point.
 *
 * Discover configuration from the <script> tag that loaded us:
 *   <script src="…/widget.js" data-store="<storeKey>" data-api="https://api.resolveai.app"></script>
 *
 * If `data-api` is omitted we fall back to the same origin as the script.
 */
function findConfig(): { apiUrl: string; storeKey: string } | null {
  const tag =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-store][src*="widget"]');
  if (!tag) return null;
  const storeKey = tag.dataset.store?.trim();
  if (!storeKey) return null;
  let apiUrl = tag.dataset.api?.trim();
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
    console.warn('[ResolveAI] widget embed: missing data-store on <script> tag');
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountWidget(cfg), { once: true });
  } else {
    mountWidget(cfg);
  }
})();
