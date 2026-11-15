// and its tools in three groups: free to read, needs your yes, never. "Add a connection" saves a new https address
// switched OFF. The list itself comes from desktop/connections.mjs through widget-data.mjs.
export function createConnections({ ask }) {
  let list = null, loading = false, err = '', open = {};
  const load = (redraw) => {
    if (loading) return; loading = true;
    ask({ op: 'connections' }).then((r) => { loading = false; if (r && r.ok) { list = r.connections || []; err = ''; } else err = (r && r.error) || 'Could not read the list.'; redraw(); });
  };
  const ago = (iso) => { if (!iso) return ''; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const VIA = { claude: 'through your Claude sign-in', mac: 'on this PC', direct: 'direct' };

  /** Draws the card. `card`, `E`, `line`, `set` are Settings' own helpers so it looks like every other card. */
  return function draw({ card, E, set, redraw }) {
    const c = card('Connections', true);
    c.append(E('div', 'sub', 'Where Jarvis can look. Reads are free; anything that changes something needs your yes; sending, deleting, paying and sharing are never done by Jarvis.'));
    if (!list) { c.append(E('p', '', err || 'Getting the list…')); load(redraw); return; }
    for (const x of list) {
      const r = E('div', `rw${x.lastError ? ' bad' : ''}`); const l = E('span'); l.append(x.name);
      const how = [VIA[x.via] || x.via, x.direct ? 'works without Claude' : '', x.lastError ? `last problem ${ago(x.lastError.at)}: ${x.lastError.message}` : x.lastOk ? `worked ${ago(x.lastOk)}` : ''].filter(Boolean).join(' · ');
      l.append(E('small', 'blk', how));
      const s = E('button', 'sw'); s.append(E('i')); s.setAttribute('role', 'switch'); s.setAttribute('aria-checked', x.on); s.setAttribute('aria-label', `${x.name} on or off`);
      s.onclick = () => { x.on = !x.on; s.setAttribute('aria-checked', x.on); set(`connections.${x.id}.on`, x.on); };
      const more = E('button', 'ghost', open[x.id] ? 'Hide tools' : 'Tools'); more.onclick = () => { open[x.id] = !open[x.id]; redraw(); };
      const right = E('div', 'acts segw'); right.append(more, s); r.append(l, right); c.append(r);
      if (open[x.id]) for (const [k, label] of [['read', 'Free to read'], ['yes', 'Needs your yes'], ['denied', 'Never']]) {
        const g = x.groups[k] || []; if (g.length) c.append(E('div', 'sub', `${label}: ${g.map((t) => t.replace(/^clickup_/, '').replace(/_/g, ' ')).join(', ')}`));
      }
    }
    // Add a connection: a short name and its https address. It starts switched off.
    const w = E('div', 'rw'); const nm = E('input', 'fld'); nm.placeholder = 'Name'; nm.spellcheck = false;
    const url = E('input', 'fld wide'); url.placeholder = 'https://… (its MCP address)'; url.spellcheck = false; url.type = 'url';
    const add = E('button', 'ghost', 'Add a connection'); const msg = E('small', '', '');
    add.onclick = () => {
      add.disabled = true;
      ask({ op: 'connection-add', id: nm.value.trim(), name: nm.value.trim(), url: url.value.trim() }).then((r) => {
        add.disabled = false; if (r && r.ok) { list = null; redraw(); } else msg.textContent = (r && r.error) || 'That did not work.';
      });
    };
    const box = E('div', 'acts segw'); box.append(nm, url, add); w.append(E('span', '', 'New (starts off)'), box); c.append(w, msg);
  };
}
