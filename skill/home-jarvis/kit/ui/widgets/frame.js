// - sandbox="allow-scripts" only: no same-origin, so the page can't touch Jarvis's own controls, the app's page, cookies or storage;
//   the Mac app also ignores any message that doesn't come from the main page (main.swift: isMainFrame).
// - its own Content-Security-Policy: no network at all (connect-src 'none'), no forms, no frames, no outside scripts.
// Pure helpers first so node can test them without a page.

export const FRAME_SANDBOX = 'allow-scripts';
export const FRAME_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data: blob:; " +
  "media-src https: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; worker-src 'none'";

/** The connector's page with our policy put first, so it applies before anything of theirs. */
export function withCSP(html) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><meta name="referrer" content="no-referrer">`;
  return meta + String(html || '');
}

const MSG = (id, body) => ({ jsonrpc: '2.0', id, ...body });
/**
 * One message from the framed page → the answer to send back (or null). `ask` reaches widget-data.mjs.
 * Only the MCP-Apps calls a viewer needs are answered; everything else is refused.
 */
export async function frameReply(m, ask, start) {
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return null;
  const has = m.id !== undefined && m.id !== null;
  switch (m.method) {
    case 'ui/initialize':
      return has ? MSG(m.id, { result: { protocolVersion: '2025-06-18', hostInfo: { name: 'Jarvis', version: '5' }, hostCapabilities: {}, hostContext: { theme: 'dark', displayMode: 'inline' } } }) : null;
    case 'tools/call': {
      if (!has) return null;
      const p = m.params || {};
      const r = await ask({ op: 'tool', name: String(p.name || ''), args: p.arguments && typeof p.arguments === 'object' ? p.arguments : {} });
      return r && r.ok ? MSG(m.id, { result: r.result }) : MSG(m.id, { error: { code: -32000, message: (r && r.error) || 'Not allowed from here.' } });
    }
    case 'ping': return has ? MSG(m.id, { result: {} }) : null;
    case 'ui/notifications/initialized': { // the screen is ready: its opening read, as a tool result
      if (!start || !start.name) return null;
      const r = await ask({ op: 'tool', name: String(start.name), args: start.args || {} });
      return r && r.ok ? { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: r.result } : null;
    }
    default: // open links, send messages, change size, anything else: not from inside the frame
      return has ? MSG(m.id, { error: { code: -32601, message: 'Jarvis does not allow that from this screen.' } }) : null;
  }
}

/** The page-side part: builds the iframe and answers it. Returns { el, stop }. */
export function lockedFrame(html, { ask, start }) {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', FRAME_SANDBOX);
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.setAttribute('allow', '');
  f.setAttribute('title', 'Connector screen');
  f.className = 'wb-frame';
  f.srcdoc = withCSP(html);
  const onMsg = async (e) => {
    if (e.source !== f.contentWindow) return; // only this frame, never another page
    let out = null; try { out = await frameReply(e.data, ask, start); } catch { out = null; }
    if (out && f.contentWindow) f.contentWindow.postMessage(out, '*'); // the frame has no origin of its own, so '*' is the only target
  };
  addEventListener('message', onMsg);
  return { el: f, stop: () => removeEventListener('message', onMsg) };
}
