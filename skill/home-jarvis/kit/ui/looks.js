// Arc, Obsidian and Atlas come from the look lab (look-lab-*.js):
// their 3D Core draws on the Core view and behind the panels; their colours and type restyle every tab.
// The choice is saved as desk.look in notes/desk-settings.json and cached here so the window opens in it.
import { createArc } from './look-lab-arc.js';
import { createObsidian } from './look-lab-obsidian.js';
import { createAtlas } from './look-lab-atlas.js';

export const LOOKS = [
  { id: 'arc', name: 'Arc', note: 'Navy and cyan, grown up: turning instrument rings, a plasma heart and a disc of light.' },
  { id: 'obsidian', name: 'Obsidian', note: 'Near-black glass, one warm accent, a slow liquid-metal core and large calm type.' },
  { id: 'atlas', name: 'Atlas', note: 'Your house, room and car as the stage, with labels held in 3D and a film-camera focus.' },
];
// Colour of each state in each look (classic keeps the app's own colours). confirm = needs your yes.
const COLOURS = {
  arc: { off: 0x46525c, waiting: 0x2aa6d8, listening: 0x37e0ff, thinking: 0x8a7dff, speaking: 0xffc77a, confirm: 0xffd166, alert: 0xff6b5e },
  obsidian: { off: 0x7a7570, waiting: 0xd9a865, listening: 0xffbe6b, thinking: 0xe9cfa4, speaking: 0xffbe6b, confirm: 0xffd27a, alert: 0xff6b5e },
  atlas: { off: 0x4a5866, waiting: 0x7fe3ff, listening: 0x37e0ff, thinking: 0x9b8cff, speaking: 0xffc77a, confirm: 0xffd166, alert: 0xff6b5e },
};
export const DEFAULT = 'obsidian';
const BG = { classic: 0x04070b, arc: 0x03060a, obsidian: 0x060607, atlas: 0x05080c };
const MAKE = { arc: createArc, obsidian: createObsidian, atlas: createAtlas };
const BRAND = { obsidian: 'Jarvis' };

const S = (look, css) => css.replace(/@/g, `html[data-look=${look}]`);
const CSS = [
  // ---------- Arc ----------
  S('arc', `@{--a:#37e0ff;--glass:rgba(8,16,24,.66);--line:rgba(130,215,245,.16);--fg:#e8f7ff;--muted:#8ea6b6}
@ body{background:#03060a}
@ .brand{letter-spacing:.34em}
@ .state{font:700 11px var(--mono);letter-spacing:.16em;border:1px solid color-mix(in srgb,var(--a) 40%,transparent);border-radius:999px;background:rgba(4,10,16,.78)}
@ .tabs button{font:700 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;background:rgba(10,18,26,.58);color:#a9bccb;border-color:rgba(255,255,255,.1)}
@ .tabs button.on{color:#fff;border-color:var(--a);box-shadow:0 0 14px -3px var(--a),inset 0 0 10px -6px var(--a)}
@ .pc,@ .card,@ .msg,@ .problem{background:linear-gradient(180deg,rgba(14,26,38,.74),rgba(6,12,18,.74));border-color:rgba(55,224,255,.2);border-radius:14px}
@ .pc,@ .msg{position:relative}@ .pc::before,@ .card::before{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--a),transparent);opacity:.75;pointer-events:none}
@ .pc h2{letter-spacing:.2em}@ .rw{border-bottom-color:rgba(120,215,245,.09)}@ .msg small{color:color-mix(in srgb,var(--a) 70%,#9fb6c6)}
@ .bar input{border-radius:12px;border-color:rgba(55,224,255,.22);background:rgba(6,12,18,.72)}
@ .tile{border-radius:12px}@ .ghost{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}
@ #pill{background:linear-gradient(180deg,rgba(12,22,32,.95),rgba(5,10,16,.95))}`),
  // ---------- Obsidian ----------
  S('obsidian', `@{--a:#ffbe6b;--glass:rgba(20,20,22,.62);--line:rgba(255,255,255,.08);--fg:#f2efe9;--muted:#8b8984}
@ body{background:#060607;font-weight:450}
@ .brand img{display:none}@ .brand{font-size:17px;font-weight:600;letter-spacing:.01em}
@ .state{font:500 12.5px var(--font);letter-spacing:.02em;text-transform:none;text-shadow:none;color:#d6d0c6;background:rgba(10,10,11,.7);padding-left:22px;white-space:nowrap}
@ .state::before{content:"";position:absolute;left:10px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:var(--a);box-shadow:0 0 calc(4px + var(--lv,0)*14px) var(--a)}
@ .tabs{gap:2px}@ .tabs button{background:none;border:0;border-bottom:1px solid transparent;border-radius:0;color:#8b8984;font-weight:500;font-size:13px;backdrop-filter:none;padding:6px 9px}
@ .tabs button.on{color:#f2efe9;border-bottom-color:var(--a);box-shadow:none}@ .tabs button:hover{color:#f2efe9}@ .tabs .sep{background:rgba(255,255,255,.08)}
@ .pc{background:rgba(18,18,20,.6);border:1px solid rgba(255,255,255,.06);border-radius:20px;box-shadow:0 30px 60px -24px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(30px) saturate(140%);padding:18px 20px}
@ .pc h2{font:600 11px var(--font);letter-spacing:.16em}@ .pc .big{font-weight:300;font-size:32px;letter-spacing:-.02em}@ .pc p,@ .rw{font-weight:450}
@ .rw{border-bottom-color:rgba(255,255,255,.05)}@ .msg{background:rgba(18,18,20,.62);border-color:rgba(255,255,255,.06);border-radius:16px;font-weight:450}
@ .msg small{font-family:var(--font);letter-spacing:.12em;color:#8b8984}
@ .caption{font-weight:300;font-size:27px;letter-spacing:-.012em;text-shadow:0 2px 24px #000}@ .caption.you{font-weight:300;color:#b9b3aa}
@ .card,@ .problem{background:rgba(18,18,20,.72);border-color:rgba(255,255,255,.08);border-top-color:var(--a);border-radius:20px;box-shadow:0 30px 60px -20px rgba(0,0,0,.85)}
@ .solid{color:#1a1206}@ .ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);font-weight:500}@ .ghost.on{box-shadow:none}
@ .bar input{background:rgba(18,18,20,.62);border-color:rgba(255,255,255,.07);border-radius:16px;font-weight:400}
@ .tile{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.06);border-radius:18px}@ .tile.on{background:color-mix(in srgb,var(--a) 8%,transparent);box-shadow:none}
@ .pin{border-radius:10px;border-color:rgba(255,255,255,.08);border-left-color:var(--a)}@ #pill{background:rgba(14,14,16,.95);border-color:rgba(255,255,255,.1)}`),
  // Same tokens as above: warm accent, near-black glass, light type, no glows.
  S('obsidian', `@ .pc h2{color:#8b8984}@ .pc .sub,@ .rw small,@ .msgc small{font-weight:450;color:#8b8984}@ .msgc b,@ .card h3,@ .tile .nm{font-weight:600}
@ .msgc div,@ .card p{font-weight:450;color:#d6d0c6}@ .msgc,@ .wblk{border-bottom-color:rgba(255,255,255,.05)}@ .msg.you{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.05)}
@ .card{box-shadow:0 30px 60px -20px rgba(0,0,0,.85)}@ .solid{font-weight:600;box-shadow:none}@ .ghost{color:#f2efe9;backdrop-filter:blur(20px)}
@ .ghost:hover,@ .tabs button:hover{border-color:rgba(255,255,255,.22)}@ .ghost.on{border-color:var(--a);color:var(--a);box-shadow:none}
@ .tile{transition:border-color .3s,background .3s}@ .tile.on{border-color:color-mix(in srgb,var(--a) 45%,transparent)}@ .tile.on .ic{filter:none}@ .tile .st{font-weight:450}@ .tile.on .st{color:#f2efe9}
@ .tile .ic{color:#8b8984}@ .sw{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}@ .sw[aria-checked=true]{background:var(--a);border-color:transparent}@ .sw[aria-checked=true] i{background:#1a1206}
@ .fld{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);font-weight:450}@ .fld:focus{box-shadow:none}@ textarea.fld{font:450 12.5px var(--font)}
@ .grid7{font:500 11.5px var(--font)}@ .grid7 span{border-radius:9px;background:rgba(255,255,255,.03)}@ .grid7 .h{background:none}
@ #focusBadge{font:500 12px var(--font);letter-spacing:.02em;border-color:var(--a);color:var(--a);background:rgba(10,10,11,.7)}
@ .hint{font-weight:450;color:#8b8984}@ .pin b{font-weight:500}@ .pin span{font:500 10.5px var(--font);letter-spacing:.06em;color:#8b8984}@ .pin{background:rgba(18,18,20,.72);backdrop-filter:blur(20px)}
@ #leads line{opacity:.45}@ .chip{font:500 11px var(--font);letter-spacing:.02em;text-transform:none;color:#d6d0c6;border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.04)}
@ .w.n{color:#f2efe9;text-shadow:none}@ .caption.you{color:#b9b3aa}@ .live{font-weight:300;color:#b9b3aa}
@ .wg{background:rgba(18,18,20,.72);border-color:rgba(255,255,255,.06);border-radius:20px;box-shadow:0 30px 60px -24px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(30px) saturate(140%)}
@ .wg.wg-front{border-color:rgba(255,255,255,.1);border-top-color:var(--a)}@ .wg-t{font:600 11px var(--font);letter-spacing:.16em;color:#8b8984}@ .wg-ic{color:#8b8984}
@ .wg-big,@ .wb-tot{font-weight:300;letter-spacing:-.02em}@ .wg-li b{font:600 .72em var(--font);letter-spacing:.08em}@ .wg-r.wg-now{background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 45%,transparent)}
@ .wg-bar{background:rgba(255,255,255,.06)}@ .wg-rail{background:rgba(18,18,20,.72);border-color:rgba(255,255,255,.06)}
@ .wb-hd{font:600 .7em var(--font);letter-spacing:.16em;color:#8b8984}@ .wb-btn{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);font-weight:500}@ .wb-it2,@ .wb-cap{font-weight:450}
@ .wb-in{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);font-weight:450}@ .wb-row:hover{background:rgba(255,255,255,.04)}
@ .wg-cam-tag,@ .wg-cam-f button{font:600 .68em var(--font);background:rgba(255,255,255,.04)}
@ .frame .fr-clock{font:500 13px/1 var(--font);letter-spacing:.01em}@ .frame .fr-clock small{font:500 10px/1 var(--font)}@ .fr-pop .fr-head{font:600 10.5px/1.3 var(--font);letter-spacing:.16em;color:#8b8984}
@ #printFrame{background:#060607}@ .tiles.looks .tile.look.on{border-color:var(--a)}`),
  // ---------- Atlas ----------
  S('atlas', `@{--a:#7fe3ff;--glass:rgba(10,16,22,.62);--line:rgba(255,255,255,.1);--fg:#e6f2f8;--muted:#8ba0ae}
@ body{background:#05080c}@ .brand{letter-spacing:.3em}
@ .state{font:600 12px var(--font);letter-spacing:.05em;text-transform:none;text-shadow:none;background:rgba(10,16,22,.7);white-space:nowrap}
@ .tabs button{color:#9fb0bd;border-color:rgba(255,255,255,.08);background:rgba(12,18,24,.55)}
@ .tabs button.on{color:#fff;background:rgba(127,227,255,.14);border-color:rgba(127,227,255,.5);box-shadow:none}
@ .pc{border-radius:16px;box-shadow:0 20px 40px -18px #000}@ .pc h2{letter-spacing:.14em}
@ .card{border-color:rgba(127,227,255,.4);box-shadow:0 20px 40px -18px #000,0 0 26px -12px var(--a)}
@ .pin{border-radius:10px;border:1px solid rgba(255,255,255,.12);border-left:1px solid rgba(255,255,255,.12);box-shadow:0 10px 24px -14px #000}
@ .pin::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:18px;background:linear-gradient(var(--a),transparent);opacity:.7}`),
  // Panels, chat and the print preview start below the top bar, however many rows its tabs take (app.js sets --top-h)
  `#panel{top:calc(var(--top-h,54px) + 12px)}.chat{top:calc(var(--top-h,54px) + 14px)}#printFrame{top:calc(var(--top-h,54px) + 6px);height:calc(100% - var(--top-h,54px) - 84px)}`,
  // The small listening bar: each look has its own orb
  `html[data-look=arc] #orb{background:radial-gradient(circle,#fff 0,var(--a) 26%,color-mix(in srgb,var(--a) 22%,transparent) 54%,transparent 66%);box-shadow:0 0 0 1px color-mix(in srgb,var(--a) 55%,transparent),0 0 0 6px rgba(3,6,10,.9),0 0 0 7px color-mix(in srgb,var(--a) 25%,transparent),0 0 calc(10px + var(--lv,0)*16px) var(--a)}
html[data-look=arc] #pilllabel{letter-spacing:.18em}
html[data-look=obsidian] #orb{background:radial-gradient(circle at 36% 30%,#fff 0,#d9d4cc 14%,#5b5853 46%,#151413 72%);box-shadow:inset -5px -7px 12px color-mix(in srgb,var(--a) calc(25% + var(--lv,0)*55%),transparent),0 6px 16px -6px #000;animation:none;transform:scale(calc(.86 + var(--lv,0)*.22))}
html[data-look=obsidian] #pill{border-color:rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 14px 30px -10px rgba(0,0,0,.7)}
html[data-look=obsidian] #pilllabel{font:600 11px var(--font);letter-spacing:.14em}html[data-look=obsidian] #pillline{font-weight:400;letter-spacing:-.005em}
html[data-look=atlas] #orb{background:radial-gradient(circle,#fff 0,var(--a) 30%,color-mix(in srgb,var(--a) 25%,transparent) 58%,transparent 70%);box-shadow:0 0 0 1px rgba(127,227,255,.35),0 0 calc(8px + var(--lv,0)*14px) var(--a)}
html[data-look=atlas] #pilllabel{font:600 11px var(--font);letter-spacing:.1em}`,
  // The More menu in the top bar
  `.top{z-index:50}.tabs .more{position:relative;display:flex}.tabs .menu{position:absolute;right:0;top:calc(100% + 8px);min-width:170px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(22px) saturate(140%);box-shadow:0 20px 40px -16px rgba(0,0,0,.8);z-index:50;transform-origin:top right;animation:menuIn .16s cubic-bezier(.2,.8,.2,1)}
.tabs .menu[hidden]{display:none}.tabs .menu button{text-align:left;border-radius:9px;border:1px solid transparent;background:none;box-shadow:none;padding:8px 12px}
.tabs .menu button:hover{background:rgba(255,255,255,.07)}.tabs .menu button.on{border-color:var(--a)}
#moreBtn::after{content:"";display:inline-block;width:5px;height:5px;margin-left:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);opacity:.7}
@keyframes menuIn{from{opacity:0;transform:scale(.96) translateY(-4px)}}@media (prefers-reduced-motion:reduce){.tabs .menu{animation:none}}
html[data-look=obsidian] .tabs .menu button{border:0;border-radius:9px;padding:8px 12px}html[data-look=obsidian] .tabs .menu button.on{color:var(--a)}`,
  // The look picker in Settings: a picture of each look
  `.tiles.looks{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.tile.look{cursor:pointer;text-align:left;color:var(--fg);font:inherit;gap:8px;padding:10px}
.tile.look img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;border:1px solid var(--line);display:block}
.tile.look:hover{border-color:rgba(255,255,255,.3)}.tile.look:active{transform:scale(.985)}`,
  // Atlas's own pins in the 3D stage (only on the Core view)
  `#lookPins{position:fixed;inset:0;pointer-events:none}#lookPins[hidden]{display:none}
.apin{position:absolute;left:0;top:0;will-change:transform,opacity,filter;white-space:nowrap}
.apin .lb{position:absolute;left:0;bottom:46px;transform:translateX(-50%);padding:6px 10px 6px 9px;border-radius:10px;background:rgba(10,16,22,.62);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(12px);font:600 12px var(--font);color:#e6f2f8}
.apin .lb small{display:block;font:600 10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:#7e93a2;margin-bottom:1px}.apin .lb span:empty{display:none}
.apin .lb:has(span:empty) small{margin:0;color:#cfe3ee}
.apin .dt{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:var(--a);box-shadow:0 0 10px var(--a)}
.apin .ln{position:absolute;left:0;bottom:4px;width:1px;height:42px;background:linear-gradient(transparent,var(--a));opacity:.7}
.apin.hot .lb{border-color:rgba(127,227,255,.6);box-shadow:0 0 22px -6px var(--a)}`,
].join('\n');

export function createLooks({ renderer, onBackground }) {
  const style = document.createElement('style'); style.id = 'looks-css'; style.textContent = CSS; document.head.append(style);
  const pinLayer = document.createElement('div'); pinLayer.id = 'lookPins'; pinLayer.hidden = true; document.body.append(pinLayer);
  const brandText = [...(document.querySelector('.brand')?.childNodes || [])].find((n) => n.nodeType === 3 && n.textContent.trim());
  const cores = {}; let id = 'classic', W = innerWidth, H = innerHeight;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let cached = DEFAULT; try { cached = localStorage.getItem('jarvis.look') || DEFAULT; } catch {}

  function core() {
    if (id === 'classic') return null;
    if (!cores[id]) { cores[id] = MAKE[id](renderer, null, { app: true }); cores[id].resize(W, H); }
    return cores[id];
  }
  const api = {
    list: LOOKS,
    get id() { return id; },
    set(next) {
      if (!LOOKS.some((l) => l.id === next)) next = DEFAULT;
      if (next === id && document.documentElement.dataset.look === id) return false;
      id = next; document.documentElement.dataset.look = id; try { localStorage.setItem('jarvis.look', id); } catch {}
      if (brandText) brandText.textContent = BRAND[id] || 'JARVIS';
      onBackground?.(BG[id]);
      const c = core(); pinLayer.innerHTML = c?.html || ''; if (c?.html) c.mount(pinLayer);
      return true;
    },
    colour(mode, classic) { return id === 'classic' ? (classic[mode] ?? classic.waiting) : COLOURS[id][mode] ?? COLOURS[id].waiting; },
    get on() { return id !== 'classic'; },
    // Called every frame on the Core view and behind the panels. Returns false when Classic should draw instead.
    draw({ t, dt, phase, level, showPins, fps }) {
      const c = core(); if (!c) { pinLayer.hidden = true; return false; }
      pinLayer.hidden = !showPins;
      c.update({ t: t % 10, dt, phase, pp: 0.5, level, motion: reduce.matches ? 0.15 : 1, reduce: reduce.matches, card: 0, fps });
      c.render(dt); return true;
    },
    pins(b) { pinLayer.hidden = !b; },
    info(key, text) { cores.atlas?.setInfo?.(key, text); },
    resize(w, h) { W = w; H = h; for (const c of Object.values(cores)) c.resize(w, h); },
  };
  api.set(cached);
  return api;
}
