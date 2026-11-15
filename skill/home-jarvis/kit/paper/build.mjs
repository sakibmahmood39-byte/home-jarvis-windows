// Builds the morning paper: edition JSON -> HTML -> Letter PDF (printed with Microsoft Edge, already on every Windows PC).
//   Every day, 3 pages: 1 Today (weather, prayer/day strip, to-dos, day plan, deadlines)
//                       2 Money & Messages (bills, waiting on, packages, emails, texts)
//                       3 Work, Faith & You (work lines, news, try something new, ayah/hadith or quote, gym, tonight's questions)
//   Sundays (edition has a "week" block): + page 4 The Week.
// Usage: node paper/build.mjs <edition.json> <out.pdf>
// Prints "overflow px per page": every number must be 0. If not, shorten the text in the edition and build again.
// Settings (paper name, place, faith) come from me/settings.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pickTheme } from './theme.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(here, '..');
const require = createRequire(import.meta.url);

export function loadSettings() {
  for (const f of [path.join(kit, 'me', 'settings.json'), path.join(kit, 'me.example', 'settings.json')]) {
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  return {};
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fontDir = path.join(kit, 'node_modules', '@fontsource');
const fp = f => 'file:///' + path.join(fontDir, f).replace(/\\/g, '/').replace(/^\//, '');
const font = (fam, file, w = 400, st = 'normal') =>
  `@font-face{font-family:'${fam}';src:url('${fp(file)}') format('woff2');font-weight:${w};font-style:${st};}`;

export const CSS = `
${font('Fraktur', 'unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff2')}
${font('Old', 'old-standard-tt/files/old-standard-tt-latin-400-normal.woff2')}
${font('Old', 'old-standard-tt/files/old-standard-tt-latin-400-italic.woff2', 400, 'italic')}
${font('Old', 'old-standard-tt/files/old-standard-tt-latin-700-normal.woff2', 700)}
${font('Play', 'playfair-display/files/playfair-display-latin-700-normal.woff2', 700)}
${font('Play', 'playfair-display/files/playfair-display-latin-900-normal.woff2', 900)}
${font('Play', 'playfair-display/files/playfair-display-latin-400-italic.woff2', 400, 'italic')}
${font('Frank', 'libre-franklin/files/libre-franklin-latin-400-normal.woff2')}
${font('Frank', 'libre-franklin/files/libre-franklin-latin-600-normal.woff2', 600)}
${font('Frank', 'libre-franklin/files/libre-franklin-latin-800-normal.woff2', 800)}
${font('Amiri', 'amiri/files/amiri-arabic-400-normal.woff2')}
@page { size: Letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #111; }
body { font-family: 'Old', Georgia, serif; font-size: 11pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 8.5in; height: 11in; padding: 0.36in 0.42in 0.5in; overflow: hidden; page-break-after: always; position: relative; display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; }
.mast { white-space: nowrap; font-family: 'Fraktur'; font-size: 40pt; line-height: 1.05; text-align: center; margin: 0 0 2px; }
.dateline { display: flex; justify-content: space-between; border-top: 3px double #111; border-bottom: 1px solid #111; margin: 2px 0 9px; padding: 3px 2px; font-family: 'Frank'; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .07em; }
.kicker { font-family: 'Frank'; font-weight: 800; font-size: 9pt; text-transform: uppercase; letter-spacing: .12em; border-bottom: 1.5px solid #111; padding-bottom: 2px; margin: 0 0 5px; }
h2 { font-family: 'Play'; font-weight: 700; font-size: 14pt; line-height: 1.12; margin: 0 0 4px; }
.grid { display: grid; gap: 0 16px; }
.rule-l { border-left: 1px solid #111; padding-left: 15px; }
.box { border: 1px solid #111; padding: 7px 10px; margin-bottom: 10px; }
.box.heavy { border-width: 2px; }
.sec { margin-bottom: 11px; }
.weather { display: grid; grid-template-columns: 1.3fr 1fr; gap: 0 16px; border: 2px solid #111; padding: 8px 12px; margin-bottom: 10px; }
.weather .now { font-family: 'Play'; font-weight: 900; font-size: 17pt; line-height: 1.15; }
.weather .out { font-family: 'Play'; font-style: italic; font-size: 11.5pt; margin-top: 3px; }
.weather .wear { font-size: 11pt; }
.prayers { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0 6px; text-align: center; margin-bottom: 11px; }
.prayers div { border: 1.5px solid #111; padding: 4px 0 3px; }
.prayers b { display: block; font-family: 'Frank'; font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; }
.prayers span { font-family: 'Play'; font-weight: 700; font-size: 17pt; }
.todo { display: grid; grid-template-columns: 15px 74px 1fr; gap: 6px; padding: 4px 0; border-bottom: 1px dotted #888; font-size: 11.5pt; }
.todo:last-child { border-bottom: 0; }
.todo.done > div:last-child { text-decoration: line-through; color: #666; }
.cb { width: 13px; height: 13px; border: 1.5px solid #111; margin-top: 3px; }
.when { font-family: 'Frank'; font-weight: 800; font-size: 9pt; padding-top: 2px; white-space: nowrap; }
.tag { font-family: 'Frank'; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; color: #444; margin-left: 5px; white-space: nowrap; }
.writein { border-bottom: 1px solid #999; height: 20px; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 3px 4px; vertical-align: top; text-align: left; }
th { font-family: 'Frank'; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .07em; border-bottom: 1px solid #111; font-weight: 800; }
tr + tr td { border-top: 1px dotted #aaa; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.r { text-align: right; }
.small { font-size: 9.5pt; color: #333; }
.sans { font-family: 'Frank'; }
.item { padding: 5px 0 6px; border-bottom: 1px dotted #999; }
.item:last-child { border-bottom: 0; }
.item .a { font-family: 'Frank'; font-size: 9.5pt; margin-top: 2px; }
.item .a b { text-transform: uppercase; font-size: 8.5pt; letter-spacing: .08em; }
.rank { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #111; color: #fff; font-family: 'Frank'; font-weight: 800; font-size: 9pt; text-align: center; line-height: 18px; margin-right: 6px; }
.biz div { padding: 3px 0; border-bottom: 1px dotted #999; }
.biz div:last-child { border-bottom: 0; }
.biz b, .wire b { font-family: 'Frank'; font-weight: 800; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .05em; }
.wire > div { padding: 3px 0 5px; border-bottom: 1px dotted #999; }
.wire > div:last-child { border-bottom: 0; }
.ar { font-family: 'Amiri'; font-size: 15pt; direction: rtl; text-align: center; line-height: 1.9; margin: 0; }
.quote { font-style: italic; text-align: center; font-size: 11pt; }
.ref { font-family: 'Frank'; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; text-align: center; color: #444; margin: 2px 0 6px; }
ul { margin: 0; padding-left: 15px; }
li { margin-bottom: 3px; }
.q { display: grid; grid-template-columns: 20px 1fr; margin-bottom: 3px; font-size: 10.5pt; }
.foot { position: absolute; left: 0.4in; right: 0.4in; bottom: 0.2in; border-top: 1px solid #111; padding-top: 3px; display: flex; justify-content: space-between; font-family: 'Frank'; font-size: 8.5pt; letter-spacing: .06em; text-transform: uppercase; color: #333; }
.sechead { display: flex; justify-content: space-between; align-items: baseline; border-top: 3px double #111; border-bottom: 1px solid #111; padding: 4px 2px 3px; margin: 0 0 11px; }
.sechead .t { font-family: 'Play'; font-weight: 900; font-size: 20pt; letter-spacing: -.01em; }
.sechead .m { font-family: 'Frank'; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; }
.alert { border: 2px solid #111; background: #111; color: #fff; font-family: 'Frank'; font-weight: 800; font-size: 10pt; padding: 5px 9px; margin-bottom: 9px; }
`;

export function renderHtml(d, s = loadSettings()) {
  const T = pickTheme(d);
  const paper = s.paper_name || 'The Morning Times';
  const callMe = s.call_me || s.name || 'friend';
  const faith = (s.faith || 'islam') === 'islam';
  const L = d.lead || {}, P = d.payments || {}, W = d.wear || {};
  const sechead = (title, page) => `<div class="sechead"><span class="t">${esc(title)}</span><span class="m">${esc(paper)} · ${esc(d.date_long)} · Page ${page}</span></div>`;
  const foot = (left, page) => `<div class="band"></div><div class="foot"><span>${left}</span><span>Today's look: ${esc(T.name)} · ${page}</span></div>`;
  const list = a => (a || []).map(i => `<li>${esc(i)}</li>`).join('');
  const strip = d.prayers || d.day_strip || [];

  const p1 = `
<section class="page">
  <div class="mast"><span class="flourish"></span> ${esc(paper)} <span class="flourish r"></span></div>
  <div class="dateline"><span>${esc(d.date_long)}</span><span>${esc(d.hijri || '')}</span><span>${esc(d.volume || '')}</span></div>
  ${d.alert ? `<div class="alert">${esc(d.alert)}</div>` : ''}
  <div class="weather">
    <div style="position:relative;padding-right:0.72in"><div class="wx-icon"></div><div class="kicker">Weather · ${esc(s.place_label || '')}</div><div class="now">${esc((d.weather || {}).today)}</div><div class="out">${esc((d.weather || {}).outlook_short || (d.weather || {}).outlook)}</div></div>
    <div class="wear rule-l"><div class="kicker">What to Wear</div>${esc(W.outfit_short || W.outfit)}</div>
  </div>
  ${strip.length ? `<div class="prayers" style="grid-template-columns:repeat(${Math.min(strip.length, 7)},1fr)">${strip.map(p => `<div><b>${esc(p[0])}</b><span>${esc(String(p[1]).replace(/\s?(AM|PM)$/i, ''))}</span></div>`).join('')}</div>` : ''}
  <div class="grid" style="grid-template-columns: 1.25fr 1fr;">
    <div>
      <div class="kicker">Today's To-Do</div>
      <div class="box heavy" style="padding:4px 10px">
        ${(L.todos || []).map(t => `<div class="todo${t.done ? ' done' : ''}"><div class="cb"></div><div class="when">${esc(t.when || '')}</div><div>${esc(t.t)}${t.tag ? `<span class="tag">${esc(t.tag)}</span>` : ''}</div></div>`).join('')}
        ${Array.from({ length: L.blank_lines ?? 2 }, () => `<div class="todo"><div class="cb"></div><div></div><div class="writein"></div></div>`).join('')}
      </div>
      ${L.note ? `<p class="small" style="font-style:italic;margin:0">${esc(L.note)}</p>` : ''}
    </div>
    <div class="rule-l">
      <div class="kicker">${faith ? 'The Day Between Prayers' : 'Your Day Plan'}</div>
      <table class="sec">${(d.plan || []).map(r => `<tr><td class="num sans" style="font-size:9.5pt;width:42%">${esc(r[0])}</td><td><b>${esc(r[1])}</b>${r[2] ? `<div class="small">${esc(r[2])}</div>` : ''}</td></tr>`).join('')}</table>
      ${(d.deadlines || []).length ? `<div class="box heavy"><div class="kicker">Deadlines</div>
        <table>${d.deadlines.map(r => `<tr><td class="num sans" style="font-weight:800;width:30%">${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>` : ''}
    </div>
  </div>
  ${foot('Today · Turn over for money and messages', 1)}
</section>`;

  const p2 = `
<section class="page">
  ${sechead('Money & Messages', 2)}
  <div class="grid" style="grid-template-columns: 1fr 1fr;">
    <div>
      <div class="kicker">Bills · Next 10 Days</div>
      <table>
        <tr><th>Due</th><th>Payment</th><th class="r">Amount</th></tr>
        ${(P.rows || []).map(r => `<tr><td class="num">${esc(r[0])}</td><td>${esc(r[1])}</td><td class="r num">${esc(r[2])}</td></tr>`).join('')}
      </table>
      <div class="sans" style="margin:5px 0 12px;font-weight:800;font-size:10pt">${esc(P.total || '')}</div>
      ${(P.checks || []).length ? `<div class="kicker">Money to Check</div><ul class="sec">${list(P.checks)}</ul>` : ''}
      <div class="kicker">Waiting On</div>
      <table class="sec">${(d.waiting || []).map(r => `<tr><td style="width:36%"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td></tr>`).join('')}</table>
      ${(d.packages || []).length ? `<div class="kicker">Packages</div><table>${d.packages.map(r => `<tr><td style="width:40%"><b>${esc(r[0])}</b></td><td class="small">${esc(r[1])}</td></tr>`).join('')}</table>` : ''}
    </div>
    <div class="rule-l">
      <div class="kicker">Emails That Need You</div>
      ${(d.inbox || []).slice(0, 5).map((r, i) => `<div class="item"><div><span class="rank">${i + 1}</span><b>${esc(r.from)}</b> · ${esc(r.what)}</div><div class="a"><b>Do:</b> ${esc(r.action)}</div></div>`).join('')}
      <div style="height:10px"></div>
      ${(d.texts || []).length ? `<div class="kicker">Texts Waiting for You</div>
      ${d.texts.slice(0, 4).map(r => `<div class="item"><div><b>${esc(r.who)}</b> · ${esc(r.what)}</div>${r.reply ? `<div class="a"><b>Reply:</b> ${esc(r.reply)}</div>` : ''}</div>`).join('')}` : ''}
    </div>
  </div>
  ${foot('From your calendar, email and notes', 2)}
</section>`;

  const p3 = `
<section class="page">
  ${sechead(faith ? 'Work, Faith & You' : 'Work & You', 3)}
  <div class="grid" style="grid-template-columns: 1fr 1fr;">
    <div>
      ${(d.business || []).length ? `<div class="kicker">${esc(d.business_title || 'Work · Next Step')}</div>
      <div class="biz sec">${d.business.map(b => `<div><b>${esc(b.name)}</b> — ${esc(b.next || b.status)}</div>`).join('')}</div>` : ''}
      ${(d.wire || []).length ? `<div class="kicker">The News You Care About</div>
      <div class="wire sec">${d.wire.map(w => `<div><b>${esc(w.desk)}:</b> ${esc((w.items || [])[0])}${w.try ? `<div class="small"><b style="font-size:8.5pt">Try:</b> ${esc(w.try)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${d.try_new ? `<div class="box"><div class="kicker">${esc(d.try_new_title || 'Try Something New')}</div>${esc(d.try_new)}${d.try_new_source ? `<div class="small" style="margin-top:2px">${esc(d.try_new_source)}</div>` : ''}</div>` : ''}
    </div>
    <div class="rule-l">
      ${d.ayah ? `<div class="box heavy">
        <div class="kicker">Ayah of the Day</div>
        ${d.ayah.ar ? `<div class="ar">${esc(d.ayah.ar)}</div>` : ''}
        <div class="quote">${esc(d.ayah.en)}</div>
        <div class="ref">${esc(d.ayah.ref)}</div>
        ${d.hadith ? `<div class="kicker">Hadith</div><div class="quote">${esc(d.hadith.en)}</div><div class="ref" style="margin-bottom:0">${esc(d.hadith.ref)}</div>` : ''}
      </div>` : ''}
      ${d.quote ? `<div class="box heavy"><div class="kicker">Words for Today</div><div class="quote">${esc(d.quote.en)}</div><div class="ref" style="margin-bottom:0">${esc(d.quote.ref)}</div></div>` : ''}
      ${d.workout ? `<div class="box">
        <div class="kicker">The Gym · ${esc(d.workout.title)}</div>
        <div class="small" style="margin-bottom:3px"><b>${esc(d.workout.when)}</b></div>
        <table>${(d.workout.moves || []).map(m => `<tr><td style="width:62%">${esc(m[0])}</td><td class="num sans" style="font-weight:700">${esc(m[1])}</td></tr>`).join('')}</table>
      </div>` : ''}
      ${(d.tonight || []).length ? `<div class="kicker">Tonight's Questions</div>
      ${d.tonight.slice(0, 6).map((q, i) => `<div class="q"><b>${i + 1}.</b><span>${esc(q)}</span></div>`).join('')}` : ''}
    </div>
  </div>
  ${foot(`Have a ${faith ? 'blessed' : 'good'} day, ${esc(callMe)}`, 3)}
</section>`;

  const wk = d.week;
  const p4 = !wk ? '' : `
<section class="page">
  ${sechead('The Week', 4)}
  ${L.headline ? `<div class="sec"><div class="kicker">${esc(L.kicker || "The Week's Story")}</div><h2 style="font-size:19pt">${esc(L.headline)}</h2><div style="font-style:italic">${esc(L.dek)}</div></div>` : ''}
  <div class="grid" style="grid-template-columns: 1fr 1fr;">
    <div>
      <div class="box heavy"><div class="kicker">Done This Week</div><ul>${list(wk.done)}</ul></div>
      <div class="box heavy"><div class="kicker">Next Week</div><ul>${list(wk.next)}</ul></div>
    </div>
    <div class="rule-l">
      ${(wk.jarvis || []).length ? `<div class="box"><div class="kicker">Jarvis Got Better</div><ul>${list(wk.jarvis)}</ul></div>` : ''}
      ${(wk.notes || []).length ? `<div class="box"><div class="kicker">Notes for the Week</div><ul>${list(wk.notes)}</ul></div>` : ''}
    </div>
  </div>
  ${foot('Sources: ' + esc((d.sources || []).join(' · ')), 4)}
</section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper)} · ${esc(d.date || '')}</title><style>${CSS}${T.css}</style></head><body>${p1}${p2}${p3}${p4}</body></html>`;
}

// Opens Edge (or Chrome) without a window, measures overflow, saves the PDF.
async function launchBrowser() {
  let pw;
  try { pw = require('playwright-core'); } catch { throw new Error('playwright-core is missing: run "npm install" in the Jarvis folder.'); }
  const opts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH }
    : { channel: process.platform === 'win32' ? 'msedge' : 'chrome' };
  return pw.chromium.launch(opts);
}

export async function buildPaper(inFile, outFile) {
  const d = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const html = renderHtml(d);
  const htmlFile = path.resolve(outFile.replace(/\.pdf$/i, '.html'));
  fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
  fs.writeFileSync(htmlFile, html);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto('file:///' + htmlFile.replace(/\\/g, '/').replace(/^\//, ''), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => [...document.querySelectorAll('.page')].map(p => {
      const limit = p.getBoundingClientRect().top + p.clientHeight - 48;
      let max = 0;
      p.querySelectorAll('*').forEach(el => { if (!el.closest('.foot')) { const b = el.getBoundingClientRect().bottom; if (b > max) max = b; } });
      return Math.max(0, Math.round(max - limit));
    }));
    console.log('overflow px per page:', over.join(', '));
    await page.pdf({ path: outFile, format: 'Letter', printBackground: true, preferCSSPageSize: true });
    return over;
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , inFile, outFile = 'paper.pdf'] = process.argv;
  if (!inFile) { console.error('Usage: node paper/build.mjs <edition.json> <out.pdf>'); process.exit(2); }
  buildPaper(inFile, outFile).then(o => process.exit(o.some(n => n > 0) ? 3 : 0), e => { console.error(e.message); process.exit(1); });
}
