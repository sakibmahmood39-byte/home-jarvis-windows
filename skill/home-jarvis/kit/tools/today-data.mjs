// Today's public facts for the desk and the paper: weather (Open-Meteo) and prayer times + Hijri date (AlAdhan).
// Both are free and need no account or key. Cached per day in me/cache/.
// Usage: node tools/today-data.mjs [YYYY-MM-DD]   -> prints JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettings } from '../paper/build.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };

const ymd = (d, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const to12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

async function getJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'home-jarvis' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${new URL(url).host} said ${r.status}`);
  return r.json();
}

export async function todayData(date, s = loadSettings()) {
  const tz = s.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const day = date || ymd(new Date(), tz);
  const cacheDir = path.join(kit, 'me', 'cache');
  const cacheFile = path.join(cacheDir, `today-${day}.json`);
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (Date.now() - c.fetched_at < 3 * 3600e3) return c;
  } catch {}
  const out = { date: day, fetched_at: Date.now(), place: s.place_label || '' };
  const F = (s.units || 'C') === 'F';
  try {
    const w = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&timezone=auto&forecast_days=3`
      + `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code${F ? '&temperature_unit=fahrenheit' : ''}`);
    const u = F ? '°F' : '°C';
    out.weather = {
      now: `${WMO[w.current.weather_code] || 'Weather'}, ${Math.round(w.current.temperature_2m)}${u}`,
      today: `${WMO[w.daily.weather_code[0]] || ''}, high ${Math.round(w.daily.temperature_2m_max[0])}${u}, low ${Math.round(w.daily.temperature_2m_min[0])}${u}; ${w.daily.precipitation_probability_max[0] ?? 0}% rain`,
      outlook: [1, 2].map(i => `${new Date(w.daily.time[i] + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' })} ${Math.round(w.daily.temperature_2m_max[i])}°, ${(WMO[w.daily.weather_code[i]] || '').toLowerCase()}`).join(' · '),
    };
  } catch (e) { out.weather_error = e.message; }
  if ((s.faith || 'islam') === 'islam') {
    try {
      const [y, m, d] = day.split('-');
      const a = await getJson(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${s.lat}&longitude=${s.lon}&method=${s.prayer_method ?? 2}&school=${s.asr_school ?? 0}`);
      const t = a.data.timings;
      out.prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => [k, to12(t[k].slice(0, 5))]);
      const h = a.data.date.hijri;
      out.hijri = `${h.day} ${h.month.en} ${h.year}`;
    } catch (e) { out.prayer_error = e.message; }
  }
  try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out, null, 1)); } catch {}
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  todayData(process.argv[2]).then(d => console.log(JSON.stringify(d, null, 2)), e => { console.error(e.message); process.exit(1); });
}
