// Look A · Arc: today's navy and cyan, grown up. Turning instrument rings, a plasma heart, a disc of light
// particles and thin instrument lines that read the moment (voice level, turn time, frame rate).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { glowTexture, smooth } from './look-lab-kit.js';

const COL = { idle: 0x2aa6d8, listening: 0x37e0ff, thinking: 0x8a7dff, speaking: 0xffc77a, off: 0x3c4852, confirm: 0xffd166, alert: 0xff6b5e };

export function createArc(renderer, shared, opts = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03060a);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100); camera.position.set(0, 0.2, 8.4);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.42, 0.12); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const color = new THREE.Color(COL.idle), tmp = new THREE.Color();
  const U = { t: { value: 0 }, level: { value: 0 }, color: { value: color }, think: { value: 0 } };
  const core = new THREE.Group(); scene.add(core);

  // Outer shell: a fresnel skin that ripples with the voice.
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 40), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float t,level; varying vec3 vN,vV; varying float vD;
      float n(vec3 p){return (sin(p.x*3.3+t*1.1)+sin(p.y*4.1-t*.8)+sin(p.z*3.9+t*1.4)+sin((p.x+p.y+p.z)*7.+t*2.3)*.5)/3.5;}
      void main(){ float d=n(position)*(.03+level*.16); vD=d; vec3 p=position+normal*d;
        vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float level; varying vec3 vN,vV; varying float vD;
      void main(){ float f=pow(max(1.-abs(dot(vN,vV)),0.),2.6); vec3 c=color*(f*(.42+level*.55)+.004+abs(vD)*.25); gl_FragColor=vec4(c,f*.7+.02); }`,
  })));
  // Inner heart: slow filaments of plasma.
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 24), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vP,vN,vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float t,level,think; uniform vec3 color; varying vec3 vP,vN,vV;
      void main(){ vec3 n=normalize(vP); float s=t*(1.+think*1.8);
        vec3 q=n*3.1+vec3(s*.31,-s*.23,s*.17); q+=vec3(sin(q.y*1.7+s*.5),sin(q.z*1.9-s*.4),sin(q.x*1.5+s*.6))*.9; float f=sin(q.x+q.y*.7)*sin(q.y-q.z*.8)+.25*sin(q.z*3.1); float fil=pow(max(1.-abs(f),0.),18.);
        float face=max(dot(normalize(vN),normalize(vV)),0.); vec3 c=color*(fil*(.32+level*.5)+.025)*(.25+face*.75);
        gl_FragColor=vec4(c,1.); }`,
  })));
  const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  heart.scale.setScalar(1.1); core.add(heart);

  // Instrument rings: hairlines with tick marks, each turning at its own pace.
  const lineMat = (o) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  function ring(r, { ticks = 0, long = 5, len = 0.05, arcs = null, o = 0.6 } = {}) {
    const g = new THREE.Group(), pts = [];
    const spans = arcs || [[0, Math.PI * 2]];
    for (const [a0, a1] of spans) { const seg = []; for (let i = 0; i <= 160; i++) { const a = a0 + ((a1 - a0) * i) / 160; seg.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg), lineMat(o))); }
    for (let i = 0; i < ticks; i++) { const a = (i / ticks) * Math.PI * 2, l = i % long ? len : len * 2.6; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0), new THREE.Vector3(Math.cos(a) * (r + l), Math.sin(a) * (r + l), 0)); }
    if (ticks) g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(o * 0.8)));
    core.add(g); return g;
  }
  const rings = [
    { g: ring(1.34, { ticks: 120, long: 10, len: 0.035, o: 0.55 }), tilt: [1.22, 0, 0.2], spin: 0.11 },
    { g: ring(1.6, { arcs: [[0, 1.25], [2.1, 3.3], [4.2, 5.5]], o: 0.85 }), tilt: [1.05, 0.42, 0], spin: -0.2 },
    { g: ring(1.92, { ticks: 36, long: 3, len: 0.06, o: 0.4 }), tilt: [1.42, -0.32, 0], spin: 0.05 },
    { g: ring(2.4, { ticks: 72, long: 6, len: 0.045, o: 0.22 }), tilt: [0, 0, 0], spin: -0.015 },
  ];
  rings.forEach((r) => r.g.rotation.set(...r.tilt));

  // Voice ring: a waveform drawn around the heart, flat to the camera.
  const VN = 256, vpos = new Float32Array((VN + 1) * 3);
  const vgeo = new THREE.BufferGeometry(); vgeo.setAttribute('position', new THREE.BufferAttribute(vpos, 3));
  const vline = new THREE.Line(vgeo, lineMat(0.9)); scene.add(vline);

  // A disc of light particles orbiting the core.
  const N = 3200, seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const r = 1.5 + Math.pow(Math.random(), 1.6) * 2.3, h = (Math.random() + Math.random() + Math.random() - 1.5) * 0.09 * (r - 1.1);
    seed.set([r, Math.random() * Math.PI * 2, h, (0.35 + Math.random() * 0.65) / Math.sqrt(r)], i * 4);
  }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); pgeo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const PU = { t: U.t, level: U.level, color: U.color, px: { value: 20 } };
  const parts = new THREE.Points(pgeo, new THREE.ShaderMaterial({
    uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 seed; uniform float t,level,px; varying float vA;
      void main(){ float a=seed.y+t*seed.w*.55; float r=seed.x*(1.+level*.05*sin(seed.y*7.+t*3.));
        vec3 p=vec3(cos(a)*r,seed.z,sin(a)*r); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float tw=.45+.55*abs(sin(t*1.6+seed.y*13.)); vA=tw*smoothstep(4.,1.6,seed.x); gl_PointSize=px*tw/-mv.z; }`,
    fragmentShader: `uniform vec3 color; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*vA; gl_FragColor=vec4(color*a*.9,a); }`,
  }));
  parts.frustumCulled = false; parts.rotation.set(0.36, 0, 0.08); scene.add(parts);

  // ---------- Header, card, caption and the instrument overlay ----------
  const html = opts.app ? '' : `${shared.header()}<svg id="inst"><line id="l1"/><line id="l2"/><line id="l1t" class="dim"/><line id="l2t" class="dim"/><path id="br"/></svg>
    <div class="ro" id="roL">Voice<b id="vDb">—</b></div><div class="ro r" id="roR">Turn<b id="vTurn">00:00.0</b></div>
    <div class="ro" id="roL2">Mic · desk<b id="vMic">▁▁▁▁▁▁</b></div><div class="ro r" id="roR2">Frame<b id="vFps">60 fps</b></div>
    ${shared.card}${shared.caption}`;
  let el = {};
  const mount = (root) => { el = Object.fromEntries(['l1', 'l2', 'l1t', 'l2t', 'br', 'roL', 'roR', 'roL2', 'roR2', 'vDb', 'vTurn', 'vMic', 'vFps'].map((k) => [k, root.querySelector('#' + k)])); };

  let W = 1, H = 1, think = 0, clock = 0;
  const bars = '▁▂▃▄▅▆▇█', hist = new Array(6).fill(0);
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; };
  const set = (e, a) => { for (const k in a) e.setAttribute(k, a[k].toFixed ? a[k].toFixed(1) : a[k]); };

  function update(s) {
    const m = s.motion;
    clock += s.dt * (1 + think * 1.4) * m;
    think = smooth(think, s.phase === 'thinking' ? 1 : 0, 4, s.dt);
    color.lerp(tmp.setHex(COL[s.phase]), 1 - Math.exp(-5 * s.dt));
    U.t.value = clock; U.level.value = s.level; U.think.value = think;
    for (const r of rings) r.g.rotation.z += r.spin * s.dt * m * (1 + think * 2.5);
    const pulse = s.phase === 'confirm' ? 0.5 + 0.5 * Math.sin(clock * 3.2) : s.phase === 'alert' ? 0.5 + 0.5 * Math.sin(clock * 7) : 0;
    heart.material.opacity = (s.phase === 'off' ? 0.12 : 0.28) + s.level * 0.3 + think * 0.1 + pulse * 0.25; heart.scale.setScalar(1.05 + s.level * 0.35);
    // voice waveform
    for (let i = 0; i <= VN; i++) {
      const a = (i / VN) * Math.PI * 2, w = Math.sin(a * 6 + clock * 4) * 0.5 + Math.sin(a * 11 - clock * 6.3) * 0.3 + Math.sin(a * 23 + clock * 9) * 0.2;
      const r = 1.13 + s.level * 0.13 * w + think * 0.015 * Math.sin(a * 40 + clock * 10);
      vpos[i * 3] = Math.cos(a) * r; vpos[i * 3 + 1] = Math.sin(a) * r; vpos[i * 3 + 2] = 0;
    }
    vgeo.attributes.position.needsUpdate = true; vline.material.opacity = 0.25 + s.level * 0.75 + think * 0.2;
    vline.quaternion.copy(camera.quaternion);
    // slow camera drift, so the rings show their depth
    camera.position.set(Math.sin(s.t * 0.628) * 0.35 * m, 0.2 + Math.cos(s.t * 0.628) * 0.12 * m, 8.4); camera.lookAt(0, 0, 0);
    bloom.strength = 0.42 + s.level * 0.22 + think * 0.1;
    // instrument lines from the edge of the outer ring out to the readouts
    if (!el.l1) return;
    const [cx, cy] = proj(new THREE.Vector3(0, 0, 0)), [ex] = proj(new THREE.Vector3(2.0, 0, 0)), R = ex - cx, L = Math.min(170, cx - R - 60);
    set(el.l1, { x1: cx - R, y1: cy, x2: cx - R - L, y2: cy }); set(el.l2, { x1: cx + R, y1: cy, x2: cx + R + L, y2: cy });
    set(el.l1t, { x1: cx - R - L, y1: cy - 8, x2: cx - R - L, y2: cy + 8 }); set(el.l2t, { x1: cx + R + L, y1: cy - 8, x2: cx + R + L, y2: cy + 8 });
    const b = R * 1.22, k = 16;
    el.br.setAttribute('d', `M${cx - b},${cy - b + k}V${cy - b}H${cx - b + k}M${cx + b - k},${cy - b}H${cx + b}V${cy - b + k}M${cx + b},${cy + b - k}V${cy + b}H${cx + b - k}M${cx - b + k},${cy + b}H${cx - b}V${cy + b - k}`);
    const place = (e, x, y, right) => { e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${right ? ' translateX(-100%)' : ''}`; };
    place(el.roL, cx - R - L, cy - 48, false); place(el.roL2, cx - R - L, cy + 12, false);
    place(el.roR, cx + R + L, cy - 48, true); place(el.roR2, cx + R + L, cy + 12, true);
    el.vDb.textContent = s.level > 0.02 ? `${Math.round(-60 + s.level * 48)} dB` : '—';
    hist.shift(); hist.push(s.level); el.vMic.textContent = hist.map((v) => bars[Math.min(7, Math.floor(v * 8))]).join('');
    el.vTurn.textContent = `00:${String(Math.floor(s.t)).padStart(2, '0')}.${Math.floor((s.t % 1) * 10)}`;
    el.vFps.textContent = `${s.fps || '–'} fps`;
    document.body.style.setProperty('--sc', '#' + color.getHexString());
  }
  function resize(w, h) {
    W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix();
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
    PU.px.value = 20 * renderer.getPixelRatio();
  }
  return { html, mount, update, resize, render: (dt) => composer.render(dt) };
}
