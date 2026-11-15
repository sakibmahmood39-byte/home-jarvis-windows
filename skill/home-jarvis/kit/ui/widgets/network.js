// unshields or changes anything. Data: hub.network (bin/desk-data → bin/netguard_lib.py widget_view()), no hardware ids.
// Drawn only with the widget frame's own classes (wg-big, wg-sub, wg-r, wg-li, wg-note, wg-warn), so it follows every look.
export const NETWORK_ICON = '<path d="M12 3l7.5 3v5.5c0 4.5-3.200 8-7.500 9.500-4.300-1.500-7.500-5-7.500-9.500V6z"/><path d="M9 12l2.200 2.200 3.800-4.200"/>';

export function networkData(d) {
  if (!d) return null;
  if (d.v === 1 && d.kind === 'network') return d;          // pushed straight from the brain
  return d.hub && d.hub.network ? d.hub.network : null;     // the desk hub file
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-11-12 14:03:22" -> { day: "12 Nov", time: "2:03 PM" }; anything else is shown as it came
function nice(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || '')); if (!m) return { day: '', time: String(s || '') };
  const H = +m[4]; return { day: `${+m[3]} ${MON[+m[2] - 1] || ''}`, time: `${H % 12 || 12}:${m[5]} ${H < 12 ? 'AM' : 'PM'}` };
}
const both = (s) => { const t = nice(s); return t.day ? `${t.day}, ${t.time}` : t.time; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function renderNetwork(el, d, { h, row, empty }) {
  const n = networkData(d);
  if (!n) return empty(el, d && d.failed && d.failed.hub ? 'Could not read the network guard just now.' : d && d.hub ? 'The network guard has nothing to show yet.' : 'Loading…');
  const note = (t, warn) => { const e = h('div', 'wg-note' + (warn ? ' wg-warn' : ''), t); el.append(e); return e; };
  const item = (tag, text, warn) => { const li = h('div', 'wg-li'); const s = h('span', warn ? 'wg-warn' : '', text); li.append(h('b', '', tag), s); el.append(li); };

  if (!n.on) {
    el.append(h('div', 'wg-big', 'Guard is off'));
    note('Double-click Turn On Network Guard in Buttons to switch it on.');
    return;
  }
  const open = n.open || [], shields = n.shields || [], watching = n.watching || [], recent = (n.recent || []).slice(0, 4);
  el.append(h('div', 'wg-big' + (open.length ? ' wg-warn' : ''), open.length ? plural(open.length, 'alert', 'alerts') : 'All quiet'));
  el.append(h('div', 'wg-sub', 'Jarvis is watching your home Wi-Fi'));
  if (n.shield_setting === false) note('Shielding is switched off in Settings, so Jarvis only warns.');
  else if (!n.shield_ready) note('Shielding needs one click: Allow Jarvis Shield in Buttons.', true);

  el.append(row('Devices Jarvis knows', String(n.devices ?? 0)), row('Household devices', String(n.household ?? 0)));

  if (watching.length) {
    note('New devices, first look');
    for (const w of watching) item(w.left_min > 0 ? `${w.left_min} min` : 'Soon', `${w.who || 'A new device'} · joined ${w.since || ''}`.replace(/ · joined $/, ''));
  }
  if (open.length) {
    note('Open alerts');
    for (const a of open) {
      const serious = Number(a.level) >= 3;
      item(serious ? 'Attack' : 'Warning', `${a.who || a.ip || 'A device'}: ${a.why || 'unusual activity'}${a.held ? ' · held' : ''}${a.protected ? ` · protecting ${a.protected}` : ''}`, serious);
    }
  }
  if (shields.length) {
    note('Shields in place');
    for (const s of shields) item('Shield', `${s.who && s.who !== s.ip ? `${s.who} (${s.ip})` : s.ip || s.who || ''} · since ${both(s.since)}`);
    note('Undo: Undo Last Shield in Buttons, or text “unshield <ip>”');
  }
  if (recent.length) {
    note('Recently looked into');
    for (const r of recent) item(nice(r.when).day || 'Earlier', `${r.who || 'A device'}: ${r.why || 'unusual activity'}${r.shielded ? ' · shielded' : ''}`, Number(r.level) >= 3);
  }
  if (n.updated) note(`As of ${both(n.updated)}. Look only.`);
}
