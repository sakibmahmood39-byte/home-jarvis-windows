// Jarvis for Windows: the local server behind the Jarvis app window.
// Listens ONLY on this PC (127.0.0.1). Serves the app (ui/), its data (/data/*.json), and the API the app's bridge calls.
// Safety: every API call needs this run's secret token (only the app page gets it) and must come from the app page
// itself, so a website open in the browser cannot talk to Jarvis. Scripts on this PC use me/.local-token (lock only).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSettings } from './paper/build.mjs';
import { todayData } from './tools/today-data.mjs';
import { ask } from './lib/brain.mjs';
import { hasPin, setPin, checkPin } from './lib/pin.mjs';
import { createKnowledge } from './lib/knowledge.mjs';
import { createDevices } from './lib/devices.mjs';
import { localStatus } from './lib/local-ai.mjs';

const kit = path.dirname(fileURLToPath(import.meta.url));
const me = path.join(kit, 'me');
const ui = path.join(kit, 'ui');
const S = () => loadSettings();
const PORT = Number(process.env.JARVIS_PORT || S().port || 3777);
const TOKEN = crypto.randomBytes(24).toString('hex');
fs.mkdirSync(me, { recursive: true });
const LOCAL_TOKEN_FILE = path.join(me, '.local-token');
if (!fs.existsSync(LOCAL_TOKEN_FILE)) fs.writeFileSync(LOCAL_TOKEN_FILE, crypto.randomBytes(24).toString('hex'));
const LOCAL_TOKEN = fs.readFileSync(LOCAL_TOKEN_FILE, 'utf8').trim();
const knowledge = createKnowledge(me);
const devices = createDevices(me, S);

// ---- the lock: one flat window per unlock, then it asks again ----
let unlockedUntil = 0;
const HARD_CAP_MS = 2 * 3600e3;
const isUnlocked = () => Date.now() < unlockedUntil;
function unlock(by) {
  const mins = Math.min(60, Math.max(1, Number(S().unlock_minutes) || 10));
  unlockedUntil = Date.now() + Math.min(mins * 60000, HARD_CAP_MS);
  log(`unlocked by ${by} for ${mins} min`);
}
function lock(why) { if (isUnlocked()) log(`locked: ${why}`); unlockedUntil = 0; }
function log(line) {
  try { fs.mkdirSync(path.join(me, 'logs'), { recursive: true }); fs.appendFileSync(path.join(me, 'logs', 'desk.log'), `${new Date().toISOString()} ${line}\n`); } catch {}
}

// Windows Hello (fingerprint, face or Windows PIN) through Windows PowerShell 5.1.
function windowsHello() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ ok: false, why: 'Windows Hello only works on Windows.' });
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(kit, 'scripts', 'windows-hello.ps1'), '-Message', 'Unlock Jarvis'],
      { timeout: 120000, windowsHide: false }, (err, stdout) => {
        const out = String(stdout || '').trim();
        resolve(out === 'Verified' ? { ok: true } : { ok: false, why: /^unavailable/.test(out) ? 'Windows Hello is not set up on this PC.' : 'Windows Hello did not confirm it was you.' });
      });
  });
}

// ---- what the app's screens read (/data/*.json). Locked: only things anyone in the house may see. ----
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
async function hub() {
  const s = S(), t = await todayData(undefined, s).catch(() => ({}));
  const tomorrow = new Date(Date.now() + 86400e3).toLocaleDateString('en-CA', { timeZone: s.timezone || undefined });
  const t2 = t.times24 ? await todayData(tomorrow, s).catch(() => ({})) : {};
  const ed = readJson(path.join(me, 'editions', `${t.date}.json`), null) || {};
  const dateLong = new Date().toLocaleDateString('en-US', { timeZone: s.timezone || undefined, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const base = { updated: new Date().toISOString(), date_long: dateLong, hijri: t.hijri || '',
    prayer: t.times24 ? { times: t.times24, tomorrow: t2.times24 ? { Fajr: t2.times24.Fajr } : undefined, week: {} } : undefined,
    today: { date_long: dateLong, weather: t.weather ? { today: t.weather.today, outlook: t.weather.outlook } : undefined, ayah: ed.ayah || ed.quote, hadith: ed.hadith } };
  if (!isUnlocked()) return { ...base, locked: true };
  return { ...base, locked: false, paper_date: fs.existsSync(path.join(me, 'papers', `${t.date}.pdf`)) ? t.date : '',
    today: { ...ed, ...base.today, lead: { headline: `Good to see you, ${s.call_me || 'boss'}`, ...(ed.lead || {}) } },
    money: readJson(path.join(me, 'money.json'), {}), team: readJson(path.join(me, 'team.json'), { overdue: [], soon: [] }), clients: readJson(path.join(me, 'clients.json'), []) };
}
// The settings the app may see while locked (look and voice only).
function publicSettings(s) { return { desk: s.desk || {}, voice: s.voice || {}, unlock_minutes: s.unlock_minutes || 10, paper_name: s.paper_name }; }
const SETTABLE = ['desk.look', 'desk.tones', 'unlock_minutes', 'voice.wake_word', 'voice.always_listening', 'voice.rate', 'voice.lang', 'voice.tts_voice',
  'models.local.enabled', 'models.local.model', 'models.local.offline_first', 'paper_name', 'build_time', 'print_paper', 'printer', 'duplex',
  'home_assistant.url', 'tv.name', 'tv.roku_ip', 'car.name', 'car.color'];
function flatten(o, pre = '') { const out = {}; for (const [k, v] of Object.entries(o || {})) { const key = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key)); else out[key] = v; } return out; }
function saveSettings(patch) {
  const f = path.join(me, 'settings.json'), cur = S();
  for (const [k, v] of Object.entries(flatten(patch))) {
    if (!SETTABLE.includes(k) || (typeof v === 'object' && v !== null) || String(v).length > 200) continue;
    if (k === 'unlock_minutes' && !(Number(v) >= 1 && Number(v) <= 60)) continue;
    const ks = k.split('.'); let o = cur; ks.slice(0, -1).forEach((x) => { o = o[x] = (o[x] && typeof o[x] === 'object') ? o[x] : {}; }); o[ks.at(-1)] = v;
  }
  fs.writeFileSync(f, JSON.stringify(cur, null, 2)); return cur;
}
async function status() {
  const s = S(), base = { locked: !isUnlocked(), unlocked_until: unlockedUntil, has_pin: hasPin() };
  const local = await localStatus(s);
  if (!isUnlocked()) return { ...base, local };
  const plog = (() => { try { return fs.readFileSync(path.join(me, 'logs', 'paper.log'), 'utf8').trim().split('\n').slice(-6); } catch { return []; } })();
  const lastPrint = plog.filter((l) => /PRINTED|NOT PRINTED|STUCK/.test(l)).pop() || '';
  const papers = (() => { try { return fs.readdirSync(path.join(me, 'papers')).filter((f) => f.endsWith('.pdf')).sort(); } catch { return []; } })();
  return { ...base, local, subs: { claude: { installed: true, signedIn: true, ok: true } },
    printer: s.printer ? { name: s.printer, ok: !/NOT PRINTED|STUCK/.test(lastPrint), text: lastPrint.replace(/^\S+\s/, '') } : null,
    paper: { last: papers.at(-1) || '' }, jobs: readJson(path.join(me, 'jobs.json'), []), home: devices.haConnected() ? 'Home Assistant connected' : '' };
}

// ---- the app's commands (the bridge sends them; answers come back as calls on window.jarvis) ----
const OWNER_ONLY = new Set(['settings-set', 'knowledge-get', 'knowledge-search', 'knowledge-set', 'memory-refresh', 'widget-data', 'home-place', 'key-set', 'job-toggle', 'provider-signin', 'fajr', 'cameras', 'open-camera', 'print-decision']);
async function command(o) {
  const c = o && o.cmd, s = S();
  if (c === 'settings-set' && !isUnlocked()) { // locked: only how it looks and sounds may change
    const f = flatten(o.patch || {}), ok = Object.keys(f).every((k) => ['desk.look', 'desk.tones', 'voice.tts_voice'].includes(k));
    if (ok) { const cfg = saveSettings(o.patch); return { cfg: publicSettings(cfg), calls: [['settings', publicSettings(cfg)]] }; }
  }
  if (OWNER_ONLY.has(c) && !isUnlocked()) {
    if (c === 'widget-data') return { calls: [['widgetData', o.rid, { ok: false, error: 'Unlock first.' }]] };
    if (c === 'knowledge-get' || c === 'knowledge-search') return { needs_unlock: true, calls: [['knowledge', { sections: [{ name: 'Locked', cards: [{ id: 'x', text: 'Unlock with Windows Hello or your PIN to see what Jarvis knows about you.', source: 'Jarvis' }] }], stats: {} }]] };
    return { needs_unlock: true, calls: [] };
  }
  switch (c) {
    case 'settings-get': return { calls: [['settings', isUnlocked() ? s : publicSettings(s)]] };
    case 'settings-status': return { calls: [['settingsStatus', await status()]] };
    case 'settings-set': { const cfg = saveSettings(o.patch || {}); return { cfg, calls: [['settings', cfg]] }; }
    case 'knowledge-get': return { calls: [['knowledge', knowledge.data()]] };
    case 'knowledge-search': return { calls: [['knowledge', { hits: knowledge.search(o.q) }]] };
    case 'knowledge-set': { const why = knowledge.change(o.change || {}); return { calls: [['knowledge', knowledge.data()]], why }; }
    case 'memory-refresh': return { calls: [] };
    case 'home-list': { const r = await devices.homeList(); return { calls: [['homeList', r.list, r.error]] }; }
    case 'home-set': { const r = await devices.homeSet(o.id, !!o.on); return { calls: [['homeResult', r]] }; }
    case 'home-place': { const f = path.join(me, 'home-places.json'), pl = readJson(f, {}); pl[o.id] = { name: o.name, room: o.room, pos: o.pos }; fs.writeFileSync(f, JSON.stringify(pl, null, 1)); return { calls: [] }; }
    case 'tv-state': return { calls: [['tv', await devices.tvState()]] };
    case 'tv-key': return { calls: [['tv', await devices.tvKey(o.key)]] };
    case 'tv-launch': return { calls: [['tv', await devices.tvLaunch(o.id || o.app)]] };
    case 'tv-play': return { calls: [['tv', { ...(await devices.tvState()), note: 'Ask Jarvis to play it, and it will tell you how.' }]] };
    case 'widget-data': return { calls: [['widgetData', o.rid, { ok: false, error: 'Nothing is connected for this card yet.' }]] };
    default: return { calls: [] };
  }
}

// Small things answered at once, without any AI.
function quick(text, t) {
  const q = text.toLowerCase().replace(/[?.!]/g, '').trim(), s = S();
  if (/^(hey )?(jarvis[, ]+)?(what('?s| is) the time( now)?|what time is it( now)?)$/.test(q)) return `It's ${new Date().toLocaleTimeString('en-US', { timeZone: s.timezone || undefined, hour: 'numeric', minute: '2-digit' })}.`;
  const m = /^(hey )?(jarvis[, ]+)?(when is|what time is) (fajr|sunrise|dhuhr|zuhr|asr|maghrib|isha)( today)?$/.exec(q);
  if (m && t.prayers) { const name = m[4] === 'zuhr' ? 'dhuhr' : m[4]; const p = t.prayers.find((x) => x[0].toLowerCase() === name); if (p) return `${p[0]} is at ${p[1]} today.`; }
  return '';
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'self'" });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
const readBody = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 50000) { req.destroy(); reject(new Error('too big')); } });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain' };
function serveFile(res, base, rel) {
  const f = path.normalize(path.join(base, rel));
  if (!f.startsWith(base + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, { error: 'not found' });
  return send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream');
}
const pageConfig = () => { const s = S(); return JSON.stringify({ call_me: s.call_me, paper_name: s.paper_name, timezone: s.timezone, voice: s.voice || {}, unlock_minutes: s.unlock_minutes || 10,
  room: s.room || {}, house: s.house || {}, car: s.car || {}, tv: { name: (s.tv || {}).name || '' }, printer: s.printer || '' }).replace(/</g, '\\u003c'); };
function runScript(name, args = []) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('This button works on Windows.');
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(kit, 'scripts', name), ...args], { cwd: kit, timeout: 15 * 60000, windowsHide: true },
      (err, out) => resolve(String(out || '').trim().split(/\r?\n/).pop() || (err ? 'It did not work. See me/logs/paper.log.' : 'Done.')));
  });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) return send(res, 403, { error: 'wrong host' }); // blocks DNS-rebinding tricks
    const url = new URL(req.url, `http://${host}`);
    let p; try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'bad path' }); }

    // ---- the app ----
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
      return send(res, 200, fs.readFileSync(path.join(ui, 'index.html'), 'utf8').replace('__TOKEN__', TOKEN).replace('__CONFIG__', pageConfig()), MIME['.html']);
    }
    if (req.method === 'GET' && p === '/paper-view') return send(res, 200, fs.readFileSync(path.join(kit, 'paper', 'view.html'), 'utf8').replace('__TOKEN__', TOKEN), MIME['.html']);
    if (req.method === 'GET' && p.startsWith('/fonts/')) return serveFile(res, path.join(kit, 'node_modules', '@fontsource'), p.slice(7));
    if (req.method === 'GET' && p.startsWith('/data/')) {
      const name = p.slice(6);
      if (name === 'hub.json') return send(res, 200, await hub());
      if (name === 'home-places.json') return send(res, 200, isUnlocked() ? readJson(path.join(me, 'home-places.json'), {}) : {});
      if (name === 'car.json') return send(res, 200, isUnlocked() ? readJson(path.join(me, 'car.json'), {}) : {});
      return send(res, 404, { error: 'not found' });
    }
    if (req.method === 'GET' && !p.startsWith('/api/')) return serveFile(res, ui, p.replace(/^\//, ''));

    // ---- the API: the token, and browser calls only from the app page ----
    const origin = req.headers.origin;
    const fromApp = req.headers['x-jarvis'] === TOKEN && (!origin || origin === `http://${host}`);
    const fromScript = req.headers['x-jarvis-local'] === LOCAL_TOKEN && !origin;
    if (!fromApp && !fromScript) return send(res, 403, { error: 'not allowed' });

    try {
      if (req.method === 'POST' && p === '/api/lock') { lock((await readBody(req)).why || 'asked'); return send(res, 200, { locked: true }); }
      if (!fromApp) return send(res, 403, { error: 'scripts may only lock' });
      if (req.method === 'GET' && p === '/api/lockstate') return send(res, 200, { locked: !isUnlocked(), unlocked_until: unlockedUntil, has_pin: hasPin() });
      if (req.method === 'POST' && p === '/api/cmd') return send(res, 200, await command(await readBody(req)));

      if (req.method === 'POST' && p === '/api/ask') {
        const b = await readBody(req);
        let text = String(b.text || '').slice(0, 2000).trim();
        if (!text) return send(res, 400, { error: 'empty' });
        if (/^(hey )?(jarvis[, ]+)?lock( yourself| up| now)?\.?$/i.test(text)) { lock('owner said lock'); return send(res, 200, { reply: 'Locked.', locked_now: true }); }
        if (/^\d{4,8}$/.test(text.replace(/\s/g, ''))) { // a PIN typed into the chat: check it, never send it to the AI or a log
          if (isUnlocked()) return send(res, 200, { reply: "Already unlocked. Please don't type your PIN into the chat.", owner: true });
          const r = checkPin(text.replace(/\s/g, ''));
          if (r.ok) { unlock('PIN in chat'); return send(res, 200, { reply: 'Unlocked.', owner: true, unlocked: true }); }
          log('wrong PIN in chat');
          return send(res, 200, { reply: r.blocked ? `Too many tries. Wait ${r.blocked} minutes or use Windows Hello.` : r.nopin ? 'No PIN is set yet.' : 'That PIN is not right.' });
        }
        text = knowledge.fixWords(text);
        const today = await todayData(undefined, S()).catch(() => ({}));
        const fast = quick(text, today); if (fast) return send(res, 200, { reply: fast, owner: isUnlocked(), by: 'quick' });
        const owner = isUnlocked();
        const r = await ask(text, { owner, settings: S(), today, facts: owner ? knowledge.facts() : '' });
        return send(res, 200, { reply: r.reply, needs_unlock: r.locked && !owner, owner, by: r.by });
      }
      if (req.method === 'POST' && p === '/api/unlock') {
        const b = await readBody(req);
        if (b.method === 'hello') { const r = await windowsHello(); if (r.ok) unlock('Windows Hello'); return send(res, 200, { unlocked: r.ok, why: r.why }); }
        if (b.method === 'pin') {
          const r = checkPin(String(b.pin || ''));
          if (r.ok) unlock('PIN'); else log(`wrong PIN${r.blocked ? ' (blocked)' : ''}`);
          return send(res, 200, { unlocked: r.ok, why: r.ok ? '' : r.nopin ? 'No PIN set yet. Set one in Settings.' : r.blocked ? `Too many tries. Wait ${r.blocked} min or use Windows Hello.` : `Wrong PIN. ${r.left} tries left.` });
        }
        return send(res, 400, { error: 'method' });
      }
      if (req.method === 'POST' && p === '/api/pin') {
        if (hasPin() && !isUnlocked()) return send(res, 200, { ok: false, why: 'Unlock first to change the PIN.' });
        try { setPin(String((await readBody(req)).pin || '')); log('PIN set'); return send(res, 200, { ok: true }); }
        catch (e) { return send(res, 200, { ok: false, why: e.message }); }
      }
      // ---- the paper (owner only) ----
      if (p === '/api/paper' || p.startsWith('/api/paper/')) {
        if (!isUnlocked()) return send(res, 200, { error: 'locked', message: 'Unlock first.' });
        const t = await todayData(undefined, S()).catch(() => ({}));
        const q = url.searchParams.get('date') || '', day = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : t.date;
        const pdf = path.join(me, 'papers', `${day}.pdf`);
        if (req.method === 'GET' && p === '/api/paper') { if (!fs.existsSync(pdf)) return send(res, 404, { error: 'no paper yet' }); return send(res, 200, fs.readFileSync(pdf), 'application/pdf'); }
        if (req.method === 'GET' && p === '/api/paper/info') {
          let list = []; try { list = fs.readdirSync(path.join(me, 'papers')).filter((f) => /^\d{4}-\d{2}-\d{2}\.pdf$/.test(f)).sort().reverse().slice(0, 14).map((f) => f.slice(0, 10)); } catch {}
          const s = S(); return send(res, 200, { date: day, ready: fs.existsSync(pdf), list, name: s.paper_name, printer: s.printer, print_paper: !!s.print_paper, build_time: s.build_time });
        }
        if (req.method === 'POST' && p === '/api/paper/build') return send(res, 200, { message: await runScript('morning-paper.ps1', ['-NoPrint']) });
        if (req.method === 'POST' && p === '/api/paper/print') {
          const s = S(), args = ['-Pdf', pdf]; if (s.printer) args.push('-Printer', s.printer); if (s.duplex) args.push('-Duplex');
          return send(res, 200, { message: await runScript('print-paper.ps1', args) });
        }
      }
      return send(res, 404, { error: 'unknown' });
    } catch (e) { log(`error ${p}: ${e.message}`); return send(res, 500, { error: 'Jarvis hit a problem. See me/logs/desk.log.' }); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => { log(`app on http://127.0.0.1:${PORT}`); console.log(`Jarvis: http://127.0.0.1:${PORT}`); });
}
