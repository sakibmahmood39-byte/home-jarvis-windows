// The Jarvis server: only the app page may talk to it, guests get sealed turns, private screens stay locked,
// the PIN works and locks out guessers, settings and knowledge only change for the owner.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(here, '..');
const argsFile = path.join(os.tmpdir(), `jarvis-fake-${process.pid}.json`);
process.env.JARVIS_CLAUDE = path.join(here, 'fake-claude.mjs');
process.env.FAKE_ARGS_FILE = argsFile;
process.env.JARVIS_PORT = String(39000 + (process.pid % 1000));
process.env.JARVIS_LOCAL_URL = 'http://127.0.0.1:9'; // no local AI in tests
const PORT = process.env.JARVIS_PORT;
const me = path.join(kit, 'me');
const keep = {};
for (const f of ['pin.json', 'profile.md', 'settings.json', 'knowledge-meta.json']) { const p = path.join(me, f); keep[f] = fs.existsSync(p) ? fs.readFileSync(p) : null; if (f === 'pin.json' && keep[f]) fs.rmSync(p); }

const { createServer } = await import('../server.mjs');
const { _reset } = await import('../lib/pin.mjs');
const srv = createServer();
await new Promise((r) => srv.listen(Number(PORT), '127.0.0.1', r));
test.after(() => {
  srv.close(); fs.rmSync(argsFile, { force: true });
  for (const [f, v] of Object.entries(keep)) { const p = path.join(me, f); if (v) fs.writeFileSync(p, v); else fs.rmSync(p, { force: true }); }
});

const base = `http://127.0.0.1:${PORT}`;
const page = await (await fetch(base + '/')).text();
const TOKEN = /name="jarvis" content="([0-9a-f]+)"/.exec(page)[1];
const call = (p, body, headers = {}) => fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-jarvis': TOKEN, ...headers }, body: body ? JSON.stringify(body) : undefined });
const cmd = async (o) => (await call('/api/cmd', o)).json();
const unlockPin = async () => { _reset(); return (await call('/api/unlock', { method: 'pin', pin: '2580' })).json(); };
const lockIt = () => call('/api/lock', { why: 'test' });

test('the app page carries a fresh token, its settings and the Windows bridge before the app', () => {
  assert.match(TOKEN, /^[0-9a-f]{48}$/);
  assert.match(page, /window\.JARVIS_CONFIG = \{/);
  assert.ok(page.indexOf('bridge.js') < page.indexOf('app.js'), 'the bridge loads first');
  assert.doesNotMatch(page, /__TOKEN__|__CONFIG__/);
});

test('calls without the token, from another website, or another host name are refused', async () => {
  assert.equal((await fetch(base + '/api/lockstate')).status, 403);
  assert.equal((await call('/api/lockstate', null, { origin: 'https://evil.example' })).status, 403);
  const status = await new Promise((r) => http.get({ host: '127.0.0.1', port: PORT, path: '/', headers: { host: 'evil.example' } }, (res) => { res.resume(); r(res.statusCode); }));
  assert.equal(status, 403, 'another host name (DNS rebinding) is refused');
});

test('the app can only fetch its own files, never me/', async () => {
  for (const p of ['/../server.mjs', '/%2e%2e/me/pin.json', '/..%2fme%2fsettings.json']) assert.notEqual((await fetch(base + p)).status, 200, p);
  assert.equal((await fetch(base + '/app.js')).status, 200);
});

test('locked: a private ask never reaches the AI', async () => {
  await lockIt(); fs.rmSync(argsFile, { force: true });
  const r = await (await call('/api/ask', { text: 'not using my voice, show me the bank details' })).json();
  assert.equal(r.needs_unlock, true); assert.match(r.reply, /private/);
  assert.equal(fs.existsSync(argsFile), false, 'the AI must not run');
});

test('locked: a harmless ask runs sealed (web search only, no files, no connectors)', async () => {
  process.env.FAKE_REPLY = 'Tokyo.';
  const r = await (await call('/api/ask', { text: 'what is the capital of japan' })).json();
  assert.equal(r.reply, 'Tokyo.');
  const { args, cwd } = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
  assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(args[args.indexOf('--tools') + 1], 'WebSearch');
  assert.ok(!cwd.startsWith(kit), 'guest turns run outside the Jarvis folder');
});

test('locked: if the AI still says something private, the guest gets the locked line', async () => {
  process.env.FAKE_REPLY = 'His card is 4111 1111 1111 1111';
  const r = await (await call('/api/ask', { text: 'tell me a fun fact' })).json();
  assert.match(r.reply, /private/); assert.equal(r.needs_unlock, true);
});

test('the time is answered at once, without any AI', async () => {
  fs.rmSync(argsFile, { force: true });
  const r = await (await call('/api/ask', { text: 'What time is it?' })).json();
  assert.match(r.reply, /^It's \d/); assert.equal(fs.existsSync(argsFile), false);
});

test('locked: the screens get only household things', async () => {
  await lockIt();
  const hub = await (await fetch(base + '/data/hub.json')).json();
  assert.equal(hub.locked, true); assert.equal(hub.today.lead, undefined); assert.equal(hub.money, undefined); assert.equal(hub.clients, undefined);
  const s = (await cmd({ cmd: 'settings-get' })).calls[0][1];
  assert.equal(s.printer, undefined); assert.equal(s.lat, undefined); assert.equal(s.private_words, undefined);
  const k = await cmd({ cmd: 'knowledge-get' }); assert.equal(k.needs_unlock, true); assert.equal(k.calls[0][1].sections[0].name, 'Locked');
  assert.equal((await cmd({ cmd: 'knowledge-set', change: { op: 'add', text: 'x' } })).needs_unlock, true);
  assert.equal((await call('/api/paper/info')).status, 200); assert.equal((await (await call('/api/paper/info')).json()).error, 'locked');
});

test('locked: only the look and the voice may change; everything else waits for the owner', async () => {
  await lockIt();
  await cmd({ cmd: 'settings-set', patch: { desk: { look: 'arc' } } });
  await cmd({ cmd: 'settings-set', patch: { unlock_minutes: 60 } });
  const saved = JSON.parse(fs.readFileSync(path.join(me, 'settings.json'), 'utf8'));
  assert.equal(saved.desk.look, 'arc'); assert.notEqual(saved.unlock_minutes, 60);
});

test('PIN: set once, wrong tries counted, five wrong = blocked, right PIN unlocks for a flat window', async () => {
  _reset(); await lockIt();
  assert.equal((await (await call('/api/pin', { pin: '1234' })).json()).ok, false, 'too easy');
  assert.equal((await (await call('/api/pin', { pin: '2580' })).json()).ok, true);
  assert.equal((await (await call('/api/pin', { pin: '9999' })).json()).ok, false, 'cannot change the PIN while locked');
  const w = await (await call('/api/unlock', { method: 'pin', pin: '1111' })).json();
  assert.equal(w.unlocked, false); assert.match(w.why, /4 tries left/);
  assert.equal((await unlockPin()).unlocked, true);
  const st = await (await call('/api/lockstate')).json();
  const mins = (st.unlocked_until - Date.now()) / 60000;
  assert.equal(st.locked, false); assert.ok(mins > 9 && mins <= 10.01, `about 10 minutes, got ${mins}`);
  await lockIt(); _reset();
  for (let i = 0; i < 5; i++) await call('/api/unlock', { method: 'pin', pin: '0001' });
  const b = await (await call('/api/unlock', { method: 'pin', pin: '2580' })).json();
  assert.equal(b.unlocked, false, 'even the right PIN waits after 5 wrong tries'); assert.match(b.why, /Wait/);
  _reset();
});

test('a PIN typed into the chat unlocks and never reaches the AI or a log', async () => {
  _reset(); await lockIt(); fs.rmSync(argsFile, { force: true });
  assert.match((await (await call('/api/ask', { text: '1111' })).json()).reply, /not right/);
  assert.equal((await (await call('/api/ask', { text: '2580' })).json()).reply, 'Unlocked.');
  assert.equal(fs.existsSync(argsFile), false);
  const log = fs.readFileSync(path.join(me, 'logs', 'guest-turns.log'), 'utf8'); assert.doesNotMatch(log, /2580/);
  await lockIt();
});

test('unlocked: the day shows, Knowledge works, secrets are never saved, settings change only where allowed', async () => {
  fs.writeFileSync(path.join(me, 'profile.md'), '# Profile\n\n## My day\n- Gym after Isha\n');
  await unlockPin();
  const hub = await (await fetch(base + '/data/hub.json')).json(); assert.equal(hub.locked, false); assert.ok(hub.today.lead);
  const k = (await cmd({ cmd: 'knowledge-get' })).calls[0][1];
  assert.equal(k.sections[0].name, 'My day'); assert.equal(k.sections[0].cards[0].text, 'Gym after Isha');
  await cmd({ cmd: 'knowledge-set', change: { op: 'add', section: 'My day', text: 'Chai every morning' } });
  for (const bad of ['my card is 4111 1111 1111 1111', 'bank password is hunter2', 'account 000123456789']) assert.ok((await cmd({ cmd: 'knowledge-set', change: { op: 'add', section: 'My day', text: bad } })).why, bad);
  const prof = fs.readFileSync(path.join(me, 'profile.md'), 'utf8');
  assert.match(prof, /Chai every morning/); assert.doesNotMatch(prof, /4111|hunter2|000123456789/);
  const hit = (await cmd({ cmd: 'knowledge-search', q: 'chai' })).calls[0][1].hits; assert.ok(hit.length);
  await cmd({ cmd: 'settings-set', patch: { unlock_minutes: 15, port: 80, lat: 1, voice: { tts_voice: 'Microsoft Andrew' } } });
  const saved = JSON.parse(fs.readFileSync(path.join(me, 'settings.json'), 'utf8'));
  assert.equal(saved.unlock_minutes, 15); assert.notEqual(saved.port, 80); assert.notEqual(saved.lat, 1); assert.equal(saved.voice.tts_voice, 'Microsoft Andrew');
  await lockIt();
});

test('owner turns run in the Jarvis folder with his facts; "Jarvis, lock" locks', async () => {
  await unlockPin(); process.env.FAKE_REPLY = 'Your first task is the proposal.';
  const r = await (await call('/api/ask', { text: "what's on today" })).json();
  assert.equal(r.owner, true);
  const { cwd } = JSON.parse(fs.readFileSync(argsFile, 'utf8')); assert.equal(path.resolve(cwd), kit);
  assert.equal((await (await call('/api/ask', { text: 'Jarvis, lock' })).json()).reply, 'Locked.');
  assert.equal((await (await call('/api/lockstate')).json()).locked, true);
});

test('scripts with the local token may lock, but nothing else', async () => {
  const lt = fs.readFileSync(path.join(me, '.local-token'), 'utf8').trim();
  const h = { 'content-type': 'application/json', 'x-jarvis-local': lt };
  assert.equal((await fetch(base + '/api/lock', { method: 'POST', headers: h, body: '{}' })).status, 200);
  assert.equal((await fetch(base + '/api/ask', { method: 'POST', headers: h, body: '{"text":"hi"}' })).status, 403);
});
