// Jarvis desk server. Listens ONLY on this PC (127.0.0.1), never on the network.
// Serves the desk page (front page + chat + voice) and the API behind it.
// Safety: every API call must carry this run's secret token (only the desk page gets it) and come from the desk page
// itself, so a website open in the browser cannot talk to Jarvis. Scripts on this PC use me/.local-token instead.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSettings } from './paper/build.mjs';
import { todayData } from './tools/today-data.mjs';
import { ask } from './lib/brain.mjs';
import { guestLeaks, maskSecrets } from './lib/lock.mjs';
import { hasPin, setPin, checkPin } from './lib/pin.mjs';

const kit = path.dirname(fileURLToPath(import.meta.url));
const me = path.join(kit, 'me');
const S = () => loadSettings();
const PORT = Number(process.env.JARVIS_PORT || S().port || 3777);
const TOKEN = crypto.randomBytes(24).toString('hex');
fs.mkdirSync(me, { recursive: true });
const LOCAL_TOKEN_FILE = path.join(me, '.local-token');
if (!fs.existsSync(LOCAL_TOKEN_FILE)) fs.writeFileSync(LOCAL_TOKEN_FILE, crypto.randomBytes(24).toString('hex'));
const LOCAL_TOKEN = fs.readFileSync(LOCAL_TOKEN_FILE, 'utf8').trim();

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

// Windows Hello (fingerprint, face or Windows PIN) through PowerShell 5.1.
function windowsHello() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve({ ok: false, why: 'Windows Hello only works on Windows.' });
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(kit, 'scripts', 'windows-hello.ps1'), '-Message', 'Unlock Jarvis'],
      { timeout: 120000, windowsHide: false }, (err, stdout) => {
        const out = String(stdout || '').trim();
        resolve(out === 'Verified' ? { ok: true } : { ok: false, why: /^unavailable/.test(out) ? 'Windows Hello is not set up on this PC. Use the Jarvis PIN.' : 'Windows Hello did not confirm it was you.' });
      });
  });
}

// What the desk shows. Locked: only things anyone in the house may see.
async function frontPage() {
  const s = S();
  const t = await todayData(undefined, s).catch(() => ({}));
  const base = { paper_name: s.paper_name, call_me: s.call_me, place: s.place_label, date: t.date, hijri: t.hijri, weather: t.weather, prayers: t.prayers,
    faith: s.faith || 'islam', unlock_minutes: Number(s.unlock_minutes) || 10, locked: !isUnlocked(), unlocked_until: unlockedUntil, has_pin: hasPin(), voice: s.voice || {} };
  if (!isUnlocked()) return base;
  let ed = {};
  try { ed = JSON.parse(fs.readFileSync(path.join(me, 'editions', `${t.date}.json`), 'utf8')); } catch {}
  return { ...base, headline: (ed.lead || {}).headline || '', todos: (ed.lead || {}).todos || [], plan: ed.plan || [], deadlines: ed.deadlines || [],
    bills: (ed.payments || {}).rows || [], ayah: ed.ayah || ed.quote || null, paper_ready: fs.existsSync(path.join(me, 'papers', `${t.date}.pdf`)),
    build_time: s.build_time || '', print_paper: !!s.print_paper, printer: s.printer || '' };
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
const readBody = req => new Promise((resolve, reject) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 20000) { req.destroy(); reject(new Error('too big')); } });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});
// What Jarvis knows: me/profile.md, split into its "## " sections. Owner only.
const PROFILE = () => path.join(me, 'profile.md');
function knowledge() {
  let txt = ''; try { txt = fs.readFileSync(PROFILE(), 'utf8'); } catch {}
  const sections = []; let cur = null;
  for (const line of txt.split(/\r?\n/)) {
    const h = /^#{2,3}\s+(.+)/.exec(line);
    if (h) { cur = { title: h[1].trim(), items: [] }; sections.push(cur); continue; }
    const t = line.replace(/^\s*[-*]\s+/, '').trim();
    if (t && cur && !/^#/.test(line)) cur.items.push(t);
  }
  return sections.filter(x => x.items.length);
}
const SETTABLE = { unlock_minutes: v => [5, 10, 15, 30].includes(v), print_paper: v => typeof v === 'boolean', 'voice.tts_voice': v => typeof v === 'string' && v.length < 120,
  'voice.always_listening': v => typeof v === 'boolean' };
function saveSettings(changes) {
  const f = path.join(me, 'settings.json');
  const cur = S();
  for (const [k, v] of Object.entries(changes)) {
    if (!SETTABLE[k] || !SETTABLE[k](v)) continue;
    const [a, b] = k.split('.'); if (b) { cur[a] = { ...(cur[a] || {}), [b]: v }; } else cur[a] = v;
  }
  fs.writeFileSync(f, JSON.stringify(cur, null, 2));
}
// Runs a Windows script and returns its last line (for Build / Print on the Paper tab).
function runScript(name, args = []) {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve('This button works on Windows.');
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(kit, 'scripts', name), ...args], { cwd: kit, timeout: 15 * 60000, windowsHide: true },
      (err, out) => resolve(String(out || '').trim().split(/\r?\n/).pop() || (err ? 'It did not work. See me/logs/paper.log.' : 'Done.')));
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createServer() {
  return http.createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) return send(res, 403, { error: 'wrong host' }); // blocks DNS-rebinding tricks
    const url = new URL(req.url, `http://${host}`);
    const p = url.pathname;

    // ---- static: the desk page and the paper fonts ----
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
      const html = fs.readFileSync(path.join(kit, 'desk', 'index.html'), 'utf8').replace('__TOKEN__', TOKEN);
      return send(res, 200, html, MIME['.html']);
    }
    if (req.method === 'GET' && (p.startsWith('/desk/') || p.startsWith('/fonts/'))) {
      const base = p.startsWith('/desk/') ? path.join(kit, 'desk') : path.join(kit, 'node_modules', '@fontsource');
      const f = path.normalize(path.join(base, decodeURIComponent(p.replace(/^\/(desk|fonts)\//, ''))));
      if (!f.startsWith(base + path.sep) || !fs.existsSync(f)) return send(res, 404, { error: 'not found' });
      return send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream');
    }

    // ---- API: needs the token; browser calls must come from the desk page itself ----
    const origin = req.headers.origin;
    const fromDesk = req.headers['x-jarvis'] === TOKEN && (!origin || origin === `http://${host}`);
    const fromScript = req.headers['x-jarvis-local'] === LOCAL_TOKEN && !origin;
    if (!fromDesk && !fromScript) return send(res, 403, { error: 'not allowed' });

    try {
      if (req.method === 'GET' && p === '/api/front') return send(res, 200, await frontPage());
      if (req.method === 'POST' && p === '/api/lock') { lock((await readBody(req)).why || 'asked'); return send(res, 200, { locked: true }); }
      if (!fromDesk) return send(res, 403, { error: 'scripts may only lock' });

      if (req.method === 'POST' && p === '/api/ask') {
        const b = await readBody(req);
        const text = String(b.text || '').slice(0, 2000).trim();
        if (!text) return send(res, 400, { error: 'empty' });
        if (/^(jarvis[, ]+)?lock( yourself| up| now)?\.?$/i.test(text)) { lock('owner said lock'); return send(res, 200, { reply: 'Locked.', locked: true }); }
        if (/^\d{4,8}$/.test(text.replace(/\s/g, ''))) { // a PIN typed into the chat: check it, never send it to the AI or a log
          if (isUnlocked()) return send(res, 200, { reply: "Already unlocked. Please don't type your PIN into the chat.", owner: true });
          const r = checkPin(text.replace(/\s/g, ''));
          if (r.ok) { unlock('PIN in chat'); return send(res, 200, { reply: 'Unlocked.', owner: true, unlocked: true }); }
          log('wrong PIN in chat');
          return send(res, 200, { reply: r.blocked ? `Too many tries. Wait ${r.blocked} minutes or use Windows Hello.` : r.nopin ? 'No PIN is set yet.' : 'That PIN is not right.', needs_unlock: false });
        }
        const owner = isUnlocked();
        const today = await todayData(undefined, S()).catch(() => ({}));
        const r = await ask(text, { owner, settings: S(), today });
        return send(res, 200, { reply: r.reply, needs_unlock: r.locked && !owner, owner });
      }
      if (req.method === 'POST' && p === '/api/unlock') {
        const b = await readBody(req);
        if (b.method === 'hello') { const r = await windowsHello(); if (r.ok) unlock('Windows Hello'); return send(res, 200, { unlocked: r.ok, why: r.why }); }
        if (b.method === 'pin') {
          const r = checkPin(String(b.pin || ''));
          if (r.ok) unlock('PIN');
          else log(`wrong PIN${r.blocked ? ' (blocked)' : ''}`);
          return send(res, 200, { unlocked: r.ok, why: r.ok ? '' : r.nopin ? 'No PIN set yet.' : r.blocked ? `Too many tries. Wait ${r.blocked} min or use Windows Hello.` : `Wrong PIN. ${r.left} tries left.` });
        }
        return send(res, 400, { error: 'method' });
      }
      if (req.method === 'POST' && p === '/api/pin') {
        // First PIN: allowed once. Changing it: only while unlocked.
        if (hasPin() && !isUnlocked()) return send(res, 200, { ok: false, why: 'Unlock first to change the PIN.' });
        try { setPin(String((await readBody(req)).pin || '')); log('PIN set'); return send(res, 200, { ok: true }); }
        catch (e) { return send(res, 200, { ok: false, why: e.message }); }
      }
      if (p === '/api/knowledge' || p === '/api/settings' || p.startsWith('/api/paper/')) {
        if (!isUnlocked()) return send(res, 200, { ok: false, error: 'locked', why: 'Unlock first.' });
        if (req.method === 'GET' && p === '/api/knowledge') return send(res, 200, { sections: knowledge() });
        if (req.method === 'POST' && p === '/api/knowledge') {
          const fact = String((await readBody(req)).fact || '').replace(/\s+/g, ' ').trim().slice(0, 300);
          if (!fact) return send(res, 200, { ok: false, why: 'Type a fact first.' });
          if (guestLeaks(fact) || maskSecrets(fact) !== fact || /\b(password|passcode|pin|ssn|routing|account number|card number|cvv)\b/i.test(fact))
            return send(res, 200, { ok: false, why: "That looks like a password or a number to keep private, so I won't save it." });
          let txt = ''; try { txt = fs.readFileSync(PROFILE(), 'utf8'); } catch {}
          if (!/^## Facts I added/m.test(txt)) txt = txt.replace(/\s*$/, '\n\n## Facts I added\n');
          fs.writeFileSync(PROFILE(), txt.replace(/\s*$/, '\n') + `- ${fact}\n`);
          return send(res, 200, { ok: true, sections: knowledge() });
        }
        if (req.method === 'POST' && p === '/api/settings') { saveSettings(await readBody(req)); return send(res, 200, { ok: true }); }
        if (req.method === 'POST' && p === '/api/paper/build') return send(res, 200, { message: await runScript('morning-paper.ps1', ['-NoPrint']) });
        if (req.method === 'POST' && p === '/api/paper/print') {
          const t = await todayData(undefined, S()).catch(() => ({}));
          const s = S(), args = ['-Pdf', path.join(me, 'papers', `${t.date}.pdf`)];
          if (s.printer) args.push('-Printer', s.printer); if (s.duplex) args.push('-Duplex');
          return send(res, 200, { message: await runScript('print-paper.ps1', args) });
        }
      }
      if (req.method === 'GET' && p === '/api/paper') {
        if (!isUnlocked()) return send(res, 200, { error: 'locked' });
        const t = await todayData(undefined, S()).catch(() => ({}));
        const f = path.join(me, 'papers', `${url.searchParams.get('date') || t.date}.pdf`);
        if (!fs.existsSync(f)) return send(res, 404, { error: 'no paper yet' });
        return send(res, 200, fs.readFileSync(f), 'application/pdf');
      }
      return send(res, 404, { error: 'unknown' });
    } catch (e) { log(`error ${p}: ${e.message}`); return send(res, 500, { error: 'Jarvis hit a problem. See me/logs/desk.log.' }); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => { log(`desk on http://127.0.0.1:${PORT}`); console.log(`Jarvis desk: http://127.0.0.1:${PORT}`); });
}
