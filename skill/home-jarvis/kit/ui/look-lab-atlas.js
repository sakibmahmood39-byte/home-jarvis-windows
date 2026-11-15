// drifts round the house and the focus pulls to whatever Jarvis is talking about (real depth of field).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowTexture, smooth, spring, clamp01 } from './look-lab-kit.js';

const COL = { idle: 0x7fe3ff, listening: 0x37e0ff, thinking: 0x9b8cff, speaking: 0xffc77a, off: 0x4a5866, confirm: 0xffd166, alert: 0xff6b5e };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Renders the scene, then blurs each pixel by how far it is from the focus distance.
class DofPass extends Pass {
  constructor(scene, camera, hide) {
    super(); this.scene = scene; this.camera = camera; this.hide = hide; this.needsSwap = true;
    this.color = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.depth = new THREE.WebGLRenderTarget(1, 1); this.depth.depthTexture = new THREE.DepthTexture(1, 1);
    this.depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.u = { tColor: { value: null }, tDepth: { value: null }, focus: { value: 10 }, range: { value: 4 }, maxBlur: { value: 10 }, near: { value: 0.1 }, far: { value: 100 }, px: { value: new THREE.Vector2() } };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tColor,tDepth; uniform float focus,range,maxBlur,near,far; uniform vec2 px; varying vec2 vUv;
        float lin(float d){ float z=d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
        float coc(vec2 uv){ return clamp(abs(lin(texture2D(tDepth,uv).x)-focus)/range,0.,1.); }
        void main(){ float c=coc(vUv); vec3 acc=texture2D(tColor,vUv).rgb; float ws=1.;
          if(c>.03){ for(int i=0;i<28;i++){ float fi=float(i); float r=sqrt((fi+.5)/28.); float a=fi*2.39996;
            vec2 uv=vUv+vec2(cos(a),sin(a))*r*maxBlur*c*px; float cs=coc(uv); float w=clamp((cs-r*c)*6.+1.,0.,1.);
            acc+=texture2D(tColor,uv).rgb*w; ws+=w; } }
          gl_FragColor=vec4(acc/ws,1.); }`,
    }));
  }
  setSize(w, h) { this.color.setSize(w, h); this.depth.setSize(Math.ceil(w / 2), Math.ceil(h / 2)); this.u.px.value.set(1 / w, 1 / h); }
  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.color); renderer.clear(); renderer.render(this.scene, this.camera);
    this.hide.forEach((o) => (o.visible = false)); const bg = this.scene.background; this.scene.background = null;
    this.scene.overrideMaterial = this.depthMat; renderer.setRenderTarget(this.depth); renderer.clear(); renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null; this.scene.background = bg; this.hide.forEach((o) => (o.visible = true));
    this.u.tColor.value = this.color.texture; this.u.tDepth.value = this.depth.depthTexture; this.u.near.value = this.camera.near; this.u.far.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}

export function createAtlas(renderer, shared, opts = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05080c); scene.fog = new THREE.Fog(0x05080c, 18, 42);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 80);
  const sun = new THREE.DirectionalLight(0xdfefff, 1.1); sun.position.set(-6, 10, 4); scene.add(sun, new THREE.HemisphereLight(0x8fb6cc, 0x05080c, 0.35));
  const hide = [];

  // Ground: a fine grid that fades into the dark.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { color: { value: new THREE.Color(0x4e7488) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 color; varying vec3 vW;
      float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); return 1.-min(min(g.x,g.y),1.); }
      void main(){ float d=length(vW.xz-vec2(1.,0.)); float f=smoothstep(24.,3.,d); float a=(grid(vW.xz,1.)*.55+grid(vW.xz,.25)*.14)*f; gl_FragColor=vec4(color*a,a); }`,
  }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // ---------- The house: a rough plan (not measured), walls as glass with bright edges ----------
  const house = new THREE.Group(); house.position.set(-1, 0, 0); scene.add(house);
  const ROOMS = [
    ['front', 'Front room', -3, -4.5, 3, 2.5], ['bed2', 'Bedroom 2', 0, -4.5, 3, 2.5], ['living', 'Living room', -3, -2, 3.5, 3],
    ['dining', 'Dining', 0.5, -2, 2.5, 3], ['kitchen', 'Kitchen', 0.5, 1, 2.5, 2.5], ['yours', 'Your room', -3, 1, 3.5, 2.5],
    ['bath', 'Bath', -3, 3.5, 1.6, 1.5], ['back', 'Storage', -1.4, 3.5, 4.4, 1.5],
  ];
  const floors = {};
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa9d6ea, transparent: true, opacity: 0.42 });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x7fd7f5, transparent: true, opacity: 0.014, side: THREE.DoubleSide, depthWrite: false });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.12, 9.9, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x0a1016, roughness: 0.8 })); slab.position.set(0, 0.0, 0.25); house.add(slab);
  for (const [id, , x, z, w, d] of ROOMS) {
    const fm = new THREE.MeshStandardMaterial({ color: 0x0e1820, roughness: 0.85, emissive: new THREE.Color(0x37e0ff), emissiveIntensity: 0 });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, d - 0.06), fm); f.rotation.x = -Math.PI / 2; f.position.set(x + w / 2, 0.07, z + d / 2); house.add(f); floors[id] = fm;
    const bg = new THREE.BoxGeometry(w, 0.9, d); bg.translate(x + w / 2, 0.52, z + d / 2);
    house.add(new THREE.LineSegments(new THREE.EdgesGeometry(bg), edgeMat));
    const glass = new THREE.Mesh(bg, glassMat); house.add(glass); hide.push(glass);
  }
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.6, metalness: 0.2 });
  const add = (geo, mat, x, y, z, parent = house) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  add(new RoundedBoxGeometry(1.3, 0.05, 0.55, 2, 0.02), dark, -2.25, 0.45, 1.35);
  for (const [dx, dz] of [[-0.6, -0.22], [0.6, -0.22], [-0.6, 0.22], [0.6, 0.22]]) add(new THREE.BoxGeometry(0.04, 0.4, 0.04), dark, -2.25 + dx, 0.25, 1.35 + dz);
  const screen = add(new THREE.BoxGeometry(0.7, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x37e0ff, emissiveIntensity: 0.6 }), -2.25, 0.72, 1.17);
  add(new RoundedBoxGeometry(0.45, 0.5, 0.45, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.4, metalness: 0.4 }), -0.15, 0.32, 3.05);
  const printLed = add(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb35c }), -0.15, 0.5, 2.82);
  add(new RoundedBoxGeometry(1.1, 0.3, 1.5, 2, 0.08), new THREE.MeshStandardMaterial({ color: 0x26323c, roughness: 0.9 }), -1.2, 0.22, 2.5);
  // Living room: sofa and the TV.
  add(new RoundedBoxGeometry(1.8, 0.35, 0.6, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x24303a, roughness: 0.9 }), -1.3, 0.25, -0.2);
  add(new THREE.BoxGeometry(1.2, 0.68, 0.04), new THREE.MeshStandardMaterial({ color: 0x06080a, roughness: 0.2, metalness: 0.5 }), -1.3, 0.62, -1.88);

  const drive = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7), new THREE.MeshStandardMaterial({ color: 0x0b1117, roughness: 0.95 })); drive.rotation.x = -Math.PI / 2; drive.position.set(4.2, 0.01, -1.4); scene.add(drive);
  const car = new THREE.Group(); car.position.set(4.2, 0, -1.8); car.rotation.y = Math.PI / 2; car.scale.setScalar(0.62); scene.add(car);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x4d5359, metalness: 0.7, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassC = new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: 0.3, roughness: 0.05, clearcoat: 1 });
  add(new RoundedBoxGeometry(4.6, 0.85, 1.9, 4, 0.2), paint, 0, 0.78, 0, car);
  add(new RoundedBoxGeometry(2.9, 0.7, 1.72, 4, 0.22), paint, -0.35, 1.45, 0, car);
  add(new RoundedBoxGeometry(2.7, 0.5, 1.76, 2, 0.12), glassC, -0.35, 1.5, 0, car);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 });
  for (const x of [1.45, -1.45]) for (const z of [0.9, -0.9]) add(new THREE.CylinderGeometry(0.4, 0.4, 0.32, 28), tyre, x, 0.4, z, car).rotation.x = Math.PI / 2;
  const lamp = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xeaf6ff, emissiveIntensity: 3 }), tail = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2a1f, emissiveIntensity: 2.4 });
  add(new THREE.BoxGeometry(0.04, 0.05, 1.6), lamp, 2.31, 1.02, 0, car); add(new THREE.BoxGeometry(0.04, 0.05, 1.5), tail, -2.31, 1.08, 0, car);

  // ---------- Jarvis's presence: a small core floating over the house ----------
  const color = new THREE.Color(COL.idle), tmp = new THREE.Color();
  const CU = { t: { value: 0 }, level: { value: 0 }, color: { value: color } };
  const core = new THREE.Group(); core.position.set(0.6, 3.1, 0.2); scene.add(core);
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 24), new THREE.ShaderMaterial({
    uniforms: CU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float t,level; varying vec3 vN,vV; void main(){ vec3 p=position*(1.+level*.18*sin(position.y*14.+t*9.)); vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: 'uniform vec3 color; uniform float level; varying vec3 vN,vV; void main(){ float f=pow(max(1.-abs(dot(vN,vV)),0.),2.2); gl_FragColor=vec4(color*(f*(1.2+level*1.5)+.05),f); }',
  })));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); glow.scale.setScalar(1.3); core.add(glow); hide.push(glow);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.006, 6, 120), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); halo.rotation.x = Math.PI / 2; core.add(halo);
  const beamGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, -2.2, 0)]);
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })); core.add(beam);

  // ---------- Composer ----------
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const dof = new DofPass(scene, camera, hide); composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.55); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- Pins and the card, held in 3D space ----------
  // In the real app the pins only say what is true: room names, and the car's real lock state when known.
  const PINS = opts.app ? [
    { id: 'car', at: V(4.2, 1.35, -1.8), k: 'Car', v: '' },
    { id: 'living', at: V(-2.3, 1.0, -0.5), k: 'Living room', v: '' },
    { id: 'yours', at: V(-2.3, 1.0, 2.25), k: 'Your room', v: '' },
    { id: 'kitchen', at: V(0.75, 1.0, 2.25), k: 'Kitchen', v: '' },
    { id: 'front', at: V(-2.5, 0.95, -4.5), k: 'Front room', v: '' },
  ] : [
    { id: 'car', at: V(4.2, 1.35, -1.8), k: 'Car', v: 'Locked · parked' },
    { id: 'living', at: V(-2.3, 1.0, -0.5), k: 'Living room', v: 'TV off' },
    { id: 'yours', at: V(-2.3, 1.0, 2.25), k: 'Your room', v: 'Printer idle' },
    { id: 'front', at: V(-2.5, 0.95, -4.5), k: 'Front door', v: 'All quiet' },
    { id: 'kitchen', at: V(0.75, 1.0, 2.25), k: 'Kitchen', v: 'Lights off' },
  ];
  const html = opts.app ? PINS.map((p, i) => `<div class="apin" data-pin="${i}"><div class="ln"></div><div class="dt"></div><div class="lb"><small>${p.k}</small><span data-v>${p.v}</span></div></div>`).join('') : `${shared.header()}<svg id="lead"><line id="ld"/><circle id="ldc" r="3"/></svg>
    ${PINS.map((p, i) => `<div class="pin" data-pin="${i}"><div class="ln"></div><div class="dt"></div><div class="lb"><small>${p.k}</small>${p.v}</div></div>`).join('')}
    ${shared.card}${shared.caption}`;
  let pinEls = [], card = null, ld = null, ldc = null;
  const mount = (root) => { pinEls = [...root.querySelectorAll('[data-pin]')]; card = root.querySelector('[data-card]'); ld = root.querySelector('#ld'); ldc = root.querySelector('#ldc'); };

  let W = 1, H = 1, clock = 0;
  const focus = spring(0.9, 18), target = V(0.9, 0.4, -0.2), look = V(), tv = V();
  const focusAt = { idle: V(-2.3, 0.5, 2.0), off: V(-2.3, 0.5, 2.0), listening: core.position, thinking: core.position, confirm: core.position, alert: core.position, speaking: opts.app ? core.position : V(4.2, 0.8, -1.8) };
  const setInfo = (id, text) => { const i = PINS.findIndex((p) => p.id === id); const e = pinEls[i]?.querySelector('[data-v]'); if (e && e.textContent !== text) e.textContent = text; };
  const toScreen = (v) => { tv.copy(v).project(camera); return [(tv.x * 0.5 + 0.5) * W, (-tv.y * 0.5 + 0.5) * H, tv.z]; };

  function update(s) {
    const m = s.motion, TAU = Math.PI * 2, w = (TAU * s.t) / 10, swing = 0.5 - 0.5 * Math.cos(w);
    clock += s.dt * m;
    // A slow arc round the house that comes back to where it started, so the 10 seconds loop seamlessly.
    const ang = 0.62 + (0.26 * Math.sin(w - Math.PI / 2) + 0.26) * m, rad = 19.5 - 2.0 * swing * m, hgt = 10.5 - 1.4 * swing * m;
    camera.position.set(Math.sin(ang) * rad + 0.6, hgt, Math.cos(ang) * rad); look.copy(target).add(V(0, 0, -0.4 * swing * m)); camera.lookAt(look);
    const fd = camera.position.distanceTo(focusAt[s.phase]);
    const f = s.reduce ? (focus.set(fd), fd) : focus.step(fd, s.dt);
    dof.u.focus.value = f; dof.u.range.value = 5; dof.u.maxBlur.value = 11 * renderer.getPixelRatio();
    // Core colour and voice
    color.lerp(tmp.setHex(COL[s.phase]), 1 - Math.exp(-5 * s.dt)); CU.t.value = clock; CU.level.value = s.level;
    core.position.y = 3.1 + Math.sin(clock * 1.2) * 0.06; halo.rotation.z += s.dt * 0.4 * m; halo.scale.setScalar(1 + s.level * 0.25);
    glow.material.opacity = 0.6 + s.level * 0.5; beam.material.opacity = 0.15 + s.level * 0.3;
    const hotRoom = s.phase === 'idle' ? 'yours' : null;
    for (const [id, fm] of Object.entries(floors)) fm.emissiveIntensity = smooth(fm.emissiveIntensity, id === hotRoom ? 0.16 : 0, 4, s.dt);
    screen.material.emissiveIntensity = 0.5 + 0.1 * Math.sin(clock * 2); printLed.visible = Math.sin(clock * 3) > -0.6;
    // Pins: placed on screen from their 3D spot, softened by the same depth of field.
    const hot = s.phase === 'speaking' ? 'car' : s.phase === 'idle' ? 'yours' : '';
    PINS.forEach((p, i) => {
      const e = pinEls[i]; if (!e) return; const [x, y, z] = toScreen(p.at);
      const c = clamp01(Math.abs(camera.position.distanceTo(p.at) - f) / 4.2);
      e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; e.style.opacity = z < 1 ? (1 - c * 0.55).toFixed(2) : 0;
      e.style.filter = c > 0.08 ? `blur(${(c * 2.2).toFixed(2)}px)` : 'none'; e.classList.toggle('hot', p.id === hot);
    });
    if (card) {
      const [cx, cy] = toScreen(core.position), k = clamp01(s.card), x = cx + 64, y = cy - 132;
      card.style.transform = s.reduce ? `translate(${x}px,${y}px)` : `translate(${(x + (1 - k) * -16).toFixed(1)}px,${(y + (1 - k) * 10).toFixed(1)}px) scale(${(0.96 + 0.04 * k).toFixed(4)})`;
      card.style.transformOrigin = '0 100%';
      ld.setAttribute('x1', cx + 14); ld.setAttribute('y1', cy); ld.setAttribute('x2', x); ld.setAttribute('y2', y + card.offsetHeight - 10); ld.style.opacity = k;
      ldc.setAttribute('cx', cx + 14); ldc.setAttribute('cy', cy); ldc.style.opacity = k;
    }
    document.body.style.setProperty('--sc', '#' + color.getHexString());
  }
  function resize(w, h) {
    W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix();
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
  }
  return { html, mount, update, resize, setInfo, placesCard: true, render: (dt) => composer.render(dt) };
}
