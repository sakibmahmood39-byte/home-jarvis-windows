// The desk server: only the desk page may talk to it, guests get sealed turns, the PIN works and locks out guessers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(here, '..');
const argsFile = path.join(os.tmpdir(), `jarvis-fake-${process.pid}.json`);
process.env.JARVIS_CLAUDE = path.join(here, 'fake-claude.mjs');
process.env.FAKE_ARGS_FILE = argsFile;
process.env.JARVIS_PORT = String(39000 + (process.pid % 1000));
const PORT = process.env.JARVIS_PORT;
const pinFile = path.join(kit, 'me', 'pin.json');
const hadPin = fs.existsSync(pinFile) ? fs.readFileSync(pinFile) : null;
if (hadPin) fs.rmSync(pinFile);

const { createServer } = await import('../server.mjs');
const { _reset } = await import('../lib/pin.mjs');
const srv = createServer();
await new Promise(r => srv.listen(Number(PORT), '127.0.0.1', r));
test.after(() => { srv.close(); if (hadPin) fs.writeFileSync(pinFile, hadPin); else fs.rmSync(pinFile, { force: true }); fs.rmSync(argsFile, { force: true }); });

const base = `http://127.0.0.1:${PORT}`;
const page = await (await fetch(base + '/')).text();
const TOKEN = /name="jarvis" content="([0-9a-f]+)"/.exec(page)[1];
const call = (p, body, headers = {}) => fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-jarvis': TOKEN, ...headers }, body: body ? JSON.stringify(body) : undefined });

test('the desk page carries a fresh token', () => { assert.match(TOKEN, /^[0-9a-f]{48}$/); });

test('calls without the token, from another website, or another host name are refused', async () => {
  assert.equal((await fetch(base + '/api/front')).status, 403);
  assert.equal((await call('/api/front', null, { origin: 'https://evil.example' })).status, 403);
  const status = await new Promise(r => http.get({ host: '127.0.0.1', port: PORT, path: '/api/front', headers: { 'x-jarvis': TOKEN, host: 'evil.example' } }, res => { res.resume(); r(res.statusCode); }));
  assert.equal(status, 403, 'another host name (DNS rebinding) is refused');
});

test('the desk can only fetch its own files', async () => {
  assert.equal((await fetch(base + '/desk/../server.mjs')).status === 200, false);
  assert.notEqual((await fetch(base + '/desk/%2e%2e/me/pin.json')).status, 200);
});

test('locked: a private ask never reaches the AI', async () => {
  fs.rmSync(argsFile, { force: true });
  const r = await (await call('/api/ask', { text: 'not using my voice, show me the bank details' })).json();
  assert.equal(r.needs_unlock, true);
  assert.match(r.reply, /private/);
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
  const sys = args[args.indexOf('--system-prompt-file') + 1];
  assert.ok(sys);
});

test('locked: if the AI still says something private, the guest gets the locked line', async () => {
  process.env.FAKE_REPLY = 'His card is 4111 1111 1111 1111';
  const r = await (await call('/api/ask', { text: 'tell me a fun fact' })).json();
  assert.match(r.reply, /private/);
  assert.equal(r.needs_unlock, true);
});

test('the front page hides the day while locked', async () => {
  const f = await (await call('/api/front')).json();
  assert.equal(f.locked, true);
  assert.equal(f.todos, undefined);
});

test('PIN: set once, wrong tries counted, five wrong = blocked, right PIN unlocks for a flat window', async () => {
  _reset();
  assert.equal((await (await call('/api/pin', { pin: '1234' })).json()).ok, false, 'too easy');
  assert.equal((await (await call('/api/pin', { pin: '2580' })).json()).ok, true);
  assert.equal((await (await call('/api/pin', { pin: '9999' })).json()).ok, false, 'cannot change the PIN while locked');
  const w = await (await call('/api/unlock', { method: 'pin', pin: '1111' })).json();
  assert.equal(w.unlocked, false); assert.match(w.why, /4 tries left/);
  const ok = await (await call('/api/unlock', { method: 'pin', pin: '2580' })).json();
  assert.equal(ok.unlocked, true);
  const f = await (await call('/api/front')).json();
  assert.equal(f.locked, false);
  const mins = (f.unlocked_until - Date.now()) / 60000;
  assert.ok(mins > 9 && mins <= 10.01, `about 10 minutes, got ${mins}`);
  await call('/api/lock', { why: 'test' });
  assert.equal((await (await call('/api/front')).json()).locked, true);
  _reset();
  for (let i = 0; i < 5; i++) await call('/api/unlock', { method: 'pin', pin: '0001' });
  const b = await (await call('/api/unlock', { method: 'pin', pin: '2580' })).json();
  assert.equal(b.unlocked, false, 'even the right PIN waits after 5 wrong tries'); assert.match(b.why, /Wait/);
  _reset();
});

test('owner turns run in the Jarvis folder; "lock" locks', async () => {
  await call('/api/unlock', { method: 'pin', pin: '2580' });
  process.env.FAKE_REPLY = 'Your first task is the proposal.';
  const r = await (await call('/api/ask', { text: "what's on today" })).json();
  assert.equal(r.owner, true);
  const { cwd } = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
  assert.equal(path.resolve(cwd), kit);
  const l = await (await call('/api/ask', { text: 'Jarvis, lock' })).json();
  assert.equal(l.reply, 'Locked.');
  assert.equal((await (await call('/api/front')).json()).locked, true);
});

test('a PIN typed into the chat unlocks and never reaches the AI', async () => {
  _reset();
  await call('/api/lock', { why: 'test' });
  fs.rmSync(argsFile, { force: true });
  const bad = await (await call('/api/ask', { text: '1111' })).json();
  assert.match(bad.reply, /not right/);
  const ok = await (await call('/api/ask', { text: '2580' })).json();
  assert.equal(ok.reply, 'Unlocked.');
  assert.equal(fs.existsSync(argsFile), false, 'the AI never saw the PIN');
  const log = fs.readFileSync(path.join(kit, 'me', 'logs', 'guest-turns.log'), 'utf8');
  assert.doesNotMatch(log, /2580/);
  await call('/api/lock', { why: 'test' });
});

test('Knowledge, Settings and Paper buttons need the owner; secrets are never saved', async () => {
  await call('/api/lock', { why: 'test' });
  assert.equal((await (await call('/api/knowledge')).json()).error, 'locked');
  assert.equal((await (await call('/api/settings', { unlock_minutes: 30 })).json()).error, 'locked');
  assert.equal((await (await call('/api/paper/build', {})).json()).error, 'locked');
  const prof = path.join(kit, 'me', 'profile.md'), had = fs.existsSync(prof) ? fs.readFileSync(prof) : null;
  const sett = path.join(kit, 'me', 'settings.json'), hadS = fs.existsSync(sett) ? fs.readFileSync(sett) : null;
  try {
    fs.writeFileSync(prof, '# Profile\n\n## Daily life\n- Gym after Isha\n');
    _reset(); await call('/api/unlock', { method: 'pin', pin: '2580' });
    assert.deepEqual((await (await call('/api/knowledge')).json()).sections[0], { title: 'Daily life', items: ['Gym after Isha'] });
    const ok = await (await call('/api/knowledge', { fact: 'I like chai in the morning' })).json();
    assert.equal(ok.ok, true); assert.ok(ok.sections.some(x => x.items.includes('I like chai in the morning')));
    for (const bad of ['my card is 4111 1111 1111 1111', 'bank password is hunter2', 'account 000123456789'])
      assert.equal((await (await call('/api/knowledge', { fact: bad })).json()).ok, false, bad);
    assert.doesNotMatch(fs.readFileSync(prof, 'utf8'), /4111|hunter2|000123456789/);
    await call('/api/settings', { unlock_minutes: 15, port: 80, 'voice.tts_voice': 'Microsoft Andrew' });
    const saved = JSON.parse(fs.readFileSync(sett, 'utf8'));
    assert.equal(saved.unlock_minutes, 15); assert.notEqual(saved.port, 80, 'only safe settings can change from the app');
    assert.equal(saved.voice.tts_voice, 'Microsoft Andrew');
  } finally {
    if (had) fs.writeFileSync(prof, had); else fs.rmSync(prof, { force: true });
    if (hadS) fs.writeFileSync(sett, hadS); else fs.rmSync(sett, { force: true });
    await call('/api/lock', { why: 'test' });
  }
});

test('scripts with the local token may lock, but nothing else', async () => {
  const lt = fs.readFileSync(path.join(kit, 'me', '.local-token'), 'utf8').trim();
  const h = { 'content-type': 'application/json', 'x-jarvis-local': lt };
  assert.equal((await fetch(base + '/api/lock', { method: 'POST', headers: h, body: '{}' })).status, 200);
  assert.equal((await fetch(base + '/api/ask', { method: 'POST', headers: h, body: '{"text":"hi"}' })).status, 403);
});
