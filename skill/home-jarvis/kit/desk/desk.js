// The Jarvis app: the core, tabs (Today, Prayer, Paper, Knowledge, Voices, Settings), chat, voice, unlock and lock.
const TOKEN = document.querySelector('meta[name=jarvis]').content;
const $ = id => document.getElementById(id);
const E = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
let front = {}, view = 'core', wasUnlocked = false, mode = 'idle';

async function api(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'x-jarvis': TOKEN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
function setMode(m) { mode = m; document.body.dataset.mode = m; drawState(); }
const unlocked = () => front.locked === false && Date.now() < (front.unlocked_until || 0);
const minsLeft = () => Math.max(0, Math.ceil(((front.unlocked_until || 0) - Date.now()) / 60000));

// ---------- the core: stars, a glowing sphere of dots and two orbits (2D canvas, light on the CPU) ----------
const cv = $('gl'), cx = cv.getContext('2d');
let W = 0, H = 0, stars = [], pts = [], level = 0;
function resize() {
  const d = Math.min(devicePixelRatio || 1, 2); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d;
  stars = Array.from({ length: 260 }, () => [Math.random() * W, Math.random() * H, Math.random() * 1.3 * d + .2, Math.random() * 6]);
}
for (let i = 0; i < 900; i++) { const y = 1 - (i / 899) * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996; pts.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
addEventListener('resize', resize); resize();
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (document.hidden || ts - last < 33) return; last = ts;
  const t = still ? 0 : ts / 1000, d = Math.min(devicePixelRatio || 1, 2);
  cx.clearRect(0, 0, W, H);
  for (const s of stars) { cx.globalAlpha = .35 + .35 * Math.sin(t * .8 + s[3]); cx.fillStyle = '#cfefff'; cx.fillRect(s[0], s[1], s[2], s[2]); }
  const panelOn = document.body.dataset.panel === 'on';
  const target = mode === 'listening' ? .5 : mode === 'speaking' ? .35 + .25 * Math.abs(Math.sin(t * 9)) : mode === 'thinking' ? .2 : 0;
  level += (target - level) * .15;
  const R = Math.min(W, H) * (panelOn ? .26 : .2) * (1 + level * .18), ox = W / 2 - (panelOn ? 0 : 160 * d), oy = H / 2 - 10 * d;
  const g = cx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.6);
  g.addColorStop(0, `rgba(55,224,255,${.28 + level * .25})`); g.addColorStop(.55, 'rgba(55,224,255,.08)'); g.addColorStop(1, 'rgba(55,224,255,0)');
  cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.arc(ox, oy, R * 1.6, 0, 7); cx.fill();
  const a = t * .25, ca = Math.cos(a), sa = Math.sin(a), tilt = .35, ct = Math.cos(tilt), st = Math.sin(tilt);
  for (const p of pts) {
    const x = p[0] * ca - p[2] * sa, z0 = p[0] * sa + p[2] * ca, y = p[1] * ct - z0 * st, z = p[1] * st + z0 * ct;
    cx.globalAlpha = .15 + .75 * ((z + 1) / 2); cx.fillStyle = z > 0 ? '#9ff3ff' : '#37e0ff';
    cx.fillRect(ox + x * R, oy + y * R, 1.6 * d, 1.6 * d);
  }
  cx.globalAlpha = .7; cx.strokeStyle = '#37e0ff'; cx.lineWidth = 1.2 * d;
  for (const [k, rot] of [[1.35, t * .15], [1.6, -t * .1 + 1.2]]) { cx.beginPath(); cx.ellipse(ox, oy, R * k, R * k * .32, rot, 0, 7); cx.stroke(); }
  cx.globalAlpha = 1;
}
requestAnimationFrame(frame);

// ---------- top bar: state and tabs ----------
function drawState() {
  const s = $('state');
  if (mode === 'listening') { s.textContent = 'Listening'; s.className = 'state'; return; }
  if (mode === 'thinking') { s.textContent = 'Thinking'; s.className = 'state'; return; }
  if (mode === 'speaking') { s.textContent = 'Speaking'; s.className = 'state'; return; }
  s.textContent = unlocked() ? `Unlocked · ${minsLeft()} min` : 'Locked';
  s.className = 'state' + (unlocked() ? '' : ' locked');
}
document.querySelectorAll('#tabs [data-s]').forEach(b => b.onclick = () => setView(b.dataset.s));
function setView(v) {
  view = v; document.body.dataset.view = v;
  document.querySelectorAll('#tabs [data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === v));
  const isPanel = v !== 'core'; $('panel').hidden = !isPanel; document.body.dataset.panel = isPanel ? 'on' : 'off';
  if (isPanel) drawPanel();
}

// ---------- panels ----------
const toMin = t => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ''); if (!m) return null; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + +m[2]; };
function nextPrayer() {
  const pr = (front.prayers || []).filter(p => p[0] !== 'Sunrise'), now = new Date().getHours() * 60 + new Date().getMinutes();
  const n = pr.find(p => toMin(p[1]) > now); if (!n) return pr[0] ? { p: pr[0][0], at: pr[0][1], tomorrow: true } : null;
  const left = toMin(n[1]) - now; return { p: n[0], at: n[1], left: left >= 60 ? `${Math.floor(left / 60)} h ${left % 60} min` : `${left} min` };
}
function pc(title, wide) { const c = E('div', 'pc rise' + (wide ? ' wide' : '')); c.append(E('h2', '', title)); $('panel').append(c); return c; }
function row(a, b, cls) { const r = E('div', 'rw' + (cls ? ' ' + cls : '')); r.append(E('span', '', a), E('small', '', b || '')); return r; }
function btn(parent, text, fn, solid) { const b = E('button', solid ? 'solid' : 'ghost', text); b.onclick = fn; parent.append(b); return b; }
function askBtn(parent, text, q, solid) { return btn(parent, text, () => askJarvis(q), solid); }
function lockedCard(what) {
  const c = pc('Locked', true); c.append(E('p', '', `${what} is private. Unlock with Windows Hello or your Jarvis PIN.`));
  const a = E('div', 'acts'); btn(a, 'Windows Hello', () => unlockHello(), true); btn(a, 'PIN', openPin); c.append(a);
}

async function drawPanel() {
  const P = $('panel'); P.innerHTML = '';
  const f = front;
  if (view === 'today') {
    const c = pc(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (f.hijri ? ` · ${f.hijri}` : ''), true);
    c.append(E('div', 'big', unlocked() ? (f.headline || `Good to see you, ${f.call_me || ''}`.trim()) : 'Your day'));
    const a = E('div', 'acts'); askBtn(a, 'Read me my morning', 'Good morning. Read me my morning: top to-dos, the first thing to do and the next prayer.', true);
    askBtn(a, 'Save an idea', 'I have an idea to save. Ask me what it is.'); askBtn(a, 'What should I do now?', 'Looking at my to-dos and the time, what should I do right now?'); c.append(a);
    const n = nextPrayer(); if (n) { const p = pc('Next prayer'); p.append(E('div', 'big', `${n.p} · ${n.at}`), E('div', 'sub', n.tomorrow ? 'Tomorrow' : `In ${n.left}`)); }
    if (f.weather) { const w = pc(`Weather${f.place ? ' · ' + f.place : ''}`); w.append(E('div', 'big', f.weather.now || ''), E('p', '', f.weather.today || ''), E('div', 'sub', f.weather.outlook || '')); }
    if (!unlocked()) return lockedCard('Your day');
    const td = pc('Top to-dos'); (f.todos || []).slice(0, 8).forEach(t => { const r = row(t.t, t.when); if (t.done) r.firstChild.className = 'done'; td.append(r); });
    if (!(f.todos || []).length) td.append(E('p', '', 'No paper for today yet. Open the Paper tab to build it.'));
    if ((f.plan || []).length) { const pl = pc('The day plan'); f.plan.forEach(r => pl.append(row(r[1], r[0]))); }
    if ((f.deadlines || []).length) { const dl = pc('Deadlines'); f.deadlines.forEach(r => dl.append(row(r[1], r[0]))); }
    if ((f.bills || []).length) { const bl = pc('Bills'); f.bills.slice(0, 6).forEach(r => bl.append(row(r[1], `${r[0]} · ${r[2]}`))); }
    if (f.ayah) { const q = pc(f.ayah.ar ? 'Ayah' : 'Words for today'); q.append(E('p', '', f.ayah.en || ''), E('div', 'sub', f.ayah.ref || '')); }
  } else if (view === 'prayer') {
    const n = nextPrayer(), c = pc('Next prayer'); if (n) c.append(E('div', 'big', `${n.p} · ${n.at}`), E('div', 'sub', n.tomorrow ? 'Tomorrow' : `In ${n.left}`));
    else c.append(E('p', '', 'Prayer times are not available. Check the internet, or the town in Settings.'));
    const t = pc('Today'); const nx = n && !n.tomorrow ? n.p : '';
    (f.prayers || []).forEach(p => t.append(row(p[0], p[1], p[0] === nx ? 'now' : '')));
    const a = E('div', 'acts'); askBtn(a, 'How long until the next prayer?', 'How long until the next prayer?'); t.append(a);
  } else if (view === 'paper') {
    const c = pc(f.paper_name || 'The morning paper', true);
    if (!unlocked()) { c.append(E('p', '', 'Your paper is built and printed every morning by itself.')); return lockedCard('The paper'); }
    c.append(E('div', 'big', f.paper_ready ? "Today's paper is ready" : 'Not built yet today'));
    c.append(E('div', 'sub', `Built at ${f.build_time || '—'} every morning · printing ${f.print_paper ? 'on' : 'off'}${f.printer ? ' · ' + f.printer : ''}`));
    const a = E('div', 'acts');
    if (f.paper_ready) btn(a, 'Open today\'s paper', openPaper, true);
    btn(a, f.paper_ready ? 'Build again' : 'Build it now', () => paperAction('build'), !f.paper_ready);
    if (f.paper_ready) btn(a, 'Print it', () => paperAction('print'));
    askBtn(a, 'Change my paper', 'I want to change my morning paper. Ask me what to add, remove or move, then tell me to make the change in Claude Code.');
    c.append(a);
    const h = pc('How it works'); ['Every morning Claude writes the paper from your answers, calendar and notes.', 'Page 1 is your day: weather, prayer times, to-dos, day plan, deadlines.', 'Page 2 is money and messages. Page 3 is work, faith and you. Sundays add The Week.', 'To change what is in it, tell Claude Code "change my paper".'].forEach(s => h.append(E('p', '', s)));
  } else if (view === 'knowledge') {
    if (!unlocked()) return lockedCard('What Jarvis knows about you');
    const k = await api('/api/knowledge'); if (view !== 'knowledge') return;
    const s = pc('Search what Jarvis knows', true); const box = E('div', 'acts'); const inp = E('input', 'fld wide'); inp.placeholder = 'family, work, gym…'; box.append(inp); s.append(box);
    const holder = E('div'); holder.style.display = 'contents'; P.append(holder);
    const draw = () => { holder.innerHTML = ''; const q = inp.value.toLowerCase();
      (k.sections || []).forEach(sec => { const items = sec.items.filter(i => !q || i.toLowerCase().includes(q) || sec.title.toLowerCase().includes(q)); if (!items.length) return;
        const c = E('div', 'pc rise'); c.append(E('h2', '', sec.title)); items.forEach(i => c.append(E('div', 'fact', i))); holder.append(c); });
      const add = E('div', 'pc rise'); add.append(E('h2', '', 'Add a fact')); const ai = E('input', 'fld wide'); ai.placeholder = 'e.g. I go to the gym after Isha'; const aa = E('div', 'acts'); aa.append(ai);
      btn(aa, 'Add', async () => { const r = await api('/api/knowledge', { fact: ai.value }); if (r.ok) { k.sections = r.sections; draw(); } else say(r.why || 'Not added.', false); }, true); add.append(aa,
        E('div', 'sub', 'Never add passwords, card or account numbers. Jarvis refuses them.')); holder.append(add); };
    inp.oninput = draw; draw();
  } else if (view === 'voices') {
    const v = f.voice || {}, list = speechSynthesis.getVoices().filter(x => /^en|^ar|^bn|^ur/i.test(x.lang));
    const c = pc('Jarvis\'s voice', true); const sel = E('select', 'fld');
    list.forEach(x => { const o = E('option', '', `${x.name} (${x.lang})`); o.value = x.name; if (pickVoice() && pickVoice().name === x.name) o.selected = true; sel.append(o); });
    const a = E('div', 'acts'); a.append(sel); btn(a, 'Test', () => { localVoice = sel.value; speak(front.faith === 'islam' ? 'Assalamu alaikum. This is how I sound.' : 'Hello. This is how I sound.'); });
    btn(a, 'Use this voice', async () => { localVoice = sel.value; if (unlocked()) await api('/api/settings', { 'voice.tts_voice': sel.value }); try { localStorage.setItem('jarvis-voice', sel.value); } catch {} say('Voice saved.', true); }, true);
    c.append(a, E('div', 'sub', 'The "Online (Natural)" voices sound the most human. They need the internet.'));
    const l = pc('Listening'); l.append(row('Wake word', `“${v.wake_word || 'jarvis'}, …”`));
    const r = E('div', 'rw'); r.append(E('span', '', 'Always listening')); const sw = E('button', 'sw'); sw.append(E('i')); sw.setAttribute('aria-checked', String(always));
    sw.onclick = () => { setAlways(!always); sw.setAttribute('aria-checked', String(always)); }; r.append(sw); l.append(r);
    l.append(E('div', 'sub', 'Voice never unlocks Jarvis. Anyone can talk to it; private things still need Windows Hello or the PIN.'));
  } else if (view === 'settings') {
    const c = pc('Lock', true); c.classList.add('set');
    c.append(row('Status', unlocked() ? `Unlocked · ${minsLeft()} min left` : 'Locked'));
    const a = E('div', 'acts'); if (unlocked()) btn(a, 'Lock now', () => lockNow('button'), true); else { btn(a, 'Windows Hello', () => unlockHello(), true); btn(a, 'PIN', openPin); }
    btn(a, f.has_pin ? 'Change PIN' : 'Set a PIN', () => (f.has_pin && !unlocked()) ? say('Unlock first to change the PIN.', false) : openPin(true)); c.append(a);
    c.append(E('div', 'sub', `Each unlock lasts ${f.unlock_minutes || 10} minutes, then Jarvis locks and clears the chat. It also locks when Windows locks.`));
    if (!unlocked()) return;
    const s = pc('Preferences'); s.classList.add('set');
    const mins = E('select', 'fld'); [5, 10, 15, 30].forEach(m => { const o = E('option', '', `${m} min`); o.value = m; if (m === (f.unlock_minutes || 10)) o.selected = true; mins.append(o); });
    mins.onchange = () => api('/api/settings', { unlock_minutes: Number(mins.value) }).then(refresh);
    const r1 = E('div', 'rw'); r1.append(E('span', '', 'Unlock lasts'), mins); s.append(r1);
    const r2 = E('div', 'rw'); r2.append(E('span', '', 'Print the paper every morning')); const sw = E('button', 'sw'); sw.append(E('i')); sw.setAttribute('aria-checked', String(!!f.print_paper));
    sw.onclick = async () => { await api('/api/settings', { print_paper: !f.print_paper }); await refresh(); drawPanel(); }; r2.append(sw); s.append(r2);
    s.append(E('div', 'sub', 'Bigger changes (the town, the printer, the paper\'s sections, the morning time): ask Claude Code.'));
  }
}

// ---------- refresh ----------
async function refresh() {
  try { front = await api('/api/front'); } catch { return; }
  const now = unlocked();
  if (wasUnlocked && !now) { clearChat(); say('Locked. The chat is cleared.', false); if (view !== 'core') drawPanel(); }
  if (now) $('card').hidden = true;
  wasUnlocked = now; drawState();
}
setInterval(() => { if (wasUnlocked && !unlocked()) refresh(); else drawState(); }, 1000);
setInterval(() => { refresh().then(() => { if (view === 'today' || view === 'prayer') drawPanel(); }); }, 60000);

// ---------- chat ----------
function clearChat() { $('chat').innerHTML = '<div class="sp"></div>'; $('caption').textContent = ''; }
function addMsg(who, text) {
  const m = E('div', 'msg' + (who === 'You' ? ' you' : '')); m.append(E('small', '', who), document.createTextNode(text));
  $('chat').append(m); $('chat').scrollTop = 1e9;
  if (who === 'Jarvis') { $('caption').textContent = text.length > 160 ? text.slice(0, 157) + '…' : text; }
}
function say(text, speakIt = true) { addMsg('Jarvis', text); if (speakIt) speak(text); }
function card(title, text, buttons) {
  const c = $('card'); c.innerHTML = ''; c.append(E('h3', '', title), E('p', '', text)); const a = E('div', 'acts');
  buttons.forEach(b => btn(a, b.text, () => { c.hidden = true; b.do && b.do(); }, b.solid)); btn(a, 'Close', () => { c.hidden = true; }); c.append(a); c.hidden = false;
}

let busy = false;
async function askJarvis(text) {
  text = String(text || '').trim(); if (!text || busy) return;
  const isPin = /^\d{4,8}$/.test(text.replace(/\s/g, ''));
  addMsg('You', isPin ? '•'.repeat(text.replace(/\s/g, '').length) : text);
  if (/^(jarvis[, ]+)?unlock( yourself)?\.?$/i.test(text)) return unlockHello();
  if (/^(jarvis[, ]+)?(open|show)( me)? (the )?(today|prayer|paper|knowledge|voices|settings|core)( tab)?\.?$/i.test(text)) { const v = /(today|prayer|paper|knowledge|voices|settings|core)/i.exec(text)[1].toLowerCase(); setView(v); return say(`Here's ${v}.`, true); }
  busy = true; setMode('thinking');
  try {
    const r = await api('/api/ask', { text });
    setMode('idle'); say(r.reply || r.error || 'Something went wrong.');
    if (r.needs_unlock) card('That needs you', 'Unlock to get this answer.', [{ text: 'Windows Hello', solid: true, do: () => unlockHello() }, { text: 'PIN', do: openPin }]);
    await refresh(); if (view !== 'core') drawPanel();
  } catch { setMode('idle'); say('I lost the connection to Jarvis. Start it again with Start Jarvis.', false); }
  busy = false;
}
$('input').addEventListener('keydown', e => { if (e.key === 'Enter') { const t = e.target.value; e.target.value = ''; askJarvis(t); } });

// ---------- unlock and lock ----------
let lastAsk = 0;
async function unlockHello() {
  if (Date.now() - lastAsk < 15000) return; // one box at a time, never a stream of pop-ups
  lastAsk = Date.now(); $('card').hidden = true;
  say('Check the Windows Hello box.', false);
  const r = await api('/api/unlock', { method: 'hello' });
  lastAsk = 0;
  if (r.unlocked) say(`Unlocked for ${front.unlock_minutes || 10} minutes.`); else if (r.why) say(r.why, false);
  await refresh(); if (view !== 'core') drawPanel();
}
async function lockNow(why) { await api('/api/lock', { why }); await refresh(); clearChat(); if (view !== 'core') drawPanel(); }
$('lockTab').onclick = () => lockNow('button');
let settingPin = false;
function openPin(change) {
  settingPin = !front.has_pin || change === true;
  $('pintitle').textContent = settingPin ? (front.has_pin ? 'New Jarvis PIN' : 'Set your Jarvis PIN') : 'Jarvis PIN';
  $('pinhelp').textContent = settingPin ? '4 to 8 digits, only you should know it. Never say it out loud near Jarvis.' : 'Type your Jarvis PIN.';
  $('pin').value = ''; $('pinerr').textContent = ''; $('card').hidden = true;
  $('pindlg').showModal(); $('pin').focus();
}
$('pinform').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  const pin = $('pin').value.trim(); $('pin').value = '';
  const r = settingPin ? await api('/api/pin', { pin }) : await api('/api/unlock', { method: 'pin', pin });
  if (r.unlocked || r.ok) { $('pindlg').close(); say(settingPin ? 'PIN saved. Use it to unlock me.' : `Unlocked for ${front.unlock_minutes || 10} minutes.`, false); await refresh(); if (view !== 'core') drawPanel(); }
  else $('pinerr').textContent = r.why || 'That did not work.';
});
async function paperAction(what) {
  say(what === 'build' ? 'Building your paper. This takes a minute or two.' : 'Sending the paper to the printer.', false);
  setMode('thinking'); const r = await api('/api/paper/' + what, {}); setMode('idle');
  say(r.message || r.error || 'Done.', false); await refresh(); if (view === 'paper') drawPanel();
}
async function openPaper() {
  const r = await fetch('/api/paper', { headers: { 'x-jarvis': TOKEN } });
  if (!r.ok || !/pdf/.test(r.headers.get('content-type') || '')) return say('The paper is not there.', false);
  open(URL.createObjectURL(await r.blob()), '_blank');
}

// ---------- voice: Edge speech recognition + Windows natural voices ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, always = false, localVoice = '';
try { localVoice = localStorage.getItem('jarvis-voice') || ''; } catch {}
function pickVoice() {
  const want = (localVoice || (front.voice || {}).tts_voice || '').toLowerCase(), vs = speechSynthesis.getVoices();
  return vs.find(v => want && v.name.toLowerCase().includes(want)) || vs.find(v => /natural/i.test(v.name) && /^en/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang));
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, ''));
  const v = pickVoice(); if (v) u.voice = v; u.rate = (front.voice || {}).rate || 1;
  stopRec(); setMode('speaking');
  u.onend = u.onerror = () => { setMode('idle'); if (always) setTimeout(startRec, 300); };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function stopRec() { try { rec && rec.abort(); } catch {} listening = false; if (mode === 'listening') setMode('idle'); }
function startRec(oneShot) {
  if (!SR) return say('Voice needs Microsoft Edge. Open Jarvis with the Start Jarvis button.', false);
  if (listening || mode === 'speaking' || mode === 'thinking') return;
  rec = new SR(); rec.lang = (front.voice || {}).lang || 'en-US'; rec.continuous = !oneShot; rec.interimResults = false;
  rec.onresult = e => {
    const t = e.results[e.results.length - 1][0].transcript.trim();
    if (oneShot) { stopRec(); return askJarvis(t); }
    const wake = ((front.voice || {}).wake_word || 'jarvis').toLowerCase();
    const m = new RegExp(`^(hey |ok |okay )?(${wake}|jervis|jarvi|travis)\\b[,.!]?\\s*(.*)$`, 'i').exec(t);
    if (m) { if (m[3]) askJarvis(m[3]); else say('Yes?'); }
  };
  rec.onend = () => { listening = false; if (mode === 'listening') setMode('idle'); if (always && mode === 'idle') setTimeout(() => startRec(), 400); };
  rec.onerror = e => { if (e.error === 'not-allowed') { setAlways(false); say('The microphone is blocked. Click the lock icon in the address bar or Edge settings and allow the microphone for Jarvis.', false); } };
  try { rec.start(); listening = true; setMode('listening'); } catch {}
}
function setAlways(on) { always = on; try { localStorage.setItem('jarvis-always', on ? '1' : ''); } catch {} if (on) startRec(); else stopRec(); }
$('mic').onclick = () => { if (listening && !always) return stopRec(); speechSynthesis.cancel(); startRec(true); };
if (speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (view === 'voices') drawPanel(); });

setView('core');
refresh().then(() => {
  say(`${front.faith === 'islam' ? 'Assalamu alaikum' : 'Hello'}${front.call_me ? ', ' + front.call_me : ''}. Ask me anything, or press the circle to talk.`, false);
  try { if (localStorage.getItem('jarvis-always') === '1' || (front.voice || {}).always_listening) setAlways(true); } catch {}
});
