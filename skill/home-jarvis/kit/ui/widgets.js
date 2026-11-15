// can be dragged between dock slots, and one at a time can fill the stage. Later phases put their
// content in through open('custom', { id, title, render }) or register(kind, def).
// Self-contained: injects its own CSS, styles only through the app's CSS variables, no network
// beyond ./data/*, no timers while the window is hidden.

import { P6_WIDGETS, P6_ICONS } from './p6-widgets.js';
import { renderCameras } from './cameras-widget.js';
import { renderWallet, WALLET_ICON } from './widgets/wallet.js';
import { renderNetwork, NETWORK_ICON } from './widgets/network.js';

const CSS = `
.wg-layer{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:var(--font);color:var(--fg);transition:opacity .2s ease}
.wg-layer.wg-off{opacity:0;visibility:hidden;transition:opacity .2s ease,visibility 0s .2s}
.wg-layer.wg-off *{pointer-events:none!important}
.wg{position:absolute;left:0;top:0;display:flex;flex-direction:column;box-sizing:border-box;pointer-events:auto;outline:0;
  background:var(--glass);border:1px solid var(--line);border-radius:16px;
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  box-shadow:0 10px 30px -18px rgba(0,0,0,.55);transform-origin:50% 50%;will-change:transform,opacity;
  max-height:var(--wg-maxh,320px);overflow:hidden;transition:border-color .2s ease,box-shadow .2s ease}
.wg.wg-front{border-color:var(--a);border-color:color-mix(in srgb,var(--a) 55%,var(--line))}
.wg:focus-visible{box-shadow:0 0 0 2px var(--a),0 10px 30px -18px rgba(0,0,0,.55)}
.wg.wg-drag{box-shadow:0 22px 46px -18px rgba(0,0,0,.7);cursor:grabbing}
.wg.wg-full{max-height:none;box-shadow:0 24px 60px -24px rgba(0,0,0,.7)}
.wg-h{display:flex;align-items:center;gap:8px;padding:10px 8px 6px 14px;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;flex:none}
.wg-drag .wg-h{cursor:grabbing}.wg-full .wg-h{cursor:default}
.wg-ic{display:flex;color:var(--a);flex:none}.wg-ic svg,.wg-rail svg,.wg-x svg{width:16px;height:16px;display:block}
.wg-t{flex:1;min-width:0;font:800 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-x{all:unset;box-sizing:border-box;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--muted);cursor:pointer;flex:none;transition:color .15s ease,background .15s ease}
.wg-x svg{width:14px;height:14px}
.wg-x:hover{color:var(--fg);background:rgba(127,127,127,.18)}
.wg-x:active{transform:scale(.92);background:rgba(127,127,127,.28)}
.wg-x:focus-visible,.wg-rail button:focus-visible{outline:2px solid var(--a);outline-offset:1px}
.wg-b{padding:2px 16px 14px;overflow-y:auto;min-height:0;flex:1;font-size:14px;line-height:1.35;font-weight:550;scrollbar-width:none}
.wg-b::-webkit-scrollbar{display:none}
.wg-full .wg-b{font-size:19px;padding:8px 26px 24px}
.wg-full .wg-t{font-size:13px}.wg-full .wg-h{padding:14px 12px 8px 24px}
.wg-big{font-size:1.6em;font-weight:800;line-height:1.15;letter-spacing:-.015em}
.wg-date{font-size:1.3em}
.wg-sub{color:var(--muted);font-size:.9em;font-weight:600;margin-top:3px}
.wg-note{color:var(--muted);font-size:.86em;font-weight:600;margin-top:9px}
.wg-warn{color:var(--a)}
.wg-sep{height:1px;background:var(--line);margin:10px 0 8px}
.wg-r{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:4px 0}
.wg-r>span:first-child{color:var(--muted);font-weight:600;min-width:0}
.wg-r>span:last-child{font-weight:750;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.wg-r.wg-now{margin:0 -8px;padding:5px 8px;border-radius:9px;background:rgba(127,127,127,.16);box-shadow:inset 0 0 0 1px var(--a)}
.wg-r.wg-now>span{color:var(--a)}
.wg-r.wg-past>span{opacity:.55}
.wg-bar{height:5px;border-radius:3px;background:rgba(127,127,127,.25);overflow:hidden;margin:7px 0 3px}
.wg-bar i{display:block;height:100%;border-radius:3px;background:var(--a)}
.wg-li{display:flex;gap:9px;padding:4px 0;align-items:baseline}
.wg-li b{flex:none;font:800 .68em var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--a);min-width:4.6em}
.wg-li span{min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wg-clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.wg-rail{position:absolute;left:14px;top:50%;transform:translateY(-50%);display:none;flex-direction:column;gap:6px;padding:6px;pointer-events:auto;
  background:var(--glass);border:1px solid var(--line);border-radius:14px;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.wg-layer.wg-on .wg-rail{display:flex}
.wg-rail button{all:unset;box-sizing:border-box;position:relative;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--muted);cursor:pointer;transition:color .15s ease,background .15s ease}
.wg-rail svg{width:18px;height:18px}
.wg-rail button:hover{color:var(--fg);background:rgba(127,127,127,.18)}
.wg-rail button:active{transform:scale(.94);background:rgba(127,127,127,.28)}
.wg-rail button[aria-pressed=true]{color:var(--a);background:rgba(127,127,127,.16)}
.wg-rail button::after{content:attr(data-tip);position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);white-space:nowrap;
  padding:5px 9px;border-radius:8px;background:var(--glass);border:1px solid var(--line);color:var(--fg);font:650 12px var(--font);
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);opacity:0;pointer-events:none;transition:opacity .12s ease}
.wg-rail button:hover::after,.wg-rail button:focus-visible::after{opacity:1}
@keyframes wg-in{from{opacity:0}}
.wg.wg-fade{animation:wg-in .18s ease both}
.wg.wg-out{opacity:0!important;transition:opacity .15s ease}
@media (prefers-reduced-transparency:reduce){.wg,.wg-rail{-webkit-backdrop-filter:none;backdrop-filter:none}}
@media (prefers-contrast:more){.wg,.wg-rail{border-color:var(--fg)}}
`;

const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  today: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  prayer: SVG('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.500 10.500z"/><path d="M17 4.200l.6 1.500 1.500.6-1.500.6-.6 1.500-.6-1.500-1.500-.6 1.500-.6z"/>'),
  car: SVG('<path d="M4 16v-3.200l1.900-4.900A2 2 0 0 1 7.800 6.600h8.400a2 2 0 0 1 1.900 1.300L20 12.800V16"/><path d="M3 16h18v2.200H3zM5.500 18.200V20M18.500 18.200V20M4.300 12.300h15.400"/><circle cx="7.500" cy="14.200" r=".6"/><circle cx="16.500" cy="14.200" r=".6"/>'),
  paper: SVG('<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>'),
  bills: SVG('<rect x="3" y="5.500" width="18" height="13" rx="2.500"/><path d="M3 10h18M7 14.500h4"/>'),
  cameras: SVG('<rect x="3" y="7" width="12.5" height="10" rx="2.5"/><path d="M15.5 10.5l5-2.5v8l-5-2.5"/>'),
  wallet: SVG(WALLET_ICON),
  network: SVG(NETWORK_ICON),
  custom: SVG('<rect x="4" y="4" width="16" height="16" rx="3.500"/><path d="M4 9.500h16"/>'),
  full: SVG('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  dock: SVG('<path d="M20 10h-6V4M4 14h6v6M14 10l6.500-6.500M10 14l-6.500 6.500"/>'),
  close: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
};

// ---------- small helpers ----------
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function row(label, value, cls) { const r = h('div', 'wg-r' + (cls ? ' ' + cls : '')); r.append(h('span', '', label), h('span', '', value)); return r; }
function bar(pct) { const b = h('div', 'wg-bar'); const i = h('i'); i.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + '%'; b.append(i); return b; }
const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));

// New York wall clock, whatever the Mac's own time zone says.
const NY = new Intl.DateTimeFormat('en-US', { timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined), hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
function nyNow(d = new Date()) {
  const o = {}; for (const p of NY.formatToParts(d)) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  return { ...o, mins: o.hour * 60 + o.minute + o.second / 60, wall: Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) };
}
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? +m[1] * 60 + +m[2] : null; };
const t12 = (s) => { const v = hm(s); if (v == null) return String(s || '–'); const H = Math.floor(v / 60), M = v % 60; return `${H % 12 || 12}:${String(M).padStart(2, '0')} ${H < 12 ? 'AM' : 'PM'}`; };
function span(mins) { mins = Math.max(0, Math.round(mins)); const H = Math.floor(mins / 60), M = mins % 60; return H ? (M ? `${H} h ${M} min` : `${H} h`) : `${M} min`; }
function ago(ms) {
  if (ms == null || isNaN(ms)) return null; const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const hrs = Math.floor(m / 60); if (hrs < 24) return `${hrs} h ago`;
  const d = Math.floor(hrs / 24); return d === 1 ? '1 day ago' : `${d} days ago`;
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// "Tue 10 Nov, 05:13 PM" (New York, no year) -> how long ago, in ms
function carAge(s) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(String(s || '')); if (!m) return null;
  const mo = MONTHS.indexOf(m[2].toLowerCase()); if (mo < 0) return null;
  let hr = +m[3]; if (m[5]) { hr %= 12; if (/pm/i.test(m[5])) hr += 12; }
  const now = nyNow(); let t = Date.UTC(now.year, mo, +m[1], hr, +m[4]);
  if (t > now.wall + 86400000) t = Date.UTC(now.year - 1, mo, +m[1], hr, +m[4]);
  return Math.max(0, now.wall - t);
}
const FIVE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
function prayerNow(pr) {
  const times = (pr && pr.times) || {}; const now = nyNow().mins; let current = null, next = null;
  for (const n of FIVE) { const t = hm(times[n]); if (t == null) continue; if (t <= now) current = n; else if (!next) next = { name: n, at: times[n], inMin: t - now }; }
  if (current === 'Fajr' && hm(times.Sunrise) != null && now >= hm(times.Sunrise)) current = null; // Fajr ends at sunrise
  if (!current && hm(times.Fajr) != null && now < hm(times.Fajr)) current = 'Isha'; // small hours: still last night's Isha
  if (!next) { const f = (pr && pr.tomorrow && pr.tomorrow.Fajr) || times.Fajr; const t = hm(f); if (t != null) next = { name: 'Fajr', at: f, inMin: 1440 - now + t, tomorrow: true }; }
  return { current, next, times };
}

// ---------- the built-in widgets ----------
const empty = (el, msg) => el.append(h('div', 'wg-sub', msg));
const WIDGETS = {
  today: {
    title: 'Today', tip: 'Today', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read today’s page just now.' : 'Loading…');
      const t = hub.today || {};
      const date = String(t.date_long || new Intl.DateTimeFormat('en-US', { timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined), weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())).replace(/,\s*\d{4}\s*$/, '');
      el.append(h('div', 'wg-big wg-date', date));
      const w = t.weather || {};
      if (w.today) el.append(h('div', 'wg-sub', w.today));
      if (w.outlook) el.append(h('div', 'wg-sub', w.outlook));
      const p = prayerNow(hub.prayer);
      if (p.next) { el.append(h('div', 'wg-sep')); const r = row(`Next: ${p.next.name} ${t12(p.next.at)}`, `in ${span(p.next.inMin)}`); r.firstChild.style.cssText = 'color:var(--fg);white-space:nowrap'; el.append(r); }
      const todos = ((hub.lead || t.lead || {}).todos || []).slice(0, 3);
      el.append(h('div', 'wg-sep'));
      if (!todos.length) el.append(h('div', 'wg-sub', 'No to-dos on today’s page.'));
      for (const x of todos) { const li = h('div', 'wg-li'); li.append(h('b', '', x.when || x.tag || ''), h('span', '', x.t || '')); el.append(li); }
    },
  },
  prayer: {
    title: 'Prayer times', tip: 'Prayer times', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read the prayer times just now.' : 'Loading…');
      const p = prayerNow(hub.prayer);
      if (!FIVE.some((n) => p.times[n])) return empty(el, 'No prayer times for today yet.');
      const now = nyNow().mins;
      for (const n of FIVE) { const t = hm(p.times[n]); el.append(row(n, t12(p.times[n]), n === p.current ? 'wg-now' : t != null && t < now ? 'wg-past' : '')); }
      const bits = [];
      if (p.next) bits.push(`${p.next.name}${p.next.tomorrow ? ' tomorrow' : ''} in ${span(p.next.inMin)}`);
      if (p.times.Sunrise) bits.push(`Sunrise ${t12(p.times.Sunrise)}`);
      if (bits.length) el.append(h('div', 'wg-note', bits.join(' · ')));
    },
  },
  car: {
    title: 'Car', tip: 'Car', sources: ['car'],
    render(el, d) {
      const c = d.car; if (!c) return empty(el, d.failed.car ? 'Could not read the car just now.' : 'Loading…');
      if (!Object.keys(c).length || (c.locked == null && c.fuel_percent == null && c.engine_running == null)) return empty(el, 'No car reading yet.');
      const yn = (v, yes, no) => (v == null ? '–' : v ? yes : no);
      el.append(h('div', 'wg-big', `${yn(c.locked, 'Locked', 'Unlocked')} · engine ${yn(c.engine_running, 'running', 'off')}`));
      if (c.name || c.car) el.append(h('div', 'wg-sub wg-clip', c.name || c.car));
      el.append(h('div', 'wg-sep'));
      const fuel = num(c.fuel_percent);
      el.append(row('Fuel', fuel == null ? '–' : `${fuel}%`)); if (fuel != null) el.append(bar(fuel));
      el.append(row('Range', c.range || '–'));
      const v12 = num(c.battery_12v_percent); el.append(row('12V battery', v12 == null ? '–' : `${v12}%`));
      if (c.tire_pressure_warning) el.append(row('Tyres', 'Check pressure', 'wg-now'));
      const a = carAge(c.status_updated);
      const note = h('div', 'wg-note', a != null ? `Last reading ${ago(a)}` : c.status_updated ? `Last reading ${c.status_updated}` : 'No time on this reading');
      if (a != null && a > 86400000) note.classList.add('wg-warn');
      el.append(note);
    },
  },
  paper: {
    title: 'Your paper', tip: 'Your morning paper', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read the paper just now.' : 'Loading…');
      if (hub.locked) return empty(el, 'Locked. Unlock to see your paper.');
      const cfg = window.JARVIS_CONFIG || {};
      el.append(h('div', 'wg-big', hub.paper_date ? 'Ready' : 'Not built yet'));
      el.append(h('div', 'wg-sub wg-clip', cfg.paper_name || 'Your morning paper'));
      if (cfg.printer) el.append(row('Printer', cfg.printer));
      el.append(h('div', 'wg-note', 'Open the Print tab to read or print it.'));
    },
  },
  bills: {
    title: 'Bills', tip: 'Bills coming up', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read the bills just now.' : 'Loading…');
      const pay = hub.payments || (hub.today || {}).payments || {}; const rows = (pay.rows || []).slice(0, 5);
      if (!rows.length) el.append(h('div', 'wg-sub', 'No payments on the calendar.'));
      for (const r of rows) {
        const a = Array.isArray(r) ? r : [r.when, r.name || r.t, r.amount, r.note];
        const li = h('div', 'wg-li'); li.append(h('b', '', a[0] || ''), h('span', '', a[1] || ''));
        const amt = h('span', '', a[2] || ''); amt.style.cssText = 'margin-left:auto;flex:none;font-weight:750;font-variant-numeric:tabular-nums;max-width:48%'; li.append(amt); el.append(li);
      }
      if (pay.total) el.append(h('div', 'wg-note', `Total: ${pay.total}`));
    },
  },
  cameras: { title: 'Cameras', tip: 'Cameras', sources: ['cameras'], render: renderCameras },
};
WIDGETS.wallet = { title: 'Wallet', tip: 'Your money this month', sources: ['hub'], render(el, d) { renderWallet(el, d, { h, row, empty }); } };
WIDGETS.network = { title: 'Network', tip: 'Home network guard', sources: ['hub'], render(el, d) { renderNetwork(el, d, { h, row, empty }); } };
const RAIL = ['today', 'prayer', 'car', 'paper', 'bills'];

// ---------- springs (damping ratio + response, the way the motion guide thinks) ----------
function mkSpring(v, eps = 0.4) { return { v, to: v, vel: 0, k: 0, c: 0, eps, rest: true }; }
function aim(s, to, { response = 0.35, damping = 1, velocity } = {}) {
  s.to = to; const w = (2 * Math.PI) / response; s.k = w * w; s.c = 2 * damping * w; if (velocity != null) s.vel = velocity; s.rest = false;
}
function snap(s, to = s.to) { s.v = s.to = to; s.vel = 0; s.rest = true; }
function stepSpring(s, dt) {
  if (s.rest) return; const n = Math.min(900, Math.max(1, Math.ceil(dt * 240))); const hh = dt / n;
  for (let i = 0; i < n; i++) { s.vel += (-s.k * (s.v - s.to) - s.c * s.vel) * hh; s.v += s.vel * hh; }
  if (Math.abs(s.v - s.to) < s.eps && Math.abs(s.vel) < s.eps * 10) snap(s);
}
Object.assign(WIDGETS, P6_WIDGETS); Object.assign(ICONS, P6_ICONS);

// Where a flick would come to rest (Apple's scroll-style projection).
const project = (v, rate = 0.998) => (v / 1000) * rate / (1 - rate);

export function createWidgets({ post } = {}) {
  if (!document.getElementById('widgets-css')) { const st = document.createElement('style'); st.id = 'widgets-css'; st.textContent = CSS; document.head.append(st); }
  const layer = h('div', 'wg-layer'); layer.setAttribute('role', 'region'); layer.setAttribute('aria-label', 'Widgets');
  const rail = h('div', 'wg-rail'); rail.setAttribute('role', 'toolbar'); rail.setAttribute('aria-label', 'Open a widget'); layer.append(rail);
  const defs = { ...WIDGETS }; const railBtn = {};
  for (const kind of RAIL) {
    const b = h('button'); b.type = 'button'; b.innerHTML = ICONS[kind]; b.dataset.tip = defs[kind].tip; b.setAttribute('aria-label', defs[kind].tip); b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => toggle(kind)); rail.append(b); railBtn[kind] = b;
  }

  const CARD_W = 272, MAX = 3;
  const cards = []; // oldest first
  let active = null, z = 1, frontId = null, seq = 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = () => cards.filter((c) => !c.closing);
  const shown = () => active !== false && !document.hidden;

  // ----- data -----
  const data = { hub: null, car: null, printer: null, failed: {} }; const fetchedAt = {};
  const SRC = {
    hub: async () => (await fetch('./data/hub.json', { cache: 'no-store' })).json(),
    car: async () => (await fetch('./data/car.json', { cache: 'no-store' })).json(),
    cameras: async () => (await fetch('./data/cameras.json', { cache: 'no-store' })).json(),
    printer: async () => {
      const r = await fetch('./data/printer.txt', { cache: 'no-store' }); if (!r.ok) throw new Error('no printer file');
      const o = {}; for (const l of (await r.text()).split('\n')) { const m = l.match(/^\W*(\w+):\s*(.+)$/); if (m) o[m[1]] = m[2].trim(); } return o;
    },
  };
  async function load(name, maxAge = 0) {
    if (fetchedAt[name] && Date.now() - fetchedAt[name] < maxAge) return;
    fetchedAt[name] = Date.now();
    try { const v = await SRC[name](); data[name] = v && typeof v === 'object' ? v : {}; data.failed[name] = false; } catch { data.failed[name] = true; }
    for (const c of live()) if (c.def.sources && c.def.sources.includes(name)) paint(c);
    layout();
  }
  function paint(c) {
    if (c.custom) return;
    const keep = c.body.scrollTop; c.body.textContent = '';
    try { c.def.render(c.body, data, ctx(c)); } catch { c.body.textContent = ''; empty(c.body, 'This widget could not draw just now.'); }
    c.body.scrollTop = keep;
  }
  const ctx = (c) => ({ id: c.id, post: post || (() => {}), close: () => close(c.id), refresh: () => refresh(true) });
  let timer = 0, beat = 0;
  function refresh(force) {
    const need = new Set(); for (const c of live()) for (const s of c.def.sources || []) need.add(s);
    for (const s of need) load(s, force ? 0 : 55000);
    for (const c of live()) { if (c.custom) { try { c.opts.refresh && c.opts.refresh(c.body, ctx(c)); } catch {} } else if (!(c.def.sources || []).length) paint(c); }
  }
  function sync() { // one clock, only while something is open and the window is on screen
    const want = live().length > 0 && shown();
    if (want && !timer) { timer = setInterval(() => { beat++; if (beat % 2 === 0) refresh(false); else for (const c of live()) paint(c); layout(); }, 30000); }
    if (!want && timer) { clearInterval(timer); timer = 0; }
    for (const k of RAIL) railBtn[k].setAttribute('aria-pressed', String(live().some((c) => c.id === k)));
    layer.dispatchEvent(new CustomEvent('widgets:change', { detail: { count: live().length, front: front() } }));
  }
  document.addEventListener('visibilitychange', () => { sync(); if (shown() && live().length) refresh(false); });

  // ----- dock slots around the Core -----
  let slots = []; let appCards = null; let ro = null; let colT = 76;
  function computeSlots() {
    const W = innerWidth, H = innerHeight; const L = 66; const bar = document.querySelector('.top'); const T = Math.max(76, bar && bar.offsetHeight ? Math.round(bar.getBoundingClientRect().bottom) + 10 : 0); let B = H - 96; const R = W - 22 - 320 - 16;
    colT = T;
    if (!appCards) { // leave room for the app's own confirmation card (bottom-left) whenever it is showing
      appCards = [...document.querySelectorAll('.card')];
      if (appCards.length && 'ResizeObserver' in window) { ro = new ResizeObserver(() => layout()); appCards.forEach((e) => ro.observe(e)); }
    }
    let leftLower = true;
    for (const e of appCards) if (e.offsetHeight > 0) { const top = e.getBoundingClientRect().top - 12; if (top - T < 380) leftLower = false; else B = Math.min(B, top); }
    const s = [{ name: 'lu', ax: L, ay: T, hx: 0, hy: 0, ex: -18, ey: 0 }];
    const room = R - CARD_W >= L + CARD_W + 40;
    if (room) s.push({ name: 'ru', ax: R, ay: T, hx: 1, hy: 0, ex: 18, ey: 0 });
    if (leftLower) s.push({ name: 'll', ax: L, ay: B, hx: 0, hy: 1, ex: -18, ey: 0 });
    if (room) s.push({ name: 'rl', ax: R, ay: H - 96, hx: 1, hy: 1, ex: 18, ey: 0 });
    s.push({ name: 'bc', ax: W / 2, ay: H - 150, hx: 0.5, hy: 1, ex: 0, ey: 18 });
    slots = s;
  }
  const slotOf = (name) => slots.find((s) => s.name === name);
  const dockH = (c) => (c.hAuto ? c.el.offsetHeight : c.naturalH || c.el.offsetHeight);
  const slotXY = (s, c) => ({ x: Math.round(s.ax - s.hx * CARD_W), y: Math.round(s.ay - s.hy * dockH(c)) });
  const taken = (name, self) => live().some((c) => c !== self && c.slot === name);
  const firstFree = (self) => (slots.find((s) => !taken(s.name, self)) || slots[0]).name;
  const inset = (v, d) => { const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v)); return Number.isFinite(n) ? n : d; };
  const stage = () => { const t = inset('--wg-top', 66), b = inset('--wg-bottom', 80), x = inset('--wg-side', 22); return { x, y: t, w: Math.max(240, innerWidth - 2 * x), h: Math.max(200, innerHeight - t - b) }; };

  function layout(opts) {
    if (!layer.isConnected) return; computeSlots();
    fit();
    for (const c of cards) {
      if (c.drag && c.drag.moved) continue;
      if (c.full) { const g = stage(); go(c, g.x, g.y, g.w, g.h, opts); continue; }
      if (!slotOf(c.slot) || (c.closing ? false : taken(c.slot, c) && cards.indexOf(c) > cards.findIndex((o) => o !== c && !o.closing && o.slot === c.slot))) c.slot = firstFree(c);
      const s = slotOf(c.slot); const p = slotXY(s, c); c.ex = s.ex; c.ey = s.ey; go(c, p.x, p.y, CARD_W, dockH(c), opts);
    }
    kick();
  }
  // How tall each docked card may be: two cards sharing a side split that side's height, the shorter one first.
  const PAIR = { lu: 'll', ll: 'lu', ru: 'rl', rl: 'ru' };
  const want = (c) => c.head.offsetHeight + c.body.scrollHeight + 2;
  function fit() {
    const l = live().filter((c) => !c.full);
    for (const c of l) {
      if (!c.hAuto && !c.measuring) continue; // still shrinking back from the full stage
      const s = slotOf(c.slot); if (!s) continue;
      const bottom = (slotOf(PAIR[c.slot]) || {}).ay; const A = Math.max(180, (s.hy ? s.ay : bottom || innerHeight - 96) - colT);
      const o = l.find((x) => x !== c && x.slot === PAIR[c.slot] && !(x.drag && x.drag.moved)); let cap = A;
      if (o && s.name !== 'bc') { const half = (A - 14) / 2; const mine = want(c), theirs = want(o); cap = mine + theirs + 14 <= A ? A : mine <= theirs ? Math.min(mine, half) : A - 14 - Math.min(theirs, half); }
      c.el.style.maxHeight = Math.max(120, Math.floor(cap)) + 'px';
    }
  }
  function go(c, x, y, w, hgt, o = {}) {
    if (reduced() || o.jump) { snap(c.x, x); snap(c.y, y); snap(c.w, w); snap(c.h, hgt); return; }
    const cfg = { response: o.response || 0.38, damping: o.damping || 1 };
    if (c.x.to !== x || !c.x.rest || o.vx != null) aim(c.x, x, { ...cfg, velocity: o.vx });
    if (c.y.to !== y || !c.y.rest || o.vy != null) aim(c.y, y, { ...cfg, velocity: o.vy });
    if (c.w.to !== w || !c.w.rest) aim(c.w, w, { response: 0.4, damping: 1 });
    if (c.hAuto) snap(c.h, hgt); else if (c.h.to !== hgt || !c.h.rest) aim(c.h, hgt, { response: 0.4, damping: 1 });
  }

  // ----- the frame clock: springs always start from where the card is right now -----
  let running = false, raf = 0, fb = 0, last = 0;
  function kick() { if (running) return; running = true; last = performance.now(); plan(); }
  function plan() { raf = requestAnimationFrame(frame); fb = setTimeout(frame, 120); } // the timeout keeps end states honest when the window is hidden
  function frame() {
    cancelAnimationFrame(raf); clearTimeout(fb);
    const now = performance.now(); let dt = Math.min(3, (now - last) / 1000); last = now; if (document.hidden) dt = 3;
    let busy = false;
    for (const c of [...cards]) {
      for (const s of [c.x, c.y, c.w, c.h, c.p]) stepSpring(s, dt);
      const moving = !(c.x.rest && c.y.rest && c.w.rest && c.h.rest && c.p.rest);
      if (!moving && !c.full && !c.hAuto) { c.hAuto = true; c.el.style.height = ''; fit(); }
      if (!moving && c.closing && !c.gone) { remove(c); continue; }
      draw(c); if (moving) busy = true;
    }
    if (busy) plan(); else running = false;
  }
  function draw(c) {
    const p = Math.max(0, Math.min(1, c.p.v)); const k = 1 - p;
    c.el.style.transform = `translate3d(${(c.x.v + k * c.ex).toFixed(2)}px,${(c.y.v + k * c.ey).toFixed(2)}px,0) scale(${(0.94 + 0.06 * c.p.v).toFixed(4)})`;
    c.el.style.opacity = p.toFixed(3); c.el.style.width = c.w.v.toFixed(1) + 'px';
    if (!c.hAuto) c.el.style.height = c.h.v.toFixed(1) + 'px';
  }
  function remove(c) {
    c.gone = true; const i = cards.indexOf(c); if (i >= 0) cards.splice(i, 1); c.el.remove();
    try { c.cleanup && c.cleanup(); } catch {}
  }

  // ----- cards -----
  function setFront(c) {
    if (!c) { frontId = null; return; }
    frontId = c.id; c.el.style.zIndex = String(++z);
    for (const o of cards) o.el.classList.toggle('wg-front', o === c && live().length > 1);
  }
  function build(kind, opts) {
    const custom = kind === 'custom' || !defs[kind];
    const def = custom ? { title: opts.title || 'Widget', sources: [] } : defs[kind];
    const id = String(opts.id || (custom ? `custom-${++seq}` : kind));
    const el = h('section', 'wg'); el.tabIndex = -1; el.dataset.widget = id; el.setAttribute('aria-label', def.title);
    const head = h('header', 'wg-h'); const ic = h('span', 'wg-ic'); ic.innerHTML = (custom && opts.icon) || ICONS[custom ? 'custom' : kind] || ICONS.custom;
    const bFull = h('button', 'wg-x'); bFull.type = 'button'; bFull.innerHTML = ICONS.full;
    const bClose = h('button', 'wg-x'); bClose.type = 'button'; bClose.innerHTML = ICONS.close; bClose.title = 'Close'; bClose.setAttribute('aria-label', `Close ${def.title}`);
    head.append(ic, h('div', 'wg-t', def.title), bFull, bClose);
    const body = h('div', 'wg-b'); el.append(head, body);
    const c = { id, kind, def, opts, custom, el, head, body, bFull, slot: null, full: false, closing: false, hAuto: true, naturalH: 0, ex: 0, ey: 0,
      x: mkSpring(0), y: mkSpring(0), w: mkSpring(CARD_W), h: mkSpring(0), p: mkSpring(0, 0.002), drag: null };
    labelFull(c);
    bClose.addEventListener('click', () => close(id));
    bFull.addEventListener('click', () => setFull(c, !c.full));
    head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) setFull(c, !c.full); });
    el.addEventListener('pointerdown', () => { if (!c.closing) setFront(c); }, true);
    el.addEventListener('focusin', () => { if (!c.closing && frontId !== id) setFront(c); });
    wireDrag(c);
    return c;
  }
  function labelFull(c) { const t = c.full ? 'Back to its place' : 'Fill the stage'; c.bFull.title = t; c.bFull.setAttribute('aria-label', t); c.bFull.innerHTML = c.full ? ICONS.dock : ICONS.full; }

  function open(kind, opts = {}) {
    const id = String(opts.id || kind);
    let c = cards.find((o) => o.id === id);
    if (c) { // already there (or on its way out): bring it back along the same path
      if (c.closing) { c.closing = false; c.el.classList.remove('wg-out'); clearTimeout(c.outT); reduced() ? snap(c.p, 1) : aim(c.p, 1, { response: 0.32 }); }
      setFront(c); layout(); sync(); refresh(false); return c.id;
    }
    for (const o of live()) if (o.full) setFull(o, false);
    while (live().length >= MAX) close(live()[0].id);
    c = build(kind, opts); cards.push(c); layer.append(c.el);
    if (c.custom) { try { const r = opts.render && opts.render(c.body, ctx(c)); if (typeof r === 'function') c.cleanup = r; } catch { empty(c.body, 'This widget could not draw just now.'); } } else paint(c);
    computeSlots(); c.slot = firstFree(c);
    const s = slotOf(c.slot); const p = slotXY(s, c); c.ex = s.ex; c.ey = s.ey;
    snap(c.x, p.x); snap(c.y, p.y); snap(c.w, CARD_W); snap(c.h, dockH(c));
    if (reduced()) { snap(c.p, 1); c.el.classList.add('wg-fade'); } else aim(c.p, 1, { response: 0.32, damping: 1 });
    draw(c); setFront(c); layout(); sync(); refresh(false);
    return c.id;
  }
  function close(id) {
    const c = cards.find((o) => o.id === String(id) && !o.closing); if (!c) return false;
    c.closing = true; c.el.classList.remove('wg-front', 'wg-drag'); c.drag = null;
    if (c.el.contains(document.activeElement)) document.activeElement.blur();
    if (reduced() || !shown()) { c.el.classList.add('wg-out'); c.outT = setTimeout(() => { if (c.closing && !c.gone) remove(c); }, shown() ? 160 : 0); }
    else { aim(c.p, 0, { response: 0.28, damping: 1 }); kick(); }
    if (frontId === c.id) { const l = live(); setFront(l.length ? l.reduce((a, b) => (+(b.el.style.zIndex || 0) > +(a.el.style.zIndex || 0) ? b : a)) : null); }
    else setFront(cards.find((o) => o.id === frontId) || null);
    layout(); sync(); return true;
  }
  function toggle(kind) { const id = String(kind); if (live().some((c) => c.id === id)) { close(id); return false; } open(kind); return true; }
  function closeAll() { for (const c of live()) close(c.id); }
  const count = () => live().length;
  function front() { const c = live().find((o) => o.id === frontId); return c ? c.id : null; }

  function setFull(c, on) {
    if (c.closing || c.full === on) return;
    if (on) { for (const o of live()) if (o !== c && o.full) setFull(o, false); c.naturalH = c.el.offsetHeight; snap(c.h, c.naturalH); c.hAuto = false; }
    else { // measure what the docked card will need, without painting in between
      const keepH = c.el.style.height, keepW = c.el.style.width; c.el.classList.remove('wg-full'); c.el.style.height = ''; c.el.style.width = CARD_W + 'px';
      c.full = false; c.measuring = true; computeSlots(); if (!slotOf(c.slot)) c.slot = firstFree(c); fit(); c.full = true; c.measuring = false;
      c.naturalH = c.el.offsetHeight; c.el.style.maxHeight = 'none'; c.el.style.height = keepH; c.el.style.width = keepW;
    }
    c.full = on; if (on) c.el.style.maxHeight = ''; c.el.classList.toggle('wg-full', on); labelFull(c); setFront(c);
    if (reduced()) { c.el.classList.remove('wg-fade'); void c.el.offsetWidth; c.el.classList.add('wg-fade'); }
    layout(); if (reduced() && !on) { c.hAuto = true; c.el.style.height = ''; fit(); }
    draw(c);
  }

  // ----- dragging: 1:1 with the pointer, then thrown to the nearest free slot -----
  function wireDrag(c) {
    const hd = c.head;
    hd.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button') || c.full || c.closing) return;
      try { hd.setPointerCapture(e.pointerId); } catch {}
      snap(c.x, c.x.v); snap(c.y, c.y.v); // catch it wherever it is in flight
      c.drag = { id: e.pointerId, ox: e.clientX - c.x.v, oy: e.clientY - c.y.v, sx: e.clientX, sy: e.clientY, moved: false, hist: [] };
    });
    hd.addEventListener('pointermove', (e) => {
      const d = c.drag; if (!d || d.id !== e.pointerId) return;
      if (!d.moved) { if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return; d.moved = true; c.el.classList.add('wg-drag'); }
      snap(c.x, e.clientX - d.ox); snap(c.y, e.clientY - d.oy);
      d.hist.push({ t: e.timeStamp, x: c.x.v, y: c.y.v }); while (d.hist.length > 2 && e.timeStamp - d.hist[0].t > 100) d.hist.shift();
      draw(c);
    });
    const end = (e) => {
      const d = c.drag; if (!d || d.id !== e.pointerId) return; c.drag = null; c.el.classList.remove('wg-drag');
      try { hd.releasePointerCapture(e.pointerId); } catch {}
      if (c.closing) return;
      if (!d.moved) { layout(); return; }
      let vx = 0, vy = 0; const a = d.hist[0], b = d.hist[d.hist.length - 1];
      if (a && b && b.t - a.t > 8 && e.timeStamp - b.t < 90) { vx = ((b.x - a.x) / (b.t - a.t)) * 1000; vy = ((b.y - a.y) / (b.t - a.t)) * 1000; }
      const cap = (v) => Math.max(-4000, Math.min(4000, v)); vx = cap(vx); vy = cap(vy);
      computeSlots(); const hh = dockH(c);
      const px = c.x.v + project(vx) + CARD_W / 2, py = c.y.v + project(vy) + hh / 2;
      let best = null, bd = Infinity;
      for (const s of slots) { if (taken(s.name, c)) continue; const q = slotXY(s, c); const dist = Math.hypot(q.x + CARD_W / 2 - px, q.y + hh / 2 - py); if (dist < bd) { bd = dist; best = s; } }
      if (best) c.slot = best.name;
      const flick = Math.hypot(vx, vy) > 400; // a little bounce only when it was really thrown
      layout({ vx, vy, damping: flick ? 0.8 : 1, response: 0.4 });
    };
    hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end); hd.addEventListener('lostpointercapture', end);
  }

  // ----- keys and the Siri Remote (arrows / Enter / Escape) -----
  function handleKey(e) {
    if (active === false || !e || e.metaKey || e.ctrlKey || e.altKey) return false;
    const l = live(); if (!l.length) return false;
    const cur = l.find((c) => c.id === frontId) || l[l.length - 1];
    const t = e.target; const typing = t && t.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON' && layer.contains(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); if (cur.full) setFull(cur, false); else close(cur.id); return true; }
    if (typing) return false;
    if (e.key === 'Enter' || e.key === ' ') {
      if (onButton) return true; // the real button takes it
      if (e.key === ' ') return false;
      e.preventDefault(); setFull(cur, !cur.full); return true;
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!dir) return false;
    e.preventDefault();
    const mid = (c) => ({ x: c.x.to + c.w.to / 2, y: c.y.to + dockH(c) / 2 }); const m = mid(cur); let pick = null, bd = Infinity;
    for (const c of l) { if (c === cur) continue; const q = mid(c); const along = (q.x - m.x) * dir[0] + (q.y - m.y) * dir[1]; if (along < 8) continue; const dist = Math.hypot(q.x - m.x, q.y - m.y); if (dist < bd) { bd = dist; pick = c; } }
    if (!pick && l.length > 1) { const i = l.indexOf(cur); pick = l[(i + (dir[0] + dir[1] > 0 ? 1 : l.length - 1)) % l.length]; }
    pick = pick || cur;
    if (cur.full && pick !== cur) setFull(cur, false);
    setFront(pick); pick.el.classList.add('wg-front'); try { pick.el.focus({ preventScroll: true }); } catch {}
    return true;
  }

  function setActive(on) {
    active = !!on; layer.classList.toggle('wg-on', active); layer.classList.toggle('wg-off', !active);
    if (active) { layout({ jump: !live().length }); if (live().length) refresh(false); }
    sync();
  }
  function register(kind, def) { if (kind && def && typeof def.render === 'function') defs[kind] = { title: def.title || kind, tip: def.title || kind, sources: def.sources || [], render: def.render }; }

  addEventListener('resize', () => layout());
  new MutationObserver(() => { if (layer.isConnected && cards.length) layout({ jump: true }); }).observe(document.documentElement, { childList: true, subtree: false });
  // if cards were opened before the lead appended the layer, place them once it is in the page
  const mo = new MutationObserver(() => { if (layer.isConnected) { mo.disconnect(); if (cards.length) layout({ jump: true }); } });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  return { layer, open, close, toggle, closeAll, count, front, handleKey, setActive, register };
}
