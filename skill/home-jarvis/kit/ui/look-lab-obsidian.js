// Look B · Obsidian: near-black glass, one warm accent, a slow liquid-metal core and large calm type.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SNOISE, smooth, glowTexture } from './look-lab-kit.js';

const WARM = new THREE.Color(0xffbe6b);

export function createObsidian(renderer, shared, opts = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060607);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100); camera.position.set(0, 0, 8);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.8, 0.85); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const accent = WARM.clone(), ACC = { alert: new THREE.Color(0xff6b5e), off: new THREE.Color(0x6d6a66), confirm: new THREE.Color(0xffd27a) };
  const U = { t: { value: 0 }, amp: { value: 0.1 }, warm: { value: 0 }, accent: { value: accent } };
  const stage = new THREE.Group(); scene.add(stage);
  // The liquid-metal core: a sphere whose skin flows slowly; it reflects a soft studio drawn in the shader.
  const metal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 120), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${SNOISE} uniform float t,amp; varying vec3 vN,vW;
      float f(vec3 n){ return snoise(n*.8+vec3(0.,0.,t*.1))*.7+snoise(n*1.6-vec3(t*.07,t*.05,0.))*.3; }
      vec3 d(vec3 n){ return n*(1.25*(1.+f(n)*amp)); }
      void main(){ vec3 n=normalize(position); vec3 p=d(n);
        vec3 tg=normalize(cross(n,abs(n.y)<.99?vec3(0.,1.,0.):vec3(1.,0.,0.))); vec3 bt=cross(n,tg); float e=.012;
        vec3 nn=normalize(cross(d(normalize(n+tg*e))-p,d(normalize(n+bt*e))-p));
        vN=normalize(mat3(modelMatrix)*nn); vW=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `uniform vec3 accent; uniform float warm; varying vec3 vN,vW;
      vec3 env(vec3 r){
        vec3 c=vec3(.006,.006,.007);
        c+=vec3(.95,.94,.92)*pow(smoothstep(.35,1.,r.y),3.)*.7;                       // soft box overhead
        c+=vec3(.9)*smoothstep(.86,.985,dot(r,normalize(vec3(-.75,.32,.55))))*.8;         // tall panel, front left
        c+=accent*smoothstep(.90,.995,dot(r,normalize(vec3(1.,.08,.12))))*(1.1+warm*2.6); // the one warm strip
        c+=vec3(.012,.011,.01)*smoothstep(0.,-1.,r.y);                                      // dark floor
        c+=vec3(.07,.068,.066)*smoothstep(-.1,1.,r.z)*(.6+.4*smoothstep(-.6,.4,r.y));    // dim wall behind the viewer, keeps the shape
        c+=vec3(.18)*exp(-abs(r.y+.02)*55.);                                              // horizon line
        return c; }
      void main(){ vec3 V=normalize(cameraPosition-vW); vec3 N=normalize(vN); vec3 R=reflect(-V,N);
        float fr=pow(1.-max(dot(N,V),0.),5.); vec3 f0=vec3(.56,.57,.6);
        vec3 col=env(R)*mix(f0,vec3(1.),fr)+vec3(.05,.048,.045)*fr; gl_FragColor=vec4(col,1.); }`,
  }));
  stage.add(metal);
  // A faint warm pool of light under it, so it sits on something.
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: glowTexture([[0, 0.5], [0.4, 0.12], [1, 0]]), color: WARM, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -1.75; stage.add(pool);

  const html = opts.app ? '' : `${shared.header('Jarvis')}
    <div class="big"><div class="day" data-day></div><h1>Good evening, ${(window.JARVIS_CONFIG || {}).call_me || 'boss'}.</h1><div class="line"></div>
      <div class="ost"><i></i><span data-state>Waiting</span></div>${shared.caption}</div>${shared.card}`;
  const mount = (root) => { if (opts.app) return; const d = root.querySelector('[data-day]'); d.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: ((window.JARVIS_CONFIG || {}).timezone || undefined) }); };

  let clock = 0, rate = 1, warm = 0, W = 1, H = 1;
  function update(s) {
    rate = smooth(rate, s.phase === 'thinking' ? 2.2 : 1, 2.5, s.dt);
    accent.lerp(ACC[s.phase] || WARM, 1 - Math.exp(-4 * s.dt));
    const pulse = s.phase === 'confirm' || s.phase === 'alert' ? 0.25 + 0.25 * Math.sin(clock * (s.phase === 'alert' ? 6 : 2.6)) : 0;
    warm = smooth(warm, s.phase === 'speaking' ? 0.35 + s.level * 0.9 : s.phase === 'listening' ? s.level * 0.5 : pulse, 8, s.dt);
    clock += s.dt * rate * s.motion;
    U.t.value = clock; U.warm.value = warm; U.amp.value = 0.055 + s.level * 0.07 + (rate - 1) * 0.015;
    metal.rotation.y = clock * 0.06; metal.rotation.x = Math.sin(clock * 0.05) * 0.15;
    pool.material.opacity = 0.14 + warm * 0.25;
    camera.position.x = Math.sin(s.t * 0.628) * 0.15 * s.motion; camera.lookAt(0, 0, 0);
  }
  function resize(w, h) {
    W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix();
    // On a wide window the metal sits to the right of the big type; on a narrow one it moves below it.
    const wide = !opts.app && w / h > 1.25, halfW = Math.tan((camera.fov * Math.PI) / 360) * 8 * camera.aspect;
    if (opts.app) { const a = w / h; if (a < 0.8) { stage.position.set(0, 0.62, 0); stage.scale.setScalar(0.8 * Math.max(0.42, a * 1.18)); } else { stage.position.set(-halfW * 0.08, 0.2, 0); stage.scale.setScalar(0.8); } }
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
  }
  return { html, mount, update, resize, render: (dt) => composer.render(dt) };
}
