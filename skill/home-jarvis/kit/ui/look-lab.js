// one widget card and the header. Nothing here touches the real app; it only draws.
import * as THREE from 'three';
import { createArc } from './look-lab-arc.js';
import { createObsidian } from './look-lab-obsidian.js';
import { createAtlas } from './look-lab-atlas.js';
import { spring, smooth, ease, clamp01 } from './look-lab-kit.js';

const $ = (id) => document.getElementById(id);
const LOOP = 10;
// The same little conversation plays in every look, so they can be compared like for like.
const SCRIPT = [
  { name: 'idle', from: 0, to: 1.6, label: 'Waiting' },
  { name: 'listening', from: 1.6, to: 3.8, label: 'Listening' },
  { name: 'thinking', from: 3.8, to: 5.4, label: 'Thinking' },
  { name: 'speaking', from: 5.4, to: 9.0, label: 'Speaking' },
  { name: 'idle', from: 9.0, to: 10, label: 'Waiting' },
];
const HEARD = 'What does tomorrow look like?'.split(' ');
const SAID = 'Fajr is at 5:21 tomorrow. Rain most of the day, so leave a little early.'.split(' ');

const shared = {
  header: (brand = 'JARVIS') => `<header class="hd"><div class="brand"><img src="./assets/logo.png" alt=""><span>${brand}</span></div>
    <div class="st"><i></i><span data-state>Waiting</span></div>
    <nav class="tabs"><b class="on">Core</b><b>Car</b><b>House</b><b>Room</b><b>Today</b><b>Business</b><b>Settings</b></nav><time data-clock></time></header>`,
  card: `<section class="card" data-card><div class="k">Tomorrow · Fri 13 Nov</div>
    <div class="r"><span>Fajr</span><b>5:21 AM</b></div><div class="r"><span>Weather</span><b>10°C · rain 99%</b></div>
    <div class="r"><span>First up</span><b>Daily meeting · noon</b></div></section>`,
  caption: `<div class="cap"><div class="heard" data-heard></div><div class="said" data-said></div></div>`,
};

// ---------- Renderer, shared by all three looks ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const makers = { arc: createArc, obsidian: createObsidian, atlas: createAtlas };
const looks = {};
let active = null, name = '';
const ui = $('ui');
const cardSpring = spring(0.42);
const lvl = { v: 0 };

function size() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  for (const l of Object.values(looks)) l.resize(w, h);
}
addEventListener('resize', size);

function show(n) {
  if (!makers[n] || n === name) return;
  const go = () => {
    if (!looks[n]) { looks[n] = makers[n](renderer, shared); looks[n].resize(innerWidth, innerHeight); }
    name = n; active = looks[n]; stats.look = n; document.body.dataset.look = n;
    ui.innerHTML = active.html; active.mount(ui);
    refs = { states: [...ui.querySelectorAll('[data-state]')], clock: ui.querySelector('[data-clock]'), heard: ui.querySelector('[data-heard]'), said: ui.querySelector('[data-said]'), card: ui.querySelector('[data-card]'), counts: [-1, -1] };
    document.querySelectorAll('#lab .seg button').forEach((b) => b.classList.toggle('on', b.dataset.l === n));
    history.replaceState(null, '', '#' + n); cardSpring.set(0); tick();
  };
  const fade = $('fade');
  if (!active || reduce.matches) { go(); return; }
  fade.classList.add('on'); setTimeout(() => { go(); requestAnimationFrame(() => fade.classList.remove('on')); }, 220);
}
let refs = {};

// ---------- The 10-second timeline ----------
let T = 0;
function phaseAt(t) { return SCRIPT.find((p) => t >= p.from && t < p.to) || SCRIPT[0]; }
function voice(t, rate) {
  const syl = Math.pow(Math.max(0, Math.sin(t * rate)), 0.6), fine = 0.62 + 0.38 * Math.sin(t * 31.7) * Math.sin(t * 17.3), phrase = 0.6 + 0.4 * Math.sin(t * 1.9);
  return Math.min(1, syl * fine * phrase * 1.15);
}
function state(dt) {
  const ph = phaseAt(T), pp = (T - ph.from) / (ph.to - ph.from);
  const env = ease(clamp01(pp / 0.12)) * ease(clamp01((1 - pp) / 0.12));
  const target = ph.name === 'listening' ? voice(T, 13) * env : ph.name === 'speaking' ? voice(T, 15.5) * env * 0.85 : 0;
  lvl.v = smooth(lvl.v, target, target > lvl.v ? 22 : 9, dt);
  const cardOn = T > 5.7 && T < 9.45;
  const card = cardSpring.step(cardOn ? 1 : 0, dt);
  return { t: T, dt, phase: ph.name, label: ph.label, pp, level: lvl.v, motion: reduce.matches ? 0.15 : 1, reduce: reduce.matches, card };
}
function words(el, list, n, i) {
  if (!el || refs.counts[i] === n) return; refs.counts[i] = n;
  el.innerHTML = list.slice(0, n).map((w) => `<span class="w">${w}</span>`).join(' ');
}
function updateUI(s) {
  for (const e of refs.states || []) if (e.textContent !== s.label) e.textContent = s.label;
  const heardN = s.phase === 'listening' ? Math.min(HEARD.length, Math.ceil(s.pp * HEARD.length * 1.2)) : s.phase === 'thinking' || (s.phase === 'speaking') ? HEARD.length : 0;
  const saidN = s.phase === 'speaking' ? Math.min(SAID.length, Math.ceil(s.pp * SAID.length * 1.15)) : s.t >= 9 ? SAID.length : 0;
  words(refs.heard, HEARD, heardN, 0); words(refs.said, SAID, saidN, 1);
  if (refs.heard) refs.heard.style.opacity = s.phase === 'speaking' ? 0.55 : 1;
  if (refs.said) refs.said.style.opacity = s.t > 9.5 ? 0 : 1;
  if (refs.card) {
    const k = clamp01(s.card);
    refs.card.style.opacity = k.toFixed(3);
    if (!active.placesCard) refs.card.style.transform = s.reduce ? 'none' : `translateY(${((1 - k) * 18).toFixed(2)}px) scale(${(0.965 + 0.035 * k).toFixed(4)})`;
  }
  ui.style.setProperty('--lv', s.level.toFixed(3));
}
function tick() { const d = new Date(); if (refs.clock) refs.clock.textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); }
setInterval(tick, 10000);

// ---------- Frame loop, frame-rate meter, pausing ----------
let last = performance.now(), paused = false, fpsAcc = [], shownFps = 0;
const stats = { fps: 0, frames: 0, slow: 0, look: '' }; window.__lab = stats;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now;
  if (paused || !active) return;
  const dt = Math.min(raw, 0.1);
  T = (T + dt) % LOOP;
  const s = state(dt); s.fps = shownFps;
  active.update(s); updateUI(s); active.render(dt);
  $('prog').style.transform = `scaleX(${(T / LOOP).toFixed(4)})`;
  fpsAcc.push(raw); stats.frames++; if (raw > 1 / 50) stats.slow++;
  if (fpsAcc.length >= 30) { const avg = fpsAcc.reduce((a, b) => a + b, 0) / fpsAcc.length; shownFps = Math.round(1 / avg); stats.fps = shownFps; stats.look = name; $('fps').textContent = `${shownFps} fps`; fpsAcc = []; }
}
const setPaused = (p) => { paused = p; last = performance.now(); };
document.addEventListener('visibilitychange', () => setPaused(document.hidden));
// The Mac app talks to whatever page is open; on this page only "visible" matters, everything else is ignored.
window.jarvis = new Proxy({ visible: (v) => setPaused(!v) }, { get: (o, k) => o[k] || (() => {}) });

// ---------- Controls ----------
document.querySelectorAll('#lab .seg button').forEach((b) => b.addEventListener('pointerdown', () => show(b.dataset.l)));
$('back').addEventListener('click', () => { location.href = './index.html'; });
addEventListener('keydown', (e) => {
  const order = ['arc', 'obsidian', 'atlas'];
  if (e.key === '1' || e.key === 'a') show('arc'); else if (e.key === '2' || e.key === 'b') show('obsidian'); else if (e.key === '3' || e.key === 'c') show('atlas');
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') show(order[(order.indexOf(name) + (e.key === 'ArrowRight' ? 1 : 2)) % 3]);
  else if (e.key === 'h' || e.key === 'H') $('lab').classList.toggle('hide');
  else if (e.key === 'r' || e.key === 'R') T = 0;
  else if (e.key === 'Escape') location.href = './index.html';
});
const syncReduce = () => { $('rm').hidden = !reduce.matches; };
reduce.addEventListener?.('change', syncReduce); syncReduce();

const want = location.hash.slice(1).split('&');
size(); show(makers[want[0]] ? want[0] : 'arc');
if (want.includes('clean')) $('lab').classList.add('hide');
requestAnimationFrame(frame);
