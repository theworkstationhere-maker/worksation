// Procedural sound: everything is synthesised live with Web Audio (no audio files).
//   outdoor day: breeze + birdsong · outdoor night: crickets · interior: soft hall drone with echo
//   footsteps on every step while walking. Starts only after the user turns sound on (browser rule).
let ctx = null, master = null, wet = null, scene = 'outdoor', enabled = false, timers = [], nodes = [];

function noiseBuffer(seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
  return b;
}
function setup() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  // simple echo for interiors
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.23;
  const fb = ctx.createGain(); fb.gain.value = 0.35;
  wet = ctx.createGain(); wet.gain.value = 0;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  wet._in = delay;
}
function clearScene() { timers.forEach(clearTimeout); timers = []; nodes.forEach((n) => { try { n.stop(); } catch { /* stopped */ } n.disconnect(); }); nodes = []; }
function every(min, max, fn) { const tick = () => { if (!enabled) return; fn(); timers.push(setTimeout(tick, min + Math.random() * (max - min))); }; timers.push(setTimeout(tick, Math.random() * max)); }

function breeze(level = 0.06) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const g = ctx.createGain(); g.gain.value = level;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = level * 0.6;
  lfo.connect(lg); lg.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(master); src.start(); lfo.start();
  nodes.push(src, lfo);
}
function chirp() {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  const f = 2400 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
  o.type = 'sine'; g.gain.value = 0; o.connect(g); g.connect(master);
  for (let i = 0; i < n; i++) {
    const s = t + i * 0.11;
    o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * 1.35, s + 0.06);
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.05, s + 0.01); g.gain.linearRampToValueAtTime(0, s + 0.08);
  }
  o.start(t); o.stop(t + n * 0.11 + 0.1);
}
function cricket() {
  const t = ctx.currentTime, o = ctx.createOscillator(), am = ctx.createOscillator(), g = ctx.createGain(), ag = ctx.createGain();
  o.frequency.value = 4300 + Math.random() * 400; am.frequency.value = 28; ag.gain.value = 0.5;
  am.connect(ag); ag.connect(g.gain); g.gain.value = 0;
  o.connect(g); g.connect(master);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.6);
  o.start(t); am.start(t); o.stop(t + 0.7); am.stop(t + 0.7);
}
function drone() {
  for (const [f, v] of [[110, 0.035], [164.8, 0.025], [220.5, 0.015]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 700; g.gain.value = v;
    o.connect(lp); lp.connect(g); g.connect(master); g.connect(wet._in); o.start(); nodes.push(o);
  }
}
function startScene() {
  clearScene();
  if (!enabled) return;
  wet.gain.value = scene === 'interior' ? 0.5 : 0;
  if (scene === 'interior') { drone(); breeze(0.015); }
  else if (scene === 'night') { breeze(0.03); every(350, 1400, cricket); }
  else { breeze(0.05); every(1200, 4200, chirp); }
}

export const sound = {
  get enabled() { return enabled; },
  setEnabled(on) {
    setup();
    enabled = on;
    if (on) ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.4);
    startScene();
  },
  setScene(s) { if (s === scene) return; scene = s; if (enabled) startScene(); },
  step(soft = false) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = scene === 'interior' ? 900 : 420 + Math.random() * 120; bp.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(soft ? 0.12 : 0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    src.connect(bp); bp.connect(g); g.connect(master); if (scene === 'interior') g.connect(wet._in);
    src.start(t); src.stop(t + 0.13);
  },
};
