// edits are stored in notes/brain/knowledge.json and win over everything else in Jarvis's memory search.
// dictation map (heard -> meant). Same knowledge-set channel: refresh, keep, forget, edit, map-set, map-del.
export function createKnowledge({ $, E, pc, post }) {
  const K = { data: null, hits: null, q: '', editing: '', showHidden: false, fresh: true, refreshing: false, forget: '', mapEdit: null };
  const editing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  const card = (title, wide) => { const c = pc(title, wide); c.classList.add('set'); if (K.fresh) c.classList.add('rise'); return c; };
  const change = (ch) => post({ cmd: 'knowledge-set', change: ch });

  function factRow(f) {
    const r = E('div', 'rw');
    if (f.hidden) r.style.opacity = '.45';
    const l = E('span');
    if (K.editing === f.id) {
      const t = E('textarea', 'fld'); t.value = f.text; t.rows = 3; l.append(t);
      const save = E('button', 'solid', 'Save'), cancel = E('button', 'ghost', 'Cancel');
      save.onclick = () => { K.editing = ''; change({ op: 'edit', id: f.id, text: t.value }); };
      cancel.onclick = () => { K.editing = ''; draw(); };
      const a = E('div', 'acts'); a.append(save, cancel); r.append(l, a); setTimeout(() => t.focus(), 0); return r;
    }
    l.append(`${f.flagged ? '⚑ ' : ''}${f.text}`);
    l.append(E('small', 'blk', `${f.edited ? 'Your words' : f.source}${f.date ? ` · ${f.date}` : ''}${f.hidden ? ' · hidden from Jarvis' : ''}${f.private ? ' · private, stays on this PC' : ''}`));
    const a = E('div', 'acts segw');
    const ed = E('button', 'ghost', 'Edit'); ed.onclick = () => { K.editing = f.id; draw(); };
    const fl = E('button', `ghost${f.flagged ? ' on' : ''}`, f.flagged ? 'Flagged' : 'Flag'); fl.title = 'Mark as wrong or needing a check';
    fl.onclick = () => change({ op: f.flagged ? 'unflag' : 'flag', id: f.id });
    const hd = E('button', 'ghost', f.hidden ? 'Show' : 'Hide'); hd.title = f.hidden ? 'Let Jarvis use this again' : 'Jarvis stops using this';
    hd.onclick = () => change({ op: f.hidden ? 'unhide' : 'hide', id: f.id });
    a.append(ed, fl, hd); r.append(l, a); return r;
  }

  function learnedRow(f) {
    const r = E('div', 'rw'), l = E('span');
    if (K.editing === f.id) {
      const t = E('textarea', 'fld'); t.value = f.text; t.rows = 3; l.append(t);
      const save = E('button', 'solid', 'Save'), cancel = E('button', 'ghost', 'Cancel');
      save.onclick = () => { K.editing = ''; change({ op: 'edit', id: f.id, text: t.value }); };
      cancel.onclick = () => { K.editing = ''; draw(); };
      const a = E('div', 'acts'); a.append(save, cancel); r.append(l, a); setTimeout(() => t.focus(), 0); return r;
    }
    l.append(f.text);
    l.append(E('small', 'blk', [f.section, f.source, f.date].filter(Boolean).join(' · ') + (f.private ? ' · private, stays on this PC' : '')));
    const a = E('div', 'acts segw');
    if (K.forget === f.id) {
      const yes = E('button', 'solid', 'Yes'), no = E('button', 'ghost', 'No');
      yes.onclick = () => { K.forget = ''; change({ op: 'forget', id: f.id }); };
      no.onclick = () => { K.forget = ''; draw(); };
      a.append(E('small', '', 'Forget this for good?'), yes, no); r.append(l, a); return r;
    }
    if (f.status === 'kept') a.append(E('small', '', 'Kept'));
    else { const kp = E('button', 'solid', 'Keep'); kp.title = 'Jarvis keeps this and uses it'; kp.onclick = () => change({ op: 'keep', id: f.id }); a.append(kp); }
    const fx = E('button', 'ghost', 'Fix'); fx.title = 'Correct the wording, then Jarvis keeps it'; fx.onclick = () => { K.editing = f.id; draw(); };
    const fg = E('button', 'ghost', 'Forget'); fg.title = 'Jarvis drops this for good'; fg.onclick = () => { K.forget = f.id; draw(); };
    a.append(fx, fg); r.append(l, a); return r;
  }

  const kindPick = (kind) => {
    const s = E('select', 'fld');
    for (const k of [...new Set(['name', 'phrase', kind || 'name'])]) { const o = E('option', '', k); o.value = k; s.append(o); }
    s.value = kind || 'name'; return s;
  };
  const mapSet = (old, heard, meant, kind) => {
    heard = heard.trim(); meant = meant.trim(); if (!heard || !meant) return;
    K.mapEdit = null;
    if (old && old !== heard) change({ op: 'map-del', heard: old });
    change({ op: 'map-set', heard, meant, kind });
  };
  function mapRow(m) {
    const r = E('div', 'rw'), l = E('span');
    if (K.mapEdit === m.heard) {
      const h = E('input', 'fld'), t = E('input', 'fld'), k = kindPick(m.kind);
      h.value = m.heard; h.placeholder = 'Heard'; t.value = m.meant; t.placeholder = 'Meant';
      const la = E('div', 'acts'); la.append(h, t, k); l.append(la);
      const save = E('button', 'solid', 'Save'), cancel = E('button', 'ghost', 'Cancel');
      const go = () => mapSet(m.heard, h.value, t.value, k.value);
      save.onclick = go; h.onkeydown = t.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      cancel.onclick = () => { K.mapEdit = null; draw(); };
      const a = E('div', 'acts'); a.append(save, cancel); r.append(l, a); setTimeout(() => t.focus(), 0); return r;
    }
    l.append(`${m.heard} → ${m.meant}`);
    l.append(E('small', 'blk', [m.kind, m.source, m.date].filter(Boolean).join(' · ')));
    const a = E('div', 'acts segw');
    const ed = E('button', 'ghost', 'Edit'); ed.onclick = () => { K.mapEdit = m.heard; draw(); };
    const rm = E('button', 'ghost', 'Remove'); rm.title = 'Jarvis stops changing this word';
    rm.onclick = () => change({ op: 'map-del', heard: m.heard });
    a.append(ed, rm); r.append(l, a); return r;
  }

  function draw() {
    const P = $('panel'); P.innerHTML = '';
    const d = K.data;
    // Search
    let c = card('Search what Jarvis knows', true);
    const row = E('div', 'acts'), box = E('input', 'fld wide');
    box.placeholder = 'family, work, gym, goals…'; box.value = K.q; box.style.width = 'min(100%,420px)';
    const go = E('button', 'solid', 'Search');
    const run = () => { K.q = box.value.trim(); if (K.q) { K.hits = 'busy'; post({ cmd: 'knowledge-search', q: K.q }); draw(); } };
    go.onclick = run; box.onkeydown = (e) => { if (e.key === 'Enter') run(); };
    row.append(box, go); c.append(row);
    if (K.hits === 'busy') c.append(E('div', 'sub', 'Searching…'));
    else if (Array.isArray(K.hits)) {
      if (!K.hits.length) c.append(E('div', 'sub', 'Nothing found. Try fewer or different words.'));
      for (const h of K.hits) {
        const r = E('div', 'rw'), l = E('span'); l.append(h.title || h.path);
        l.append(E('small', 'blk', `${h.source === 'knowledge' ? 'Knowledge (your facts)' : h.source} · ${(h.snippet || '').replace(/[[\]]/g, '')}`));
        r.append(l); c.append(r);
      }
    }
    if (!d) { card('Knowledge', true).append(E('div', 'sub', 'Loading what Jarvis knows…')); K.fresh = false; return; }
    const st = d.stats || {};
    const names = { knowledge: 'Your facts', notes: 'Jarvis notes', brain: 'Project brain', repo: 'Jarvis files', vault: 'Your notes', sessions: 'Claude chats', calls: 'Calls and desk talks' };
    // Learned this week
    c = card('Learned this week', true);
    const learned = d.learned || [];
    if (!learned.length) c.append(E('div', 'sub', 'Nothing new this week. Jarvis adds what he learns here each night once nightly learning is on.'));
    else c.append(E('div', 'sub', 'New things Jarvis picked up. He only uses one after you keep it.'));
    for (const f of learned) c.append(learnedRow(f));
    // Sources (with the memory numbers)
    c = card('Sources', true);
    c.append(E('div', 'big', `${(st.docs || 0).toLocaleString()} documents`));
    c.append(E('div', 'sub', `Last refresh ${st.indexed || 'never'} · ${(st.chunks || 0).toLocaleString()} passages${d.private_count ? ` · ${d.private_count.toLocaleString()} private facts stay on this Mac` : ''}`));
    for (const s of d.sources || []) {
      const r = E('div', 'rw'), l = E('span'); l.append(s.name || s.id);
      l.append(E('small', 'blk', [s.where, s.state, s.note].filter(Boolean).join(' · ')));
      if (s.id === 'chatgpt' && s.state === 'waiting for you') l.append(E('small', 'blk', 'Ask Claude Code to import it.'));
      r.append(l, E('small', '', `last pulled ${s.last_pulled || 'never'}`)); c.append(r);
    }
    const cnt = document.createElement('details'), cs = document.createElement('summary');
    cs.textContent = 'How many documents from each'; cs.style.cssText = 'cursor:pointer;padding:7px 0;font-weight:700'; cnt.append(cs);
    for (const [k, n] of Object.entries(st.by_source || {})) { const r = E('div', 'rw'); r.append(E('span', '', names[k] || k), E('small', '', String(n))); cnt.append(r); }
    c.append(cnt);
    const acts = E('div', 'acts'), rb = E('button', 'ghost', K.refreshing ? 'Refreshing…' : 'Refresh all');
    rb.title = 'Pull the About Me file and every other source again';
    rb.onclick = () => {
      if (K.refreshing) return;
      K.refreshing = true; change({ op: 'refresh' }); post({ cmd: 'memory-refresh' });
      setTimeout(() => { K.refreshing = false; post({ cmd: 'knowledge-get' }); }, 9000); draw();
    };
    const hb = E('button', `ghost${K.showHidden ? ' on' : ''}`, K.showHidden ? 'Hiding nothing' : 'Show hidden facts');
    hb.onclick = () => { K.showHidden = !K.showHidden; draw(); };
    acts.append(rb, hb); c.append(acts);
    // Dictation map
    c = card('How your words are heard', true);
    c.append(E('div', 'sub', `Names are fixed before Jarvis thinks; phrases are hints.${d.map_updated ? ` Last changed ${d.map_updated}.` : ''}`));
    if (!(d.map || []).length) c.append(E('div', 'sub', 'No words yet. Add one below when Jarvis mishears you.'));
    for (const m of d.map || []) c.append(mapRow(m));
    {
      const add = E('div', 'acts'), h = E('input', 'fld'), t = E('input', 'fld'), k = kindPick('name'), ab = E('button', 'ghost', 'Add');
      h.placeholder = 'Heard (what Jarvis wrote)'; t.placeholder = 'Meant (what you said)';
      const go = () => mapSet('', h.value, t.value, k.value);
      ab.onclick = go; h.onkeydown = t.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      add.append(h, t, k, ab); c.append(add);
    }
    // One card per section
    for (const s of d.sections || []) {
      c = card(s.name);
      const facts = s.cards.filter((f) => K.showHidden || !f.hidden);
      if (!facts.length) c.append(E('div', 'sub', s.name === "Jarvis's picture of you" ? 'Jarvis\'s own summary of you. Add what you want him to keep in mind.' : 'Nothing here yet.'));
      for (const f of facts) c.append(factRow(f));
      const add = E('div', 'acts'), t = E('input', 'fld wide'); t.placeholder = 'Add a fact…'; t.style.width = 'min(100%,320px)';
      const ab = E('button', 'ghost', 'Add');
      const doAdd = () => { if (t.value.trim()) change({ op: 'add', section: s.name, text: t.value.trim() }); };
      ab.onclick = doAdd; t.onkeydown = (e) => { if (e.key === 'Enter') doAdd(); };
      add.append(t, ab); c.append(add);
    }
    // Sources
    c = card('Where it comes from', true);
    c.append(E('div', 'sub', 'The newest documents in each source. Secret files (keys, passwords, private documents) are never read.'));
    for (const [src, docs] of Object.entries(d.tree || {})) {
      const det = document.createElement('details'), sum = document.createElement('summary');
      sum.textContent = `${names[src] || src} · ${(st.by_source || {})[src] || docs.length}`; sum.style.cssText = 'cursor:pointer;padding:7px 0;font-weight:700';
      det.append(sum);
      for (const doc of docs) { const r = E('div', 'rw'), l = E('span'); l.append(doc.title || doc.path); l.append(E('small', 'blk', doc.path)); r.append(l, E('small', '', doc.date)); det.append(r); }
      c.append(det);
    }
    K.fresh = false;
  }

  return {
    open() { K.fresh = true; K.hits = null; post({ cmd: 'knowledge-get' }); draw(); },
    draw,
    data(o) {
      if (o && 'hits' in o) K.hits = o.hits; else if (o) K.data = o;
      if (!editing()) draw();
    },
  };
}
