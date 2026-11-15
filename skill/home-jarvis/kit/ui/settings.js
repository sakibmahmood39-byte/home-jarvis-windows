// The Settings tab: look, lock and PIN, voice, the brain, the paper, home/TV/car, and what's working.
// Every change is saved through the app (settings-set) and only while Jarvis is unlocked.
export function createSettings({ $, E, pc, post, go, looks, onLook, onTones, connections }) {
  const S = { cfg: null, st: null, fresh: true, refreshing: false };
  const get = (path, def) => { let o = S.cfg; for (const k of path.split('.')) { if (o == null || typeof o !== 'object') return def; o = o[k]; } return o ?? def; };
  const set = (path, value) => {
    const ks = path.split('.'); const patch = {}; let p = patch, c = (S.cfg = S.cfg || {});
    ks.forEach((k, i) => { if (i === ks.length - 1) { p[k] = value; c[k] = value; } else { p = p[k] = {}; c = (typeof c[k] === 'object' && c[k]) || (c[k] = {}); } });
    post({ cmd: 'settings-set', patch });
  };
  const editing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

  // ---- small controls, all built from the existing look ----
  const sw = (path, def, onchange) => {
    const b = E('button', 'sw'); b.append(E('i')); const on = !!get(path, def); b.setAttribute('aria-checked', on); b.setAttribute('role', 'switch');
    b.onclick = () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); set(path, onchange ? onchange(v) : v); };
    return b;
  };
  const num = (path, def, { min = 0, max = 1e6, step = 'any', int = false } = {}) => {
    const i = E('input', 'fld'); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = get(path, def);
    i.onchange = () => { let v = Number(i.value); if (!Number.isFinite(v)) v = def; v = Math.min(max, Math.max(min, int ? Math.round(v) : v)); i.value = v; set(path, v); };
    return i;
  };
  const text = (path, def, ph = '') => { const i = E('input', 'fld wide'); i.type = 'text'; i.value = get(path, '') || def || ''; i.placeholder = ph; i.spellcheck = false; i.onchange = () => set(path, i.value.trim()); return i; };
  const line = (label, ctl, sub) => { const r = E('div', 'rw'); const l = E('span'); l.append(label); if (sub) l.append(E('small', 'blk', sub)); r.append(l, ctl); return r; };
  const seg = (path, def, options) => {
    const w = E('div', 'acts segw'); const cur = get(path, def);
    for (const [v, t] of options) { const b = E('button', `ghost${v === cur ? ' on' : ''}`, t); b.onclick = () => { set(path, v); [...w.children].forEach((x) => x.classList.toggle('on', x === b)); if (path.startsWith('calls.')) draw(); }; w.append(b); }
    return w;
  };
  const when = (epoch) => (epoch ? new Date(epoch * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
  const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
  const card = (title, wide) => { const c = pc(title, wide); c.classList.add('set'); if (S.fresh) c.classList.add('rise'); return c; };

  function draw() {
    const P = $('panel'); P.innerHTML = '';
    if (!S.cfg) { card('Settings', true).append(E('p', '', 'Getting your settings…')); return; }
    const st = S.st || {}, locked = st.locked !== false;
    if (looks) {
      const L = looks(); let c0 = card('Look', true);
      c0.append(E('div', 'sub', 'How Jarvis looks. It changes straight away; every tab works the same in each. You can also say "Jarvis, change your look to Obsidian".'));
      const g = E('div', 'tiles looks');
      for (const l of L.list) {
        const t = E('button', `tile look${l.id === L.id ? ' on' : ''}`); t.type = 'button'; t.setAttribute('aria-pressed', l.id === L.id);
        const img = E('img'); img.src = `./assets/looks/${l.id}.jpg`; img.alt = ''; t.append(img, E('div', 'nm', l.name), E('div', 'st', l.note));
        t.onclick = () => { if (L.set(l.id)) { set('desk.look', l.id); onLook?.(); } [...g.children].forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); };
        g.append(t);
      }
      const lab = E('button', 'ghost', 'See all three moving (look lab)'); lab.onclick = () => { location.href = './look-lab.html'; };
      const a = E('div', 'acts'); a.append(lab); c0.append(g, line('Interface sounds', sw('desk.tones', true, (v) => { onTones?.(v); return v; }), 'Short soft tones when Jarvis starts listening, needs your yes or hits a problem. Never music.'), a);
    }


    // Lock: who may see and change things
    let c = card('Lock and PIN', true);
    c.append(E('div', 'big', locked ? 'Locked' : `Unlocked · ${Math.max(0, Math.ceil(((st.unlocked_until || 0) - Date.now()) / 60000))} min left`));
    c.append(E('div', 'sub', 'Locked, anyone can ask the time, the weather, prayer times and general questions. Your day, notes, paper and settings need Windows Hello or your Jarvis PIN. Each unlock lasts a set time, then Jarvis locks and clears the chat. It also locks when Windows locks.'));
    { const a = E('div', 'acts');
      const b1 = E('button', locked ? 'solid' : 'ghost', locked ? 'Unlock with Windows Hello' : 'Lock now'); b1.onclick = () => post({ cmd: locked ? 'unlock-hello' : 'lock' });
      const b2 = E('button', 'ghost', st.has_pin ? (locked ? 'Unlock with PIN' : 'Change PIN') : 'Set a PIN'); b2.onclick = () => post({ cmd: 'pin-dialog', change: !locked || !st.has_pin });
      a.append(b1, b2); c.append(a); }
    if (locked) { c.append(E('div', 'sub', 'Unlock to see and change the rest of Settings.')); S.fresh = false; return; }
    c.append(line('Each unlock lasts', num('unlock_minutes', 10, { min: 1, max: 60, int: true }), 'minutes (1 to 60)'));

    // Voice and listening
    c = card('Voice and listening');
    c.append(line('Wake word', text('voice.wake_word', 'jarvis', 'jarvis'), 'Say it first when "Always listening" is on'));
    c.append(line('Always listening', sw('voice.always_listening', false), 'Off = press the circle to talk'));
    c.append(line('Speaking speed', num('voice.rate', 1, { min: 0.6, max: 1.6, step: 0.05 })));
    c.append(line('Language', text('voice.lang', 'en-US', 'en-US'), 'For example en-US, en-GB, en-IN'));
    { const a = E('div', 'acts'), b = E('button', 'ghost', 'Choose a voice'); b.onclick = () => go('voices'); a.append(b); c.append(a); }
    c.append(E('div', 'sub', 'A voice never unlocks Jarvis. Anyone can talk to it; private things still need Windows Hello or the PIN.'));

    // The brain
    c = card('The brain');
    const cl = st.subs?.claude;
    c.append(line('Claude (first choice)', E('small', cl?.ok === false ? 'badc' : 'okc', cl ? (cl.ok === false ? (cl.text || 'not answering') : 'ready') : 'checking…'), 'Uses your own Claude Code sign-in'));
    const lo = st.local || {};
    c.append(line('Qwen on this PC (backup)', sw('models.local.enabled', true), lo.running ? (lo.hasModel === false ? 'Running, but the model is not downloaded yet' : 'Ready. Answers when Claude is busy or the internet is down') : 'Not running. Ask Claude Code to install Ollama and Qwen (free)'));
    c.append(line('Qwen model', text('models.local.model', 'qwen3.5:4b-q4_K_M', 'qwen3.5:4b-q4_K_M')));
    c.append(line('Try Qwen first for quick questions', sw('models.local.offline_first', false), 'Faster for small things; Claude still handles the rest'));

    // The paper
    c = card('Your morning paper');
    c.append(line('Name', text('paper_name', 'The Morning Times')));
    c.append(line('Build it at', text('build_time', '05:45', '05:45'), 'Changing this? Ask Claude Code to update the morning job too'));
    c.append(line('Print it every morning', sw('print_paper', true)));
    c.append(line('Printer', text('printer', '', 'exact name from Windows')));
    c.append(line('Both sides', sw('duplex', true), 'Only if the printer can print both sides by itself'));
    { const a = E('div', 'acts'), b = E('button', 'ghost', 'Open the Print tab'); b.onclick = () => go('print'); a.append(b); c.append(a); }

    // Home, TV and car (each optional)
    c = card('Home, TV and car');
    c.append(line('Home Assistant address', text('home_assistant.url', '', 'http://homeassistant.local:8123'), 'Optional. The access token goes in me\\ha-token.txt, never here'));
    c.append(line('TV name', text('tv.name', '', 'Living room TV')));
    c.append(line('Roku TV address', text('tv.roku_ip', '', '192.168.1.50'), 'Optional. Lets the TV tab work as a remote'));
    c.append(line('Car name', text('car.name', '', 'My car')));
    c.append(line('Car colour', text('car.color', '#7c8288', '#7c8288'), 'Shown in the Car tab'));

    // What's working
    c = card("What's working", true);
    c.append(line('Paper printer', E('small', st.printer?.ok === false ? 'badc' : '', st.printer?.name ? `${st.printer.name}${st.printer.text ? ' · ' + st.printer.text : ''}` : 'not set up yet')));
    c.append(line('Last paper', E('small', '', st.paper?.last || 'none yet')));
    c.append(line('Daily jobs', E('small', '', (st.jobs || []).length ? st.jobs.join(' · ') : 'none added yet (ask Claude Code)')));
    c.append(line('Smart home', E('small', '', st.home || 'not connected')));
    S.fresh = false;
  }

  return {
    open() { S.fresh = true; post({ cmd: 'settings-get' }); post({ cmd: 'settings-status' }); },
    draw,
    settings(o) { S.cfg = o || {}; if (!editing()) draw(); },
    status(o) { S.st = o || {}; if (!editing()) draw(); },
    fajr() {}, cameras() {},
  };
}
