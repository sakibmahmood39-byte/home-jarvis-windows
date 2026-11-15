// The Windows bridge. On the Mac the app lives inside a native window that listens, speaks and answers the page.
// On Windows the same page runs in an Edge app window, and this file does that job:
//   - page -> Jarvis: window.webkit.messageHandlers.jarvis.postMessage({cmd, ...}) is handled here or sent to the
//     local Jarvis server (127.0.0.1 only, with this run's secret token);
//   - Jarvis -> page: window.jarvis.state / settings / knowledge / homeList / tv / voices / level / layout …;
//   - listening (Edge speech recognition, wake word), speaking (Windows voices), the lock (Windows Hello or PIN).
(() => {
  const TOKEN = document.querySelector('meta[name=jarvis]').content;
  const CFG = window.JARVIS_CONFIG || {};
  const J = () => window.jarvis || {};
  const call = (fn, ...a) => { try { J()[fn] && J()[fn](...a); } catch (e) { console.error(fn, e); } };
  async function api(path, body) {
    const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'x-jarvis': TOKEN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return r.json();
  }
  const cmd = (o) => api('/api/cmd', o);

  // ---------- the conversation and the state the page draws ----------
  let mode = 'waiting', lines = [], live = '', status = '', problem = '', locked = true, unlockedUntil = 0;
  const VOICE = Object.assign({ wake_word: 'jarvis', lang: 'en-US', rate: 1, always_listening: true }, CFG.voice || {});
  function push() { call('state', { mode, lines: lines.slice(-12), live, status, problem: problem || undefined }); }
  function setMode(m, extra = {}) { mode = m; if ('live' in extra) live = extra.live; if ('status' in extra) status = extra.status; push(); }
  function say(text, { speakIt = true, tag } = {}) {
    lines.push({ who: 'Jarvis', text, at: new Date().toISOString(), ...(tag ? { tag } : {}) });
    if (speakIt) speak(text); else setMode(idleMode());
  }
  const idleMode = () => (listenOn ? 'waiting' : 'off');

  // ---------- speaking: Windows voices through Edge ----------
  let voiceName = (() => { try { return localStorage.getItem('jarvis-voice') || ''; } catch { return ''; } })() || VOICE.tts_voice || '';
  function pickVoice() {
    const vs = speechSynthesis.getVoices(), want = voiceName.toLowerCase();
    return vs.find((v) => want && v.name.toLowerCase() === want) || vs.find((v) => want && v.name.toLowerCase().includes(want))
      || vs.find((v) => /natural/i.test(v.name) && v.lang.startsWith((VOICE.lang || 'en').slice(0, 2))) || vs.find((v) => /^en/i.test(v.lang));
  }
  let lvTimer = 0;
  function speak(text, after) {
    if (!('speechSynthesis' in window)) { setMode(idleMode()); return; }
    stopRec();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, '').slice(0, 1200));
    const v = pickVoice(); if (v) u.voice = v; u.rate = Number(VOICE.rate) || 1;
    u.onstart = () => { setMode('speaking'); clearInterval(lvTimer); lvTimer = setInterval(() => call('level', 0.25 + Math.random() * 0.45), 90); };
    u.onend = u.onerror = () => { clearInterval(lvTimer); call('level', 0); setMode(idleMode()); after && after(); if (listenOn) setTimeout(startRec, 350); };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // ---------- listening: Edge speech recognition, the wake word, Ctrl+Space to talk ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, recOn = false, listenOn = VOICE.always_listening !== false, oneShot = false, analyser = null;
  async function micLevel() {
    if (analyser) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); const ctx = new AudioContext(); analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(analyser); const buf = new Uint8Array(analyser.frequencyBinCount);
      setInterval(() => { if (mode !== 'listening') return; analyser.getByteTimeDomainData(buf); let m = 0; for (const x of buf) m = Math.max(m, Math.abs(x - 128)); call('level', Math.min(1, m / 50)); }, 80);
    } catch {}
  }
  const wakeRe = () => new RegExp(`^(hey |ok |okay )?(${String(VOICE.wake_word || 'jarvis').toLowerCase()}|jervis|jarvi|travis|service)\\b[,.!]?\\s*(.*)$`, 'i');
  function stopRec() { try { rec && rec.abort(); } catch {} recOn = false; }
  function startRec() {
    if (!SR || recOn || mode === 'speaking' || mode === 'thinking') return;
    rec = new SR(); rec.lang = VOICE.lang || 'en-US'; rec.continuous = !oneShot; rec.interimResults = true;
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1], t = r[0].transcript.trim();
      if (oneShot) { live = t; push(); if (r.isFinal) { oneShot = false; stopRec(); live = ''; ask(t, 'voice'); } return; }
      const m = wakeRe().exec(t);
      if (!m) return;
      if (!r.isFinal) { if (mode !== 'listening') setMode('listening', { live: m[3] || '' }); else { live = m[3] || ''; push(); } return; }
      live = ''; if (m[3]) ask(m[3], 'voice'); else { oneShot = true; stopRec(); setMode('listening', { live: '' }); setTimeout(startRec, 150); }
    };
    rec.onend = () => { recOn = false; if (mode === 'listening' && !oneShot) setMode(idleMode()); if ((listenOn || oneShot) && mode !== 'speaking' && mode !== 'thinking') setTimeout(startRec, 300); };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { listenOn = false; oneShot = false; problem = 'The microphone is blocked. Allow it for Jarvis in Edge (the lock icon in the address bar, or edge://settings/content/microphone).'; push(); }
    };
    try { rec.start(); recOn = true; micLevel(); if (oneShot) setMode('listening', { live: '' }); else if (mode === 'off') setMode('waiting'); } catch {}
  }
  function talkOnce() { speechSynthesis.cancel(); oneShot = true; stopRec(); setTimeout(startRec, 120); }
  addEventListener('keydown', (e) => { if (e.code === 'Space' && e.ctrlKey) { e.preventDefault(); talkOnce(); } }, true);
  addEventListener('dblclick', (e) => { if (e.target && e.target.id === 'gl') talkOnce(); });

  // ---------- asking ----------
  let busy = false, lastAsk = '', helloAt = 0;
  async function ask(text, via = 'typed') {
    text = String(text || '').trim(); if (!text || busy) return;
    const pin = text.replace(/\s/g, '');
    lines.push({ who: 'You', text: /^\d{4,8}$/.test(pin) ? '•'.repeat(pin.length) : text, at: new Date().toISOString() });
    if (/^(hey )?(jarvis[, ]+)?unlock( yourself)?\.?$/i.test(text)) { push(); return unlock(); }
    if (/^(hey )?(jarvis[, ]+)?(change|switch) (your )?look to (obsidian|arc|atlas)\b/i.test(text)) { const l = /(obsidian|arc|atlas)/i.exec(text)[1].toLowerCase(); call('scene', `look-${l}`); return say(`Here's ${l[0].toUpperCase() + l.slice(1)}.`); }
    const tab = /^(hey )?(jarvis[, ]+)?(open|show)( me)?( the| my)? (core|today|car|home|prayer|tv|knowledge|house|room|print|paper|business|clients|team|voices|settings)( tab)?\.?$/i.exec(text);
    if (tab) { const v = tab[6].toLowerCase() === 'paper' ? 'print' : tab[6].toLowerCase(); call('scene', v); return say(`Here's ${tab[6].toLowerCase()}.`); }
    busy = true; lastAsk = text; setMode('thinking', { status: 'Thinking' });
    try {
      const r = await api('/api/ask', { text, via });
      busy = false; status = '';
      if (r.locked_now) { locked = true; lines = []; }
      say(r.reply || r.error || 'Something went wrong.');
      if (r.unlocked) await refreshLock();
      if (r.needs_unlock) setTimeout(() => unlock(lastAsk), 400);
    } catch { busy = false; say('I lost the connection to Jarvis. Start it again with the Start Jarvis button.', { speakIt: false }); }
  }

  // ---------- the lock ----------
  async function refreshLock() {
    try { const s = await api('/api/lockstate'); const was = !locked; locked = s.locked; unlockedUntil = s.unlocked_until || 0;
      if (was && locked) { lines = []; call('scene', 'core'); say('Locked. The chat is cleared.', { speakIt: false }); }
      window.dispatchEvent(new CustomEvent('jarvis-lock', { detail: s })); } catch {}
  }
  setInterval(refreshLock, 5000);
  async function unlock(thenAsk) {
    if (Date.now() - helloAt < 15000) return; helloAt = Date.now(); // one box at a time, never a stream of pop-ups
    setMode('thinking', { status: 'Check the Windows Hello box' });
    const r = await api('/api/unlock', { method: 'hello' });
    helloAt = 0; status = '';
    if (r.unlocked) { await refreshLock(); say(`Unlocked for ${CFG.unlock_minutes || 10} minutes.`, { speakIt: !thenAsk }); if (thenAsk) setTimeout(() => ask(thenAsk), 200); reloadData(); return; }
    setMode(idleMode());
    pinBox(thenAsk, r.why);
  }
  // A small card for the PIN, built from the app's own card style.
  function pinBox(thenAsk, why, setting) {
    document.getElementById('pinbox')?.remove();
    const c = document.createElement('div'); c.id = 'pinbox'; c.className = 'card'; c.style.zIndex = 80;
    c.innerHTML = `<h3>${setting ? 'Set your Jarvis PIN' : 'Your Jarvis PIN'}</h3><p>${why ? why + ' ' : ''}${setting ? '4 to 8 digits that only you know. Never say it out loud near Jarvis.' : 'Type your Jarvis PIN to unlock.'}</p>
      <div class="row"><input class="fld" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="width:140px;font-size:20px;letter-spacing:.3em;text-align:center"><button class="solid">OK</button><button class="ghost">Cancel</button></div><p class="sub" style="color:#ff8a7c;margin-top:6px"></p>`;
    document.body.append(c);
    const [inp] = c.getElementsByTagName('input'), [ok, cancel] = c.getElementsByTagName('button'), err = c.querySelector('p.sub');
    const go = async () => {
      const pin = inp.value.trim(); inp.value = '';
      const r = setting ? await api('/api/pin', { pin }) : await api('/api/unlock', { method: 'pin', pin });
      if (r.ok || r.unlocked) { c.remove(); await refreshLock(); say(setting ? 'PIN saved. Use it to unlock me.' : `Unlocked for ${CFG.unlock_minutes || 10} minutes.`, { speakIt: false }); reloadData(); if (thenAsk) ask(thenAsk); }
      else err.textContent = r.why || 'That did not work.';
    };
    ok.onclick = go; cancel.onclick = () => c.remove(); inp.onkeydown = (e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') c.remove(); };
    setTimeout(() => inp.focus(), 50);
  }
  function reloadData() { cmd({ cmd: 'settings-get' }).then(apply); cmd({ cmd: 'settings-status' }).then(apply); }

  // ---------- answers from the server: a list of calls on window.jarvis ----------
  function apply(r) { for (const [fn, ...a] of (r && r.calls) || []) call(fn, ...a); }

  // ---------- voices ----------
  function voiceList() {
    const vs = speechSynthesis.getVoices();
    const cur = pickVoice();
    return { current: cur ? `windows:${cur.name}` : '', windows: vs.filter((v) => /^(en|ar|bn|ur|hi)/i.test(v.lang) || v.lang.startsWith(String(VOICE.lang || 'en').slice(0, 2))).map((v) => ({ id: v.name, name: v.name.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, ''), natural: /natural/i.test(v.name), tag: v.lang, about: v.localService ? 'works offline' : 'needs the internet' })) };
  }
  speechSynthesis.addEventListener?.('voiceschanged', () => call('voices', voiceList()));

  // ---------- the page's messages ----------
  let escAt = 0;
  addEventListener('keydown', (e) => { if (e.key === 'Escape') escAt = Date.now(); }, true);
  async function handle(o) {
    const c = o && o.cmd;
    switch (c) {
      case 'ready': push(); call('layout', document.fullscreenElement ? 'full' : 'half'); refreshLock(); if (listenOn) startRec(); return;
      case 'send': return ask(o.text, 'typed');
      case 'close': if (Date.now() - escAt < 500) return; window.close(); return;
      case 'layout': if (o.to === 'full') document.documentElement.requestFullscreen?.(); else if (document.fullscreenElement) document.exitFullscreen?.(); setTimeout(() => call('layout', document.fullscreenElement ? 'full' : 'half'), 300); return;
      case 'ui-error': console.warn('ui', o.text); return;
      case 'voices-list': call('voices', voiceList()); return;
      case 'voice-sample': { const was = voiceName; voiceName = o.id; speak(`Hello, I'm Jarvis. This is how I sound.`); voiceName = was; return; }
      case 'voice-use': voiceName = o.id; try { localStorage.setItem('jarvis-voice', o.id); } catch {} cmd({ cmd: 'settings-set', patch: { voice: { tts_voice: o.id } } }); call('voices', voiceList()); speak('This is my voice now.'); return;
      case 'voice-teach-start': case 'voice-teach-line': case 'voice-teach-done': case 'voice-teach-cancel':
        call('voiceTeach', { phase: 'error', message: 'On Windows, Jarvis never decides who you are from your voice. Private things always need Windows Hello or your PIN.' }); return;
      case 'unlock-hello': return unlock();
      case 'lock': await api('/api/lock', { why: 'button' }); lines = []; await refreshLock(); say('Locked.', { speakIt: false }); reloadData(); return;
      case 'pin-dialog': return pinBox(null, '', !!o.change);
      case 'yes': case 'no': push(); return;
      default: {
        const r = await cmd(o).catch(() => null); apply(r);
        if (r && r.needs_unlock && c === 'knowledge-get') unlock();
        if (c === 'settings-set' && r && r.cfg) { Object.assign(VOICE, r.cfg.voice || {}); listenOn = VOICE.always_listening !== false; if (listenOn) startRec(); else stopRec(); }
      }
    }
  }
  window.webkit = { messageHandlers: { jarvis: { postMessage: (o) => { handle(o); } } } };
})();
