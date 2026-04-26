/**
 * Minimal browser-side widget snippet generator.
 *
 * Merchants embed:
 *
 *   <script src="https://cdn.resolveai.app/widget.js" data-key="..."></script>
 *
 * but for self-hosting we expose a function that returns the JS payload that
 * connects to the WS gateway. This keeps the widget code in one place.
 */
export function buildWidgetSnippet(opts: {
  publicKey: string;
  wsUrl: string;
}): string {
  const safeKey = JSON.stringify(opts.publicKey);
  const safeUrl = JSON.stringify(opts.wsUrl);
  return `(function(){
  var key = ${safeKey};
  var url = ${safeUrl};
  var sessionId = localStorage.getItem('resolveai_sid') || (function(){
    var s = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    localStorage.setItem('resolveai_sid', s);
    return s;
  })();
  var ws = new WebSocket(url);
  ws.onopen = function(){
    ws.send(JSON.stringify({ type: 'hello', storeKey: key, sessionId: sessionId, visitor: {}, pageUrl: location.href }));
  };
  window.ResolveAI = {
    send: function(body){ ws.send(JSON.stringify({ type: 'message', sessionId: sessionId, body: body })); },
    onMessage: function(cb){ ws.addEventListener('message', function(e){ try { cb(JSON.parse(e.data)); } catch(_) {} }); }
  };
})();`;
}
