// Inbox (recent texts and client messages, read only) and Agents (Jarvis jobs and which engine runs them).
// Data comes from the hub page (bin/desk-data -> hub.messages / hub.inbox / hub.agents). Nothing here sends anything by itself:
// Yes and No post the same { cmd: 'yes' } / { cmd: 'no' } the on-screen confirmation card posts.
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const P6_ICONS = {
  messages: SVG('<path d="M4 5.500h16a1.500 1.500 0 0 1 1.500 1.500v9a1.500 1.500 0 0 1-1.500 1.500H10l-4.500 3.500v-3.500H4A1.500 1.500 0 0 1 2.500 16V7A1.500 1.500 0 0 1 4 5.500z"/><path d="M7 10h10M7 13.500h6"/>'),
  inbox: SVG('<path d="M3 13.500l2.500-7.500a2 2 0 0 1 1.900-1.400h9.200a2 2 0 0 1 1.900 1.400L21 13.500V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13.500h5l1 2.500h6l1-2.500h5"/>'),
  agents: SVG('<rect x="6" y="8" width="12" height="10" rx="2.500"/><path d="M12 8V4.500M9.500 12.500v1M14.500 12.500v1M3.500 12.500v3M20.500 12.500v3"/><circle cx="12" cy="4" r="1"/>'),
};

const STALE_MS = 5 * 60 * 1000; // the hub page refreshes every 3 minutes; older than this and the card must not offer a yes
const CHANNELS = { imessage: 'Text', whatsapp: 'WhatsApp', email: 'Email' };

// ---- pure helpers (tested in desktop/tests/p6-widgets.test.mjs) ----
export const stageWords = (stage) => (stage === 'drafted' ? 'Needs 2 yeses' : stage === 'first_yes' ? '1 more yes' : '');
export const channelWords = (c) => CHANNELS[c] || String(c || '');
// Same defaults as engine_line() in bin/job: old jobs without these fields read as Claude's usual setup.
export const engineLine = (j) => `${(j && j.engine) || 'claude'} / ${(j && j.model) || 'sonnet'} / ${(j && j.effort) || 'default'} effort`;
// The yes buttons only work on a fresh reading whose message has not expired.
export function canAnswer(pending, hubUpdated, nowMs = Date.now()) {
  if (!pending || !stageWords(pending.stage)) return false;
  const upd = Date.parse(hubUpdated || ''); if (!(nowMs - upd <= STALE_MS)) return false;
  return !(pending.expires && pending.expires * 1000 <= nowMs);
}
export const rowsOf = (v, max = 8) => (Array.isArray(v) ? v.slice(0, max) : []);

// ---- tiny DOM helpers (same shapes widgets.js uses) ----
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function row(label, value) { const r = h('div', 'wg-r'); r.append(h('span', '', label), h('span', '', value)); return r; }
const empty = (el, msg) => el.append(h('div', 'wg-sub', msg));
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

let answered = '';

export const P6_WIDGETS = {
  messages: {
    title: 'Messages', tip: 'Messages', sources: ['hub'],
    render(el, d, ctx) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read your messages just now.' : 'Loading…');
      const m = hub.messages || {}; const p = m.pending;
      el.append(row('Sending for real', m.send_live ? 'On' : 'Off'));
      if (!p || !stageWords(p.stage)) { el.append(h('div', 'wg-sep')); return el.append(h('div', 'wg-sub', 'Nothing is waiting for your yes.')); }
      el.append(h('div', 'wg-sep'));
      el.append(h('div', 'wg-big', `${channelWords(p.channel)} to ${p.who}`));
      el.append(h('div', 'wg-sub', `${p.to} · ${stageWords(p.stage)}`));
      if (p.subject) el.append(h('div', 'wg-sub', `Subject: ${p.subject}`));
      el.append(h('div', 'wg-note', `“${p.text}”`));
      const key = `${p.stage}|${p.expires}`; const ok = canAnswer(p, hub.updated);
      const acts = h('div', 'acts'); acts.style.cssText = 'display:flex;gap:8px;margin-top:10px';
      const yes = h('button', 'solid', 'Yes'), no = h('button', 'ghost', 'No'); yes.type = no.type = 'button';
      if (!ok || answered === key) { yes.disabled = no.disabled = true; }
      const send = (cmd) => { answered = key; yes.disabled = no.disabled = true; try { ctx.post({ cmd }); } catch {} note.textContent = cmd === 'yes' ? 'Your yes was sent. The confirmation card shows what happens next.' : 'Cancelled.'; };
      yes.onclick = () => send('yes'); no.onclick = () => send('no');
      acts.append(yes, no); el.append(acts);
      const note = h('div', 'wg-note wg-warn', answered === key ? 'You already answered this one.' : ok ? '' : 'This may be out of date. Use the confirmation card to answer.');
      el.append(note);
    },
  },
  inbox: {
    title: 'Inbox', tip: 'Inbox', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read your inbox just now.' : 'Loading…');
      const ib = hub.inbox || {}; const texts = rowsOf(ib.texts), cl = rowsOf(ib.clients);
      el.append(h('div', 'wg-sub', 'Texts'));
      if (ib.texts_why) el.append(h('div', 'wg-note wg-warn', ib.texts_why));
      else if (!texts.length) empty(el, 'No recent texts.');
      for (const t of texts) { const li = h('div', 'wg-li'); li.append(h('b', '', t.dir === 'sent' ? 'to' : 'from'), h('span', '', `${t.who}: ${clip(t.text, 110)}`)); el.append(li); }
      el.append(h('div', 'wg-sep'), h('div', 'wg-sub', 'Client messages'));
      if (!cl.length) empty(el, 'No client messages.');
      for (const m of cl) { const li = h('div', 'wg-li'); li.append(h('b', '', m.app || ''), h('span', '', `${m.who}: ${clip(m.text, 110)}`)); el.append(li); }
    },
  },
  agents: {
    title: 'Agents', tip: 'Agents', sources: ['hub'],
    render(el, d) {
      const hub = d.hub; if (!hub) return empty(el, d.failed.hub ? 'Could not read the jobs just now.' : 'Loading…');
      const jobs = rowsOf(hub.agents, 10); if (!jobs.length) return empty(el, 'No Jarvis jobs yet.');
      for (const j of jobs) { el.append(row(`${j.project || j.id}`, j.state)); el.append(h('div', 'wg-sub wg-clip', `${j.id} · ${engineLine(j)}`)); }
    },
  },
};
