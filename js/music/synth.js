// WebAudio synth: one shared AudioContext, a master chain (bus -> compressor -> limiter -> volume)
// with a generated-noise reverb, and the band's instruments. Everything is synthesized: no files.
// Every instrument takes (dest, time, ...) where dest is a bus from createBus() and time is in
// AudioContext seconds, so song.js can schedule ahead with sample accuracy.

let ctx = null;
let mix = null;      // where every bus ends up (dry)
let verbIn = null;   // reverb send input
let master = null;   // final volume (0 when muted)
let noiseBuf = null;
let analyser = null;
let volume = 0.8;
let muted = false;
const ksCache = new Map();

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// iPhone: WebAudio counts as "ambient" sound, so the ring/silent switch mutes the music while Papá's
// voice (an <audio> element) still plays. Asking for a "playback" session makes the music behave like
// the voice: it plays with the switch on silent (iOS 17+; older systems just ignore it).
export function playbackSession() {
  try { if (typeof navigator !== 'undefined' && navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
}

export function getContext() {
  if (ctx) return ctx;
  playbackSession();
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch { try { ctx = new AC(); } catch { return null; } }
  build();
  return ctx;
}

export const now = () => (ctx ? ctx.currentTime : 0);

// Offline render (export a song to a file): while fn() schedules, the module's context and master chain
// are an OfflineAudioContext of `seconds`. JS is single-threaded, so live playback is untouched.
// Resolves to an AudioBuffer, or null when the browser can't render offline.
export function renderOffline(seconds, fn, { sampleRate = 44100 } = {}) {
  const OAC = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!OAC) return Promise.resolve(null);
  let off;
  try { off = new OAC(2, Math.ceil(seconds * sampleRate), sampleRate); } catch { return Promise.resolve(null); }
  const saved = { ctx, mix, verbIn, master, noiseBuf, analyser, cache: new Map(ksCache) };
  ctx = off;
  ksCache.clear();
  try {
    build();
    master.gain.value = 0.9;
    fn();
  } finally {
    ({ ctx, mix, verbIn, master, noiseBuf, analyser } = saved);
    ksCache.clear();
    saved.cache.forEach((v, k) => ksCache.set(k, v));
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (buf) => { if (!settled) { settled = true; resolve(buf || null); } };
    off.oncomplete = (e) => done(e.renderedBuffer);
    try {
      const p = off.startRendering();
      if (p && p.then) p.then(done, () => done(null));
    } catch { done(null); }
  });
}

function build() {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5;
  comp.attack.value = 0.006; comp.release.value = 0.22;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.002; limiter.release.value = 0.1;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  mix = ctx.createGain();
  mix.gain.value = 0.7;
  mix.connect(comp).connect(limiter).connect(master).connect(ctx.destination);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  limiter.connect(analyser); // QA meter (level before the volume knob)

  // Reverb: stereo noise with an exponential tail, darker as it decays (a small warm hall).
  const conv = ctx.createConvolver();
  conv.buffer = impulse(2.2, 2.6);
  verbIn = ctx.createGain();
  const ret = ctx.createGain();
  ret.gain.value = 0.32;
  const preLp = ctx.createBiquadFilter();
  preLp.type = 'lowpass'; preLp.frequency.value = 6000;
  verbIn.connect(preLp).connect(conv).connect(ret).connect(mix);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function impulse(seconds, decay) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      const k = 0.15 + 0.8 * x; // smoothing grows with time: high end fades first
      lp += (1 - k) * ((Math.random() * 2 - 1) - lp);
      const pre = i < sr * 0.012 ? i / (sr * 0.012) : 1; // 12 ms pre-delay ramp
      d[i] = lp * Math.pow(1 - x, decay) * pre;
    }
  }
  return buf;
}

// First touch on iOS/Safari: create + resume inside the gesture and play one silent sample.
// Also called on later touches: iOS leaves the context "interrupted" after a call, Siri or switching apps.
export function unlock() {
  playbackSession();
  const c = getContext();
  if (!c) return Promise.resolve(false);
  try {
    const b = c.createBuffer(1, 1, c.sampleRate);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch { /* ignore */ }
  if (c.state === 'running') return Promise.resolve(true);
  return c.resume().then(() => c.state === 'running').catch(() => false);
}

export const getAnalyser = () => (getContext(), analyser);
export const isRunning = () => !!ctx && ctx.state === 'running';

export function setMasterVolume(v) {
  volume = Math.max(0, Math.min(1, Number(v) || 0));
  applyVolume();
}
export const getMasterVolume = () => volume;
export function setMuted(flag) {
  muted = !!flag;
  applyVolume();
}
export const isMuted = () => muted;
function applyVolume() {
  if (!master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(muted ? 0 : volume, t, 0.03);
}

// A bus = a group of sounds (one song, one preview) that can be faded and dropped together.
// Each part has its own level and reverb send.
const PART_MIX = {
  drums: { level: 0.9, send: 0.12 },
  bass: { level: 0.36, send: 0.03 },
  keys: { level: 0.75, send: 0.3 },
  guitar: { level: 1, send: 0.22 },
  choir: { level: 0.95, send: 0.55 },
  sfx: { level: 0.7, send: 0.15 },
};
export function createBus({ level = 1 } = {}) {
  const c = getContext();
  if (!c) return null;
  const out = c.createGain();
  out.gain.value = level;
  out.connect(mix);
  const send = c.createGain();
  send.gain.value = 1;
  send.connect(verbIn);
  const parts = {};
  for (const [name, p] of Object.entries(PART_MIX)) {
    const g = c.createGain();
    g.gain.value = p.level;
    g.connect(out);
    const s = c.createGain();
    s.gain.value = p.send;
    g.connect(s).connect(send);
    parts[name] = g;
  }
  let dead = false;
  return {
    parts,
    fade(sec = 0.3) {
      if (dead) return;
      const t = c.currentTime;
      for (const g of [out, send]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + Math.max(0.01, sec));
      }
    },
    dispose(after = 0) {
      if (dead) return;
      dead = true;
      setTimeout(() => { try { out.disconnect(); send.disconnect(); } catch { /* gone */ } }, after * 1000 + 50);
    },
  };
}

// ---------- helpers ----------
const ok = (dest) => ctx && dest && dest.parts;
function env(g, t, { a = 0.005, peak = 1, d = 0.1, s = 0.5, dur = 0.3, r = 0.1 }) {
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * s, t + a, d / 3);
  const end = t + Math.max(a + 0.01, dur);
  p.setTargetAtTime(0.0001, end, r / 3);
  return end + r * 1.5;
}
function pan(node, value) {
  if (!ctx.createStereoPanner) return node;
  const p = ctx.createStereoPanner();
  p.pan.value = value;
  node.connect(p);
  return p;
}
function noise(t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const off = Math.random() * 0.5;
  s.start(t, off, Math.min(dur + 0.05, 1 - off));
  return s;
}

// ---------- guitar: Karplus-Strong pluck, clean and bright ----------
// The string is simulated once per pitch in JS (a delay line filled with a soft noise "pick",
// fed back through a gentle low-pass), cached as an AudioBuffer, and tuned exactly with playbackRate.
function ksBuffer(midi) {
  if (ksCache.has(midi)) return ksCache.get(midi);
  const sr = ctx.sampleRate;
  const f = mtof(midi);
  const S = 0.35;                                  // stretch: < 0.5 keeps more highs (bright pop tone)
  const N = Math.max(4, Math.floor(sr / f - S));
  const len = Math.floor(sr * 1.8);
  const T60 = 2.6 - Math.min(1.4, (midi - 55) * 0.05); // low notes ring longer
  const g = Math.pow(10, -3 / (T60 * f));
  const line = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += 0.6 * ((Math.random() * 2 - 1) - lp); line[i] = lp; }
  const P = Math.max(1, Math.round(N * 0.13));     // pick near the bridge: remove a comb of harmonics
  const exc = Float32Array.from(line, (v, i) => v - 0.6 * line[(i - P + N) % N]);
  let mean = 0;
  for (const v of exc) mean += v;
  mean /= N;
  for (let i = 0; i < N; i++) line[i] = exc[i] - mean;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let idx = 0;
  for (let n = 0; n < len; n++) {
    const cur = line[idx];
    const nxt = line[idx + 1 === N ? 0 : idx + 1];
    d[n] = cur;
    line[idx] = g * ((1 - S) * cur + S * nxt);
    idx = idx + 1 === N ? 0 : idx + 1;
  }
  let peak = 0;
  for (let n = 0; n < Math.min(len, 4000); n++) peak = Math.max(peak, Math.abs(d[n]));
  const norm = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(sr * 0.05);
  for (let n = 0; n < len; n++) d[n] *= norm * (n > len - fade ? (len - n) / fade : 1);
  const entry = { buf, rate: f * (N + S) / sr };
  ksCache.set(midi, entry);
  return entry;
}

export function guitar(dest, t, midi, dur = 0.4, vel = 1) {
  if (!ok(dest)) return;
  const { buf, rate } = ksBuffer(midi);
  const tone = ctx.createBiquadFilter();
  tone.type = 'highshelf'; tone.frequency.value = 2800; tone.gain.value = 5;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking'; body.frequency.value = 320; body.Q.value = 1; body.gain.value = -4;
  const g = ctx.createGain();
  const stopAt = env(g, t, { a: 0.002, peak: 0.72 * vel, d: 0.6, s: 0.8, dur: Math.max(0.12, dur), r: 0.12 });
  tone.connect(body).connect(g);
  pan(g, 0.18).connect(dest.parts.guitar);
  // main string + a slightly detuned, delayed double: the shimmer of a clean chorus pedal
  const a = ctx.createBufferSource();
  a.buffer = buf; a.playbackRate.value = rate;
  a.connect(tone);
  a.start(t); a.stop(stopAt);
  const b = ctx.createBufferSource();
  b.buffer = buf; b.playbackRate.value = rate * 1.0035;
  const bg = ctx.createGain(); bg.gain.value = 0.4;
  b.connect(bg);
  pan(bg, -0.35).connect(g);
  b.start(t + 0.011); b.stop(stopAt + 0.011);
}

// ---------- keys: 'pad' (warm detuned saws) or 'ep' (FM electric piano, for stabs) ----------
export function keys(dest, t, midis, dur = 1, { style = 'pad', vel = 1 } = {}) {
  if (!ok(dest)) return;
  const out = ctx.createGain();
  const n = midis.length || 1;
  if (style === 'pad') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2200, t + Math.min(dur, 0.6));
    const stopAt = env(out, t, { a: 0.18, peak: (0.32 / n) * vel, d: 0.4, s: 0.85, dur, r: 0.45 });
    lp.connect(out);
    for (const m of midis) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(stopAt);
      }
    }
  } else {
    const stopAt = env(out, t, { a: 0.004, peak: (0.55 / n) * vel, d: 0.35, s: 0.35, dur, r: 0.18 });
    for (const m of midis) {
      const f = mtof(m);
      const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
      const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * 1.8, t);
      idx.gain.setTargetAtTime(f * 0.25, t, 0.08);
      mod.connect(idx).connect(car.frequency);
      car.connect(out);
      car.start(t); mod.start(t); car.stop(stopAt); mod.stop(stopAt);
    }
  }
  pan(out, -0.2).connect(dest.parts.keys);
}

// ---------- bass: saw + sine sub through a plucky low-pass ----------
export function bass(dest, t, midi, dur = 0.3, vel = 1) {
  if (!ok(dest)) return;
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.setTargetAtTime(380, t + 0.005, 0.06);
  const g = ctx.createGain();
  const stopAt = env(g, t, { a: 0.004, peak: 0.6 * vel, d: 0.2, s: 0.7, dur: Math.max(0.08, dur - 0.02), r: 0.05 });
  const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = f;
  const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f;
  const sg = ctx.createGain(); sg.gain.value = 0.8;
  saw.connect(lp).connect(g);
  sub.connect(sg).connect(g);
  g.connect(dest.parts.bass);
  for (const o of [saw, sub]) { o.start(t); o.stop(stopAt); }
}

// ---------- drums ----------
export function kick(dest, t, vel = 1) {
  if (!ok(dest)) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(165, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(1.0 * vel, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  o.connect(g).connect(dest.parts.drums);
  o.start(t); o.stop(t + 0.45);
  const n = noise(t, 0.02);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.25 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
  n.connect(hp).connect(ng).connect(dest.parts.drums);
}

export function snare(dest, t, vel = 1) {
  if (!ok(dest)) return;
  const n = noise(t, 0.25);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1300;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.55 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.connect(hp).connect(ng).connect(dest.parts.drums);
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.5 * vel, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  o.connect(og).connect(dest.parts.drums);
  o.start(t); o.stop(t + 0.13);
}

export function hihat(dest, t, { open = false, vel = 1 } = {}) {
  if (!ok(dest)) return;
  const len = open ? 0.32 : 0.05;
  const n = noise(t, len);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.32 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  n.connect(hp).connect(bp).connect(g);
  pan(g, 0.25).connect(dest.parts.drums);
}

export function clap(dest, t, vel = 1) {
  if (!ok(dest)) return;
  const n = noise(t, 0.3);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2;
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  for (const k of [0, 0.011, 0.022]) {   // three quick hands, then the room tail
    p.setValueAtTime(0.5 * vel, t + k);
    p.exponentialRampToValueAtTime(0.08 * vel, t + k + 0.009);
  }
  p.setValueAtTime(0.35 * vel, t + 0.033);
  p.exponentialRampToValueAtTime(0.001, t + 0.24);
  n.connect(bp).connect(g).connect(dest.parts.drums);
}

export function crash(dest, t, vel = 1) {
  if (!ok(dest)) return;
  const n = noise(t, 0.95);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.22 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
  n.connect(hp).connect(g);
  pan(g, -0.3).connect(dest.parts.drums);
}

// ---------- choir: "la" / "oh" from detuned saws through vowel formants ----------
const VOWELS = {
  a: [[800, 1], [1150, 0.5], [2900, 0.18]],
  o: [[450, 1], [800, 0.45], [2830, 0.1]],
};
export function choir(dest, t, midi, dur = 0.5, { vowel = 'a', vel = 1, crowd = true } = {}) {
  if (!ok(dest)) return;
  const pre = ctx.createGain();
  const out = ctx.createGain();
  const stopAt = env(out, t, { a: 0.07, peak: 0.9 * vel, d: 0.3, s: 0.85, dur, r: 0.22 });
  const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
  const vibG = ctx.createGain(); vibG.gain.value = 9; // cents
  vib.connect(vibG);
  const voices = crowd ? [[0, -14], [0, 11], [-12, -6], [-12, 8], [12, 3]] : [[0, -6], [0, 6]];
  for (const [oct, det] of voices) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = mtof(midi + oct); o.detune.value = det + (Math.random() * 6 - 3);
    vibG.connect(o.detune);
    const vg = ctx.createGain(); vg.gain.value = (oct > 0 ? 0.35 : 1) / voices.length;
    o.connect(vg).connect(pre);
    o.start(t + Math.random() * 0.03); o.stop(stopAt);
  }
  vib.start(t); vib.stop(stopAt);
  for (const [i, [f, amp]] of VOWELS[vowel === 'o' ? 'o' : 'a'].entries()) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = f / (i === 0 ? 90 : 120);
    if (vowel !== 'o' && i === 0) { // the "l" of "la": F1 opens up from closed
      bp.frequency.setValueAtTime(350, t);
      bp.frequency.linearRampToValueAtTime(f, t + 0.06);
    } else bp.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = amp * 3.2;
    pre.connect(bp).connect(g).connect(out);
  }
  out.connect(dest.parts.choir);
}

// ---------- soft chime for hits and UI ----------
export function chime(dest, t, midi, vel = 1) {
  if (!ok(dest)) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  for (const [r, a] of [[1, 1], [2.01, 0.3]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi) * r;
    const og = ctx.createGain(); og.gain.value = a;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + 0.4);
  }
  g.connect(dest.parts.sfx);
}

// ---------- style instruments (song.js STYLES): balada, pop latino and electro ----------

// Piano: a few decaying sine partials with a hammer that softens fast (the balada's broken chords).
export function piano(dest, t, midi, dur = 1, vel = 1) {
  if (!ok(dest)) return;
  const f = mtof(midi);
  const out = ctx.createGain();
  const p = out.gain;
  const ring = Math.max(0.25, dur);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(0.2 * vel, t + 0.004);
  p.setTargetAtTime(0.06 * vel, t + 0.004, 0.35);     // the note fades while held, like a real string
  p.setTargetAtTime(0.0001, t + ring, 0.12);
  const stopAt = t + ring + 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
  lp.frequency.setTargetAtTime(Math.min(4000, f * 3), t + 0.01, 0.25);
  lp.connect(out);
  for (const [r, a, det] of [[1, 1, 0], [1, 0.5, 4], [2, 0.42, 0], [3, 0.16, 2], [4, 0.07, 0]]) {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f * r; o.detune.value = det;
    const og = ctx.createGain(); og.gain.value = a;
    o.connect(og).connect(lp);
    o.start(t); o.stop(stopAt);
  }
  pan(out, -0.15).connect(dest.parts.keys);
}

// Rim click (cross-stick): a short wooden "tok" for the balada verse and the latino dembow.
export function rim(dest, t, vel = 1) {
  if (!ok(dest)) return;
  const o = ctx.createOscillator();
  o.type = 'triangle'; o.frequency.setValueAtTime(1750, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.32 * vel, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  o.connect(og);
  const n = noise(t, 0.04);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.35 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  n.connect(bp).connect(ng);
  const mixG = ctx.createGain();
  og.connect(mixG); ng.connect(mixG);
  pan(mixG, -0.15).connect(dest.parts.drums);
  o.start(t); o.stop(t + 0.06);
}

// Shaker / guacharaca: filtered noise with a soft attack; `long` is the accented "chas".
export function shaker(dest, t, { vel = 1, long = false } = {}) {
  if (!ok(dest)) return;
  const len = long ? 0.11 : 0.06;
  const n = noise(t, len);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7500; bp.Q.value = 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2 * vel, t + (long ? 0.025 : 0.01));
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  n.connect(hp).connect(bp).connect(g);
  pan(g, 0.35).connect(dest.parts.drums);
}

// Synth arpeggio: a plucky square + saw through a closing low-pass (electro).
export function synthArp(dest, t, midi, dur = 0.2, vel = 1) {
  if (!ok(dest)) return;
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 4;
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.setTargetAtTime(900, t + 0.004, 0.07);
  const g = ctx.createGain();
  const stopAt = env(g, t, { a: 0.003, peak: 0.13 * vel, d: 0.15, s: 0.35, dur: Math.max(0.06, dur), r: 0.08 });
  lp.connect(g);
  for (const [type, det, a] of [['square', 0, 0.6], ['sawtooth', 9, 0.5]]) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f; o.detune.value = det;
    const og = ctx.createGain(); og.gain.value = a;
    o.connect(og).connect(lp);
    o.start(t); o.stop(stopAt);
  }
  pan(g, -0.3).connect(dest.parts.keys);
}

// Synth pad that "pumps": it ducks on every beat and swells back, like a sidechained synth-pop pad.
export function synthPad(dest, t, midis, dur = 2, { beat = 0.5, vel = 1 } = {}) {
  if (!ok(dest)) return;
  const n = midis.length || 1;
  const out = ctx.createGain();
  const stopAt = env(out, t, { a: 0.02, peak: (0.3 / n) * vel, d: 0.3, s: 0.9, dur, r: 0.25 });
  const pump = ctx.createGain();
  const pg = pump.gain;
  pg.setValueAtTime(1, t);
  for (let b = t; b < t + dur - 0.01; b += beat) {
    pg.setValueAtTime(0.15, b);
    pg.linearRampToValueAtTime(1, b + beat * 0.7);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 1.2; lp.frequency.value = 2400;
  lp.connect(pump).connect(out);
  for (const m of midis) {
    for (const det of [-11, 11]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(stopAt);
    }
  }
  pan(out, 0.2).connect(dest.parts.keys);
}
