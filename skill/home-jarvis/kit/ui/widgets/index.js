// Clicks go back to the Mac as { cmd:'widget-data', rid, req } and the answer returns through jarvis.widgetData(rid, answer).
import { CSS } from './style.js';
import { h, item, head, none, button, yesButton, money, text, fmtDate, fmtWhen, fmtTime, safeImg, plural, join } from './util.js';
import { lockedFrame } from './frame.js';

const EXTRA = `.wb-frame{display:block;width:100%;height:440px;border:0;border-radius:10px;background:#fff}
.wg-full .wb-frame{height:calc(100vh - 170px)}
.wb-big{display:block;width:100%;max-height:60vh;object-fit:contain;border-radius:10px;margin-top:8px}
.wb-tot{font-size:1.5em;font-weight:800;font-variant-numeric:tabular-nums;margin:2px 0 4px}
.wb-say{color:var(--a);font-weight:700;margin-top:10px}`;

export const BIZ_KINDS = ['gallery', 'money', 'invoices', 'contracts', 'schedule', 'team', 'content', 'leads', 'brain', 'sites', 'search', 'draft', 'app'];

// ---------- one renderer per card kind: (el, data, api) ----------
const R = {
  gallery(el, d, api) {
    if (d.gallery) return photos(el, d, api);
    if (d.note) none(el, d.note);
    const list = d.galleries || [];
    if (!list.length) return d.note ? null : none(el, 'No galleries yet.');
    for (const g of list) {
      const r = h('button', 'wb-row'); r.type = 'button';
      const src = safeImg(g.cover); if (src) { const im = h('img', 'wb-th'); im.decoding = 'async'; im.alt = ''; im.src = src; r.append(im); } // no lazy loading: inside the floating cards the Mac app's WebKit never started most of them (13 Nov)
      const box = h('div'); item(box, { title: text(g.name), right: g.photo_count != null ? plural(g.photo_count, 'photo') : '', sub: join(text(g.client), fmtDate(g.event_date), text(g.status)) });
      r.append(box); r.addEventListener('click', () => api.load({ op: 'gallery', id: g.id }, r)); el.append(r);
    }
    acts(el, [screenBtn(api)]);
  },
  money(el, d) {
    if (d.in) { head(el, `Came in${d.in.period ? ' · ' + text(d.in.period).replace(/_/g, ' ') : ' this month'}`); el.append(h('div', 'wb-tot', money(d.in.total)));
      for (const p of (d.in.items || []).slice(0, 6)) item(el, { title: text(p.who) || 'Payment', right: money(p.amount), sub: join(fmtDate(p.date), text(p.method)) }); }
    if (d.due) { head(el, 'Owed to you'); el.append(h('div', 'wb-tot', money(d.due.total)));
      for (const r of (d.due.items || []).slice(0, 8)) item(el, { title: text(r.who) || 'Client', right: money(r.amount), warn: r.late, sub: join(r.late ? 'Late' : 'Due', fmtDate(r.due), text(r.invoice)) }); }
    if (d.confirm && d.confirm.length) { head(el, 'Waiting for your OK');
      for (const s of d.confirm.slice(0, 6)) item(el, { title: text(s.who) || 'Payment', right: money(s.amount), sub: text(s.why) }); }
    if (!d.in && !d.due && !(d.confirm || []).length) none(el, 'No money figures came back.');
  },
  invoices(el, d) {
    const s = d.summary || {}; const keys = Object.keys(s);
    if (keys.length) { head(el, 'This year'); for (const k of keys.slice(0, 6)) item(el, { title: k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()), right: /count|number/i.test(k) ? String(s[k]) : money(s[k]) }); }
    list(el, d.items, 'Invoices', (i) => ({ title: join(text(i.number), text(i.client)) || 'Invoice', right: money(i.amount), warn: /overdue|late/i.test(i.status), sub: join(text(i.status), i.due ? 'due ' + fmtDate(i.due) : '') }), !keys.length);
  },
  contracts(el, d) { list(el, d.items, '', (c) => ({ title: text(c.client) || text(c.title) || 'Contract', right: text(c.status), sub: join(text(c.title), fmtDate(c.date)) }), true); },
  schedule(el, d) {
    if (!(d.days || []).length) return none(el, 'Nothing on the schedule.');
    for (const day of d.days.slice(0, 10)) { head(el, /^\d{4}-/.test(day.date) ? fmtDate(day.date) : text(day.date));
      for (const e of day.items.slice(0, 12)) item(el, { title: text(e.title) || 'Booking', right: e.time ? fmtTime(e.time) : '', sub: join(text(e.where), text(e.who)) }); }
  },
  team(el, d) { list(el, d.items, '', (t) => ({ title: text(t.title) || 'Task', right: t.due ? fmtDate(t.due) : '', warn: t.late, sub: join(text(t.who), text(t.status), t.late ? 'Late' : '') }), true); },
  content(el, d) { list(el, d.items, '', (p) => ({ title: text(p.title) || 'Post', right: p.date ? fmtDate(p.date) : '', warn: p.needs_approval, sub: join(text(p.platform), text(p.status), p.needs_approval ? 'Needs your OK' : '') }), true); },
  leads(el, d) { list(el, d.items, '', (l) => ({ title: text(l.name) || 'Lead', right: l.date ? fmtDate(l.date) : '', sub: join(text(l.source), text(l.status), text(l.note)) }), true); },
  brain(el, d) {
    if (d.query) el.append(h('div', 'wg-sub', `Company Brain · "${text(d.query)}"`));
    list(el, d.items, '', (x) => ({ title: text(x.title) || 'Note', sub: text(x.snippet), lines: 4 }), true);
  },
  sites(el, d) { list(el, d.items, '', (s) => ({ title: text(s.name), right: s.up === true ? 'up' : s.up === false ? 'DOWN' : '–', warn: s.up === false, sub: join(text(s.url).replace(/^https:\/\//, ''), s.last_deploy ? 'deployed ' + fmtWhen(s.last_deploy) : '') }), true); },
  search(el, d) {
    if (!(d.groups || []).length) return none(el, `Nothing found for "${text(d.query)}".`);
    for (const g of d.groups) { head(el, text(g.source)); for (const x of (g.items || []).slice(0, 8)) item(el, { title: text(x.title) || '–', sub: text(x.sub || x.path || x.snippet) }); }
  },
  draft(el, d, api) {
    el.append(h('div', 'wg-sub', `${d.type === 'contract' ? 'Contract' : 'Invoice'} draft for ${text(d.client && d.client.name)}. Nothing is created or sent from here without you.`));
    for (const l of d.lines || []) item(el, { title: `${l.qty > 1 ? l.qty + ' × ' : ''}${text(l.item)}`, right: l.price == null ? 'no price' : money(l.price * (l.qty || 1)), warn: l.price == null, sub: l.price == null ? "No price on file: I won't guess" : text(l.source) });
    head(el, 'Total'); el.append(h('div', 'wb-tot', d.total == null ? 'Not complete' : money(d.total)));
    if ((d.missing || []).length) { head(el, 'Before it can be created'); for (const m of d.missing) item(el, { title: text(m), warn: true }); }
    const out = h('div', 'wb-say'); const say = (r) => { out.textContent = r && (r.say || r.error) ? text(r.say || r.error) : 'Something went wrong.'; };
    const btns = [];
    if ((api.actions || []).some((a) => a.id === 'create')) btns.push(yesButton('Create it', true, async (b) => { b.disabled = true; const r = await api.ask({ op: 'create', token: d.token }); say(r); if (!r.ok) b.disabled = false; }, 'Sure? Create it (not sent)'));
    const pdf = button('Save as PDF'); pdf.addEventListener('click', async () => { pdf.disabled = true; say(await api.ask({ op: 'pdf', token: d.token })); pdf.disabled = false; }); btns.push(pdf);
    acts(el, btns); el.append(out);
  },
  app(el, d, api) {
    if (!d.html) return none(el, 'No screen came back.');
    const fr = lockedFrame(d.html, { ask: api.ask, start: d.start }); el.append(fr.el); return fr.stop;
  },
};

function list(el, items, label, map, emptyMsg) {
  if (label) head(el, label);
  if (!(items || []).length) { if (emptyMsg) none(el); return; }
  for (const x of items.slice(0, 30)) item(el, map(x));
}
function acts(el, btns) { const a = h('div', 'wb-acts'); for (const b of btns.filter(Boolean)) a.append(b); if (a.children.length) el.append(a); }
function screenBtn(api, label) { const b = button(label || 'Open it'); b.addEventListener('click', () => api.load({ op: 'screen', tool: 'show_galleries' }, b)); return b; }
function photos(el, d, api) {
  const g = d.gallery || {};
  const count = g.photo_count != null ? g.photo_count : (d.photos || []).length;
  el.append(h('div', 'wg-sub', join(text(g.client), fmtDate(g.event_date), text(g.status), plural(count, 'photo'))));
  if (!(d.photos || []).length) {
    const src = safeImg(g.cover); if (src) { const big = h('img', 'wb-big'); big.src = src; big.alt = text(g.name); el.append(big); }
    acts(el, [screenBtn(api, count ? `See all ${plural(count, 'photo')}` : 'Open it')]); return;
  }
  const grid = h('div', 'wb-grid');
  for (const p of d.photos.slice(0, 120)) {
    const src = safeImg(p.thumb) || safeImg(p.url); if (!src) continue;
    const b = h('button', 'wb-ph'); b.type = 'button'; b.setAttribute('aria-label', text(p.name) || 'Photo');
    const im = h('img'); im.decoding = 'async'; im.alt = ''; im.src = src; b.append(im); // loads straight away, same reason as the covers
    b.addEventListener('click', () => { // one photo large, with a way back
      el.textContent = ''; const back = h('button', 'wb-back', '‹ All photos'); back.type = 'button';
      back.addEventListener('click', () => { el.textContent = ''; photos(el, d, api); }); const big = h('img', 'wb-big'); big.src = safeImg(p.url) || src; big.alt = text(p.name);
      el.append(back, big); back.focus();
    });
    grid.append(b);
  }
  el.append(grid);
}

/** Wire the cards into the widget frame. Returns { show(ev), data(rid, answer), ask(req) }. */
export function installBusiness(widgets, { post }) {
  if (!document.getElementById('biz-css')) { const st = document.createElement('style'); st.id = 'biz-css'; st.textContent = CSS + EXTRA; document.head.append(st); }
  const waiting = new Map(); const bodies = new Map(); let seq = 0;
  const ask = (req) => new Promise((res) => {
    const rid = `w${++seq}`; waiting.set(rid, res); post({ cmd: 'widget-data', rid, req });
    setTimeout(() => { if (waiting.has(rid)) { waiting.delete(rid); res({ ok: false, error: 'That took too long. Try again in a moment.' }); } }, 25000);
  });
  function draw(id, ev) {
    const b = bodies.get(id); if (!b) return;
    try { b.stop && b.stop(); } catch {}
    b.stop = null; b.el.textContent = ''; b.ev = ev;
    const d = ev.data && typeof ev.data === 'object' ? ev.data : {};
    if (d.error) { none(b.el, text(d.error)); return; }
    const api = { ask, actions: Array.isArray(ev.actions) ? ev.actions : [],
      load: async (req, btn) => { if (btn) btn.disabled = true; const r = await ask(req); if (btn) btn.disabled = false;
        if (r && r.ok && r.widget) show(r.widget); else if (r && r.error) { b.el.prepend(h('div', 'wb-say', text(r.error))); } } };
    try { const stop = R[ev.kind](b.el, d, api); if (typeof stop === 'function') b.stop = stop; } catch { b.el.textContent = ''; none(b.el, 'This card could not draw just now.'); }
  }
  function show(ev) {
    if (!ev || !BIZ_KINDS.includes(ev.kind)) return false;
    const id = `biz-${String(ev.id || ev.kind).replace(/[^\w-]/g, '').slice(0, 60)}`;
    const have = bodies.get(id);
    if (have && have.el.isConnected) { widgets.open('custom', { id }); draw(id, ev); return id; }
    // On a phone-sized screen one card at a time: the new one takes the screen, the last one closes.
    if (innerWidth < 600) for (const other of [...bodies.keys()]) if (other !== id) widgets.close(other);
    const opened = widgets.open('custom', { id, title: text(ev.title || ev.kind).slice(0, 60),
      render: (el) => { bodies.set(id, { el, ev, stop: null }); draw(id, ev); return () => { const b = bodies.get(id); try { b && b.stop && b.stop(); } catch {} bodies.delete(id); }; } });
    // On a phone-sized screen (the iPhone app shows this same page) the card fills the stage instead of docking.
    if (innerWidth < 600) setTimeout(() => { const b = bodies.get(id); const full = b && b.el.closest('.wg') && b.el.closest('.wg').querySelector('[aria-label="Fill the stage"]'); if (full) full.click(); }, 60);
    return opened;
  }
  function data(rid, answer) { const f = waiting.get(rid); if (f) { waiting.delete(rid); f(answer && typeof answer === 'object' ? answer : { ok: false, error: 'No answer came back.' }); } }
  return { show, data, ask };
}
