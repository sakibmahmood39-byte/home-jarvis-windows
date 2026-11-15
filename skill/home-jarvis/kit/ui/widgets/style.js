// Colours and fonts come only from the app's variables (--a, --fg, --muted, --line, --glass, --font, --mono).
export const CSS = `
.wb-it{padding:6px 0;border-top:1px solid var(--line)}
.wb-it:first-child,.wb-hd+.wb-it,.wg-sep+.wb-it,.wg-sub+.wb-it{border-top:0}
.wb-it1{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.wb-it1>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}
.wb-it1>span+span{flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;font-weight:750;font-variant-numeric:tabular-nums;white-space:nowrap}
.wb-it2{color:var(--muted);font-size:.86em;font-weight:600;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.wb-hd{font:800 .68em var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:12px 0 2px}
.wb-hd:first-child{margin-top:2px}
.wb-row{all:unset;box-sizing:border-box;display:flex;gap:10px;align-items:center;width:calc(100% + 12px);margin:0 -6px;padding:6px;border-radius:10px;cursor:pointer;transition:background .15s ease}
.wb-row:hover{background:rgba(127,127,127,.16)}.wb-row:active{background:rgba(127,127,127,.26)}
.wb-row>div{min-width:0;flex:1}
.wb-th{flex:none;width:46px;height:46px;border-radius:9px;object-fit:cover;background:rgba(127,127,127,.2);display:block}
.wg-full .wb-th{width:72px;height:72px}
.wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin-top:10px}
.wg-full .wb-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.wb-ph{all:unset;box-sizing:border-box;display:block;aspect-ratio:1;border-radius:9px;overflow:hidden;cursor:pointer;background:rgba(127,127,127,.2)}
.wb-ph img{width:100%;height:100%;object-fit:cover;display:block}
.wb-btn{all:unset;box-sizing:border-box;padding:7px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(127,127,127,.14);color:var(--fg);font:700 .86em var(--font);cursor:pointer;transition:background .15s ease,border-color .15s ease}
.wb-btn:hover{background:rgba(127,127,127,.24)}.wb-btn:active{transform:scale(.97)}
.wb-btn.wb-main{border-color:var(--a);color:var(--a)}
.wb-btn[disabled]{opacity:.5;cursor:default;transform:none}
.wb-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.wb-back{all:unset;display:inline-block;color:var(--muted);font:700 .82em var(--font);cursor:pointer;padding:2px 6px 6px 0}
.wb-back:hover{color:var(--fg)}
.wb-in{all:unset;box-sizing:border-box;display:block;width:100%;padding:7px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(127,127,127,.12);color:var(--fg);font:600 .95em var(--font)}
.wb-in::placeholder{color:var(--muted)}
.wb-row:focus-visible,.wb-ph:focus-visible,.wb-btn:focus-visible,.wb-back:focus-visible,.wb-nav:focus-visible,.wb-in:focus-visible{outline:2px solid var(--a);outline-offset:1px}
.wg-b.wb-fill{display:flex;flex-direction:column}
.wb-view{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.wb-stage{position:relative;flex:1;min-height:170px;border-radius:12px;overflow:hidden;background:rgba(127,127,127,.1)}
.wb-stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
.wb-nav{all:unset;box-sizing:border-box;position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;border-radius:12px;display:grid;place-items:center;cursor:pointer;
  color:var(--fg);background:var(--glass);border:1px solid var(--line);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.wb-nav svg{width:18px;height:18px;display:block}.wb-nav:hover{color:var(--a)}
.wb-prev{left:10px}.wb-next{right:10px}
.wb-cap{display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--muted);font-size:.86em;font-weight:600}
.wb-cap>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-app{display:block;width:100%;height:280px;border:0;border-radius:10px;background:transparent;color-scheme:dark}
.wb-fill .wb-app{flex:1;min-height:0;height:auto}
@media (prefers-reduced-motion:reduce){.wb-row,.wb-btn{transition:none}.wb-btn:active{transform:none}}
@media (prefers-reduced-transparency:reduce){.wb-nav{-webkit-backdrop-filter:none;backdrop-filter:none}}
@media print{
html.wb-printing,html.wb-printing body{background:#fff!important}
html.wb-printing body>*:not(.wg-layer){display:none!important}
html.wb-printing .wg-layer{position:static!important;opacity:1!important;visibility:visible!important}
html.wb-printing .wg-layer>*:not(.wb-print){display:none!important}
html.wb-printing .wb-print{position:static!important;transform:none!important;opacity:1!important;width:auto!important;height:auto!important;max-height:none!important;
  border:0;box-shadow:none;background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none;color:#000;--fg:#000;--muted:#444;--a:#000;--line:#bbb}
html.wb-printing .wb-print .wg-b{overflow:visible!important}
html.wb-printing .wb-print .wg-x,html.wb-printing .wb-print .wb-acts,html.wb-printing .wb-print .wb-say{display:none!important}
}
`;

const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const DOC = '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5v4h4"/>';
export const ICONS = {
  gallery: SVG('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.5"/><path d="M4.5 17.5l5-4.5 3.5 3 2.5-2 4 3.5"/>'),
  money: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.6c-.4-.9-1.400-1.400-2.600-1.400-1.500 0-2.600.7-2.600 1.900 0 2.600 5.400 1.200 5.400 3.900 0 1.100-1.200 1.900-2.800 1.900-1.300 0-2.300-.5-2.800-1.400M12 6.500v1.700M12 15.900v1.600"/>'),
  invoices: SVG(DOC + '<path d="M9.500 12h5M9.500 15.500h5"/>'),
  contracts: SVG(DOC + '<path d="M9 16.500c1-2.500 1.800-2.500 2.200-.8.3 1.300 1 1.300 1.500 0 .4-1 1-.8 2.300.3"/>'),
  schedule: SVG('<rect x="3.5" y="5" width="17" height="15" rx="2.500"/><path d="M3.500 10h17M8 3v4M16 3v4"/>'),
  team: SVG('<circle cx="9" cy="9" r="3"/><path d="M3.500 19c.5-3 2.700-4.500 5.500-4.500s5 1.500 5.500 4.500"/><circle cx="17" cy="10" r="2.300"/><path d="M16 14.600c2.400 0 4 1.300 4.500 3.900"/>'),
  content: SVG('<rect x="3.500" y="3.500" width="7" height="7" rx="1.800"/><rect x="13.500" y="3.500" width="7" height="7" rx="1.800"/><rect x="3.500" y="13.500" width="7" height="7" rx="1.800"/><rect x="13.500" y="13.500" width="7" height="7" rx="1.800"/>'),
  leads: SVG('<circle cx="10" cy="8.500" r="3.500"/><path d="M3.500 20c.6-3.600 3.200-5.500 6.500-5.500 1.500 0 2.900.4 4 1.200M18 14v6M15 17h6"/>'),
  brain: SVG('<path d="M12 3.500l8.500 4.500-8.500 4.500L3.500 8z"/><path d="M3.500 12l8.500 4.500 8.500-4.500M3.500 16l8.500 4.500 8.500-4.500"/>'),
  sites: SVG('<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.300 3.800 5.100 3.800 8.500s-1.300 6.200-3.800 8.500c-2.500-2.300-3.800-5.100-3.800-8.500s1.300-6.200 3.800-8.500z"/>'),
  agents: SVG('<rect x="6" y="6" width="12" height="12" rx="2.500"/><path d="M9.500 3v3M14.500 3v3M9.500 18v3M14.500 18v3M3 9.500h3M3 14.500h3M18 9.500h3M18 14.500h3"/><rect x="10" y="10" width="4" height="4" rx=".8"/>'),
  search: SVG('<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>'),
  draft: SVG('<path d="M4 20l1-4.500L16.500 4a2 2 0 0 1 2.800 0l.7.7a2 2 0 0 1 0 2.800L8.500 19z"/><path d="M14.500 6l3.500 3.500"/>'),
  app: SVG('<rect x="3.500" y="4.500" width="17" height="15" rx="2.500"/><path d="M3.500 9h17M6.500 6.800h.01M9 6.800h.01"/>'),
  prev: SVG('<path d="M14.500 5.500L8 12l6.500 6.500"/>'),
  next: SVG('<path d="M9.500 5.500L16 12l-6.500 6.500"/>'),
};
