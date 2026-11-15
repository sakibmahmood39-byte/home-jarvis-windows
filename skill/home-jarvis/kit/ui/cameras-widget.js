// room, who it was, one line of what they did, the key pictures and the clip.
// Everything stays on this PC: pictures and clips are only shown from ./data/cameras/, nothing is
// sent anywhere, and the clip never plays by itself or with sound.
// Styles only through the app's CSS variables and the widget frame's own classes; no timers here,
// the widget frame refreshes the data.

const CSS = `
.wg-cam-f{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 4px}
.wg-cam-f button{all:unset;box-sizing:border-box;padding:4px 9px;border-radius:8px;cursor:pointer;color:var(--muted);
  font:800 .68em var(--mono);letter-spacing:.08em;text-transform:uppercase;background:rgba(127,127,127,.16);transition:color .15s ease,background .15s ease}
.wg-cam-f button:hover{color:var(--fg);background:rgba(127,127,127,.28)}
.wg-cam-f button[aria-pressed=true]{color:var(--a);box-shadow:inset 0 0 0 1px var(--a)}
.wg-cam-f button:focus-visible,.wg-cam-row:focus-visible{outline:2px solid var(--a);outline-offset:1px}
.wg-cam-row{margin:0 -8px;padding:5px 8px;border-radius:9px;cursor:pointer;transition:background .15s ease}
.wg-cam-row:hover,.wg-cam-row[aria-expanded=true]{background:rgba(127,127,127,.16)}
.wg-cam-m{min-width:0;flex:1}
.wg-cam-top{display:flex;align-items:baseline;gap:7px;min-width:0}
.wg-cam-top>div{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-cam-tag{flex:none;font:800 .68em var(--mono);letter-spacing:.08em;text-transform:uppercase;font-style:normal;padding:1px 6px;border-radius:6px;background:rgba(127,127,127,.16);color:var(--fg)}
.wg-cam-tag.wg-cam-unknown{color:var(--a);box-shadow:inset 0 0 0 1px var(--a)}
.wg-cam-tag.wg-cam-none{color:var(--muted)}
.wg-cam-what{color:var(--muted);font-size:.9em;font-weight:600;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wg-cam-row[aria-expanded=true] .wg-cam-what{display:block}
.wg-cam-d{padding:6px 0 8px}
.wg-cam-s{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.wg-cam-s::-webkit-scrollbar{display:none}
.wg-cam-s img{flex:none;height:64px;width:auto;border-radius:8px;border:1px solid var(--line);display:block;background:rgba(127,127,127,.16)}
.wg-full .wg-cam-s img{height:150px}
.wg-cam-d video{display:block;width:100%;max-height:52vh;margin-top:8px;border-radius:10px;border:1px solid var(--line);background:#000}
.wg-full .wg-cam-d video{max-width:720px}
`;

function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }

const TIME = new Intl.DateTimeFormat('en-US', { timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined), hour: 'numeric', minute: '2-digit' });
const DAYKEY = new Intl.DateTimeFormat('en-CA', { timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined), year: 'numeric', month: '2-digit', day: '2-digit' });
const DAYNAME = new Intl.DateTimeFormat('en-US', { timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined), weekday: 'long', day: 'numeric', month: 'short' });
const when = (iso) => { const t = Date.parse(iso); return isNaN(t) ? null : new Date(t); };
function dayLabel(d) {
  const k = DAYKEY.format(d); const now = Date.now();
  if (k === DAYKEY.format(new Date(now))) return 'Today';
  if (k === DAYKEY.format(new Date(now - 86400000))) return 'Yesterday';
  return DAYNAME.format(d);
}
function ago(ms) {
  if (ms == null || isNaN(ms)) return null; const m = Math.floor(Math.max(0, ms) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const hrs = Math.floor(m / 60); if (hrs < 24) return `${hrs} h ago`;
  const d = Math.floor(hrs / 24); return d === 1 ? '1 day ago' : `${d} days ago`;
}
// Only plain relative paths inside the cameras folder are ever loaded.
function mediaUrl(p) {
  p = String(p || ''); if (!p || p.startsWith('/') || p.includes('\\') || p.includes(':') || p.split('/').some((s) => !s || s === '.' || s === '..')) return null;
  return './data/cameras/' + p.split('/').map(encodeURIComponent).join('/');
}
function whoTag(who) {
  const w = String(who || '').trim(); const low = w.toLowerCase();
  if (!w || low === 'no face') return h('i', 'wg-cam-tag wg-cam-none', 'No face');
  if (low === 'unknown') return h('i', 'wg-cam-tag wg-cam-unknown', 'Unknown');
  return h('i', 'wg-cam-tag', w);
}
const isName = (who) => { const low = String(who || '').trim().toLowerCase(); return !!low && low !== 'unknown' && low !== 'no face'; };

const state = { filter: 'all', open: null, detailKey: '', detail: null };

function buildDetail(ev, label) {
  const box = h('div', 'wg-cam-d');
  const frames = (Array.isArray(ev.frames) ? ev.frames : []).map(mediaUrl).filter(Boolean);
  if (frames.length) {
    const strip = h('div', 'wg-cam-s');
    frames.forEach((src, i) => { const im = h('img'); im.loading = 'lazy'; im.decoding = 'async'; im.alt = `${label}, picture ${i + 1}`; im.src = src; im.addEventListener('error', () => im.remove()); strip.append(im); });
    box.append(strip);
  }
  const clip = mediaUrl(ev.clip);
  if (clip) {
    const v = h('video'); v.controls = true; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'none'; v.setAttribute('aria-label', `Clip: ${label}`);
    if (frames[0]) v.poster = frames[0];
    v.src = clip; box.append(v);
  } else box.append(h('div', 'wg-note', frames.length ? 'No clip was saved for this one.' : 'No pictures or clip were saved for this one.'));
  if (isName(ev.who) && ev.confirmed === false) box.append(h('div', 'wg-note', `Jarvis thinks this was ${ev.who}, but isn't fully sure.`));
  return box;
}

export function renderCameras(el, d, ctx) {
  if (!document.getElementById('wg-cam-css')) { const st = document.createElement('style'); st.id = 'wg-cam-css'; st.textContent = CSS; document.head.append(st); }
  const cam = d.cameras; const sub = (msg) => el.append(h('div', 'wg-sub', msg));
  if (!cam) return sub(d.failed && d.failed.cameras ? 'Could not read the cameras just now.' : 'Loading…');
  const events = (Array.isArray(cam.events) ? cam.events : []).filter((e) => e && when(e.at))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 80);
  const offline = !cam.hub_key;
  if (offline && !events.length) return sub('Cameras aren’t connected. Ask Claude Code to connect them.');

  // rooms for the filter: the cameras Jarvis knows, plus any room that only shows up in the events
  const rooms = [];
  for (const c of [...(Array.isArray(cam.cameras) ? cam.cameras : []), ...events]) { const r = String((c && c.room) || '').trim(); if (r && !rooms.includes(r)) rooms.push(r); }
  if (state.filter !== 'all' && !rooms.includes(state.filter)) state.filter = 'all';
  const list = state.filter === 'all' ? events : events.filter((e) => String(e.room || '').trim() === state.filter);
  const redraw = () => { el.textContent = ''; renderCameras(el, d, ctx); if (ctx && ctx.refresh) ctx.refresh(); };

  const todayKey = DAYKEY.format(new Date()); const today = list.filter((e) => DAYKEY.format(when(e.at)) === todayKey).length;
  el.append(h('div', 'wg-big', today === 1 ? '1 movement today' : `${today || 'No'} movement${today ? 's' : ''} today`));
  const last = list[0];
  if (last) el.append(h('div', 'wg-sub', `Last: ${last.room || 'Camera'}, ${dayLabel(when(last.at)) === 'Today' ? '' : dayLabel(when(last.at)) + ' '}${TIME.format(when(last.at))}`));

  if (rooms.length > 1) {
    const f = h('div', 'wg-cam-f'); f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Show which camera');
    for (const r of ['all', ...rooms]) {
      const b = h('button', '', r === 'all' ? 'All' : r); b.type = 'button'; b.setAttribute('aria-pressed', String(state.filter === r));
      b.addEventListener('click', () => { if (state.filter !== r) { state.filter = r; redraw(); } }); f.append(b);
    }
    el.append(f);
  }

  if (!list.length) sub(state.filter === 'all' ? 'No movement in the last two days.' : `No movement in ${state.filter} in the last two days.`);
  let day = '';
  for (const ev of list) {
    const at = when(ev.at); const dl = dayLabel(at); const id = String(ev.id != null ? ev.id : ev.at + '|' + ev.camera);
    if (dl !== day) { day = dl; el.append(h('div', 'wg-note', dl)); }
    const label = `${ev.room || 'Camera'}, ${TIME.format(at)}`; const isOpen = state.open === id;
    const r = h('div', 'wg-li wg-cam-row'); r.tabIndex = 0; r.setAttribute('role', 'button'); r.setAttribute('aria-expanded', String(isOpen));
    const m = h('div', 'wg-cam-m'); const top = h('div', 'wg-cam-top'); top.append(h('div', '', ev.room || 'Camera'), whoTag(ev.who)); m.append(top);
    if (ev.what) m.append(h('div', 'wg-cam-what', ev.what));
    r.append(h('b', '', TIME.format(at)), m);
    const toggle = () => { state.open = isOpen ? null : id; redraw(); };
    r.addEventListener('click', toggle);
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    el.append(r);
    if (isOpen) { // the same pictures and player are put back on every redraw, so a clip that is playing keeps playing
      const key = id + '|' + (ev.clip || '') + '|' + (Array.isArray(ev.frames) ? ev.frames.join(',') : '') + '|' + ev.confirmed;
      if (state.detailKey !== key || !state.detail) { state.detailKey = key; state.detail = buildDetail(ev, label); }
      el.append(state.detail);
    }
  }
  if (!state.open) { state.detailKey = ''; state.detail = null; }

  if (offline) { const n = h('div', 'wg-note wg-warn', 'The cameras aren’t answering right now, so nothing new is coming in.'); el.append(n); }
  else if (cam.intake_on === false) el.append(h('div', 'wg-note wg-warn', 'Jarvis isn’t watching the cameras right now, so nothing new is coming in.'));
  if (cam.face_models === false) el.append(h('div', 'wg-note', 'Faces can’t be named yet. Double-click Install Camera Face Models in the Buttons folder.'));
  else if (Array.isArray(cam.taught) && !cam.taught.length) el.append(h('div', 'wg-note', 'Jarvis hasn’t been taught any faces yet. Double-click Teach Jarvis a Face in the Buttons folder.'));
  const up = when(cam.updated); if (up) el.append(h('div', 'wg-note', `Checked ${ago(Date.now() - up.getTime())}`));
}
