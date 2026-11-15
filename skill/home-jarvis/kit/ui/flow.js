// A word already on screen is never re-created, so an updating transcript only animates its new words (diff by index).
// paced:true reveals words at about `rate` per second (for Jarvis's spoken answer); long text appears at once.
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFlow(el, { rate = 3.2, maxPaced = 40 } = {}) {
  let words = [], spans = [], shown = 0, raf = 0, last = 0, acc = 0, hot = null;
  const mark = (s) => { if (hot && hot !== s) hot.classList.remove('n'); hot = s; if (s) s.classList.add('n'); };
  const reveal = (n) => {
    const frag = document.createDocumentFragment();
    while (spans.length < n) {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = words[spans.length];
      if (spans.length) frag.append(' ');
      frag.append(s); spans.push(s);
    }
    if (frag.childNodes.length) { el.append(frag); mark(spans[spans.length - 1]); }
    shown = spans.length;
  };
  const tick = (t) => {
    raf = 0; if (shown >= words.length) return;
    acc += ((t - (last || t)) / 1000) * rate; last = t;
    const n = Math.min(words.length, shown + Math.floor(acc)); if (n > shown) { acc -= n - shown; reveal(n); }
    if (shown < words.length) raf = requestAnimationFrame(tick);
  };
  const clear = () => { cancelAnimationFrame(raf); raf = 0; words = []; spans = []; shown = 0; hot = null; acc = 0; last = 0; el.textContent = ''; };
  return {
    clear,
    set(text, { paced = false } = {}) {
      const w = String(text || '').trim().split(/\s+/).filter(Boolean);
      if (!w.length) { if (spans.length) clear(); return; }
      if (w.length < spans.length) clear();                       // the text got shorter: start fresh
      words = w;
      spans.forEach((s, i) => { if (s.textContent !== w[i]) s.textContent = w[i]; });  // a revised word changes quietly, no new animation
      if (!paced || reduced() || w.length > maxPaced) { cancelAnimationFrame(raf); raf = 0; reveal(w.length); }
      else if (!raf && shown < w.length) { last = 0; raf = requestAnimationFrame(tick); }
    },
  };
}

// Fade a short label in when it changes, and out when it goes (status, flashed messages).
export function setLabel(el, text) {
  text = text || ''; if (el._lab === text) return; el._lab = text;
  if (reduced() || !el.animate) { el.textContent = text; return; }
  if (text) { el.textContent = text; el.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' }); }
  else el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in' }).onfinish = () => { if (el._lab === '') el.textContent = ''; };
}

// Small pills for the tools Jarvis used this turn. Icons are inline SVG, nothing is loaded from outside.
const P = {
  clickup: '<path d="M4 12l5 5L20 6"/><circle cx="12" cy="12" r="9"/>',
  gmail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  memory: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3"/><circle cx="8" cy="13" r=".8"/><circle cx="16" cy="13" r=".8"/>',
  home: '<path d="M4 11l8-7 8 7M6 10v10h12V10"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  other: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
};
export function createChips(...hosts) {
  const seen = new Set();
  return {
    clear() { seen.clear(); hosts.forEach((h) => { h.textContent = ''; }); },
    add(kind, label) {
      kind = P[kind] ? kind : 'other'; label = String(label || kind).slice(0, 24);
      const key = `${kind}|${label}`; if (seen.has(key)) return; seen.add(key);
      for (const h of hosts) {
        const c = document.createElement('span'); c.className = 'chip';
        c.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[kind]}</svg>`;
        c.append(label); h.append(c);
      }
    },
  };
}
