// (desk.tones in Settings → Look). Quiet on purpose: they sit under the voice and never play while Jarvis speaks.
export function createTones() {
  let ctx = null, on = true, last = 0;
  const audio = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  addEventListener('pointerdown', () => audio(), { once: true });
  // One soft note: a sine with a quick attack and a gentle fade.
  function note(freq, at, len = 0.11, vol = 0.045) {
    const c = audio(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.02);
  }
  const SOUNDS = {
    listening: () => { note(660, 0); note(880, 0.07); },
    thinking: () => { note(587, 0, 0.09, 0.03); },               // got it
    done: () => { note(784, 0, 0.12, 0.03); note(659, 0.08, 0.16, 0.025); },
    confirm: () => { note(740, 0, 0.1); note(740, 0.16, 0.12); },
    alert: () => { note(392, 0, 0.16, 0.05); note(330, 0.18, 0.2, 0.05); },
    off: () => { note(523, 0, 0.1, 0.03); note(392, 0.08, 0.14, 0.025); },
  };
  return {
    set enabled(v) { on = !!v; }, get enabled() { return on; },
    play(name) {
      if (!on || !SOUNDS[name] || document.hidden) return;
      const now = performance.now(); if (now - last < 250) return; last = now;
      SOUNDS[name]();
    },
  };
}
