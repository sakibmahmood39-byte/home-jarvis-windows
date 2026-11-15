// Today's look for the paper: a black-and-white theme picked from the weather, weekday, Islamic month and season.
// Only decoration changes (pattern band, weather drawing, section marks, box corners, masthead flourishes).
// Every section stays in the same place, so the reader always knows where to look.
const INK = '#111';
const svg = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${extra}>${body}</svg>`;
const uri = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const st = (w = 1.4) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// ---------- pattern tiles for the band (each tile is repeated across the page) ----------
const tiles = {
  star: { w: 28, h: 28, name: 'eight-point star', body: `<rect x="7" y="7" width="14" height="14" ${st()}/><rect x="7" y="7" width="14" height="14" transform="rotate(45 14 14)" ${st()}/><circle cx="14" cy="14" r="2.2" fill="${INK}"/>` },
  arches: { w: 30, h: 28, name: 'masjid arches', body: `<path d="M3 27 V15 Q3 4 15 2 Q27 4 27 15 V27" ${st()}/><path d="M9 27 V17 Q9 10 15 8 Q21 10 21 17 V27" ${st(1)}/><circle cx="15" cy="4" r="1" fill="${INK}"/>` },
  vine: { w: 40, h: 28, name: 'arabesque vine', body: `<path d="M0 14 Q10 2 20 14 T40 14" ${st()}/><path d="M10 8 q4 -6 8 -2 q-4 5 -8 2Z" ${st(1)}/><path d="M30 20 q4 6 8 2 q-4 -5 -8 -2Z" ${st(1)}/>` },
  waves: { w: 36, h: 28, name: 'waves', body: `<path d="M0 10 Q9 2 18 10 T36 10" ${st()}/><path d="M0 18 Q9 10 18 18 T36 18" ${st(1)}/><path d="M0 26 Q9 18 18 26 T36 26" ${st(0.8)}/>` },
  mountains: { w: 40, h: 28, name: 'mountains', body: `<path d="M0 26 L12 8 L20 18 L28 6 L40 26" ${st()}/><path d="M9 12.5 L12 8 L15 12.5 M25 10.5 L28 6 L31 10.5" ${st(1)}/>` },
  rays: { w: 32, h: 28, name: 'sun rays', body: `<circle cx="16" cy="14" r="5" ${st()}/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="16" y1="5" x2="16" y2="2" transform="rotate(${a} 16 14)" ${st(1.2)}/>`).join('')}` },
  lattice: { w: 24, h: 28, name: 'lattice', body: `<path d="M0 14 L12 2 L24 14 L12 26Z" ${st()}/><path d="M6 14 L12 8 L18 14 L12 20Z" ${st(0.9)}/>` },
  lanterns: { w: 30, h: 28, name: 'Ramadan lanterns', body: `<line x1="15" y1="0" x2="15" y2="5" ${st(1)}/><path d="M10 7 H20 L22 11 V21 L18 25 H12 L8 21 V11Z" ${st()}/><path d="M12 12 V20 M15 12 V20 M18 12 V20" ${st(0.8)}/>` },
};
// The band's second layer: what the weather is doing, drawn small between the pattern tiles.
const weatherTiles = {
  rain: `<path d="M4 4 l-2 6 M14 2 l-2 6 M24 6 l-2 6" ${st(1)}/>`,
  snow: `<path d="M6 2 v8 M2 6 h8 M3 3 l6 6 M9 3 l-6 6" ${st(0.9)}/>`,
  wind: `<path d="M0 5 H18 q4 0 4 -3 M0 10 H24 q4 0 4 3" ${st(1)}/>`,
  cloud: `<path d="M3 11 q-3 -5 3 -6 q1 -5 7 -3 q5 -3 7 3 q4 1 2 6Z" ${st(1)}/>`,
  fog: `<path d="M0 3 H20 M4 7 H26 M0 11 H18" ${st(1)}/>`,
  sun: `<circle cx="6" cy="6" r="2.5" fill="${INK}"/>`,
};

// ---------- the big weather drawing (top-right of the weather box) ----------
const icons = {
  sun: `<circle cx="32" cy="32" r="11" ${st(2.4)}/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="32" y1="12" x2="32" y2="5" transform="rotate(${a} 32 32)" ${st(2.4)}/>`).join('')}`,
  cloud: `<path d="M14 46 q-10 -1 -8 -11 q2 -8 11 -7 q3 -12 16 -10 q11 2 11 13 q10 0 10 8 q0 7 -9 7Z" ${st(2.4)}/>`,
  rain: `<path d="M14 36 q-10 -1 -8 -11 q2 -8 11 -7 q3 -12 16 -10 q11 2 11 13 q10 0 10 8 q0 7 -9 7Z" ${st(2.4)}/><path d="M18 44 l-3 9 M30 44 l-3 9 M42 44 l-3 9" ${st(2.4)}/>`,
  snow: `<path d="M32 8 V56 M11 20 L53 44 M11 44 L53 20" ${st(2.4)}/><path d="M26 12 L32 18 L38 12 M26 52 L32 46 L38 52" ${st(1.8)}/>`,
  wind: `<path d="M6 24 H40 q8 0 8 -7 q0 -6 -6 -6 q-5 0 -6 5 M6 34 H50 q8 0 8 7 q0 6 -6 6 q-5 0 -6 -5 M6 44 H32" ${st(2.4)}/>`,
  fog: `<path d="M8 22 H50 M14 32 H56 M8 42 H46 M18 52 H52" ${st(2.4)}/>`,
};

// ---------- section-title ornaments ----------
const marks = {
  star: `<path d="M6 0 L7.5 4.5 L12 6 L7.5 7.5 L6 12 L4.5 7.5 L0 6 L4.5 4.5Z" fill="${INK}"/>`,
  crescent: `<path d="M8 1 A5.5 5.5 0 1 0 8 11 A4.2 4.2 0 1 1 8 1Z" fill="${INK}"/>`,
  diamond: `<path d="M6 0 L12 6 L6 12 L0 6Z" fill="${INK}"/>`,
  leaf: `<path d="M1 11 Q1 1 11 1 Q11 11 1 11Z M1 11 L8 4" ${st(1.2)}/>`,
  drop: `<path d="M6 0 Q11 7 6 11.5 Q1 7 6 0Z" fill="${INK}"/>`,
  flake: `<path d="M6 0 V12 M0 6 H12 M2 2 L10 10 M10 2 L2 10" ${st(1.3)}/>`,
  sun: `<circle cx="6" cy="6" r="3" fill="${INK}"/><circle cx="6" cy="6" r="5.4" ${st(1)}/>`,
  pine: `<path d="M6 0 L11 8 H1Z M6 8 V12" fill="${INK}"/>`,
};

// ---------- reading the edition ----------
function weatherKind(text = '') {
  const t = text.toLowerCase();
  if (/snow|flurr|sleet/.test(t)) return 'snow';
  if (/rain|shower|drizzle|storm|thunder/.test(t)) return 'rain';
  if (/fog|mist|haze/.test(t)) return 'fog';
  const wind = (t.match(/(\d+)\s*mph/) || [])[1];
  if (wind && Number(wind) >= 20) return 'wind';
  if (/cloud|overcast|grey|gray/.test(t)) return 'cloud';
  return 'sun';
}
const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
const DAY_PATTERN = ['rays', 'star', 'vine', 'waves', 'lattice', 'arches', 'mountains']; // Sun..Sat (Fri = arches, Jumu'ah)
const SEASON_MARK = { winter: 'pine', spring: 'leaf', summer: 'sun', autumn: 'leaf' };
const WEATHER_MARK = { rain: 'drop', snow: 'flake', sun: null, cloud: null, wind: null, fog: null };
const CORNERS = ['square', 'round', 'notch', 'ticks'];

function pickTheme(d) {
  const date = d.date ? new Date(d.date + 'T12:00:00') : new Date(String(d.date_long || '').replace(/^[A-Za-z]+,\s*/, '') + ' 12:00');
  const day = isNaN(date) ? 0 : date.getDay();
  const month = isNaN(date) ? 9 : date.getMonth();
  const seed = isNaN(date) ? 0 : Math.floor(date.getTime() / 86400000);
  const wk = weatherKind((d.weather || {}).today);
  const season = SEASONS[month];
  const ramadan = /rama/i.test(d.hijri || '');
  const pattern = ramadan ? 'lanterns' : DAY_PATTERN[day];
  const mark = day === 5 || ramadan ? 'crescent' : WEATHER_MARK[wk] || (seed % 3 === 0 ? 'star' : seed % 3 === 1 ? 'diamond' : SEASON_MARK[season]);
  const corners = CORNERS[seed % CORNERS.length];
  const tile = tiles[pattern];
  const band = svg(tile.w * 2, tile.h,
    `<g>${tile.body}</g><g transform="translate(${tile.w + 4} ${tile.h / 2 - 6})">${weatherTiles[wk]}</g>`);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', "Jumu'ah", 'Saturday'][day];
  const name = `${ramadan ? '' : dayName + ' '}${tile.name} · ${season} ${wk === 'sun' ? 'sunshine' : wk}`;
  const flourish = svg(60, 40, day === 5 || ramadan
    ? `<path d="M38 6 A15 15 0 1 0 38 34 A11.5 11.5 0 1 1 38 6Z" fill="${INK}"/><path d="M50 14 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5Z" fill="${INK}"/>`
    : `<g transform="translate(16 6) scale(1)">${tiles[pattern].body}</g>`);
  const cornerCss = {
    square: '',
    round: '.box, .weather, .prayers div, .comic, .panel { border-radius: 7px; }',
    notch: `.box, .weather { position: relative; } .box::before, .weather::before { content: ''; position: absolute; top: -5px; left: -5px; width: 9px; height: 9px; background: #fff; border: 1.5px solid ${INK}; transform: rotate(45deg); }`,
    ticks: `.box, .weather { position: relative; } .box::after, .weather::after { content: ''; position: absolute; right: -4px; bottom: -4px; width: 12px; height: 12px; border-right: 2px solid ${INK}; border-bottom: 2px solid ${INK}; }`,
  }[corners];
  const css = `
.band { position: absolute; left: 0.42in; right: 0.42in; top: 0.07in; height: 0.22in; background-image: ${uri(band)}; background-repeat: repeat-x; background-size: auto 100%; opacity: .85; }
.kicker::before { content: ''; display: inline-block; width: 9pt; height: 9pt; margin-right: 5px; vertical-align: -1pt; background: ${uri(svg(12, 12, marks[mark]))} no-repeat center / contain; }
.wx-icon { position: absolute; right: 8px; top: 6px; width: 0.62in; height: 0.62in; background: ${uri(svg(64, 64, icons[wk]))} no-repeat center / contain; }
.flourish { display: inline-block; width: 0.55in; height: 0.37in; vertical-align: middle; background: ${uri(flourish)} no-repeat center / contain; }
.flourish.r { transform: scaleX(-1); }
${cornerCss}
`;
  return { name, css, weather: wk, pattern, mark, corners };
}

export { pickTheme, weatherKind };
