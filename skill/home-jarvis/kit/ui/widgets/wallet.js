// Data: hub.money_view (bin/desk-data → desktop/money_reader.py), already masked to the last 4 digits.
// Drawn only with the widget frame's own classes (wg-big, wg-r, wg-li, wg-note), so it follows every look.
const usd = (n) => (typeof n === 'number' && isFinite(n) ? (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const WALLET_ICON = '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>';

export function walletData(d) {
  if (!d) return null;
  if (d.v === 1 && (d.kind === 'wallet' || d.kind === 'money_view')) return d;
  return d.hub && d.hub.money_view ? d.hub.money_view : null; // the desk hub file
}

export function renderWallet(el, d, { h, row, empty }) {
  const m = walletData(d);
  if (!m) return empty(el, d && d.failed && d.failed.hub ? 'Could not read the money just now.' : 'Loading…');
  const t = m.totals || {};
  el.append(h('div', 'wg-sub', `${m.month_name || m.month} · net`));
  el.append(h('div', 'wg-big', usd(t.net)));
  el.append(row('Came in', usd(t.in)), row('Went out', usd(t.out)));
  const biz = (m.by_business || []).filter((b) => b.in || b.out);
  if (biz.length) {
    el.append(h('div', 'wg-note', 'By business (in · out)'));
    for (const b of biz) el.append(row(b.business, `${usd(b.in)} · ${usd(b.out)}`));
  }
  const wait = m.waiting_ok || [];
  if (wait.length) {
    el.append(h('div', 'wg-note', 'Waiting for your OK on the payments page'));
    for (const w of wait.slice(0, 4)) { const li = h('div', 'wg-li'); li.append(h('b', '', usd(w.amount)), h('span', '', `${w.who || ''}${w.invoice ? ` · invoice ${w.invoice}` : ''}`)); el.append(li); }
  }
  const due = m.due_week || {}; const soon = [...(due.bills || []), ...(due.tickets || [])].slice(0, 5);
  if (soon.length) {
    el.append(h('div', 'wg-note', 'Due soon'));
    for (const b of soon) { const li = h('div', 'wg-li'); li.append(h('b', '', b.when || ''), h('span', '', `${b.what || ''} ${b.amount || ''}`.trim())); el.append(li); }
  }
  const acc = (m.accounts || {}).balances;
  if (acc && (acc.accounts || []).length) {
    el.append(h('div', 'wg-note', `Accounts (as of ${String(acc.updated || '').replace('T', ' ')})`));
    for (const a of acc.accounts.slice(0, 6)) el.append(row(`${a.name || ''}${a.last4 ? ` ••••${a.last4}` : ''}`, usd(a.balance)));
  }
  const i = m.interest || {};
  if (i.earned || i.paid) el.append(row('Interest this year', `${usd(i.earned)} in · ${usd(i.paid)} out`));
  else if ((i.lenders || []).length) el.append(h('div', 'wg-note', `${i.lenders.length} lender${i.lenders.length > 1 ? 's' : ''} paid this year (${i.lenders[0].who}…). ${i.lenders_note || ''}`));
  const z = m.zakat || {};
  if (z.year) el.append(h('div', 'wg-note', `For zakat: ${z.year} so far ${usd(z.came_in)} in, ${usd(z.went_out)} out. ${z.balances == null ? 'Balances show once you connect your accounts.' : `Cash held ${usd(z.balances)}${z.investments != null ? `, investments ${usd(z.investments)}` : ''}.`}`));
  el.append(h('div', 'wg-note', 'Look only. Jarvis never pays or moves money.'));
}
