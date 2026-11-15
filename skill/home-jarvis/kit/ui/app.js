import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSettings } from './settings.js';
import { createKnowledge } from './knowledge.js';
import { createFlow, createChips, setLabel } from './flow.js';
import { createLooks, DEFAULT as LOOK_DEFAULT } from './looks.js';
import { createFrame } from './frame.js';
import { createTones } from './tones.js';
import { createWidgets } from './widgets.js';
import { installBusiness } from './widgets/index.js';
import { createConnections } from './connections-card.js';

const $ = (id) => document.getElementById(id);
const post = (o) => window.webkit?.messageHandlers?.jarvis?.postMessage(o);
window.addEventListener('unhandledrejection', (e) => post({ cmd: 'ui-error', text: String(e.reason && (e.reason.stack || e.reason)) }));
const hash = new URLSearchParams(location.hash.slice(1));
const COLORS = { off: 0x46525c, waiting: 0x2a86b8, listening: 0x37e0ff, thinking: 0x8a7dff, speaking: 0xffbe6b };
const CFG = window.JARVIS_CONFIG || {};  // his own details, from the questionnaire (me/settings.json)
const CALL = CFG.call_me || 'boss';
const PAINT = parseInt(String((CFG.car || {}).color || '#7c8288').replace('#', ''), 16) || 0x7c8288;

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070b);
scene.fog = new THREE.Fog(0x04070b, 16, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = studioEnv;
scene.environmentIntensity = 0.5;
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 120);
camera.position.set(0, 0.2, 7);
scene.add(camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.495; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, 256, 256); ao.updateGtaoMaterial({ radius: 0.28, distanceExponent: 1.4, thickness: 1, scale: 1.25, samples: 16, distanceFallOff: 1, screenSpaceRadius: false }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); ao.blendIntensity = 1; ao.enabled = false; composer.addPass(ao); // soft shadow where things meet, for the room
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const looks = createLooks({ renderer, onBackground: (hex) => { scene.background.setHex(hex); scene.fog.color.setHex(hex); } });
const PHASE = { off: 'off', waiting: 'idle', listening: 'listening', thinking: 'thinking', speaking: 'speaking' };
let stateExtra = '';
const frame = createFrame({ post }); $('state').after(frame.el);
const tones = createTones();
// The frame must never stop the rest of a message from the app; and a new look re-colours everything at once.
const safe = (f) => { try { f(); } catch (e) { console.error('frame:', e); post({ cmd: 'ui-error', text: 'frame: ' + (e.stack || e) }); } };
function lookColour() { colorTo.setHex(looks.colour(stateExtra || mode, COLORS)); color.copy(colorTo); document.documentElement.style.setProperty('--a', `#${colorTo.getHexString()}`); }
const widgets = createWidgets({ post }); document.body.append(widgets.layer);
const biz = installBusiness(widgets, { post });
const fpsBox = Object.assign(document.createElement('div'), { id: 'fpsBox', hidden: true }); fpsBox.style.cssText = 'position:fixed;right:22px;bottom:72px;font:700 11px var(--mono);color:var(--muted);background:var(--glass);border:1px solid var(--line);border-radius:8px;padding:4px 8px;z-index:60;pointer-events:none';
document.body.append(fpsBox); const fpsLog = [];
addEventListener('keydown', (e) => { if (e.key === 'F' && e.shiftKey && document.activeElement?.tagName !== 'INPUT') fpsBox.hidden = !fpsBox.hidden; });
// The tabs can wrap onto two rows (narrow window, the frame beside them): keep the panels and chat below them.
const fitTop = () => { const b = document.querySelector('.top')?.getBoundingClientRect().bottom || 54; document.documentElement.style.setProperty('--top-h', `${Math.ceil(b)}px`); };
document.fonts?.ready.then(fitTop); new ResizeObserver(fitTop).observe(document.querySelector('.top'));
const syncWidgets = () => { widgets.setActive(view === 'core' && layoutNow !== 'pill'); markMore(); };
const moreMenu = $('moreMenu'), moreBtn = $('moreBtn');
const showMore = (b) => { moreMenu.hidden = !b; moreBtn.setAttribute('aria-expanded', b); };
function markMore() { moreBtn.classList.toggle('on', !!moreMenu.querySelector('.on')); }
moreBtn.onclick = (e) => { e.stopPropagation(); showMore(moreMenu.hidden); };
moreMenu.addEventListener('click', () => showMore(false));
addEventListener('pointerdown', (e) => { if (!moreMenu.hidden && !e.target.closest('.more')) showMore(false); });

const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
let handLights = [];
const glow = (color, k = 3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: k });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = shadow; parent?.add(m); return m;
}
const box = (w, h, d, mat, parent, x, y, z, r = 0) => mesh(r ? new RoundedBoxGeometry(w, h, d, 4, r) : new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);

// ---------- The core: the glowing thing that listens ----------
const core = new THREE.Group(); scene.add(core);
const coreU = { t: { value: 0 }, level: { value: 0 }, color: { value: new THREE.Color(COLORS.waiting) }, power: { value: 0.5 } };
const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 48), new THREE.ShaderMaterial({
  uniforms: coreU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `uniform float t,level,power; varying vec3 vN,vV; varying float vD;
    float n(vec3 p){return (sin(p.x*3.1+t*1.1)+sin(p.y*4.3-t*.9)+sin(p.z*3.7+t*1.3)+sin((p.x+p.y+p.z)*6.1+t*2.1)*.5)/3.5;}
    void main(){ float d=n(position)*(.05+.05*power+level*.42); vD=d; vec3 p=position+normal*d;
      vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 color; uniform float power,level; varying vec3 vN,vV; varying float vD;
    void main(){ float f=pow(1.-abs(dot(vN,vV)),2.4); vec3 c=color*(f*(.62+power*.62+level*1.1)+.015+abs(vD)*.42); gl_FragColor=vec4(c,f*.9+.04); }`,
})); core.add(shell);
const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,.75)'); r.addColorStop(0.55, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })(), color: COLORS.waiting, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
core.add(heart);
const rings = [1.3, 1.5, 1.72].map((r, i) => {
  const m = mesh(new THREE.TorusGeometry(r, 0.004 + i * 0.001, 8, 220), new THREE.MeshBasicMaterial({ color: COLORS.waiting, transparent: true, opacity: 0.75 }), core, 0, 0, 0, false);
  m.rotation.set(1.2 + i * 0.5, i * 0.7, 0); return m;
});
const dots = (() => {
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1.5 + Math.random() * 1.5);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: COLORS.waiting, size: 0.014, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.add(p); return p;
})();

const carStage = new THREE.Group(); scene.add(carStage);
const carG = new THREE.Group(); carStage.add(carG);
const paint = new THREE.MeshPhysicalMaterial({ color: PAINT, metalness: 0.75, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.5 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x070a0d, metalness: 0.2, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.8 });
const trim = std(0x0c0d0f, 0.55, 0.3), chrome = std(0xcfd6db, 0.16, 1), tyre = std(0x0a0a0b, 0.92);
function extrude(pts, depth, mat, parent, z = 0, bevel = 0.05, holes = []) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  holes.forEach((h) => s.holes.push(h));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments: 24 });
  g.translate(0, 0, -depth / 2 + z); return mesh(g, mat, parent);
}
{
  const WF = 1.44, WR = -1.38, R = 0.44, H = 0.3;
  const body = new THREE.Shape();
  body.moveTo(2.38, H + 0.06); body.lineTo(2.42, 0.78); body.lineTo(2.34, 1.04); body.lineTo(1.0, 1.14); body.lineTo(-2.3, 1.2); body.lineTo(-2.4, 0.86); body.lineTo(-2.36, H + 0.06);
  body.lineTo(WR - R, H); body.absarc(WR, H, R, Math.PI, 0, true); body.lineTo(WF - R, H); body.absarc(WF, H, R, Math.PI, 0, true); body.lineTo(2.38, H + 0.06);
  const lower = new THREE.ExtrudeGeometry(body, { depth: 1.78, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 6, curveSegments: 28 });
  lower.translate(0, 0, -0.89); mesh(lower, paint, carG);
  const cab = [[1.22, 1.1], [0.52, 1.66], [0.3, 1.71], [-1.7, 1.73], [-2.12, 1.66], [-2.3, 1.16]];
  extrude(cab, 1.46, paint, carG, 0, 0.09);
  extrude([[1.02, 1.17], [0.47, 1.6], [0.3, 1.63], [-0.42, 1.64], [-0.42, 1.17]], 1.66, glass, carG, 0, 0.01);
  extrude([[-0.5, 1.17], [-0.5, 1.64], [-1.32, 1.65], [-1.32, 1.18]], 1.66, glass, carG, 0, 0.01);
  extrude([[-1.4, 1.18], [-1.4, 1.65], [-1.82, 1.65], [-2.06, 1.4], [-2.14, 1.19]], 1.66, glass, carG, 0, 0.01);
  const ws = box(0.02, 0.9, 1.42, glass, carG, 0.87, 1.38, 0); ws.rotation.z = 0.9;
  const rw = box(0.02, 0.46, 1.3, glass, carG, -2.26, 1.42, 0); rw.rotation.z = -0.34;
  // Lower cladding, door lines, handles, rails, mirrors
  for (const z of [0.95, -0.95]) {
    box(4.6, 0.17, 0.02, trim, carG, 0, 0.38, z);
    for (const x of [-0.46, 0.62, -1.36]) box(0.012, 0.74, 0.014, trim, carG, x, 0.8, z);
    for (const x of [0.1, -0.86]) box(0.2, 0.035, 0.02, chrome, carG, x, 1.04, z + Math.sign(z) * 0.006);
    box(3.1, 0.022, 0.02, chrome, carG, -0.5, 1.17, z * 0.885);
    box(2.2, 0.035, 0.05, trim, carG, -0.7, 1.82, z * 0.7);
    for (const x of [0.4, -1.8]) box(0.07, 0.09, 0.05, trim, carG, x, 1.78, z * 0.7);
    const mirror = box(0.2, 0.12, 0.17, paint, carG, 0.82, 1.2, z * 0.93, 0.03); mirror.rotation.y = 0.2;
  }
  // Front: the big grille and the H-shaped lights this model is known for
  box(0.03, 0.34, 1.34, trim, carG, 2.48, 0.72, 0);
  for (let i = 0; i < 6; i++) box(0.012, 0.012, 1.3, chrome, carG, 2.5, 0.6 + i * 0.05, 0);
  box(0.04, 0.2, 1.1, chrome, carG, 2.44, 0.36, 0);
  const drl = glow(0xeaf6ff, 5), tail = glow(0xff2a1f, 4); handLights = [drl, tail];
  for (const s of [1, -1]) {
    box(0.02, 0.26, 0.022, drl, carG, 2.49, 0.92, s * 0.86); box(0.02, 0.26, 0.022, drl, carG, 2.49, 0.92, s * 0.62); box(0.02, 0.022, 0.24, drl, carG, 2.49, 0.92, s * 0.74);
    box(0.02, 0.3, 0.022, tail, carG, -2.47, 0.98, s * 0.86); box(0.02, 0.3, 0.022, tail, carG, -2.47, 0.98, s * 0.62); box(0.02, 0.022, 0.24, tail, carG, -2.47, 0.98, s * 0.74);
  }
  box(0.02, 0.03, 1.5, drl, carG, 2.49, 1.05, 0); box(0.02, 0.02, 1.0, tail, carG, -2.47, 1.1, 0);
  box(0.04, 0.2, 1.3, trim, carG, -2.44, 0.42, 0); box(0.03, 0.06, 1.2, chrome, carG, -2.46, 0.36, 0);
  // Wheels: 20-inch alloys
  const tg = new THREE.TorusGeometry(0.28, 0.1, 18, 48), rim = new THREE.CylinderGeometry(0.235, 0.235, 0.2, 40);
  const wheels = [];
  for (const x of [WF, WR]) for (const z of [0.84, -0.84]) {
    const w = new THREE.Group(); w.position.set(x, 0.38, z); carG.add(w); wheels.push(w);
    const t = mesh(tg, tyre, w); t.scale.z = 1.5;
    const c = mesh(rim, std(0x24282c, 0.3, 0.9), w); c.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { const s = box(0.205, 0.022, 0.02, chrome, w, 0, 0, Math.sign(z) * 0.115); s.position.x = Math.cos(i * 0.628) * 0.11; s.position.y = Math.sin(i * 0.628) * 0.11; s.rotation.z = i * 0.628; }
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 20), chrome, w, 0, 0, Math.sign(z) * 0.12).rotation.x = Math.PI / 2;
  }
}
const CAR_TURN = 0; const realCar = new THREE.Group(); carG.add(realCar);
let realCarAsked = false;
const P = (o) => new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, ...o });
const carSkin = P({ color: PAINT, metalness: 0.82, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4 });
const carGlass = P({ color: 0x0b1014, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.42, clearcoat: 1, envMapIntensity: 1.7, depthWrite: false });
const carShell = P({ color: 0x0e0f11, roughness: 0.62, metalness: 0.15 }); // the panels under the paint
const carHead = P({ color: 0x4d555c, metalness: 0.3, roughness: 0.08, emissive: 0xf2f8ff, emissiveIntensity: 0 });
const headBeams = [];  // two beams that light the floor ahead while it runs
const carTail = P({ color: 0x3a0606, emissive: 0xff1a12, emissiveIntensity: 0.32, roughness: 0.2 });
const CAR_PARTS = [
  [/santafek_led/i, carHead], [/body/i, carSkin], [/glass/i, carGlass],
  [/redgl|rearotr|otr_rear|_red|rearl/i, carTail],
  [/_L$|_R$/i, carGlass], [/revers|_sg\b/i, P({ color: 0xc9d2d8, metalness: 0.4, roughness: 0.12 })],
  [/chr|chrom/i, P({ color: 0xd4dadf, metalness: 1, roughness: 0.14 })], [/mirror/i, P({ color: 0xb6c4cc, metalness: 1, roughness: 0.03 })],
  [/alum/i, P({ color: 0x2c3034, metalness: 0.92, roughness: 0.26, clearcoat: 0.6 })],
  [/tire/i, P({ color: 0x0d0d0e, roughness: 0.92 })], [/brakedisc/i, P({ color: 0x7c7f83, metalness: 0.9, roughness: 0.4 })], [/calipers/i, P({ color: 0x1b1c1f, metalness: 0.5, roughness: 0.4 })],
  [/leath2|alca/i, P({ color: 0xd8d4ca, roughness: 0.66 })], [/leath/i, P({ color: 0xece9e1, roughness: 0.58, clearcoat: 0.12 })], [/wood/i, P({ color: 0x8a8880, metalness: 0.4, roughness: 0.38, clearcoat: 0.5 })],
  [/carpet/i, P({ color: 0x2a2a2a, roughness: 0.98 })], [/rul/i, P({ color: 0x1d1d1f, roughness: 0.55 })], [/ambi/i, P({ color: 0x041018, emissive: 0x2a8cff, emissiveIntensity: 0.9 })],
  [/screen|speed|dyn|text/i, P({ color: 0x050709, emissive: 0x1d6fa8, emissiveIntensity: 0.5, roughness: 0.2 })],
  [/plates/i, P({ color: 0xc8c8c8, roughness: 0.5 })], [/etk/i, carShell], [/black/i, P({ color: 0x0e0f11, roughness: 0.62, metalness: 0.15 })],
];
const partFor = (mat) => (CAR_PARTS.find(([re]) => re.test(mat?.name || '')) || [0, P({ color: 0x17181b, roughness: 0.6 })])[1];
function realCarRemap(m) {
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (/etk_engine/i.test([].concat(o.material)[0]?.name || '')) { o.visible = false; return; } // leftover game parts under the hood
    o.material = Array.isArray(o.material) ? o.material.map(partFor) : partFor(o.material);
  });
}
let realCarIn = false;
function loadRealCar() {
  return; // the hand-built car is used; no outside model file is shipped
  if (realCarAsked) return; realCarAsked = true;
  new FBXLoader().load('./assets/car/car.fbx', (m) => {
    const b0 = new THREE.Box3().setFromObject(m), s0 = b0.getSize(new THREE.Vector3());
    realCarRemap(m);
    const seen = {};
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const n = [].concat(o.material).map((x) => `${x?.name}:${x?.color?.getHexString()}:${x?.map ? 'tex' : ''}`).join('+'); seen[n] = (seen[n] || 0) + 1; } });
    console.log('CARINFO', JSON.stringify({ size: s0.toArray().map((x) => +x.toFixed(2)), meshes: Object.keys(seen).length, seen }));
    window.__carInfo = { s0, seen };
    m.scale.setScalar(4.83 / Math.max(s0.x, s0.y, s0.z)); m.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -b.min.y, -c.z);
    m.rotation.y = CAR_TURN; realCar.add(m); realCarIn = true;
    const hb = new THREE.Box3(); m.traverse((o) => { if (o.isMesh && [].concat(o.material).includes(carHead)) hb.expandByObject(o); });
    if (!hb.isEmpty()) {
      carG.updateMatrixWorld(true);
      const hc = carG.worldToLocal(hb.getCenter(new THREE.Vector3())), dir = hc.clone().setY(0).normalize(), across = new THREE.Vector3(-dir.z, 0, dir.x);
      for (const side of [-1, 1]) {
        const sp = new THREE.SpotLight(0xf2f6ff, 0, 11, 0.45, 0.75, 1.2), at = hc.clone().addScaledVector(across, 0.62 * side);
        sp.position.copy(at); sp.target.position.copy(at).addScaledVector(dir, 5).setY(0); carG.add(sp, sp.target); headBeams.push(sp);
      }
    }
    carG.children.forEach((k) => { if (k !== realCar) k.visible = false; }); applyInside();
    if (hash.get('yaw')) { carG.rotation.y = +hash.get('yaw'); }
  }, undefined, (e) => console.log('CARFAIL', e?.message || e));
}
// What's inside: shown when the shell turns see-through
const inside = new THREE.Group(); inside.visible = false; carG.add(inside);
{
  const seat = std(0x8a6a4a, 0.7), holo = (c, k = 1.6) => glow(c, k);
  for (const [x, z] of [[0.2, 0.42], [0.2, -0.42], [-0.72, 0.5], [-0.72, 0], [-0.72, -0.5]]) {
    box(0.46, 0.13, 0.42, seat, inside, x, 0.68, z, 0.03);
    const b = box(0.12, 0.56, 0.42, seat, inside, x - 0.26, 0.98, z, 0.03); b.rotation.z = 0.18;
  }
  box(0.42, 0.26, 1.5, std(0x2a2017, 0.6), inside, 0.82, 0.96, 0);
  box(0.02, 0.15, 0.72, glow(0x7fd8ff, 1.5), inside, 0.62, 1.1, 0.14);
  mesh(new THREE.TorusGeometry(0.15, 0.02, 12, 32), trim, inside, 0.52, 1.02, 0.42).rotation.y = Math.PI / 2;
  box(0.84, 0.58, 1.1, holo(0xff8a3c, 0.9), inside, 1.7, 0.72, 0, 0.05);             // engine
  box(1.5, 0.16, 1.2, holo(0x37e0ff, 1.6), inside, -0.3, 0.42, 0, 0.03);              // hybrid battery
  box(0.6, 0.22, 0.9, holo(0x57ff9a, 0.9), inside, -1.25, 0.46, 0, 0.05);             // fuel tank
}
const carFloor = mesh(new THREE.CircleGeometry(16, 96), std(0x020305, 0.7, 0.1, { envMapIntensity: 0.05 }), carStage); carFloor.rotation.x = -Math.PI / 2; carFloor.castShadow = false;
const haloMat = new THREE.MeshBasicMaterial({ color: 0x37e0ff, transparent: true, opacity: 0.8 });
const halo = mesh(new THREE.RingGeometry(3.55, 3.585, 128), haloMat, carStage, 0, 0.004, 0, false); halo.rotation.x = -Math.PI / 2;
const carRings = []; // the outer floor rings follow the look's colour, dimmed
for (const r of [4.6, 5.8]) { const m = mesh(new THREE.RingGeometry(r, r + 0.012, 128), new THREE.MeshBasicMaterial({ color: 0x1d6b86, transparent: true, opacity: 0.6 }), carStage, 0, 0.004, 0, false); carRings.push(m.material); m.rotation.x = -Math.PI / 2; }
const key = new THREE.SpotLight(0xe8f4ff, 150, 26, 0.5, 0.8, 1.4); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; carStage.add(key, key.target);
const rim1 = new THREE.PointLight(0x37e0ff, 7, 18); rim1.position.set(-7, 3.4, -7); carStage.add(rim1);
const rim2 = new THREE.PointLight(0xffb56b, 5, 16); rim2.position.set(8, 3, -7); carStage.add(rim2);

const room = new THREE.Group(); scene.add(room);
const spots = [];
const ROOMC = CFG.room || {}, FT = 0.3048, RW = Number(ROOMC.width_ft) || 11, RD = Number(ROOMC.depth_ft) || 12, RH = Number(ROOMC.height_ft) || 8, wx = (x) => (x - RW / 2) * FT, wz = (z) => (z - RD / 2) * FT, wy = (y) => y * FT;
const ftv = (x, y, z) => [wx(x), wy(y), wz(z)];
function span(x0, x1, y0, y1, z0, z1, mat, parent = room, r = 0) { // a block from its edges, in feet
  return box((x1 - x0) * FT, (y1 - y0) * FT, (z1 - z0) * FT, mat, parent, wx((x0 + x1) / 2), wy((y0 + y1) / 2), wz((z0 + z1) / 2), r);
}
function tex(w, h, draw, rx = 1, ry = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 12; return t;
}
const speckle = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
// Pleated cloth: a curtain with real folds
function pleats(x0, x1, y0, y1, z, folds, amp, mat) {
  const g = new THREE.PlaneGeometry((x1 - x0) * FT, (y1 - y0) * FT, folds * 10, 24), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / ((x1 - x0) * FT) + 0.5, v = p.getY(i) / ((y1 - y0) * FT) + 0.5; p.setZ(i, Math.sin(u * folds * Math.PI * 2) * amp * FT * (0.55 + v * 0.45) + Math.sin(u * 7 + v * 3) * 0.004); }
  g.computeVertexNormals(); const m = mesh(g, mat, room, wx((x0 + x1) / 2), wy((y0 + y1) / 2), wz(z)); return m;
}
// Soft bedding: a cover that lies over the mattress and falls off its edges
function bedding(x0, x1, z0, z1, top, mat) {
  const w = (x1 - x0) * FT, d = (z1 - z0) * FT, over = 0.5 * FT, g = new THREE.PlaneGeometry(w + over * 2, d + over, 90, 120); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), ex = Math.max(0, Math.abs(x) - w / 2 + 0.03), ez = Math.max(0, z - d / 2 + over / 2 - over + 0.03);
    const soft = Math.sin(x * 9 + z * 3.3) * 0.009 + Math.sin(x * 3.1 - z * 7.7) * 0.012 + Math.sin(x * 17 + z * 13) * 0.003;
    const drop = Math.min(0.5, ex * 1.5 + ez * 1.5); p.setY(i, soft * (1 - Math.min(1, drop * 3)) - drop); p.setX(i, x + Math.sin(z * 18) * 0.005 * Math.min(1, drop * 6));
  }
  g.computeVertexNormals(); const m = mesh(g, mat, room, wx((x0 + x1) / 2), wy(top), wz((z0 + z1) / 2 + 0.25)); return m;
}
const print3d = {};
{
  // A plain room built from his answers (CFG.room: width_ft, depth_ft, items[]). Claude Code reshapes it to his real room.
  const W = RW * FT, D = RD * FT, H = RH * FT;
  const wood = tex(1024, 1024, (g, w, h) => {
    const rows = 10, rh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) { const v = Math.random() * 22 - 10; g.fillStyle = `rgb(${128 + v},${88 + v * 0.8},${56 + v * 0.55})`; g.fillRect(x * (w / 4) + (y % 3) * 90, y * rh, w / 4, rh); g.strokeStyle = 'rgba(40,22,8,.35)'; g.strokeRect(x * (w / 4) + (y % 3) * 90, y * rh, w / 4, rh); }
    speckle(g, w, h, 4000, 0.05);
  }, RW / 4, RD / 4);
  const wallM = std(0xe7e4de, 0.92), floorM = std(0xffffff, 0.62, 0, { map: wood }), wallT = std(0xd9d5ce, 0.9);
  const fabric = std(0x51606e, 0.95), sheet = std(0xeeeae4, 0.9), darkWood = std(0x3a2a1e, 0.7), metal = std(0x2b2f34, 0.4, 0.6), white = std(0xf2f2ef, 0.5);
  span(0, RW, -0.05, 0, 0, RD, floorM);                       // floor
  span(-0.25, 0, 0, RH, 0, RD, wallM);                        // left wall
  span(0, RW, 0, RH, -0.25, 0, wallM);                        // back wall
  span(0, RW, 0, 0.35, 0.02, 0.06, wallT); span(0.02, 0.06, 0, 0.35, 0, RD, wallT); // skirting
  const winX = Number(ROOMC.window_x_ft) || RW * 0.55;          // a window on the back wall
  span(winX - 1.6, winX + 1.6, 3, 6.6, -0.04, 0.02, std(0xbfe3ff, 0.05, 0, { emissive: 0x9fd2ff, emissiveIntensity: 0.55 }));
  span(winX - 1.75, winX + 1.75, 2.9, 3.0, -0.05, 0.25, white);
  pleats(winX - 2.6, winX - 1.5, 0.6, 7.4, 0.18, 4, 0.12, std(0xcfc6b8, 0.95, 0, { side: THREE.DoubleSide }));
  pleats(winX + 1.5, winX + 2.6, 0.6, 7.4, 0.18, 4, 0.12, std(0xcfc6b8, 0.95, 0, { side: THREE.DoubleSide }));
  const ITEMS = Array.isArray(ROOMC.items) && ROOMC.items.length ? ROOMC.items : [
    { type: 'bed', x: 0.3, z: RD - 7, w: 5, d: 6.6 },
    { type: 'desk', x: RW - 4.2, z: 0.3, w: 4, d: 2 },
    { type: 'printer', x: RW - 1.7, z: 3.2, w: 1.5, d: 1.5 },
    { type: 'shelf', x: 0.3, z: 0.3, w: 3, d: 1.3 },
  ];
  const at = (it) => [it.x || 0, (it.x || 0) + (it.w || 2), it.z || 0, (it.z || 0) + (it.d || 2)];
  for (const it of ITEMS) {
    const [x0, x1, z0, z1] = at(it), g = new THREE.Group(); room.add(g); g.userData.item = it;
    const sp = (a0, a1, y0, y1, b0, b1, m) => span(a0, a1, y0, y1, b0, b1, m, g);
    if (it.type === 'bed') {
      sp(x0, x1, 0, 1.1, z0, z1, darkWood); sp(x0 + 0.1, x1 - 0.1, 1.1, 1.9, z0 + 0.1, z1 - 0.1, sheet);
      sp(x0, x1, 0, 3.4, z0 - 0.25, z0, darkWood);                                   // headboard
      sp(x0 + 0.5, x0 + 2.2, 1.9, 2.3, z0 + 0.3, z0 + 1.4, white, 0.08); sp(x1 - 2.2, x1 - 0.5, 1.9, 2.3, z0 + 0.3, z0 + 1.4, white, 0.08);
      bedding(x0 + 0.1, x1 - 0.1, z0 + 1.8, z1 - 0.1, 1.92, fabric);
    } else if (it.type === 'desk') {
      sp(x0, x1, 2.4, 2.55, z0, z1, darkWood); for (const lx of [x0 + 0.1, x1 - 0.25]) for (const lz of [z0 + 0.1, z1 - 0.25]) sp(lx, lx + 0.15, 0, 2.4, lz, lz + 0.15, metal);
      const mx = (x0 + x1) / 2; sp(mx - 1.1, mx + 1.1, 3.0, 4.3, z0 + 0.3, z0 + 0.42, metal);
      const scr = sp(mx - 1.0, mx + 1.0, 3.07, 4.23, z0 + 0.43, z0 + 0.44, glow(0x37e0ff, 0.6)); sp(mx - 0.1, mx + 0.1, 2.55, 3.0, z0 + 0.32, z0 + 0.4, metal);
      sp(x1 - 0.9, x1 - 0.35, 2.55, 3.9, z0 + 0.2, z0 + 1.6, std(0x1b1d20, 0.5, 0.3));   // the PC
      sp(mx - 0.9, mx + 0.9, 1.5, 1.65, z1 + 0.4, z1 + 1.9, fabric); sp(mx - 0.9, mx + 0.9, 1.65, 3.6, z1 + 1.75, z1 + 1.9, fabric); // chair
      spots.push({ id: 'desk', label: 'Desk', sub: it.label || 'Your PC', obj: scr, at: [0, 0.3, 0], eye: ftv(mx, 5, z1 + 5), look: ftv(mx, 3, z0), blurb: 'Your PC and screen. Jarvis lives here.', asks: ['What should I work on next?', "What's on my list today?"] });
    } else if (it.type === 'printer') {
      sp(x0, x1, 0, 2.3, z0, z1, darkWood);                                           // small table
      const pr = sp(x0 + 0.1, x1 - 0.1, 2.3, 3.05, z0 + 0.15, z1 - 0.1, white, 0.05); sp(x0 + 0.25, x1 - 0.25, 3.05, 3.1, z0 + 0.2, z1 - 0.4, std(0x22262a, 0.4));
      sp(x0 + 0.3, x1 - 0.3, 2.5, 2.55, z1 - 0.15, z1 + 0.35, std(0xf8f8f6, 0.7));    // paper coming out
      spots.push({ id: 'paper', label: 'Paper printer', sub: CFG.printer || 'Your printer', obj: pr, at: [0, 0.2, 0], eye: ftv((x0 + x1) / 2 - 3, 4.6, z1 + 3.5), look: ftv((x0 + x1) / 2, 2.6, (z0 + z1) / 2), blurb: `Prints ${CFG.paper_name || 'your morning paper'} every morning.`, asks: ["Print today's paper", "What's in today's paper?"] });
    } else if (it.type === 'tv') {
      const tvS = sp(x0, x1, 3, 3 + (x1 - x0) * 0.56, z0, z0 + 0.15, std(0x050607, 0.2, 0.4)); sp(x0, x1, 0, 1.6, z0, z1, darkWood);
      spots.push({ id: 'tv', label: 'TV', sub: (CFG.tv || {}).name || 'TV', obj: tvS, at: [0, 0.5, 0], eye: ftv((x0 + x1) / 2, 4.5, z1 + 6), look: ftv((x0 + x1) / 2, 3.5, z0), blurb: 'Your TV.', asks: ['What is on the TV?'] });
    } else if (it.type === 'sofa') {
      sp(x0, x1, 0, 1.4, z0, z1, fabric, 0.1); sp(x0, x1, 1.4, 2.8, z0, z0 + 0.8, fabric);
    } else { // shelf, wardrobe, dresser, anything else: a simple cabinet
      sp(x0, x1, 0, Number(it.h) || 6, z0, z1, darkWood);
    }
  }
  const fill = new THREE.PointLight(0xffe6c9, 4.2, 12, 1.7); fill.position.set(0, H - 0.2, 0); fill.castShadow = true; fill.shadow.mapSize.set(1024, 1024); fill.shadow.bias = -0.002; room.add(fill);
  const sky = new THREE.DirectionalLight(0xdfefff, 1.4); sky.position.set(wx(winX), wy(5), wz(-6)); room.add(sky);
  room.add(new THREE.HemisphereLight(0xf4f1ea, 0x3a2e24, 0.6));
  Object.assign(print3d, { layers: [] });
}

// The room lights its own reflections, so the floor and metal pick up the window and walls
let roomEnv = null;
function bakeRoomEnv() {
  if (roomEnv) return; const was = [core.visible, carStage.visible]; core.visible = carStage.visible = false; room.position.y = -1.3; room.updateMatrixWorld(true);
  const bg = scene.background; scene.background = new THREE.Color(0xd8d8d4); const envKeep = scene.environment; scene.environment = null;
  roomEnv = pmrem.fromScene(scene, 0.035, 0.05, 20).texture; scene.background = bg; scene.environment = envKeep; room.position.y = 0; room.updateMatrixWorld(true); [core.visible, carStage.visible] = was;
}

// ---------- Moving between the three views ----------
const VIEWS = {
  core: { eye: [0, 0.15, 7], look: [0, 0, 0], min: 4, max: 11 },
  car: { eye: [6.6, 1.9, 7.4], look: [0, 0.8, 0], min: 3.6, max: 16 }, inside: { eye: [6.6, 2.15, 7.4], look: [0, 0.85, 0], min: 3.6, max: 16 },
  room: { eye: ftv(RW * 0.82, 5.6, RD * 1.0), look: ftv(RW * 0.4, 1.9, RD * 0.3), min: 0.35, max: 9, fov: 64 },
  house: { eye: [0, 24, 17], look: [0, 0, 1.2], min: 6, max: 60 },
};
let view = 'core', flying = 0, focused = null, carInside = false, carData = {}, printer = { state: 'unknown' };
let carGlow = 0;
// Running = the car says its engine is on, or Jarvis just started it (a remote start lasts its set minutes).
const carRunning = () => !!carData.engine_running && (!carData.running_until || Date.now() < Date.parse(carData.running_until));
const eyeTo = new THREE.Vector3(...VIEWS.core.eye), lookTo = new THREE.Vector3(0, 0, 0);
const pinsEl = $('pins');
let pins = [];
function setPins(list) {
  pinsEl.innerHTML = ''; pins = list.map((p) => {
    const el = document.createElement('div'); el.className = `pin${p.warn ? ' warn' : ''}${p.onClick ? ' click' : ''}`; el.innerHTML = `<b></b><span></span>`;
    el.querySelector('b').textContent = p.value; el.querySelector('span').textContent = p.label;
    if (p.onClick) el.onclick = p.onClick; pinsEl.appendChild(el); return { ...p, el };
  });
  placeHeroPins();
}
function placeHeroPins() { // labels and their lines, anchored to the car photo
  return; const svg = $('leads'); const r = svg.getBoundingClientRect();
  for (const p of pins) if (p.hero) {
    const [fx, fy, ox, oy] = p.hero, ax = r.left + fx * r.width, ay = r.top + fy * r.height, bx = ax + ox * r.width * 0.5, by = ay + oy * r.height;
    p.el.style.left = `${bx}px`; p.el.style.top = `${by}px`; p.el.style.opacity = 1;
    svg.innerHTML += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/><circle cx="${ax}" cy="${ay}" r="3.5"/>`;
  }
}
function card(title, text, buttons) {
  const c = $('card'); c.hidden = !title; if (!title) return;
  c.innerHTML = ''; const h = document.createElement('h3'); h.textContent = title; const p = document.createElement('p'); p.textContent = text; const r = document.createElement('div'); r.className = 'row';
  c.append(h, p, r); for (const b of buttons) { const e = document.createElement('button'); e.className = b.solid ? 'solid' : 'ghost'; e.textContent = b.text; e.onclick = b.do; r.appendChild(e); }
}
const TEACH_LINES = [
  "Hey Jarvis, good morning. What's on my calendar today?",
  'Hey Jarvis, start my car and set it to twenty-two degrees.',
  'Did any client pay their invoice this week? Tell me who still owes money.',
  'Hey Jarvis, how long until Asr, and when does Maghrib come in?',
  'Turn off the light in my room, and switch the plug on.',
  'Play some Quran recitation on YouTube in my Chrome.',
  'Hey Jarvis, what did I put on my list for tomorrow?',
  'Print my paper again, both sides please.',
  'Remind me at nine tonight to call my mother about the weekend.',
  "Hey Jarvis, that's all for now. Thank you, I'll talk to you later.",
];
let teachOpen = false, teachAt = 0, teachHits = [], teachMics = [], teachMic = '', teachNext = null;
const teachWord = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const sameWord = (a, b) => a === b || (a.length > 3 && b.length > 3 && a.slice(0, 3) === b.slice(0, 3) && Math.abs(a.length - b.length) <= 2);
function teachClose(cancel) { teachOpen = false; clearTimeout(teachNext); card('', '', []); if (cancel) post({ cmd: 'voice-teach-cancel' }); }
function teachPick(text) {
  card('Teach Jarvis your voice', text, [...teachMics.map((m) => ({ text: `${m.name}${m.taught ? ' ✓' : ''}`, solid: !m.taught, do: () => post({ cmd: 'voice-teach-start', uid: m.uid }) })), { text: 'Close', do: () => teachClose(true) }]);
}
// Each word lights up once Jarvis has heard it; most of the line heard and it moves on by itself.
function teachLine() {
  const words = TEACH_LINES[teachAt].split(' '), last = teachAt === TEACH_LINES.length - 1;
  card(`${teachMic} · line ${teachAt + 1} of ${TEACH_LINES.length}`, '', [
    { text: last ? 'Finish' : 'Skip line', do: teachAdvance },
    { text: 'Stop', do: () => teachClose(true) },
  ]);
  const p = $('card').querySelector('p'); p.textContent = '';
  words.forEach((w, i) => { const sp = document.createElement('span'); sp.textContent = `${w} `; if (teachHits[i]) sp.style.color = 'var(--a)'; else sp.style.opacity = '.55'; p.append(sp); });
}
function teachAdvance() {
  clearTimeout(teachNext);
  if (teachAt === TEACH_LINES.length - 1) { post({ cmd: 'voice-teach-done' }); return; }
  teachAt++; teachHits = []; post({ cmd: 'voice-teach-line' }); teachLine();
}
function teachHeard(text) {
  const want = TEACH_LINES[teachAt].split(' ').map(teachWord), got = text.split(/\s+/).map(teachWord).filter(Boolean);
  let k = 0;
  want.forEach((w, i) => { for (let x = k; x < Math.min(got.length, k + 4); x++) if (w && sameWord(w, got[x])) { teachHits[i] = true; k = x + 1; break; } });
  teachLine();
  const hit = teachHits.filter(Boolean).length;
  if (hit >= Math.ceil(want.length * 0.75) && (teachHits[want.length - 1] || hit >= want.length - 1)) { clearTimeout(teachNext); teachNext = setTimeout(teachAdvance, 700); }
}
function carPins() {
  const d = carData, v = (x, u = '') => (x === undefined || x === null ? '—' : `${x}${u}`);
  // Labels stay put around the car as it turns, so they never pile up.
  setPins(carInside ? [] : [
    { label: 'Fuel', value: v(d.fuel_percent, '%'), at: [carStage, 3.1, 2.75, -2.3], warn: d.fuel_percent < 20 },
    { label: 'Range', value: v(d.range), at: [carStage, 0.6, 3.1, -2.9] },
    { label: 'Doors', value: d.locked === undefined ? '—' : d.locked ? 'Locked' : 'Unlocked', at: [carStage, -2.4, 2.9, -1.5], warn: d.locked === false },
    { label: '12 V battery', value: v(d.battery_12v_percent, '%'), at: [carStage, 4.1, 1.8, 0.2], warn: d.battery_12v_percent < 50 },
    { label: 'Tyres', value: d.tire_pressure_warning === undefined ? '—' : d.tire_pressure_warning ? 'Check pressure' : 'OK', at: [carStage, -3.7, 1.6, 0.6], warn: !!d.tire_pressure_warning },
    { label: 'Trunk', value: d.trunk_open === undefined ? '—' : d.trunk_open ? 'Open' : 'Closed', at: [carStage, -4.0, 2.3, -0.8], warn: !!d.trunk_open },
  ]);
  card(`Your ${(CFG.car || {}).name || 'car'}`, d.status_updated ? `Engine ${d.engine_running ? 'running' : 'off'} · ${d.odometer || ''}. Last reading ${d.status_updated}.` : 'Ask me about your car for a fresh reading.', [
    { text: carInside ? 'Show outside' : "What's inside", solid: true, do: () => { carInside = !carInside; applyInside(); setView('car'); } },
    { text: 'Fresh reading', do: () => post({ cmd: 'send', text: "Get a live reading of my car and tell me how it's doing." }) },
    { text: 'Start it', do: () => post({ cmd: 'send', text: 'Start my car.' }) },
    { text: 'Lock it', do: () => post({ cmd: 'send', text: 'Lock my car.' }) },
  ]);
}
function applyInside() {
  inside.visible = carInside && !realCarIn; $('hint').hidden = view !== 'room' && view !== 'car';
  carSkin.visible = !carInside; carGlass.visible = !carInside; carShell.visible = !carInside;
  for (const m of [paint, glass]) { m.transparent = carInside; m.opacity = carInside ? (m === glass ? 0.05 : 0.14) : 1; m.depthWrite = !carInside; m.needsUpdate = true; }
}
function roomPins() {
  const pct = printer.percent != null ? `${printer.percent}%` : '';
  const pState = { printing: `Printing ${pct}`, paused: 'Paused', failed: 'Failed', idle: 'Idle', offline: 'Offline', unknown: 'Not connected yet' }[printer.state] || printer.state;
  setPins([...spots.map((s) => ({ label: s.label, value: s.id === 'printer' ? pState : s.sub, at: [s.obj, ...s.at], warn: s.id === 'printer' && ['paused', 'failed'].includes(printer.state), onClick: () => goTo(s) })),
    ...devicePins()]);
  drawDeviceMarkers();
  if (placing) placeCard(); else if (!focused) devicesCard();
}
const THIS_ROOM = 'Your room';
const HOUSE = (Array.isArray((CFG.house || {}).rooms) && CFG.house.rooms.length ? CFG.house.rooms : [
  { name: 'Entry', x: [3, 4.3], z: [0, 3], hall: true },
  { name: 'Living room', x: [4.3, 8.6], z: [0, 4.6] },
  { name: 'Kitchen', x: [0, 3], z: [0, 4.6] },
  { name: 'Hallway', x: [3, 4.3], z: [3, 9], hall: true },
  { name: 'Bathroom', x: [0, 3], z: [4.6, 7] },
  { name: THIS_ROOM, label: 'Your room', x: [4.3, 8.6], z: [4.6, 9], mine: true },
  { name: 'Bedroom 2', x: [0, 3], z: [7, 9] },
]).map((r) => (r.mine || r.name === THIS_ROOM ? { ...r, name: THIS_ROOM, mine: true } : r));
const OTHER_ROOMS = HOUSE.filter((r) => !r.mine).map((r) => r.name);
let places = {}, placing = null;
const devMarks = new THREE.Group(); room.add(devMarks);
async function fetchPlaces() { try { places = await (await fetch(`./data/home-places.json?t=${Date.now()}`)).json(); } catch { places = {}; } if (view === 'room') roomPins(); if (view === 'house') housePins(); if (view === 'home') drawHome(); }
const realDevices = () => {
  if (!home.list) return [];
  const names = home.list.map((d) => d.name);
  return home.list.filter((d) => d.can_switch && !/ (LED|Auto-off|Auto off|Auto-update|Child lock)$/i.test(d.name) && !names.some((n) => n !== d.name && d.name.startsWith(`${n} `))
    && !['media_player.everywhere'].includes(d.id) );
};
const devState = (d) => home.busy[d.id] ? `Turning ${home.busy[d.id]}…` : OFFLINE.has(d.state) ? 'Offline' : d.state === 'on' ? 'On' : 'Off';
function devicePins() {
  return realDevices().filter((d) => places[d.id]?.pos).map((d) => ({
    label: d.name, value: devState(d), warn: OFFLINE.has(d.state), at: [room, places[d.id].pos[0], places[d.id].pos[1] + 0.16, places[d.id].pos[2]],
    onClick: () => { if (placing || home.busy[d.id] || OFFLINE.has(d.state)) return; const on = d.state !== 'on'; home.busy[d.id] = on ? 'on' : 'off'; delete home.note[d.id]; roomPins(); post({ cmd: 'home-set', id: d.id, on }); },
  }));
}
// A small glowing bead on each device, and a lit bulb really lights the room.
function drawDeviceMarkers() {
  devMarks.clear();
  for (const d of realDevices()) {
    const p = places[d.id]?.pos; if (!p) continue;
    const on = d.state === 'on', dead = OFFLINE.has(d.state), light = d.domain === 'light';
    const col = dead ? 0x6b6f74 : on ? (light ? 0xffd9a0 : 0x3fd8ff) : 0x2a3540;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: on ? 2.4 : 0.35 }));
    bead.position.set(...p); devMarks.add(bead);
    if (on && light) { const glowL = new THREE.PointLight(0xffd9a0, 2.2, 4.5, 1.8); glowL.position.set(p[0], p[1] + 0.1, p[2]); devMarks.add(glowL); }
  }
}
const house = new THREE.Group(); house.visible = false; scene.add(house);
house.rotation.y = Math.PI / 2;  // the long house runs across the wide screen: front door on the left, kitchen on the right
const houseFloors = [], houseMarks = new THREE.Group(); house.add(houseMarks);
(function buildHouse() {
  const cx = 4.3, cz = 8.5, wall = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.9, transparent: true, opacity: 0.85 });
  for (const r of HOUSE) {
    const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0], mx = (r.x[0] + r.x[1]) / 2 - cx, mz = (r.z[0] + r.z[1]) / 2 - cz;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.06, d - 0.08), new THREE.MeshStandardMaterial({
      color: r.mine ? 0x123c46 : r.hall ? 0x5a3a26 : 0x6b4429, roughness: 0.7, emissive: r.mine ? 0x1a9fc2 : 0x000000, emissiveIntensity: r.mine ? 0.35 : 0 }));
    floor.position.set(mx, 0.03, mz); floor.userData.room = r; house.add(floor); houseFloors.push(floor);
    if (!r.hall) for (const [a, b, len, rot] of [[mx, mz - d / 2, w, 0], [mx, mz + d / 2, w, 0], [mx - w / 2, mz, d, Math.PI / 2], [mx + w / 2, mz, d, Math.PI / 2]]) {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, 0.06), wall); wl.position.set(a, 0.3, b); wl.rotation.y = rot; house.add(wl);
    }
    r.center = [mx, 0.1, mz];
  }
})();
function housePins() {
  const ds = realDevices(), out = HOUSE.map((r) => ({ label: r.mine ? 'Tap to go inside' : (r.hall ? 'Hallway' : 'Room'), value: r.label || r.name, at: [house, ...r.center], onClick: () => houseRoom(r) }));
  houseMarks.clear();
  for (const r of HOUSE) {
    const here = ds.filter((d) => places[d.id]?.room === r.name);
    here.forEach((d, i) => {
      const on = d.state === 'on', dead = OFFLINE.has(d.state), col = dead ? 0x6b6f74 : on ? (d.domain === 'light' ? 0xffd9a0 : 0x3fd8ff) : 0x2a3540;
      const p = [r.center[0] - Math.min(1.1, (r.x[1] - r.x[0]) / 2 - 0.35), 0.35, r.center[2] - 0.6 + i * 0.7];  // just below the room's name on screen
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: on ? 2.2 : 0.3 }));
      bead.position.set(...p); houseMarks.add(bead);
      out.push({ label: d.name, value: devState(d), warn: dead, at: [house, p[0], p[1] + 0.25, p[2]], onClick: () => { if (home.busy[d.id] || dead) return; const nowOn = d.state !== 'on'; home.busy[d.id] = nowOn ? 'on' : 'off'; housePins(); post({ cmd: 'home-set', id: d.id, on: nowOn }); } });
    });
  }
  setPins(out);
  const unplaced = ds.filter((d) => !places[d.id]).map((d) => d.name);
  if (!focused) card('Your house', `A simple map of your home, not measured. Tap your room to go inside, or a room to see what's there.${unplaced.length ? ` Not placed yet: ${unplaced.join(', ')}.` : ''} Ask Claude Code to reshape it to your real home.`, [{ text: 'Go to my room', solid: true, do: () => setView('room') }]);
}
function houseRoom(r) {
  if (r.mine) { setView('room'); return; }
  const here = realDevices().filter((d) => places[d.id]?.room === r.name);
  focused = { id: r.name };
  card(r.label || r.name, here.length ? here.map((d) => `${d.name}: ${devState(d)}`).join(' · ') : 'No smart devices placed here yet.', [
    ...realDevices().filter((d) => places[d.id]?.room !== r.name).map((d) => ({ text: `Put ${d.name} here`, do: () => { savePlace(d.id, r.name, null); placing = null; focused = null; housePins(); } })),
    { text: 'Back', do: () => { focused = null; housePins(); } }]);
}
function devicesCard() {
  const ds = realDevices(); if (!ds.length) { card('', '', []); return; }
  const here = ds.filter((d) => places[d.id]?.pos).length, away = ds.filter((d) => places[d.id] && !places[d.id].pos), none = ds.filter((d) => !places[d.id]);
  const text = [here ? `${here} in this room` : '', ...OTHER_ROOMS.map((r) => { const n = away.filter((d) => places[d.id].room === r).map((d) => d.name); return n.length ? `${r}: ${n.join(', ')}` : ''; }),
    none.length ? `Not placed yet: ${none.map((d) => d.name).join(', ')}` : ''].filter(Boolean).join(' · ');
  card('Your smart devices', `${text}. Tap a device's label to switch it.`, [{ text: none.length ? 'Place devices' : 'Move a device', solid: !!none.length, do: () => { placing = { step: 'pick' }; placeCard(); } }]);
}
function placeCard() {
  const ds = realDevices();
  if (placing.step === 'pick') {
    card('Place your devices', 'Pick a device, then click its spot in your room, or choose the room it\'s in.', [
      ...ds.map((d) => ({ text: `${d.name}${places[d.id] ? ' ✓' : ''}`, solid: !places[d.id], do: () => { placing = { step: 'where', id: d.id, name: d.name }; placeCard(); } })),
      { text: 'Done', do: () => { placing = null; roomPins(); } }]);
  } else {
    card(`Where is ${placing.name}?`, 'Click its spot in your room, or pick another room.', [
      ...OTHER_ROOMS.map((r) => ({ text: r, do: () => savePlace(placing.id, r, null) })),
      { text: 'Back', do: () => { placing = { step: 'pick' }; placeCard(); } }]);
  }
}
function savePlace(id, roomName, pos) {
  places[id] = { name: realDevices().find((d) => d.id === id)?.name || id, room: roomName, pos };
  post({ cmd: 'home-place', id, name: places[id].name, room: roomName, pos }); placing = { step: 'pick' }; if (view === 'house') housePins(); else roomPins();
}
async function drawCamera() {
  if (focused?.id !== 'printer' || $('card').hidden) return;
  let wrap = document.getElementById("camWrap");
  const r = await fetch(`./data/printer-camera.jpg?t=${Date.now()}`).catch(() => null);
  if (!r?.ok) { wrap?.remove(); return; }
  const url = URL.createObjectURL(await r.blob());
  if (!wrap) { wrap = E('div'); wrap.id = 'camWrap'; wrap.style.marginBottom = '8px'; wrap.append(E('img'), E('div', 'small')); wrap.firstChild.style.cssText = 'width:100%;display:block;border-radius:10px'; wrap.lastChild.style.cssText = 'color:var(--muted);font-size:11.5px;font-weight:600;margin-top:4px'; $('card').insertBefore(wrap, $('card').children[1]); }
  const old = wrap.firstChild.src; wrap.firstChild.src = url; if (old) URL.revokeObjectURL(old);
  const age = (await fetch('./data/hub.json').then((x) => x.json()).catch(() => ({}))).camera_age_min;
  wrap.lastChild.textContent = age == null ? '' : age <= 3 ? 'Picture from the last few minutes. Not live video.' : `Picture from about ${dur(age)} ago. Not live video.`;
}
setInterval(drawCamera, 30000);
function goTo(s) {
  focused = s; eyeTo.set(...s.eye); lookTo.set(...s.look); flying = 1; controls.enabled = false;
  const text = s.id === 'printer' && printer.job ? `Printing ${printer.job}${printer.remaining_min ? `, about ${printer.remaining_min} minutes left` : ''}.` : s.blurb;
  card(s.label, text, [...s.asks.map((a, i) => ({ text: a, solid: i === 0, do: () => post({ cmd: 'send', text: a }) })), ...(s.id === 'printer' ? [{ text: 'Open camera', do: () => post({ cmd: 'open-camera' }) }] : []), { text: 'Ask by voice', do: () => post({ cmd: 'focus', what: `${s.label} (${s.sub})` }) }, { text: 'Step back', do: () => setView('room') }]);
  drawCamera();
}
// The 3D print preview: its own page, loaded only when asked, since a print can be tens of MB.
function showPrint(fresh) {
  const fr = $('printFrame'); fr.hidden = false; if (fresh || !fr.getAttribute('src')) fr.src = `/paper-view?t=${Date.now()}`;
}
addEventListener('message', (e) => {
  if (e.source !== $('printFrame').contentWindow || !e.data || !['print-approve', 'print-change'].includes(e.data.type)) return;
  post({ cmd: 'print-decision', kind: e.data.type, title: String(e.data.title || 'this print').slice(0, 120) });
});
// ---------- The information screens: read from what Jarvis already keeps, so they open at once ----------
const PANELS = new Set(['today', 'business', 'clients', 'team', 'prayer', 'home', 'voices', 'tv', 'settings', 'knowledge']);
let hub = {};
async function fetchHub() { try { hub = await (await fetch('./data/hub.json')).json(); if (PANELS.has(view)) drawPanel(); drawFocus(); } catch {} }
setInterval(() => fetchHub(), 60000);
const E = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const pc = (title, wide) => { const c = E('section', `pc${wide ? ' wide' : ''}`); c.append(E('h2', '', title)); $('panel').append(c); return c; };
const settingsTab = createSettings({ $, E, pc, post, go: (v) => setView(v), looks: () => looks, onLook: () => lookColour(), onTones: (v) => { tones.enabled = v; if (v) tones.play('done'); }, connections: createConnections({ ask: (r) => biz.ask(r) }) });
const knowledgeTab = createKnowledge({ $, E, pc, post });
const row = (left, right, bad, done) => { const r = E('div', `rw${bad ? ' bad' : ''}`); r.append(E('span', done ? 'done' : '', left), E('small', '', right)); return r; };
const ask = (parent, text, q, solid) => { const b = E('button', solid ? 'solid' : 'ghost', text); b.onclick = () => post({ cmd: 'send', text: q }); parent.append(b); return b; };
const usd = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const hhmm = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const PR = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
function nextPrayer() {
  const t = hub.prayer?.times || {}, now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
  for (const p of PR) { if (!t[p]) continue; const [h, m] = t[p].split(':').map(Number); if (h * 60 + m > mins) return { p, at: t[p], left: h * 60 + m - mins }; }
  const f = hub.prayer?.tomorrow?.Fajr; if (!f) return null; const [h, m] = f.split(':').map(Number); return { p: 'Fajr', at: f, left: h * 60 + m + 1440 - mins, tomorrow: true };
}
const dur = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`);
const ICONS = {
  light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.2 2.2h4.8c.1-.9.5-1.6 1.2-2.2A6 6 0 0 0 12 3Z"/>',
  switch: '<path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5"/>',
  media_player: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4-1 1-3 2-6 3ZM14 12c4 0 7 1 7 4 0 2-2 3-4 2-1-1-2-3-3-6ZM12 14c0 4-1 7-4 7-2 0-3-2-2-4 1-1 3-2 6-3ZM10 12c-4 0-7-1-7-4 0-2 2-3 4-2 1 1 2 3 3 6Z"/>',
  climate: '<path d="M12 3v18M5 7l14 10M19 7 5 17"/>', humidifier: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/>',
  sensor: '<rect x="4" y="9" width="16" height="9" rx="2"/><path d="M8 9V4h8v5M8 14h8"/>',
};
const icon = (d) => { const w = E('div', 'ic'); w.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[d] || ICONS.switch}</svg>`; return w; };
const home = { list: null, error: '', busy: {}, note: {}, want: {} };
const homeFetch = () => post({ cmd: 'home-list' });
setInterval(() => { if (['home', 'room', 'house'].includes(view) && running) homeFetch(); }, 15000);
const OFFLINE = new Set(['unavailable', 'unknown']);
const GROUPS = [['light', 'Lights'], ['switch', 'Plugs'], ['media_player', 'TV and media'], ['fan', 'Fans'], ['climate', 'Air'], ['humidifier', 'Air']];
function drawHome() {
  const P_ = $('panel'); P_.innerHTML = '';
  if (home.error && !home.list?.length) { const c = pc('Home', true); c.append(E('div', 'big', "Can't reach your devices"), E('div', 'sub', home.error)); return; }
  if (!home.list) { pc('Home', true).append(E('p', '', 'Checking your devices…')); return; }
  // Only real devices: the hub also lists extras like a plug's LED and its power readings.
  const names = home.list.map((d) => d.name);
  const real = home.list.filter((d) => d.can_switch && !/ (LED|Auto-off|Auto off|Auto-update|Child lock)$/i.test(d.name) && !names.some((n) => n !== d.name && d.name.startsWith(`${n} `)));
  const on = real.filter((d) => d.state === 'on').length, off = real.filter((d) => OFFLINE.has(d.state)).length;
  const head = pc('Home', true); head.append(E('div', 'big', on ? `${on} on` : 'Everything is off'), E('div', 'sub', `${real.length} devices${off ? ` · ${off} offline` : ''} · Tap to switch, or just ask Jarvis`));
  const done = new Set();
  for (const [dom, label] of GROUPS) {
    if (done.has(label)) continue; done.add(label);
    const items = real.filter((d) => GROUPS.find((g) => g[0] === d.domain)?.[1] === label); if (!items.length) continue;
    const c = pc(label, true), grid = E('div', 'tiles'); c.append(grid);
    for (const d of items) {
      const dead = OFFLINE.has(d.state), isOn = d.state === 'on', busy = home.busy[d.id], note = home.note[d.id];
      const t = E('div', `tile${isOn ? ' on' : ''}${dead ? ' off-line' : ''}${note ? ' warn' : ''}`), hd = E('div', 'hd'), sw = E('button', `sw${busy ? ' busy' : ''}`); sw.append(E('i'));
      sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(isOn)); sw.setAttribute('aria-label', d.name); sw.disabled = (dead && !home.want[d.id]) || !!busy;
      sw.onclick = () => { home.busy[d.id] = !isOn ? 'on' : 'off'; delete home.note[d.id]; delete home.want[d.id]; drawHome(); post({ cmd: 'home-set', id: d.id, on: !isOn }); };
      hd.append(icon(d.domain), sw);
      const power = home.list.find((x) => x.name === `${d.name} Current consumption`), w = power && !OFFLINE.has(power.state) && Number(power.state) > 0 ? ` · ${power.state} W` : '';
      const where = places[d.id]?.room ? ` · ${places[d.id].room}` : '';
      const status = busy ? `Turning ${busy}, waiting for it to confirm…` : note || (dead ? `Not answering right now. It may come back in a moment.${where}` : `${isOn ? 'On' : 'Off'}${w}${where}`);
      const txt = E('div'); txt.append(E('div', 'nm', d.name), E('div', 'st', status)); t.append(hd, txt); grid.append(t);
    }
  }
  const info = home.list.filter((d) => !d.can_switch && (d.domain === 'sensor' || d.id === 'binary_sensor.wifi_motion') && !names.some((n) => n !== d.name && d.name.startsWith(`${n} `)) && !/consumption|connection/i.test(d.name));
  if (info.length) { const c = pc('Status only', true), grid = E('div', 'tiles'); c.append(grid); for (const d of info) { const t = E('div', 'tile'), hd = E('div', 'hd'); hd.append(icon('sensor')); const txt = E('div'); txt.append(E('div', 'nm', d.name), E('div', 'st', OFFLINE.has(d.state) ? 'Offline' : d.id === 'binary_sensor.wifi_motion' ? `${d.state === 'on' ? 'Movement' : 'No movement'} between the Mac mini and the router. Not whole rooms, and not someone sitting still.` : d.state[0].toUpperCase() + d.state.slice(1))); t.append(hd, txt); grid.append(t); } }
}
const tv = { state: null, note: '', why: '' };
const TV_APPS = [['837', 'YouTube'], ['12', 'Netflix'], ['13', 'Prime Video'], ['2285', 'Hulu'], ['291097', 'Disney+'], ['61322', 'HBO Max'], ['551012', 'Apple TV'],
  ['23048', 'Spectrum TV'], ['195316', 'YouTube TV'], ['22297', 'Spotify'], ['31440', 'Paramount+'], ['592369', 'Jellyfin'], ['tvinput.hdmi1', 'PlayStation 4'], ['dev', 'Jarvis Home']];
setInterval(() => { if (view === 'tv' && running) post({ cmd: 'tv-state' }); }, 5000);
function drawTV() {
  const P_ = $('panel'); const st = tv.state;
  let mir = document.getElementById('tvmirror');
  [...P_.children].forEach((ch) => { if (ch !== mir) ch.remove(); });
  if (!mir) {
    mir = pc('Live on the TV', true); mir.id = 'tvmirror';
    const f = document.createElement('iframe'); f.src = '/mirror';
    f.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000;display:block';
    mir.append(f);
  }
  const head = pc('TV', true);
  head.append(E('div', 'big', !st ? 'Checking the TV…' : st.ok ? `${st.app}${st.playing === 'play' ? ' · playing' : st.playing === 'pause' ? ' · paused' : ''}` : "Can't reach the TV"),
    E('div', 'sub', tv.why || tv.note || (st && !st.ok ? 'Is it switched on and on the Wi-Fi?' : `${(CFG.tv || {}).name || 'Your TV'} · Tap to control, or say "Jarvis, play … on the TV"`)));
  // Play anything: finds it on YouTube and plays it on the TV
  const pl = pc('Play anything', true), row = E('div', 'acts'), box = E('input');
  box.placeholder = 'Surah Al-Kahf, Nasheed, a match…'; box.style.cssText = 'flex:1;min-width:220px;background:var(--glass);border:1px solid var(--line);border-radius:999px;color:var(--fg);padding:8px 14px;font:inherit;font-size:14px';
  const go = E('button', 'solid', 'Play on TV'); const send = () => { if (box.value.trim()) { tv.note = 'Finding it…'; tv.why = ''; post({ cmd: 'tv-play', text: box.value.trim() }); drawTV(); } };
  go.onclick = send; box.onkeydown = (e) => { if (e.key === 'Enter') send(); }; row.append(box, go); pl.append(row);
  // Remote
  const rc = pc('Remote', true), K = (label, key, cls = 'ghost') => { const b = E('button', cls, label); b.onclick = () => post({ cmd: 'tv-key', key }); return b; };
  const pad = E('div'); pad.style.cssText = 'display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:start;margin-bottom:10px';
  [['', ''], ['▲', 'Up'], ['', ''], ['◀', 'Left'], ['OK', 'Select'], ['▶', 'Right'], ['', ''], ['▼', 'Down'], ['', '']].forEach(([l, k]) => pad.append(k ? K(l, k, k === 'Select' ? 'solid' : 'ghost') : E('span')));
  const r1 = E('div', 'acts'); r1.append(K('Back', 'Back'), K('Home', 'Home'), K('⏯ Play / pause', 'Play'), K('⏪', 'Rev'), K('⏩', 'Fwd'), K('↺ 10 s back', 'InstantReplay'));
  const r2 = E('div', 'acts'); r2.append(K('Volume −', 'VolumeDown'), K('Mute', 'VolumeMute'), K('Volume +', 'VolumeUp'), K('Turn off', 'PowerOff'), K('Turn on', 'PowerOn'));
  rc.append(pad, r1, r2);
  // Apps
  const ap = pc('Apps', true), grid = E('div', 'tiles');
  for (const [id, name] of TV_APPS) {
    const t = E('div', `tile${st?.app_id === id ? ' on' : ''}`), img = E('img'); if (!id.startsWith('tvinput.')) img.src = `./data/tv-icon/${id}.png`;
    img.onerror = () => img.remove(); if (id.startsWith('tvinput.')) t.append(E('div', 'nm', name)); else t.append(img, E('div', 'nm', name)); t.style.cursor = 'pointer'; t.onclick = () => { tv.note = `Opening ${name}…`; tv.why = ''; post({ cmd: 'tv-launch', id }); drawTV(); }; grid.append(t);
  }
  ap.append(grid);
}
const vox = { list: null, error: '', busy: '' };
function drawVoices() {
  const P_ = $('panel'); P_.innerHTML = '';
  if (!vox.list) { pc('Voices', true).append(E('p', '', 'Getting every voice…')); return; }
  const L = vox.list, cur = L.current;
  const all = (L.windows || []).map((v) => ({ ...v, kind: 'windows', key: `windows:${v.id}`, group: v.natural ? 'natural' : 'windows' }));
  const now = all.find((v) => v.key === cur);
  const head = pc('Voices', true); head.append(E('div', 'big', now ? `Jarvis sounds like ${now.name}` : 'Pick a voice for Jarvis'), E('div', 'sub', `${all.length} voices · Hear plays a free sample · Use makes it his voice`));
  if (vox.error || L.error) head.append(E('div', 'sub', vox.error || L.error));
  for (const [g, title] of [['natural', 'Natural voices (free, need the internet)'], ['windows', 'Windows voices (free, work offline)']]) {
    const items = all.filter((v) => v.group === g); if (!items.length) continue;
    const c = pc(title, true), grid = E('div', 'tiles'); c.append(grid);
    for (const v of items) {
      const on = v.key === cur, t = E('div', `tile${on ? ' on' : ''}`), txt = E('div'), a = E('div', 'acts');
      txt.append(E('div', 'nm', v.name), E('div', 'st', [v.tag, v.about].filter(Boolean).join(' · ')));
      const hear = E('button', 'ghost', 'Hear'), use = E('button', on ? 'ghost' : 'solid', on ? 'In use' : vox.busy === v.key ? 'Adding…' : 'Use');
      hear.onclick = () => post({ cmd: 'voice-sample', kind: v.kind, id: v.id });
      use.disabled = on || !!vox.busy;
      use.onclick = () => { vox.busy = v.key; vox.error = ''; drawVoices(); post({ cmd: 'voice-use', kind: v.kind, id: v.id, owner: v.owner || '', name: v.name }); };
      a.append(hear, use); t.append(txt, a); grid.append(t);
    }
  }
}
function drawPanel() {
  if (view === 'home') { homeFetch(); fetchPlaces(); return drawHome(); }
  if (view === 'voices') { if (!vox.list) post({ cmd: 'voices-list' }); return drawVoices(); }
  if (view === 'tv') { post({ cmd: 'tv-state' }); return drawTV(); }
  if (view === 'settings') return settingsTab.draw();
  if (view === 'knowledge') return knowledgeTab.draw();
  const P_ = $('panel'); P_.innerHTML = ''; const T = hub.today || {}, L = T.lead || {};
  if (!hub.updated) { pc('Loading').append(E('p', '', 'Getting your information…')); return; }
  if (view === 'today') {
    const c = pc(T.date_long || 'Today', true); c.append(E('div', 'big', L.headline || 'Your day')); if (L.dek) c.append(E('div', 'sub', L.dek));
    if (hub.paper_date && hub.paper_date !== new Date().toLocaleDateString('en-CA')) c.append(E('div', 'sub', `From the paper of ${hub.paper_date}.`));
    const a = E('div', 'acts'); ask(a, 'Read me my morning', 'Good morning', true); ask(a, 'Focus for 2 hours', 'Focus for two hours'); ask(a, 'Save an idea', 'I have an idea to save. Ask me what it is.'); c.append(a);
    const n = nextPrayer(); const pr = pc('Next prayer'); if (n) { pr.append(E('div', 'big', `${n.p} · ${hhmm(n.at)}`), E('div', 'sub', `In ${dur(n.left)}${n.tomorrow ? ', tomorrow' : ''}`)); }
    const td = pc('Top to-dos'); (L.todos || []).slice(0, 8).forEach((t) => td.append(row(t.t, t.when, false, t.done)));
    const bl = pc('Bills'); ((T.payments || {}).rows || []).slice(0, 6).forEach((r) => bl.append(row(r[1], `${r[0]} · ${r[2]}`, false, r[2] === 'Paid'))); if ((T.payments || {}).total) bl.append(E('div', 'sub', T.payments.total));
    const lt = pc('Team running late'); (hub.team?.overdue || []).slice(0, 5).forEach((x) => lt.append(row(`${x.who}: ${x.job}`, `${x.late} d late`, true))); if (!(hub.team?.overdue || []).length) lt.append(E('p', '', 'Nothing late.'));
    if (T.weather) { const w = pc('Weather'); w.append(E('p', '', T.weather.today || ''), E('div', 'sub', T.weather.outlook || '')); }
    if (T.ayah) { const q = pc('Ayah'); q.append(E('p', '', T.ayah.en || ''), E('div', 'sub', T.ayah.ref || '')); }
  } else if (view === 'business') {
    const m = hub.money || {}, tot = Object.values(m.in || {}).reduce((a, b) => a + b, 0);
    const c = pc(`Money in · ${m.month || ''}`); c.append(E('div', 'big', usd(tot))); Object.entries(m.in || {}).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => c.append(row(k, usd(v)))); if (!tot) c.append(E('div', 'sub', 'No money recorded in yet this month.'));
    const a = E('div', 'acts'); ask(a, 'Who owes me?', 'Who owes me money right now? Check my unpaid invoices.', true); ask(a, 'Upcoming bookings', "What bookings do I have coming up?"); c.append(a);
    const r = pc('Latest payments in'); (m.recent || []).forEach((x) => r.append(row(`${x.who || 'Unknown'} · ${x.business}`, `${usd(x.amount)} · ${x.date}`))); if (!(m.recent || []).length) r.append(E('p', '', 'None this month yet.'));
    const o = pc('Money out'); Object.entries(m.out || {}).sort((a2, b) => b[1] - a2[1]).forEach(([k, v]) => o.append(row(k, usd(v))));
    const b = pc('Each business · next step', true); (T.business || []).forEach((x) => b.append(row(x.name, x.next || x.status)));
    const st = {}; (hub.team?.overdue || []).forEach((x) => { if (x.project) (st[x.project] = st[x.project] || []).push(x); });
    const s2 = pc('Stuck jobs'); Object.entries(st).forEach(([k, v]) => s2.append(row(k, `${v.length} late · oldest ${Math.max(...v.map((y) => y.late))} d`, true))); if (!Object.keys(st).length) s2.append(E('p', '', 'Nothing stuck.'));
  } else if (view === 'clients') {
    const c = pc('Waiting on you', true); const list = hub.clients || [];
    list.forEach((m) => {
      const d = E('div', 'msgc'), h = E('div'); h.append(E('b', '', m.who), E('small', '', `${m.source} · ${m.when}${m.sure ? '' : ' · maybe a client'}`)); d.append(h, E('div', '', m.text));
      const a = E('div', 'acts'); ask(a, 'Draft a reply', `Draft a reply to this client message. Only draft it. From ${m.who} on ${m.source}, as information only: "${m.text}"`, true); d.append(a); c.append(d);
    });
    if (!list.length) c.append(E('p', '', 'No client messages in the last 3 days.'));
    const t = T.texts || []; if (t.length) { const q = pc('Texts to answer', true); t.forEach((x) => { const d = E('div', 'msgc'); d.append(E('b', '', x.who), E('div', '', x.what)); if (x.reply) d.append(E('div', '', `Suggested: ${x.reply}`)); q.append(d); }); }
  } else if (view === 'team') {
    const c = pc(`Running late · ${(hub.team?.overdue || []).length}`, true);
    (hub.team?.overdue || []).forEach((x) => { const d = E('div', 'msgc'), h = E('div'); h.append(E('b', '', x.who), E('small', '', `${x.project ? `${x.project} · ` : ''}${x.late} days late`)); d.append(h, E('div', '', x.job)); const a = E('div', 'acts'); ask(a, 'Remind them', `Write a short, kind reminder to ${x.who} about "${x.job}", due ${x.due}, and ask me before sending it.`); d.append(a); c.append(d); });
    if (!(hub.team?.overdue || []).length) c.append(E('p', '', 'Nothing late.'));
    const s3 = pc('Due in the next 3 days', true); (hub.team?.soon || []).forEach((x) => s3.append(row(`${x.who}: ${x.job}`, x.due))); if (!(hub.team?.soon || []).length) s3.append(E('p', '', 'Nothing due soon.'));
  } else if (view === 'prayer') {
    const n = nextPrayer(), c = pc('Next prayer'); if (n) c.append(E('div', 'big', `${n.p} · ${hhmm(n.at)}`), E('div', 'sub', `In ${dur(n.left)}${n.tomorrow ? ', tomorrow' : ''}`));
    const t = pc('Today'); PR.forEach((p) => t.append(row(p, hhmm(hub.prayer?.times?.[p]))));
    const w = pc('This week, from your prayer calls', true), g = E('div', 'grid7'); g.append(E('span', 'h', '')); PR.forEach((p) => g.append(E('span', 'h', p)));
    Object.entries(hub.prayer?.week || {}).forEach(([d, v]) => { g.append(E('span', 'h', new Date(`${d}T12:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }))); PR.forEach((p) => g.append(E('span', v[p] || '', { prayed: 'Prayed', missed: 'No answer', asked: 'Asked' }[v[p]] || '–'))); });
    w.append(g, E('div', 'sub', 'Prayed means you told a call you had. No answer only means the call went unanswered, not that you missed the prayer.'));
  }
}
let focusDone = false;
function drawFocus() {
  const f = hub.focus || {}, b = $('focusBadge'), left = f.until ? new Date(f.until) - Date.now() : 0;
  if (left > 0) { focusDone = false; const m = Math.ceil(left / 60000); b.hidden = false; b.textContent = `FOCUS · ${m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} m`} left`; }
  else { b.hidden = true; if (f.until && !focusDone && Date.now() - new Date(f.until) < 3600000) { focusDone = true; card('Focus finished', `${hub.calls_waiting || 0} call${hub.calls_waiting === 1 ? '' : 's'} waiting. ${(hub.clients || []).length} client conversation${(hub.clients || []).length === 1 ? '' : 's'} to look at.`, [{ text: 'Show clients', solid: true, do: () => setView('clients') }, { text: 'Close', do: () => card('', '', []) }]); } }
}
setInterval(drawFocus, 30000);
function setView(v, data) {
  document.body.dataset.view = v;
  if (v === 'settings') settingsTab.open();
  if (v === 'knowledge') knowledgeTab.open();
  const isPanel = PANELS.has(v); $('panel').hidden = !isPanel; document.body.dataset.panel = isPanel ? 'on' : 'off';
  if (isPanel) {
    view = 'core'; setViewCore(); view = v; document.body.dataset.view = v;
    document.querySelectorAll('.tabs [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === v));
    $('hint').hidden = true; drawPanel(); fetchHub(); syncWidgets(); return;
  }
  setViewCore(v, data);
}
function setViewCore(v = 'core', data) {
  $('printFrame').hidden = v !== 'print';
  if (v === 'print') {
    view = v; focused = null; carStage.visible = room.visible = core.visible = house.visible = false; setPins([]); card('', '', []); $('hint').hidden = true;
    document.querySelectorAll('.tabs [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === v));
    showPrint(data === 'fresh'); markMore(); return;
  }
  if (data && v === 'car') carData = { ...carData, ...data };
  view = v; focused = null;
  camera.fov = v === 'room' ? 64 : 36; camera.updateProjectionMatrix(); ao.enabled = v === 'room'; if (v === 'room') { bakeRoomEnv(); scene.environment = roomEnv; } else scene.environment = studioEnv;
  const V = VIEWS[v === 'car' && carInside ? 'inside' : v]; eyeTo.set(...V.eye); lookTo.set(...V.look); flying = 1; controls.enabled = false; controls.minDistance = V.min; controls.maxDistance = V.max;
  carStage.visible = v === 'car'; room.visible = v === 'room'; core.visible = v === 'core'; house.visible = v === 'house';
  scene.fog.far = v === 'room' ? 60 : v === 'house' ? 95 : 40;
  document.querySelectorAll('.tabs [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === v));
  applyInside(); $('hint').textContent = v === 'room' ? 'Drag to look around. Click anything to go over to it.' : v === 'house' ? 'A rough plan, not measured. Drag to turn it, scroll to zoom.' : 'Drag to go all the way around it. Pinch or scroll to get closer.';
  if (v !== 'car') $('leads').innerHTML = '';
  if (v === 'car') { loadRealCar(); fetchCar(); carPins(); } else if (v === 'room') { placing = null; fetchPrinter(); homeFetch(); fetchPlaces(); roomPins(); }
  else if (v === 'house') { placing = null; homeFetch(); fetchPlaces(); housePins(); } else { setPins([]); card('', '', []); }
  syncWidgets();
}
document.querySelectorAll('.tabs [data-s]').forEach((b) => { b.onclick = () => setView(b.dataset.s); });
$('close').onclick = () => post({ cmd: 'close' });
$('pillClose').onclick = (e) => { e.stopPropagation(); post({ cmd: 'close' }); };
$('pill').onclick = () => post({ cmd: 'layout', to: 'app' }); // press the bar to open the full app
$('bigger').onclick = () => post({ cmd: 'layout', to: layoutNow === 'full' ? 'app' : 'full' });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !moreMenu.hidden) { showMore(false); return; } if (widgets.handleKey(e)) { e.preventDefault(); return; } if (e.key === 'Escape') post({ cmd: 'close' }); });
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && /^look ?lab$/i.test(e.target.value.trim())) { location.href = './look-lab.html'; return; }
  if (e.key === 'Enter' && e.target.value.trim()) { post({ cmd: 'send', text: e.target.value.trim() }); e.target.value = ''; } });
async function fetchCar() { try { carData = { ...carData, ...(await (await fetch('./data/car.json')).json()) }; lookCarInfo(); if (view === 'car') carPins(); } catch {} }
const lookCarInfo = () => looks.info('car', carData.engine_running ? 'Engine on' : carData.locked === true ? 'Locked' : carData.locked === false ? 'Unlocked' : '');
async function fetchPrinter() {
  try {
    const t = await (await fetch('./data/printer.txt')).text(); const o = { state: 'unknown' };
    for (const l of t.split('\n')) { const m = l.match(/^\W*(\w+):\s*(.+)$/); if (m) o[m[1]] = m[2].trim(); }
    const spools = ['A1', 'A2', 'A3', 'A4', 'Ext'].filter((k) => o[`spool_${k}`]).map((k) => { const m = o[`spool_${k}`].match(/(\S+)\s+(#[0-9a-fA-F]{6})(?:\s+(\d+)%)?/); return m ? { slot: k, type: m[1], colour: m[2], remain: m[3] ? +m[3] : 100 } : null; }).filter(Boolean);
    if (spools.length) print3d.model?.setSpools(spools);
    if (o.percent) o.percent = parseInt(o.percent, 10);
    if (o.updated && Date.now() - new Date(o.updated).getTime() > 900000) o.state = 'unknown'; // an old reading says nothing
    printer = o; if (view === 'room' && !focused) roomPins();
  } catch {}
}
setInterval(() => { if (view === 'room' && running) fetchPrinter(); }, 30000);
// Clicking things in the room directly
const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(); let downAt = null;
let userTouched = false;
renderer.domElement.addEventListener('pointerdown', (e) => { userTouched = true; downAt = [e.clientX, e.clientY]; flying = 0; controls.enabled = true; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!['room', 'house'].includes(view) || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
  if (view === 'house') { const hit = ray.intersectObjects(houseFloors)[0]; if (hit) houseRoom(hit.object.userData.room); return; }
  if (placing?.step === 'where') {
    const hit = ray.intersectObject(room, true).find((h) => !devMarks.children.includes(h.object));
    if (hit) { const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0); const p = room.worldToLocal(hit.point.clone().addScaledVector(n, 0.05)); savePlace(placing.id, THIS_ROOM, [p.x, p.y, p.z].map((v) => +v.toFixed(3))); }
    return;
  }
  for (const hit of ray.intersectObject(room, true)) {
    let o = hit.object; while (o) { const s = spots.find((x) => x.obj === o); if (s) return goTo(s); o = o.parent; }
    break;
  }
});

// ---------- State from the Mac app ----------
let mode = 'waiting', level = 0, target = 0, running = true, lastSay = 0;
const color = new THREE.Color(COLORS.waiting), colorTo = new THREE.Color(COLORS.waiting);
const STATE_TEXT = { off: 'Not listening', waiting: `Say "${(CFG.voice && CFG.voice.wake_word) ? CFG.voice.wake_word.replace(/^./, (c) => c.toUpperCase()) : 'Jarvis'}"`, listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };
function msgLabel(l, now = new Date()) {
  const parts = [l.who]; if (l.tag) parts.push(l.tag);
  if (l.at) { const d = new Date(l.at), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    parts.push(d.toDateString() === now.toDateString() ? t : `${d.toLocaleDateString([], { weekday: 'short' })} ${t}`); }
  return parts.join(' · ');
}
function drawLines(lines) {
  const chat = $('chat'); [...chat.querySelectorAll('.msg')].forEach((m) => m.remove());
  for (const l of lines) { const d = document.createElement('div'); d.className = `msg${l.who === 'You' ? ' you' : ''}`; const s = document.createElement('small'); s.textContent = msgLabel(l); d.append(s, l.text); chat.appendChild(d); }
  chat.scrollTop = chat.scrollHeight;
}
let prevKey = '', layoutNow = 'half';
const pillFlow = createFlow($('pillline')), liveFlow = createFlow($('live')), capFlow = createFlow($('caption'), { rate: 3.2 });
const chips = createChips($('chips'), $('pillchips'));
let pillChan = '', capIdx = -1, capPrev = '', youKey = '';
const lastTwo = (t) => t.split(/(?<=[.!?])\s+/).slice(-2).join(' ');
// The ring moves between the widget cards (and anything else focusable on the Core); the battery feeds the frame dot.
function remoteAction(a, n) {
  if (a === 'battery') { safe(() => frame.remote?.(n)); return; }
  const items = [...document.querySelectorAll('.wg, [data-widget], .tile, button.wg-card')].filter((e) => e.offsetParent !== null);
  if (!items.length) return;
  const at = items.indexOf(document.activeElement.closest?.('.wg, [data-widget], .tile, button.wg-card'));
  const next = items[(at + (a === 'prev' ? -1 : 1) + items.length) % items.length];
  if (!next.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT)$/.test(next.tagName)) next.tabIndex = -1;
  next.focus({ preventScroll: false }); next.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}
window.jarvis = {
  widget(ev) { if (view !== 'core') setView('core'); biz.show(ev); },
  widgetData(rid, answer) { biz.data(rid, answer); },
  remote(a, n) { safe(() => remoteAction(a, n)); },
  state(o) {
    if (o.mode && o.mode !== mode && view === 'home') setTimeout(homeFetch, 300);
    const was = mode, wasExtra = stateExtra;
    mode = o.mode || mode; stateExtra = o.problem ? 'alert' : o.confirm ? 'confirm' : '';
    if (stateExtra && stateExtra !== wasExtra) tones.play(stateExtra);
    else if (mode !== was) tones.play(mode === 'listening' ? 'listening' : mode === 'thinking' ? 'thinking' : mode === 'off' ? 'off' : was === 'speaking' && mode === 'waiting' ? 'done' : '');
    safe(() => frame.state(o));
    colorTo.setHex(looks.on ? looks.colour(stateExtra || mode, COLORS) : COLORS[mode] ?? COLORS.waiting);
    document.body.dataset.mode = mode; document.documentElement.style.setProperty('--a', `#${colorTo.getHexString()}`);
    const lab = (mode === 'thinking' && o.status) || STATE_TEXT[mode] || '';
    setLabel($('state'), lab); setLabel($('pilllabel'), lab);
    const heard = (o.lines || []).filter((l) => l.who === 'Jarvis').pop(), you = (o.lines || []).filter((l) => l.who === 'You');
    const yk = you.length + '|' + (you.at(-1)?.text || ''); if (yk !== youKey) { youKey = yk; chips.clear(); }  // a new question clears the pills
    const inText = o.live || (mode === 'thinking' ? you.at(-1)?.text || '' : '');
    const chan = inText || mode === 'listening' ? 'in' : 'out';
    if (chan !== pillChan) { pillChan = chan; pillFlow.clear(); }
    pillFlow.set(o.live || (mode === 'listening' ? (heard ? lastTwo(heard.text) : `Yes, ${CALL}?`) : mode === 'thinking' ? inText : heard ? lastTwo(heard.text) : ''), { paced: chan === 'out' });
    liveFlow.set('');
    const key = JSON.stringify(o.lines || []); if (key !== prevKey) { prevKey = key; drawLines(o.lines || []); }
    { const ls = o.lines || [], lastJ = ls.filter((l) => l.who === 'Jarvis').pop(), jIdx = lastJ ? ls.lastIndexOf(lastJ) : -1, yIdx = ls.map((l) => l.who).lastIndexOf('You');
      const showYou = !!inText && (mode === 'listening' || mode === 'thinking') && (!!o.live || yIdx > jIdx);
      const t = showYou ? inText : lastJ ? lastTwo(lastJ.text) : '', tag = (showYou ? 'you' : 'jar') + (showYou ? yIdx : jIdx);
      if (tag !== capIdx || !t.startsWith(capPrev.slice(0, 20))) { capFlow.clear(); capPrev = ''; }
      if (t !== capPrev) capFlow.set(t, { paced: !showYou && tag !== capIdx });
      $('caption').classList.toggle('you', showYou); capIdx = tag; capPrev = t; $('caption').style.opacity = 1; lastSay = performance.now(); }
    if (o.live !== undefined) { $('input').placeholder = mode === 'listening' ? 'Listening… or type here' : 'Type here'; }  // the box is for typing only
    const p = $('problem'); p.hidden = !o.problem; if (o.problem) p.textContent = o.problem;
    if (o.confirm && o.pin) card('Say the PIN', `${o.confirm} I couldn't confirm it's your voice, so say the PIN or type it below.`, [{ text: 'No', do: () => { card('', '', []); post({ cmd: 'no' }); } }]);
    else if (o.confirm) card('Your click is needed', o.confirm, [{ text: 'Yes, do it', solid: true, do: () => { card('', '', []); post({ cmd: 'yes' }); } }, { text: 'No', do: () => { card('', '', []); post({ cmd: 'no' }); } }]);
    else if (o.confirmCleared && !teachOpen) card('', '', []);
  },
  chip(kind, label) { chips.add(kind, label); },
  voiceTeach(o) {
    if (o.phase === 'heard') { if (teachOpen && teachMic) teachHeard(o.text || ''); return; }
    teachOpen = true; if (o.mics) teachMics = o.mics;
    if (o.phase === 'ready') teachPick('Pick a mic and read 10 short lines into it. Each word lights up as Jarvis hears it, and it moves on by itself. Do it once for every mic you use.');
    else if (o.phase === 'recording') { teachMic = o.mic; teachAt = 0; teachHits = []; teachLine(); }
    else if (o.phase === 'learning') { teachMic = ''; card('Learning your voice…', 'This takes a few seconds.', []); }
    else if (o.phase === 'done') { teachMic = ''; const left = teachMics.filter((m) => !m.taught).length; teachPick(`${o.message} ${left ? 'Pick the next mic, or close if you\'re done.' : 'Every mic is done. Jarvis now answers only you.'}`); }
    else { teachMic = ''; teachPick(o.message || "That didn't work."); }
  },
  tv(o) {
    if ('app' in o || o.ok === false && !('note' in o)) tv.state = o;
    if (o.note !== undefined) tv.note = o.note; if (o.why) tv.why = o.why; else if ('app' in o) tv.why = '';
    if ('app' in o) tv.note = '';
    if (view === 'tv' && document.activeElement?.tagName !== 'INPUT') drawTV(); else if (view === 'tv') { const sub = $('panel').querySelector('.pc .sub'); if (sub) sub.textContent = tv.why || tv.note || ''; }
  },
  settings(o) {
    if (looks.set(o?.desk?.look || LOOK_DEFAULT)) lookColour();
    tones.enabled = o?.desk?.tones !== false; safe(() => frame.settings?.(o));
    if (view === 'settings') settingsTab.settings(o);
  },
  knowledge(o) { knowledgeTab.data(o); },
  fajr(o) { settingsTab.fajr(o); },
  cameras(o) { settingsTab.cameras(o); safe(() => frame.cameras?.(o)); },
  settingsStatus(o) { safe(() => frame.status(o)); if (view === 'settings') settingsTab.status(o); },
  voices(o) { vox.list = o; vox.busy = ''; vox.error = o.error || ''; if (view === 'voices') drawVoices(); },
  homeList(list, error) {
    safe(() => frame.home?.(list, error));
    home.list = list; home.error = error || '';
    // It said "may not have worked", then the device caught up: that's confirmed after all.
    for (const d of list) if (home.want[d.id] && d.state === home.want[d.id]) { delete home.note[d.id]; delete home.want[d.id]; }
    if (view === 'home') drawHome(); else if (view === 'room') roomPins(); else if (view === 'house' && !focused) housePins();
  },
  homeResult(r) {
    delete home.busy[r.id];
    if (!r.ok) home.want[r.id] = r.on ? 'on' : 'off';
    if (!r.ok) home.note[r.id] = /did not confirm/.test(r.message) ? `Sent, but it hasn't reported back, probably a weak connection. If it turned ${r.on ? 'on' : 'off'}, it worked.` : (r.message || 'That didn\'t work.').split('\n')[0].slice(0, 110);
    if (view === 'home') { drawHome(); homeFetch(); } else if (view === 'room') { roomPins(); homeFetch(); } else if (view === 'house') { if (!focused) housePins(); homeFetch(); }
  },
  level(x) { target = Math.min(1, x); if (layoutNow === 'pill') document.documentElement.style.setProperty('--lv', Math.min(1, x).toFixed(3)); },
  layout(name) {
    if (name === 'pill' && layoutNow !== 'pill') { carInside = false; setView('core'); } // every new call starts clean
    layoutNow = name; document.body.classList.toggle('pill', name === 'pill'); document.documentElement.classList.toggle('pill', name === 'pill');
    $('bigger').textContent = name === 'full' ? 'Smaller' : 'Full screen';
    syncWidgets(); const was = running; running = name !== 'pill'; setTimeout(() => { resize(); placeHeroPins(); }, 280); resize(); if (running && !was) requestAnimationFrame(loop);
  },
  scene(name, data) {
    if (/^widget-/.test(name)) { if (view !== 'core') setView('core'); widgets.open(name.slice(7)); return; }
    if (/^look-/.test(name)) { const l = name.slice(5); if (looks.set(l)) { lookColour(); post({ cmd: 'settings-set', patch: { desk: { look: looks.id } } }); } return; }
    if (name === 'print') setView('print', 'fresh'); else if (VIEWS[name] || PANELS.has(name)) setView(name, data); },
  carData(d) { carData = { ...carData, ...d }; if (view === 'car') carPins(); },
  visible(b) { safe(() => frame.visible(b)); if (b) post({ cmd: 'settings-get' }); const was = running; running = b && layoutNow !== 'pill'; if (b && view === 'car') fetchCar(); if (running && !was) requestAnimationFrame(loop); },
};

// ---------- Drawing ----------
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); looks.resize(w, h); camera.aspect = w / h; camera.zoom = w < h ? Math.max(0.55, (w / h) * 1.2) : 1; camera.updateProjectionMatrix(); if (typeof placeHeroPins === 'function') placeHeroPins(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(), tmp = new THREE.Vector3(), corner = new THREE.Vector3();
function loop() {
  if (!running) return; requestAnimationFrame(loop);
  if (view === 'print') return; // the preview page draws itself
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
  if (!fpsBox.hidden) { fpsLog.push([t, rawDt]); while (fpsLog.length && fpsLog[0][0] < t - 60) fpsLog.shift(); if (fpsLog.length % 20 === 0) { const n = fpsLog.length, sum = fpsLog.reduce((a, f) => a + f[1], 0), worst = Math.max(...fpsLog.map((f) => f[1])), slow = fpsLog.filter((f) => f[1] > 1 / 50).length; fpsBox.textContent = `${looks.id} · ${Math.round(n / sum)} fps avg · ${Math.round(sum)} s · slowest ${Math.round(worst * 1000)} ms · ${slow} slow frames`; } }
  level += (target - level) * Math.min(1, dt * 14); document.documentElement.style.setProperty('--lv', level.toFixed(3));
  color.lerp(colorTo, Math.min(1, dt * 4));
  const speakPulse = mode === 'speaking' ? 0.22 + 0.2 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9)) : 0;
  const power = { off: 0.05, waiting: 0.3, listening: 0.75 + level, thinking: 0.7, speaking: 0.8 }[mode] ?? 0.4;
  coreU.t.value = t * (mode === 'thinking' ? 2.4 : 1); coreU.level.value = mode === 'listening' ? level : speakPulse; coreU.color.value.copy(color); coreU.power.value += (power - coreU.power.value) * Math.min(1, dt * 5);
  heart.material.color.copy(color).multiplyScalar(0.45 + coreU.power.value * 0.55 + coreU.level.value * 0.7); heart.scale.setScalar(1.5 + coreU.level.value * 1.3 + Math.sin(t * 2) * 0.05);
  rings.forEach((r, i) => { r.material.color.copy(color); r.rotation.x += dt * (0.12 + i * 0.05) * (mode === 'thinking' ? 4 : 1); r.rotation.y += dt * (0.09 - i * 0.03); r.scale.setScalar(1 + coreU.level.value * 0.12 * (i + 1)); });
  dots.material.color.copy(color); dots.rotation.y += dt * 0.04; dots.scale.setScalar(1 + coreU.level.value * 0.25);
  bloom.strength = (view === 'core' || PANELS.has(view)) ? 0.28 + coreU.power.value * 0.3 : view === 'room' ? 0.09 : 0.16 + carGlow * 0.2; scene.environmentIntensity = view === 'room' ? 0.62 : view === 'car' ? 1.15 : 0.6;
  if (view === 'core' || PANELS.has(view)) { core.position.lerp(tmp.set(0, 0, 0), Math.min(1, dt * 4)); core.scale.lerp(tmp.setScalar(1), Math.min(1, dt * 4)); dots.visible = true; }
  else { corner.set(0, 0.47, -2.2).applyMatrix4(camera.matrixWorld); core.position.lerp(corner, Math.min(1, dt * 7)); core.scale.lerp(tmp.setScalar(0.065), Math.min(1, dt * 5)); dots.visible = false; }
  if (view === 'car') {  // lights fade on when it starts, and off when it stops
    carGlow += ((carRunning() ? 1 : 0) - carGlow) * Math.min(1, dt * 2.5);
    carHead.emissiveIntensity = carGlow * 9; carTail.emissiveIntensity = 0.32 + carGlow * 3;
    headBeams.forEach((b) => { b.intensity = carGlow * 45; });
    if (handLights.length) { handLights[0].emissiveIntensity = 0.8 + carGlow * 4.2; handLights[1].emissiveIntensity = 1.2 + carGlow * 2.8; }
  }
  if (view === 'car') { if (!userTouched && !hash.get('yaw')) carG.rotation.y += dt * (flying ? 0.03 : 0.07); key.intensity = 62; haloMat.color.copy(color); rim1.color.copy(color); for (const rm of carRings) rm.color.copy(color).multiplyScalar(0.45); key.target.position.set(0, 0.6, 0); }
  if (flying) { camera.position.lerp(eyeTo, Math.min(1, dt * 2.6)); controls.target.lerp(lookTo, Math.min(1, dt * 3)); if (camera.position.distanceTo(eyeTo) < 0.03) { flying = 0; controls.enabled = true; } }
  controls.update();
  // The 3D printer, when it's really printing
  const printing = printer.state === 'printing' || hash.get('printing');
  if (room.visible && print3d.model) {
    const pct = printer.percent ?? (hash.get('printing') ? 62 : 0), n = printing ? Math.round((pct / 100) * print3d.layers.length) : 0;
    print3d.layers.forEach((l, i) => { l.visible = i < n; });
    print3d.model.setHeight(printing ? 6 + n * 6 + Math.sin(t * 3) * 0.2 : 120);
    print3d.beam.material.emissive.setHex(printing ? 0x57ff9a : ['paused', 'failed'].includes(printer.state) ? 0xff5040 : 0x2a6f8a);
  }
  // Labels follow the things they're about
  for (const p of pins) {
    if (p.hero) continue;
    const [obj, x, y, z] = p.at; tmp.set(x, y, z); obj.localToWorld(tmp); const behind = tmp.clone().project(camera);
    const sx = (behind.x * 0.5 + 0.5) * innerWidth, sy = (-behind.y * 0.5 + 0.5) * innerHeight;
    p.el.style.left = `${sx}px`; p.el.style.top = `${sy}px`; const first = document.querySelector('.msg')?.getBoundingClientRect(); p.el.style.opacity = behind.z < 1 && !(first && sx > first.left - 60 && sy > first.top) ? 1 : 0;
  }
  // the caption stays until the next turn (no fade)
  if (view === 'house') for (const f of houseFloors) if (f.userData.room.mine) { f.material.emissive.copy(color); f.material.color.copy(color).multiplyScalar(0.22); }
  const lookView = view === 'core' || PANELS.has(view);
  if (lookView && looks.draw({ t, dt, phase: stateExtra || PHASE[mode] || 'idle', level: coreU.level.value, showPins: view === 'core' })) return;
  looks.pins(false);
  composer.render();
}
setView(hash.get('scene') || 'core');
if (hash.get('demo')) {
  carData = { locked: true, engine_running: !!hash.get('running'), fuel_percent: 72, range: '326 mi', odometer: '10,018 mi', battery_12v_percent: 88, trunk_open: false, hood_open: false, tire_pressure_warning: false, status_updated: 'Sat 07 Nov, 06:37 AM' };
  if (hash.get('inside')) { carInside = true; setView('car'); }
  if (hash.get('printing')) printer = { state: 'printing', percent: 62, job: 'Sample print', remaining_min: 48 };
  window.jarvis.state({ mode: hash.get('mode') || 'listening', lines: [{ who: 'You', text: "How's my car doing?" }, { who: 'Jarvis', text: "Your car is locked and the engine is off. Fuel is at 72 percent with about 326 miles of range." }], live: '' });
  target = 0.55;
  if (view === 'car') carPins(); if (view === 'room') roomPins();
  const sp = spots.find((s) => s.id === hash.get('go')); if (sp) { goTo(sp); camera.position.set(...sp.eye); controls.target.set(...sp.look); }
  camera.position.copy(eyeTo); controls.target.copy(lookTo); flying = 0; controls.enabled = true; controls.update(); camera.updateMatrixWorld();
  if (view !== 'core') { corner.set(0, 0.47, -2.2).applyMatrix4(camera.matrixWorld); core.position.copy(corner); core.scale.setScalar(0.065); }
}
if (hash.get('placesdemo')) fetch('./data/home.json').then((r) => r.json()).then((l) => { home.list = l; fetchPlaces(); });
if (hash.get('homedemo')) { fetch('./data/home.json').then((r) => r.json()).then((l) => { window.jarvis.homeList(l, ''); home.note['light.light_1'] = "Sent, but it hasn't reported back, probably a weak connection. If it turned on, it worked."; home.busy['switch.plug_3'] = 'on'; drawHome(); }); }
if (hash.get('tvdemo')) { view = 'tv'; window.jarvis.tv({ ok: true, app: 'YouTube', app_id: '837', playing: 'play' }); }
if (hash.get('voicesdemo')) fetch('./data/voices.json').then((r) => r.json()).then((o) => window.jarvis.voices(o));
if (hash.get('layout')) window.jarvis.layout(hash.get('layout'));
if (hash.get('bizdemo')) fetch('./data/biz-demo.json').then((r) => r.json()).then((l) => l.forEach((ev, i) => setTimeout(() => window.jarvis.widget(ev), 400 + i * 300)));
setTimeout(fetchHub, 600);
setTimeout(loadRealCar, 2500);
window.__ready = true;
loop();
lookColour(); // the saved look's colour from the first frame, not the old blue until the first status arrives
post({ cmd: 'ready' }); post({ cmd: 'settings-get' }); setTimeout(() => post({ cmd: 'settings-get' }), 1500); fetchCar();  // the saved look, once the app is listening
