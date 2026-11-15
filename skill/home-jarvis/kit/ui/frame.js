// prayer, and eight small health dots. Rule for every dot: it shows only what was really read. Anything
// not known is grey with an honest note, never a made-up green.
//
//   const frame = createFrame({ post });  document.querySelector('#state').after(frame.el);
//   frame.state(o)    <- same object as jarvis.state(o)
//   frame.status(o)   <- same object as jarvis.settingsStatus(o)
//   frame.visible(b)  <- same as jarvis.visible(b); false stops every timer
// Optional, for two dots that have no other readable source from the page:
//   frame.home(list, error)  <- same as jarvis.homeList(list, error)   (smart-home hub dot)
//   frame.settings(o)        <- same as jarvis.settings(o)             (phone line: calls.transport)

const TZ = ((window.JARVIS_CONFIG || {}).timezone || undefined);
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const TICK_MS = 20_000, HUB_MS = 10 * 60_000, STATUS_MS = 5 * 60_000;

const CSS = `
.frame{display:flex;align-items:center;gap:10px;flex:0 0 auto;white-space:nowrap;font-family:var(--font);color:var(--fg);-webkit-app-region:no-drag;position:relative;z-index:2}
.frame .fr-clock{font:700 13px/1 var(--mono);letter-spacing:.04em;color:var(--fg)}
.frame .fr-clock small{font:600 10px/1 var(--mono);color:var(--muted);margin-left:3px;letter-spacing:.08em}
.frame .fr-next{font:600 12px/1 var(--font);color:var(--muted)}
.frame .fr-next:empty{display:none}
.frame .fr-dots{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:var(--glass);border:1px solid var(--line);cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font:inherit;color:inherit;transition:border-color .2s}
.frame .fr-dots:hover,.frame .fr-dots[aria-expanded=true]{border-color:var(--a)}
.frame .fr-dots:focus-visible{outline:2px solid var(--a);outline-offset:2px}
.fr-dot{width:7px;height:7px;border-radius:50%;display:block;flex:0 0 auto;background:var(--muted);opacity:.4;transition:background-color .4s,opacity .4s}
.fr-dot[data-s=ok]{background:#57d68d;opacity:1}
.fr-dot[data-s=warn]{background:#ffbe6b;opacity:1}
.fr-dot[data-s=bad]{background:#ff6b5e;opacity:1}
.fr-pop{position:fixed;z-index:9999;width:350px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);color:var(--fg);font:500 12.5px/1.4 var(--font);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 18px 40px -18px rgba(0,0,0,.7);-webkit-app-region:no-drag}
.fr-pop .fr-head{font:700 10.5px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.fr-pop .fr-note{color:var(--fg);margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.fr-pop .fr-row{display:grid;grid-template-columns:7px 124px 1fr;gap:9px;align-items:baseline;padding:3px 0}
.fr-pop .fr-row .fr-dot{align-self:center}
.fr-pop .fr-row b{font-weight:700}
.fr-pop .fr-row span{color:var(--muted);overflow-wrap:anywhere}
@media (max-width:1100px){.frame .fr-next{display:none}.frame{gap:8px}}
@media (max-width:860px){.frame .fr-clock{display:none}}
@media (prefers-reduced-motion:reduce){.fr-dot,.frame .fr-dots{transition:none}}
`;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const first = (s, n = 90) => { const t = String(s || '').split('\n')[0].trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

function nyParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, sec: (+p.hour % 24) * 3600 + +p.minute * 60 + +p.second };
}
const nyClock = (d = new Date()) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
function nyWhen(ms) {
  const d = new Date(ms), sameDay = nyParts(d).date === nyParts().date;
  return sameDay ? nyClock(d) : new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}
function ago(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? +m[1] * 3600 + +m[2] * 60 : null; };
const dayShift = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// "Isha in 1 h 12 min". After Isha it counts to tomorrow's Fajr. If the saved times are from yesterday, the saved
// "tomorrow" is really today. Anything older than that is not trusted and nothing is shown.
export function nextPrayer(hub, now = new Date()) {
  const pr = hub?.prayer; if (!pr?.times) return '';
  const { date, sec } = nyParts(now), made = String(hub.paper_date || hub.updated || '').slice(0, 10) || date;
  let today = pr.times, tomorrow = pr.tomorrow;
  if (made === dayShift(date, -1)) { today = pr.tomorrow; tomorrow = null; } else if (made !== date) return '';
  if (!today) return '';
  let name = '', left = null;
  for (const p of PRAYERS) { const t = hm(today[p]); if (t !== null && t + 59 >= sec) { name = p; left = t - sec; break; } }
  if (!name) { const t = hm((tomorrow || {}).Fajr); if (t === null) return ''; name = 'Fajr'; left = t + 86400 - sec; }
  const mins = Math.ceil(left / 60);
  if (mins <= 0) return `${name} now`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${name} in ${h ? `${h} h ` : ''}${m || !h ? `${m} min` : ''}`.trim();
}

// "Tue 10 Nov, 05:13 PM" (no year in the car's file) -> a time on this PC's clock, or null.
function carTime(s) {
  const m = /(\d{1,2}) ([A-Za-z]{3}),? (\d{1,2}):(\d{2}) ?([AP]M)/i.exec(String(s || '')); if (!m) return null;
  const mon = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase()); if (mon < 0) return null;
  const hr = (+m[3] % 12) + (/pm/i.test(m[5]) ? 12 : 0), now = new Date();
  let d = new Date(now.getFullYear(), mon, +m[1], hr, +m[4]);
  if (d.getTime() > now.getTime() + 86400000) d = new Date(now.getFullYear() - 1, mon, +m[1], hr, +m[4]);
  return d.getTime();
}

export function createFrame({ post = () => {} } = {}) {
  if (!document.getElementById('frame-css')) { const s = el('style'); s.id = 'frame-css'; s.textContent = CSS; document.head.append(s); }

  const root = el('div', 'frame'), clock = el('span', 'fr-clock'), next = el('span', 'fr-next');
  const btn = el('button', 'fr-dots'); btn.type = 'button'; btn.setAttribute('aria-label', 'What is working'); btn.setAttribute('aria-expanded', 'false');
  const IDS = ['internet', 'claude', 'local', 'hub', 'car', 'printer'];
  const dots = Object.fromEntries(IDS.map((id) => { const d = el('i', 'fr-dot'); btn.append(d); return [id, d]; }));
  root.append(clock, next, btn);

  // What has really been read so far. undefined = never heard; null = tried and failed.
  const S = { cameras: undefined, remote: (() => { try { const r = JSON.parse(localStorage.getItem('jarvis.remoteBattery') || 'null'); return r && r.battery >= 0 ? r : undefined; } catch { return undefined; } })(), mode: '', problem: '', hub: undefined, car: undefined, st: undefined, home: undefined, cfg: undefined };
  let shown = true, timer = 0, hubAt = 0, statusAt = Date.now() - STATUS_MS + TICK_MS, pop = null, busy = false;

  function health() {
    const now = Date.now(), st = S.st, prob = S.problem, out = [];
    const add = (id, label, s, text) => out.push({ id, label, s, text });

    { // Internet: this PC's own "am I online", whether Jarvis's data loaded, and the last website check if it is recent.
      const site = st?.watch?.site, siteAt = site?.last_run ? new Date(site.last_run).getTime() : 0, fresh = siteAt && now - siteAt < 30 * 60000;
      if (navigator.onLine === false) add('internet', 'Internet', 'bad', 'offline');
      else if (/offline|internet|network|wi-?fi|no connection/i.test(prob)) add('internet', 'Internet', 'warn', `Jarvis reports: ${first(prob)}`);
      else if (S.hub === null) add('internet', 'Internet', 'warn', "connected, but Jarvis's data didn't load");
      else if (S.hub === undefined) add('internet', 'Internet', '', 'checking…');
      else add('internet', 'Internet', 'ok', fresh && site.ok ? `connected, websites checked ${ago(siteAt)}` : 'connected');
    }
    { // Claude: the plan-limit note and the sign-in check from Settings.
      const c = st?.subs?.claude, until = (st?.limited?.until || 0) * 1000;
      if (!st) add('claude', 'Claude', /claude|plan limit|weekly limit/i.test(prob) ? 'warn' : '', /claude|plan limit|weekly limit/i.test(prob) ? first(prob) : 'checking…');
      else if (until > now) add('claude', 'Claude', 'warn', `limited until ${nyWhen(until)}`);
      else if (c && c.installed === false) add('claude', 'Claude', 'bad', 'not installed');
      else if (c && !c.signedIn) add('claude', 'Claude', 'bad', 'not signed in');
      else if (c && c.last && c.last.ok === false) add('claude', 'Claude', 'warn', first(c.last.text) || 'limited');
      else if (c) add('claude', 'Claude', 'ok', 'ready');
      else add('claude', 'Claude', '', "couldn't check the sign-in");
    }
    { // On-this-PC brain: the status file the offline brain writes. No file yet means not set up yet.
      const l = st?.local, has = l && typeof l === 'object' && Object.keys(l).length > 0;
      if (!st) add('local', 'On-this-PC brain', '', 'checking…');
      else if (!has || l.installed === false) add('local', 'On-this-PC brain', '', 'not set up yet');
      else if (l.ok === false) add('local', 'On-this-PC brain', 'warn', first(l.text || l.error) || 'not answering');
      else if (l.running && l.hasModel === false) add('local', 'On-this-PC brain', 'warn', 'running, but its model is not downloaded yet');
      else if (l.running || l.ok === true) add('local', 'On-this-PC brain', 'ok', 'ready');
      else if (l.installed && l.running === false) add('local', 'On-this-PC brain', 'warn', 'installed, not running');
      else add('local', 'On-this-PC brain', '', 'status not clear yet');
    }
    { // Smart-home hub: only known once the app hands over the device list.
      const h = S.home;
      if (!h) add('hub', 'Smart-home hub', '', 'not checked yet');
      else if (h.error) add('hub', 'Smart-home hub', 'bad', `not answering (${first(h.error, 60)})`);
      else if (!h.list.length) add('hub', 'Smart-home hub', 'warn', `answered ${ago(h.at)}, but listed no devices`);
      else { const dead = h.list.filter((d) => d && /unavailable|unknown|offline/i.test(String(d.state))).length;
        add('hub', 'Smart-home hub', dead === h.list.length ? 'warn' : 'ok', `${h.list.length - dead} of ${h.list.length} devices answering, checked ${ago(h.at)}`); }
    }
    { // Car: how old the last reading is.
      const c = S.car, at = c ? carTime(c.status_updated) : null;
      if (c === undefined) add('car', 'Car', '', 'checking…');
      else if (!c || !at) add('car', 'Car', '', 'no reading yet');
      else if (c.locked === true) add('car', 'Car', 'ok', `locked · car last reported ${ago(at)}`);
      else if (c.locked === false) add('car', 'Car', 'warn', `unlocked · last reading ${ago(at)}`);
      else add('car', 'Car', now - at < 24 * 3600000 ? 'ok' : 'warn', `last reading ${ago(at)}`);
    }
    {
      const p = st?.printer;
      if (!st) add('printer', 'Paper printer', '', 'checking…');
      else if (!p || !p.name) add('printer', 'Paper printer', '', 'not set up yet');
      else if (p.ok === false) add('printer', 'Paper printer', 'warn', first(p.text) || 'the last print had a problem');
      else add('printer', 'Paper printer', 'ok', p.text ? `${p.name} · ${first(p.text, 60)}` : p.name);
    }
    return out;
  }

  function fillPop(list) {
    if (!pop) return;
    const kids = [el('p', 'fr-head', "What's working")];
    const note = S.problem ? first(S.problem, 160) : S.mode === 'off' ? 'Jarvis is switched off.' : '';
    if (note) kids.push(el('p', 'fr-note', note));
    for (const h of list) { const r = el('div', 'fr-row'), d = el('i', 'fr-dot'); if (h.s) d.dataset.s = h.s; r.append(d, el('b', '', h.label), el('span', '', h.text)); kids.push(r); }
    pop.replaceChildren(...kids);
  }
  function placePop() {
    if (!pop) return;
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth || 350;
    pop.style.top = `${Math.round(r.bottom + 10)}px`;
    pop.style.left = `${Math.round(Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12)))}px`;
  }
  function draw() {
    const t = nyClock(), sp = t.lastIndexOf(' '), small = el('small', '', sp > 0 ? t.slice(sp + 1) : '');
    clock.replaceChildren(sp > 0 ? t.slice(0, sp) : t, small);
    next.textContent = nextPrayer(S.hub);
    const list = health();
    for (const h of list) { const d = dots[h.id]; if (h.s) d.dataset.s = h.s; else delete d.dataset.s; d.title = `${h.label}: ${h.text}`; }
    btn.title = list.some((h) => h.s === 'bad') ? 'Something needs a look. Click for the list.' : 'Click to see what is working.';
    fillPop(list);
  }

  const onDocDown = (e) => { if (pop && !pop.contains(e.target) && !btn.contains(e.target)) closePop(); };
  const onKey = (e) => { if (e.key === 'Escape') closePop(); };  // only listens: Esc still reaches the rest of the app
  function closePop() {
    if (!pop) return;
    pop.remove(); pop = null; btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDocDown, true); document.removeEventListener('keydown', onKey, true); removeEventListener('resize', placePop);
  }
  function openPop() {
    pop = el('div', 'fr-pop'); pop.setAttribute('role', 'status'); document.body.append(pop);
    btn.setAttribute('aria-expanded', 'true'); askFresh(); draw(); placePop();
    document.addEventListener('pointerdown', onDocDown, true); document.addEventListener('keydown', onKey, true); addEventListener('resize', placePop);
  }
  btn.addEventListener('click', () => (pop ? closePop() : openPop()));
  let askedAt = 0;
  function askFresh() {
    if (Date.now() - askedAt < 60000) return; askedAt = Date.now();
    try { post({ cmd: 'home-list' }); post({ cmd: 'cameras', action: 'json', args: [] }); } catch { /* no app behind the page */ }
  }

  const getJSON = (u) => fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  async function refetch() {
    if (busy) return; busy = true; hubAt = Date.now();
    const [hub, car] = await Promise.all([getJSON('./data/hub.json'), getJSON('./data/car.json')]);
    S.hub = hub && typeof hub === 'object' && Object.keys(hub).length ? hub : null;
    S.car = car && typeof car === 'object' && Object.keys(car).length ? car : null;
    busy = false; draw();
  }
  function tick() {
    if (!shown) return;
    const now = Date.now();
    if (now - hubAt >= HUB_MS) refetch();
    if (now - statusAt >= STATUS_MS) { statusAt = now; try { post({ cmd: 'settings-status' }); } catch { /* no app behind the page */ } }
    draw();
  }
  function start() { if (!timer) { timer = setInterval(tick, TICK_MS); tick(); setTimeout(askFresh, 3000); } }
  function stop() { clearInterval(timer); timer = 0; }
  const onNet = () => draw();
  addEventListener('online', onNet); addEventListener('offline', onNet);
  start();

  return {
    el: root,
    state(o) { if (!o) return; const m = o.mode || S.mode, p = o.problem ? String(o.problem) : ''; if (m === S.mode && p === S.problem) return; S.mode = m; S.problem = p; draw(); },
    status(o) { S.st = o && typeof o === 'object' ? o : {}; statusAt = Date.now(); draw(); },
    visible(b) { shown = !!b; if (shown) start(); else { stop(); closePop(); } },
    home(list, error) { S.home = { list: Array.isArray(list) ? list : [], error: error ? String(error) : '', at: Date.now() }; draw(); },
    settings(o) { S.cfg = o && typeof o === 'object' ? o : undefined; draw(); },
    remote(battery) { const b = Math.round(Number(battery)); if (b >= 0 && b <= 100) { S.remote = { battery: b, at: Date.now() }; try { localStorage.setItem('jarvis.remoteBattery', JSON.stringify(S.remote)); } catch {} draw(); } },
    cameras(o) { S.cameras = o && typeof o === 'object' ? o : null; draw(); },
  };
}
