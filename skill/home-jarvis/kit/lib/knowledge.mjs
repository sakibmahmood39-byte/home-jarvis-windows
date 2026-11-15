// What Jarvis knows: me/profile.md (one fact per line under "## " headings), plus his own edits, flags and hides
// (me/knowledge-meta.json) and the words Jarvis mishears (me/dictation-map.json). Owner only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { maskSecrets, guestLeaks } from './lock.mjs';

export function createKnowledge(me) {
  const PROFILE = path.join(me, 'profile.md'), META = path.join(me, 'knowledge-meta.json'), MAP = path.join(me, 'dictation-map.json');
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const text = () => { try { return fs.readFileSync(PROFILE, 'utf8'); } catch { return ''; } };
  const idOf = (sec, t) => crypto.createHash('sha1').update(sec + '|' + t).digest('hex').slice(0, 12);
  const looksSecret = (t) => guestLeaks(t) || maskSecrets(t) !== t || /\b(password|passcode|pin|ssn|routing|account number|card number|cvv)\b/i.test(t);

  function sections() {
    const meta = read(META, {}), out = []; let cur = null;
    for (const line of text().split(/\r?\n/)) {
      const h = /^#{2,3}\s+(.+)/.exec(line); if (h) { cur = { name: h[1].trim(), cards: [] }; out.push(cur); continue; }
      const t = line.replace(/^\s*[-*]\s+/, '').trim(); if (!t || !cur || /^<!--|^#/.test(t)) continue;
      const id = idOf(cur.name, t), m = meta[id] || {};
      cur.cards.push({ id, text: m.text || t, source: 'Your profile', date: m.date || '', hidden: !!m.hidden, flagged: !!m.flagged, edited: !!m.text });
    }
    return out;
  }
  function data() {
    const secs = sections(), notes = (() => { try { return fs.readdirSync(path.join(me, 'notes')).length; } catch { return 0; } })();
    const papers = (() => { try { return fs.readdirSync(path.join(me, 'editions')).length; } catch { return 0; } })();
    let when = ''; try { when = fs.statSync(PROFILE).mtime.toISOString().slice(0, 16).replace('T', ' '); } catch {}
    const map = Object.entries(read(MAP, {})).map(([heard, v]) => ({ heard, meant: v.meant, kind: v.kind || 'name' }));
    return {
      sections: secs.length ? secs : [{ name: "Jarvis's picture of you", cards: [] }],
      stats: { docs: 1 + notes + papers, chunks: secs.reduce((n, s) => n + s.cards.length, 0), indexed: when, by_source: { knowledge: secs.reduce((n, s) => n + s.cards.length, 0), notes, papers } },
      sources: [{ id: 'profile', name: 'Your profile', where: 'me\\profile.md', state: 'from your answers', last_pulled: when },
        { id: 'notes', name: 'Jarvis notes', where: 'me\\notes', state: `${notes} files` }, { id: 'papers', name: 'Your papers', where: 'me\\editions', state: `${papers} editions` }],
      learned: [], map, map_updated: '', tree: {},
    };
  }
  function search(q) {
    const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean), hits = [];
    const scan = (title, source, body) => { const low = body.toLowerCase(); if (words.every((w) => low.includes(w))) { const i = low.indexOf(words[0]); hits.push({ title, source, snippet: body.slice(Math.max(0, i - 60), i + 120).replace(/\s+/g, ' ') }); } };
    for (const s of sections()) for (const c of s.cards) if (!c.hidden) scan(s.name, 'knowledge', c.text);
    for (const dir of ['notes', 'editions']) { let fsx = []; try { fsx = fs.readdirSync(path.join(me, dir)); } catch {} for (const f of fsx.slice(-60)) { if (f === 'talk.log') continue; try { scan(f, dir === 'notes' ? 'Jarvis notes' : 'Your papers', fs.readFileSync(path.join(me, dir, f), 'utf8').slice(0, 20000)); } catch {} } }
    return hits.slice(0, 20);
  }
  function change(ch) {
    const meta = read(META, {}), save = () => fs.writeFileSync(META, JSON.stringify(meta, null, 1));
    const t = String(ch.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (ch.op === 'add') {
      if (!t) return 'Type a fact first.'; if (looksSecret(t)) return "That looks like a password or a number to keep private, so I won't save it.";
      let s = text(); const head = `## ${ch.section || 'Facts I added'}`;
      if (!s.includes(head)) s = s.replace(/\s*$/, `\n\n${head}\n`);
      const at = s.indexOf(head) + head.length, next = s.indexOf('\n## ', at);
      s = next === -1 ? s.replace(/\s*$/, '\n') + `- ${t}\n` : s.slice(0, next) + `\n- ${t}` + s.slice(next);
      fs.writeFileSync(PROFILE, s); return '';
    }
    if (ch.op === 'edit') { if (looksSecret(t)) return "That looks private, so I won't save it."; meta[ch.id] = { ...(meta[ch.id] || {}), text: t, date: new Date().toISOString().slice(0, 10) }; save(); return ''; }
    if (['flag', 'unflag', 'hide', 'unhide'].includes(ch.op)) { const k = ch.op.replace(/^un/, '') === 'flag' ? 'flagged' : 'hidden'; meta[ch.id] = { ...(meta[ch.id] || {}), [k]: !ch.op.startsWith('un') }; save(); return ''; }
    if (ch.op === 'map-set') { const m = read(MAP, {}); if (ch.heard && ch.meant) m[String(ch.heard).toLowerCase()] = { meant: String(ch.meant), kind: ch.kind || 'name' }; fs.writeFileSync(MAP, JSON.stringify(m, null, 1)); return ''; }
    if (ch.op === 'map-del') { const m = read(MAP, {}); delete m[String(ch.heard || '').toLowerCase()]; fs.writeFileSync(MAP, JSON.stringify(m, null, 1)); return ''; }
    return '';
  }
  // Fixes names the speech engine gets wrong before Jarvis thinks ("jervis" -> "Jarvis").
  function fixWords(s) { let out = String(s || ''); for (const [heard, v] of Object.entries(read(MAP, {}))) out = out.replace(new RegExp(`\\b${heard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), v.meant); return out; }
  const facts = () => sections().map((s) => `## ${s.name}\n` + s.cards.filter((c) => !c.hidden).map((c) => `- ${c.text}${c.flagged ? ' (he flagged this as maybe wrong)' : ''}`).join('\n')).join('\n\n');
  return { data, search, change, fixWords, facts };
}
