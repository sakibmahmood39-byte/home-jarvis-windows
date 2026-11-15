// The backup brain: Qwen running in Ollama on this PC (127.0.0.1 only, free, works without internet).
// Used when Claude can't answer (busy, limit reached, no internet), or first for quick questions if he chose that.
export const DEFAULT_MODEL = 'qwen3.5:4b-q4_K_M';
const BASE = process.env.JARVIS_LOCAL_URL || 'http://127.0.0.1:11434';
export function localConf(s = {}) { const l = (s.models && s.models.local) || {}; return { enabled: l.enabled !== false, model: l.model || DEFAULT_MODEL, offline_first: l.offline_first === true }; }
export async function localStatus(s) {
  const c = localConf(s);
  try {
    const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(2500) }); const j = await r.json();
    const names = (j.models || []).map((m) => m.name);
    return { installed: true, running: true, hasModel: names.some((n) => n === c.model || n.startsWith(c.model.split(':')[0])), model: c.model, ok: true };
  } catch { return { installed: false, running: false, model: c.model }; }
}
export async function askLocal({ system, input, settings }) {
  const c = localConf(settings); if (!c.enabled) return { ok: false, text: '', err: 'local brain is off' };
  try {
    const r = await fetch(`${BASE}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ model: c.model, stream: false, think: false, options: { temperature: 0.4, num_predict: 300 }, messages: [{ role: 'system', content: system }, { role: 'user', content: input }] }) });
    const j = await r.json(); const text = String((j.message && j.message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return { ok: !!text, text, err: j.error || '' };
  } catch (e) { return { ok: false, text: '', err: e.message }; }
}
