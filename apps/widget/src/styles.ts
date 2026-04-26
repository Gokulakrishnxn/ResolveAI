/**
 * Inlined widget styles. Kept as a single string so we can inject one
 * <style> tag and avoid leaking host-page CSS into the widget.
 */
export const STYLES = /* css */ `
.r-w-root, .r-w-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, sans-serif; }
.r-w-root { position: fixed; right: 24px; bottom: 24px; z-index: 2147483640; color: #0f172a; }
.r-w-launcher { width: 56px; height: 56px; border-radius: 28px; background: #0f172a; color: white; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; }
.r-w-launcher svg { width: 24px; height: 24px; }
.r-w-panel { position: absolute; bottom: 70px; right: 0; width: 360px; height: 520px; background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18); display: flex; flex-direction: column; overflow: hidden; }
.r-w-header { background: #0f172a; color: white; padding: 14px 16px; }
.r-w-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.r-w-header p { margin: 2px 0 0; font-size: 12px; opacity: 0.75; }
.r-w-stream { flex: 1; padding: 12px 16px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 8px; }
.r-w-msg { padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; max-width: 80%; word-wrap: break-word; }
.r-w-msg.ai, .r-w-msg.agent, .r-w-msg.system { align-self: flex-start; background: white; border: 1px solid #e2e8f0; }
.r-w-msg.system { background: #fef9c3; border-color: #fde68a; color: #713f12; font-size: 12px; }
.r-w-msg.user { align-self: flex-end; background: #0f172a; color: white; }
.r-w-input { display: flex; border-top: 1px solid #e2e8f0; padding: 8px; gap: 6px; background: white; }
.r-w-input input { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-size: 14px; outline: none; }
.r-w-input input:focus { border-color: #0f172a; }
.r-w-input button { border: none; background: #0f172a; color: white; border-radius: 10px; padding: 0 14px; font-weight: 600; cursor: pointer; font-size: 13px; }
.r-w-input button:disabled { opacity: 0.5; cursor: not-allowed; }
`;
