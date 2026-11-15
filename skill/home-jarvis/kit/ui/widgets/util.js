// The first half is pure (no page needed) so node can test it; the DOM helpers below only touch the page when called.

// ---------- pure ----------
const numOrNull = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[$,\s]/g, '')); return isFinite(n) ? n : null;
};
export const num = numOrNull;

// 1234 -> "$1,234.00"; anything that is not a number -> "–" (never a guess)
export function money(v) {
  const n = numOrNull(v); if (n === null) return '–';
  const r = Math.round(n * 100) / 100;
  return (r < 0 ? '-$' : '$') + Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Anything that looks like an account or card number (9 or more digits, spaces or dashes allowed) keeps its last 4 only.
// Dates (2026-11-12, with or without a time) and phone numbers written 718-555-0142 are left alone.
const NUMBERISH = /(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?!\d)(?:[T ]\d{2}:\d{2}(?::\d{2})?)?)|(\d(?:[ -]?\d){8,})/g;
const PHONE = /^(?:\+?1[ -])?\d{3}[ -]\d{3}[ -]\d{4}$/;
export function maskAccounts(s) {
  return String(s ?? '').replace(NUMBERISH, (m, date, run, off, all) => {
    if (date) return m;
    if (PHONE.test(m) || (all[off - 1] === '+' && PHONE.test('+' + m))) return m;
    return '•••• ' + m.replace(/\D/g, '').slice(-4);
  });
}
// every string from outside goes through this before it is shown
export const text = (v) => (v === null || v === undefined ? '' : maskAccounts(String(v)).trim());

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-11-12" -> "Thu 12 Nov" (the year is added only when it is not this year); other wording passes through
export function fmtDate(s, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? '')); if (!m) return text(s);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (isNaN(d)) return text(s);
  const out = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONS[d.getUTCMonth()]}`;
  return +m[1] === now.getFullYear() ? out : `${out} ${m[1]}`;
}
// "14:30" -> "2:30 PM"; other wording passes through
export function fmtTime(s) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(s ?? '').trim()); if (!m || +m[1] > 23) return text(s);
  return `${+m[1] % 12 || 12}:${m[2]} ${+m[1] < 12 ? 'AM' : 'PM'}`;
}
// a full date-time ("2026-11-12T14:30:00Z" or "2026-11-12 14:30") -> "Thu 12 Nov, 2:30 PM"
export function fmtWhen(s) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}:\d{2}))?/.exec(String(s ?? '')); if (!m) return text(s);
  return m[2] ? `${fmtDate(m[1])}, ${fmtTime(m[2])}` : fmtDate(m[1]);
}
// pictures may only come from https or be an inline image; anything else is not loaded
export function safeImg(u) {
  const s = String(u ?? '').trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) || /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s) ? s : '';
}
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
export const join = (...bits) => bits.filter((b) => b !== null && b !== undefined && b !== '').join(' · ');

// ---------- DOM (called only in the page) ----------
export function h(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = String(txt); return e; }
export function row(label, value, cls) { const r = h('div', 'wg-r' + (cls ? ' ' + cls : '')); r.append(h('span', '', label), h('span', '', value)); return r; }
// one list entry: a title with a value on the right, and a quieter second line
export function item(el, { title, right, sub, warn, lines }) {
  const it = h('div', 'wb-it'); const top = h('div', 'wb-it1'); top.append(h('span', '', title || '–'));
  if (right) top.append(h('span', warn ? 'wg-warn' : '', right));
  it.append(top); if (sub) { const s = h('div', 'wb-it2', sub); if (lines) s.style.webkitLineClamp = String(lines); it.append(s); }
  el.append(it); return it;
}
export const head = (el, label) => el.append(h('div', 'wb-hd', label));
export const none = (el, msg) => el.append(h('div', 'wg-sub', msg || 'Nothing here right now.'));
export function button(label, cls) { const b = h('button', 'wb-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; return b; }
export function yesButton(label, needsYes, onYes, sure) {
  const b = button(label); let armed = 0, at = 0;
  const calm = () => { clearTimeout(armed); armed = 0; b.textContent = label; b.classList.remove('wb-main'); };
  b.addEventListener('click', () => {
    if (b.disabled) return;
    if (needsYes && !armed) { at = Date.now(); b.textContent = sure || `Sure? ${label}`; b.classList.add('wb-main'); armed = setTimeout(calm, 6000); return; }
    if (needsYes && Date.now() - at < 400) return; // a double-click is not a yes
    calm(); onYes(b);
  });
  return b;
}
