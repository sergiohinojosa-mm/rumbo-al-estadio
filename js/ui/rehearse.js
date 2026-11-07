// Rhythm minigame: three lanes, notes fall in time with her song and she taps them on the line
// (tap, J K L or the arrows). The song never stops and misses never punish. In 'show' mode the
// crowd starts singing her chorus halfway through.
// Before playing (rehearsal only): pick the song if she has 2+, and 🐢 Despacito (the slow tempo, on by default
// at the easiest level). Her first run ever gets a tiny tutorial: the first 4 notes light up their pad and say "¡Ahora!".
// Every run measures how late or early her taps land; with Bluetooth headphones (iOS doesn't report their delay) the
// game adjusts itself without asking: result.latencyMs, saved in settings.latencyMs.

import { h } from '../util.js';
import { app, saveSettingsNow, sfx, confetti } from './core.js';
import { playSong, stopMusic, songNotes, songTiming, nextDifficulty, hitSound, normalizeSong, INTRO_BARS } from '../music/song.js';
import { getContext, unlock, isRunning, createBus, guitar } from '../music/synth.js';

export const LATENCY_MS = 40;       // typical touch/keyboard delay; settings.latencyMs overrides it
export const PERFECT = 0.07;        // seconds either side of the beat
export const GOOD = 0.17;
// A "¡Bien!" counts almost like a "¡Perfecto!": the accuracy she later reads as "X de cada 10 notas" must match the
// "Tocaste X de Y notas" she just saw (with 0.85, 21 of 21 notes read as "8 de cada 10").
const GOOD_WEIGHT = 0.95;
const KEYS = { j: 0, a: 0, arrowleft: 0, k: 1, s: 1, arrowdown: 1, arrowup: 1, l: 2, d: 2, arrowright: 2 };
const KEY_LABEL = ['J', 'K', 'L'];
const SHAPES = ['●', '▲', '■'];     // same shapes and colors as the solo pads in live.js (help if colors look alike)
// Latency calibration: taps within ±300 ms of a note of their lane are samples; with 6+ samples that agree
// (middle half within 200 ms) and a median beyond ±60 ms, the next run shifts by that median.
const CAL = { window: 0.3, min: 6, dead: 0.06, spread: 0.2, maxMs: 300 };
const TUTORIAL_NOTES = 4;
const SPARKS = 8;                  // hit burst: a ring, a light beam up the lane and 8 sparks (transform/opacity only)

// Per-song best (hits) lives in s.records.songHits ({ songId: hits, 'show:songId': hits }), plain JSON.
export const songRecords = (s) => (s?.records ? (s.records.songHits ||= {}) : null);

// A tap on an empty lane still sounds: a soft guitar note in the song's key (tonic, 3rd, 5th of the
// pentatonic song.js uses for the riff), quieter than a real note.
const STRUM_TONIC = { alegre: 67, sonador: 62, valiente: 69 };
const STRUM_SEMI = [0, 4, 7];
let strumBus = null;
function strum(lane, mood) {
  const c = getContext();
  if (!c || !isRunning()) return;
  strumBus = strumBus || createBus({ level: 0.3 });
  try { guitar(strumBus, c.currentTime + 0.005, (STRUM_TONIC[mood] || 67) + STRUM_SEMI[lane], 0.25, 0.6); } catch { /* no audio */ }
}

export function rhythmGame({
  song, seconds, mode = 'ensayo', difficulty = 1, latencyMs, settings,
  autostart = false, onDone, onChorus, onBeat, crowdCount,
  slow, songs, tutorial = false, records,
  onFx,   // visual hook only (live.js lights the venue): onFx('beat') and onFx('hit', perfect); never affects the game
} = {}) {
  const show = mode === 'show';
  const total = Math.max(8, Number(seconds) || (show ? 75 : 30));
  const diff = Math.max(0, Math.min(2, Number(difficulty) || 0));
  const lat = (Number.isFinite(latencyMs) ? latencyMs : Number.isFinite(settings?.latencyMs) ? settings.latencyMs : LATENCY_MS) / 1000;
  const lead = 1.75 - 0.2 * diff;                                // seconds a note is visible before the line
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const choices = show ? [] : (Array.isArray(songs) ? songs : []).filter((x) => x && x.id);

  // The song as given (keeps its id and style); 🐢 only swaps the tempo for 'lento'.
  let base = song || {};
  let slowOn = !show && (typeof slow === 'boolean' ? slow : diff === 0);
  let s, T, notes, endT, crowdT, canSlow, lyric;
  function setup() {
    canSlow = !show && normalizeSong(base).tempo !== 'lento';
    s = normalizeSong(canSlow && slowOn ? { ...base, tempo: 'lento' } : base);
    T = songTiming(s);
    notes = songNotes(s, total, diff).map((n) => ({ ...n, el: null, judged: false }));
    endT = Math.ceil(total / T.bar - 1e-6) * T.bar;               // the closing chord
    crowdT = show ? Math.max(INTRO_BARS * T.bar, Math.ceil((total / 2) / T.bar - 1e-6) * T.bar) : Infinity;
    lyric = s.chorus.join(' ') || 'la la la';
  }
  setup();
  const recKeyOf = () => (base.id && records ? `${show ? 'show:' : ''}${base.id}` : null); // base can change (song chips)

  let state = 'ready';
  let handle = null;
  let clock = null;
  let raf = 0;
  let cursor = 0;            // next note to spawn
  const live = new Set();    // notes on screen
  let perfect = 0, good = 0, misses = 0, combo = 0, maxCombo = 0;
  let chorusShown = false;
  let lastBeat = -1;
  let geo = { hitY: 300 };
  const samples = [];        // signed tap offsets (s), for the latency calibration
  let cues = tutorial ? TUTORIAL_NOTES : 0;

  // ---- DOM ----
  const lanes = [0, 1, 2].map((i) => {
    const fb = h('span', { class: 'rg-fb', 'aria-hidden': 'true' });
    const cue = h('span', { class: 'rg-cue-txt', 'aria-hidden': 'true', hidden: true }, '¡Ahora!');
    // On a phone the keys mean nothing: only the shape. On the Mac: shape and key.
    const glow = h('i', { class: 'rg-pad-glow' });
    const pad = h('span', { class: 'rg-pad', 'aria-hidden': 'true' },
      glow, h('i', { class: 'rg-shape' }, SHAPES[i]), touch ? null : h('b', null, KEY_LABEL[i]));
    // Hit burst, built once per lane and replayed with the Web Animations API (no new nodes, no reflow on a tap).
    const ring = h('i', { class: 'rg-ring' });
    const sparks = Array.from({ length: SPARKS }, () => h('i', { class: 'rg-spark' }));
    const burst = h('span', { class: 'rg-burst', 'aria-hidden': 'true' }, ring, ...sparks);
    const beam = h('span', { class: 'rg-beam', 'aria-hidden': 'true' });
    const lane = h('div', {
      class: `rg-lane rg-l${i}`, role: 'button', 'aria-label': touch ? `Carril ${i + 1}` : `Carril ${i + 1} (${KEY_LABEL[i]})`,
      onPointerdown: (e) => { e.preventDefault(); tap(i); },
    }, beam, fb, cue, pad, burst);
    return { lane, fb, pad, cue, glow, ring, sparks, beam };
  });
  const hitLine = h('div', { class: 'rg-hit', 'aria-hidden': 'true' });
  const intro = h('div', { class: 'rg-intro', 'aria-live': 'polite', hidden: true }, '🎧 Escucha… ya vienen');
  // Stage lights: two beams that sway (transform) and a glow that pulses on each beat (opacity).
  const beatGlow = h('div', { class: 'rg-beatglow', 'aria-hidden': 'true' });
  const lights = h('div', { class: 'rg-lights', 'aria-hidden': 'true' }, h('i'), h('i'));
  const stage = h('div', { class: 'rg-stage' }, lights, beatGlow, ...lanes.map((l) => l.lane), hitLine, intro);
  const progress = h('i');
  const accEl = h('span', { class: 'rg-acc' }, '🎵 0 notas');  // counts up, never a %: she is 9
  const comboEl = h('span', { class: 'rg-combo' }, '');
  const energy = h('i');
  // In a show the box is there from the start (no layout jump mid-song); it lights up at the chorus.
  const chorusBox = h('div', { class: 'rg-chorus rg-wait', hidden: !show, 'aria-live': 'polite' },
    h('b', null, '🎤 A la mitad, el público canta contigo'), h('span', null, 'Tu coro: ', `“${lyric}”`));
  const startBtn = h('button', { type: 'button', class: 'rg-start', onClick: () => start() }, '▶ ¡A tocar!');
  const titleSong = h('span', null, `“${s.title}”`);
  // Before playing: which song (2+ songs) and 🐢 Despacito. Changing either rebuilds the notes.
  const songChips = choices.length >= 2 ? choices.map((c) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(c.id === base.id),
    onClick: () => { sfx('tap'); base = c; setup(); paintReady(); },
  }, h('span', null, `🎵 ${normalizeSong(c).title}`))) : [];
  const slowBtn = h('button', {
    type: 'button', class: 'chip rg-slow', 'aria-pressed': String(slowOn),
    onClick: () => { sfx('tap'); slowOn = !slowOn; setup(); paintReady(); },
  }, '🐢 Despacito');
  function paintReady() {
    songChips.forEach((b, i) => b.setAttribute('aria-pressed', String(choices[i].id === base.id)));
    slowBtn.setAttribute('aria-pressed', String(slowOn));
    slowBtn.hidden = !canSlow;
    titleSong.textContent = `“${s.title}”`;
    root.notes = notes.length;
  }
  const overlay = h('div', { class: 'rg-over' },
    songChips.length ? h('div', { class: 'rg-songs', role: 'group', 'aria-label': '¿Qué canción ensayas?' }, songChips) : null,
    show ? null : slowBtn,
    startBtn,
    h('p', null, 'Toca cada bolita cuando llegue a la línea.'),
    touch ? null : h('p', { class: 'rg-keys' }, 'En la compu: J K L o las flechas.'));
  const root = h('div', { class: `rg${show ? ' rg-show' : ''}${calm ? ' rg-calm' : ''}`, 'data-state': 'ready' },
    h('header', { class: 'rg-top' },
      h('h2', { class: 'rg-title' }, show ? '🎤 ¡En vivo! ' : '🎸 Ensayo: ', titleSong)),
    chorusBox,
    h('div', { class: 'rg-wrap' }, stage, overlay),
    h('div', { class: 'rg-hud' },
      h('div', { class: 'rg-prog', role: 'progressbar', 'aria-label': 'Avance de la canción' }, progress),
      h('div', { class: 'rg-row' }, accEl, comboEl),
      show ? h('div', { class: 'rg-row' }, h('span', null, '🔥 Energía del público'), h('div', { class: 'rg-energy' }, energy)) : null));
  paintReady();

  // ---- clocks: the audio clock when sound is running, else a plain timer ----
  function audioClock(c, startTime) {
    const out = (c.outputLatency || c.baseLatency || 0);
    let lastCt = -1, lastPerf = 0;
    return () => {
      const ct = c.currentTime;
      const p = performance.now();
      if (ct !== lastCt) { lastCt = ct; lastPerf = p; return ct - startTime - out; }
      // Between audio ticks we extrapolate a little. If the audio clock froze (iOS interruption, headphones
      // unplugged, a hidden tab), keep going with the plain clock so the song always reaches its end.
      const gap = (p - lastPerf) / 1000;
      return ct + (gap > 0.5 ? gap : Math.min(0.05, gap)) - startTime - out;
    };
  }
  function timerClock(delay) {
    const t0 = performance.now() + delay * 1000;
    return () => (performance.now() - t0) / 1000;
  }

  async function start() {
    if (state !== 'ready') return;
    state = 'play';
    root.dataset.state = 'play';
    overlay.hidden = true;
    intro.hidden = false;   // the intro bars have no notes: tell her they're coming
    const ok = await Promise.race([unlock(), new Promise((r) => setTimeout(() => r(false), 1500))]); // iOS can take a moment to wake
    if (state !== 'play') return;
    measure();
    const c = getContext();
    if (ok && c && isRunning()) {
      handle = playSong(s, {
        parts: show ? ['drums', 'bass', 'keys', 'guitar', 'crowd'] : ['drums', 'bass', 'keys', 'guitar'],
        endAt: total, crowdFrom: show ? crowdT : undefined, chorusFrom: show ? crowdT : undefined,
        delay: 0.25, onBeat,
      });
      clock = audioClock(c, handle.startTime);
    } else {
      clock = timerClock(0.25); // no sound available: the game still plays and ends
    }
    raf = requestAnimationFrame(frame);
  }

  // Notes live inside the lanes, so the hit line is measured in lane coordinates.
  let measuredAt = 0;
  function measure() {
    const lr = lanes[0].lane.getBoundingClientRect();
    const hr = hitLine.getBoundingClientRect();
    geo = { hitY: hr.top + hr.height / 2 - lr.top, h: lr.height };
    measuredAt = performance.now();
  }

  function judgeTime() { return clock() - lat; }

  function frame() {
    if (!root.isConnected) { cleanup(); return; }
    const now = clock();
    if (performance.now() - measuredAt > 500) measure(); // rotation / resize
    // spawn
    while (cursor < notes.length && notes[cursor].t - now < lead) {
      const n = notes[cursor++];
      n.el = h('span', { class: 'rg-note', 'aria-hidden': 'true' }, SHAPES[n.lane]);
      lanes[n.lane].lane.append(n.el);
      live.add(n);
    }
    if (cursor > 0 && !intro.hidden) intro.hidden = true;
    // move + misses
    const jt = now - lat;
    for (const n of live) {
      const y = geo.hitY * (1 - (n.t - now) / lead);
      if (!n.judged && jt > n.t + GOOD) {
        n.judged = true; misses++; combo = 0;
        n.el.classList.add('rg-missed');
        hud();
      }
      if (y > geo.h + 40 || (n.judged && n.hit && now - n.hitAt > 0.3)) { n.el.remove(); live.delete(n); continue; }
      if (!n.hit) n.el.style.transform = `translate(-50%, ${y.toFixed(1)}px) translateY(-50%)`;
    }
    if (cues) tutorialCues(jt);
    // beat pulse + chorus
    const beat = Math.floor(now / T.beat);
    if (beat !== lastBeat && now >= 0) {
      lastBeat = beat;
      fx(beatGlow, KF.beat, 300, 'ease-out');
      // Intro bars (no notes yet): a light check runs across the three pads in time, inside the bars that already exist.
      if (cursor === 0 && !intro.hidden) fx(lanes[beat % 3].glow, KF.check, 420, 'ease-out');
      if (onFx) { try { onFx('beat'); } catch { /* visual only */ } }
    }
    if (show && !chorusShown && now >= crowdT - T.beat) {
      chorusShown = true;
      chorusBox.classList.remove('rg-wait');
      chorusBox.replaceChildren(h('b', null, `♪ “${lyric[0].toUpperCase() + lyric.slice(1)}” ♪`), h('span', null, crowdCount > 1 ? `🎤 ¡${Number(crowdCount).toLocaleString('es-MX')} personas cantan tu coro!` : '🎤 ¡El público canta tu coro!'));
      try { onChorus?.(s.chorus); } catch (e) { console.error(e); }
    }
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, now / endT)).toFixed(3)})`;
    if (now >= endT + 1.3) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  // First run ever: the first notes light up their pad as they come, and "¡Ahora!" pops just before the
  // perfect moment (a 9-year-old needs ~¼ s to react) until the note is played or gone.
  function tutorialCues(jt) {
    const pad = [false, false, false], now = [false, false, false];
    let left = 0;
    for (const n of notes.slice(0, TUTORIAL_NOTES)) {
      if (n.judged) continue;
      left++;
      const d = n.t - jt;                 // seconds to the perfect moment
      if (d <= 0.6) pad[n.lane] = true;
      if (d <= 0.2) now[n.lane] = true;
    }
    lanes.forEach((L, i) => { L.pad.classList.toggle('rg-cue', pad[i]); L.cue.hidden = !now[i]; });
    if (!left) cues = 0;
  }

  function tap(lane) {
    if (state === 'ready') return;
    if (state !== 'play' || !clock) return;
    const t = judgeTime();
    const L = lanes[lane];
    // Calibration sample: how late (+) or early (−) this tap is against the nearest note of its lane, hit or not.
    let near = null;
    for (const n of notes) {
      if (n.lane !== lane) continue;
      const d = t - n.t;
      if (d < -CAL.window) break;      // notes are in time order: the rest are later
      if (d <= CAL.window && (near === null || Math.abs(d) < Math.abs(near))) near = d;
    }
    if (near !== null) samples.push(near);
    let best = null;
    for (const n of live) {
      if (n.judged || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d <= GOOD && (!best || d < Math.abs(best.t - t))) best = n;
    }
    if (!best) { strum(lane, s.mood); pressFx(L); return; } // a tap with no note is just a strum: never a penalty
    const isPerfect = Math.abs(best.t - t) <= PERFECT;
    best.judged = true; best.hit = true; best.hitAt = clock();
    if (isPerfect) perfect++; else good++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    hitSound(best.deg, s.mood, isPerfect);   // sound first: the visuals below never delay it
    const pos = `translate(-50%, ${geo.hitY.toFixed(1)}px) translateY(-50%)`;
    best.el.style.transform = pos;
    best.el.classList.add('rg-got');
    L.fb.textContent = isPerfect ? '¡Perfecto!' : '¡Bien!';
    L.fb.classList.toggle('rg-perfect', isPerfect);
    hud();
    hitFx(L, best.el, pos, isPerfect);
    if (onFx) { try { onFx('hit', isPerfect); } catch { /* visual only */ } }
  }

  // ---- visual feedback: Web Animations on transform and opacity only (smooth on an iPhone, no forced reflow).
  // Reduced motion: no animation at all; the "¡Perfecto!" / "¡Bien!" text just shows (CSS .rg-calm).
  // Keyframes built once (only the note's own position changes per hit): a beat or a tap allocates almost nothing.
  const EASE = 'cubic-bezier(.2, .8, .3, 1)';
  const KF = {
    beat: [{ opacity: 1 }, { opacity: 0 }],
    check: [{ opacity: 0.7 }, { opacity: 0 }],
    press: [{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
    pressGlow: [{ opacity: 0.55 }, { opacity: 0 }],
    hitGlow: [{ opacity: 1 }, { opacity: 0 }],
    combo: [{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
    fb: [
      { opacity: 0, transform: 'translateY(10px) scale(0.6)' },
      { opacity: 1, transform: 'translateY(0) scale(1.12)', offset: 0.22 },
      { opacity: 1, transform: 'translateY(-4px) scale(1)', offset: 0.6 },
      { opacity: 0, transform: 'translateY(-16px) scale(1)' },
    ],
    // [good, perfect]
    ring: [1.6, 2].map((k) => [{ opacity: 1, transform: 'translate(-50%, 50%) scale(0.5)' }, { opacity: 0, transform: `translate(-50%, 50%) scale(${k})` }]),
    beam: [0.6, 0.95].map((o) => [{ opacity: o, transform: 'translateX(-50%) scaleY(0.25)' }, { opacity: 0, transform: 'translateX(-50%) scaleY(1)' }]),
    sparks: [false, true].map((isPerfect) => Array.from({ length: SPARKS }, (_, k) => {
      const a = (360 / SPARKS) * k + (isPerfect ? 0 : 22.5);
      const d = (isPerfect ? 54 : 38) * (k % 2 ? 0.72 : 1);
      return [{ opacity: 1, transform: `rotate(${a}deg) translateY(0) scale(1)` }, { opacity: 0, transform: `rotate(${a}deg) translateY(-${d}px) scale(0.3)` }];
    })),
  };
  function fx(el, frames, ms, easing = EASE) {
    if (calm || !el?.animate) return null;
    try { return el.animate(frames, { duration: ms, easing }); } catch { return null; }
  }
  function pressFx(L) {
    fx(L.pad, KF.press, 180);
    fx(L.glow, KF.pressGlow, 200);
  }
  function hitFx(L, noteEl, pos, isPerfect) {
    if (calm) { L.fb.classList.add('rg-pop'); return; }
    const p = isPerfect ? 1 : 0;
    pressFx(L);
    fx(L.glow, KF.hitGlow, 420, 'ease-out');
    fx(noteEl, [{ transform: `${pos} scale(1)`, opacity: 1 }, { transform: `${pos} scale(1.8)`, opacity: 0 }], 260, 'ease-out');
    fx(L.fb, KF.fb, 650, 'ease-out');
    fx(L.ring, KF.ring[p], 420, 'ease-out');
    fx(L.beam, KF.beam[p], 420, 'ease-out');
    L.sparks.forEach((sp, k) => fx(sp, KF.sparks[p][k], 480 + (k % 3) * 60, 'ease-out'));
  }

  function score() {
    const judged = perfect + good + misses;
    return { judged, acc: judged ? (perfect + GOOD_WEIGHT * good) / judged : 0 };
  }
  function hud() {
    const { acc, judged } = score();
    const got = perfect + good;
    accEl.textContent = `🎵 ${got} ${got === 1 ? 'nota' : 'notas'}`;
    const c = combo >= 3 ? `🔥 ${combo} seguidas` : '';
    if (c && c !== comboEl.textContent) fx(comboEl, KF.combo, 240);
    comboEl.textContent = c;
    if (show) energy.style.transform = `scaleX(${((25 + 75 * (judged ? acc : 0)) / 100).toFixed(3)})`;
  }

  function onKey(e) {
    if (!root.isConnected) { if (state !== 'ready') cleanup(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (state === 'ready' && (k === 'enter' || k === ' ')) {
      if (e.target?.tagName === 'BUTTON') return; // a song chip or 🐢: the button handles it
      e.preventDefault(); start(); return;
    }
    if (!(k in KEYS)) return;
    e.preventDefault();
    if (!e.repeat) tap(KEYS[k]);
  }
  document.addEventListener('keydown', onKey);

  // New latency (ms) when her taps are consistently late or early, else undefined.
  function calibrate() {
    if (samples.length < CAL.min) return undefined;
    const v = [...samples].sort((a, b) => a - b);
    const at = (p) => v[Math.round(p * (v.length - 1))];
    const mid = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    if (Math.abs(mid) <= CAL.dead || at(0.75) - at(0.25) > CAL.spread) return undefined;
    return Math.round(Math.max(0, Math.min(CAL.maxMs, (lat + mid) * 1000)));
  }

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    state = 'done';
    root.dataset.state = 'done';
    cancelAnimationFrame(raf);
    for (const n of notes) if (!n.judged) { n.judged = true; misses++; }
    for (const n of live) n.el?.remove();
    live.clear();
    lanes.forEach((L) => { L.pad.classList.remove('rg-cue'); L.cue.hidden = true; });
    intro.hidden = true;
    handle?.stop(0.8);
    document.removeEventListener('keydown', onKey);
    const hits = perfect + good;
    const accuracy = notes.length ? Math.max(0, Math.min(1, (perfect + GOOD_WEIGHT * good) / notes.length)) : 1;
    const recKey = recKeyOf();
    const prevBest = recKey ? Number(records[recKey]) || 0 : 0;
    const record = prevBest > 0 && hits > prevBest;   // the first time on a song is not a "record" yet
    if (recKey && hits > prevBest) records[recKey] = hits;
    const result = {
      accuracy, hits, misses, maxCombo, perfect, good, total: notes.length,
      difficulty: diff, nextDifficulty: nextDifficulty(diff, accuracy),
      song: base, songId: base.id, slow: slowOn, canSlow, record,  // slow = her 🐢 choice (it only acts when canSlow)
      latencyMs: calibrate(),
    };
    if (result.latencyMs === undefined) delete result.latencyMs;
    else if (settings) { settings.latencyMs = result.latencyMs; if (settings === app.settings) saveSettingsNow(); }
    hud();
    // Very few notes: no "X de Y" (it reads as a grade), and the next run really is slower (fewer notes or 🐢).
    const low = accuracy < 0.4;
    const nextSlow = result.nextDifficulty < diff || (canSlow && !slowOn) ? 'La próxima va más despacito 🐢' : 'Despacito también cuenta 🐢';
    const head = low ? (hits ? '🎸 ¡Buen calentamiento!' : '🔥 ¡Calentaste los dedos!')
      : accuracy >= 0.85 ? '🌟 ¡Increíble!' : accuracy >= 0.6 ? '🎉 ¡Muy bien!' : '🎸 ¡La tocaste completa!';
    const line = low ? (hits ? `Tocaste ${hits} ${hits === 1 ? 'nota' : 'notas'} · ${nextSlow}` : nextSlow) : `Tocaste ${hits} de ${notes.length} notas`;
    // The card gets one spotlight sweep as it appears, and a gold glow only for a new record (both play once).
    overlay.replaceChildren(h('div', { class: `rg-card${low ? ' rg-card-soft' : ''}${record ? ' rg-card-record' : ''}` },
      h('span', { class: 'rg-sweep', 'aria-hidden': 'true' }, h('i')),
      record ? h('span', { class: 'rg-gold', 'aria-hidden': 'true' }) : null, ...[
      h('p', { class: 'rg-done' }, head),
      record ? h('p', { class: 'rg-record' }, '🏅 ¡Récord nuevo!') : null,
      h('p', { class: 'rg-line' }, line),
      maxCombo >= 3 ? h('p', { class: 'rg-streak' }, `${maxCombo} notas seguidas sin fallar`) : null,
    ].filter(Boolean)));
    overlay.hidden = false;
    // Juice for a good rehearsal (the show has its own cheer and encore in live.js).
    if (!show && accuracy >= 0.6) { sfx('cheer'); confetti(0.5); }
    try { onDone?.(result); } catch (e) { console.error(e); }
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    if (handle) handle.stop(0.3);
    else if (state === 'play') stopMusic(0.3);
    state = 'done';
  }

  root.stop = cleanup;
  root.start = start;
  root.notes = notes.length;
  // QA (qa/ pages): the song clock, the latency in use and the notes, to tap with a known offset.
  root.qa = () => ({ now: clock ? clock() : null, lat, state, samples, notes: notes.map((n) => ({ t: n.t, lane: n.lane })), tempo: s.tempo });
  if (autostart) {
    const wait = () => (root.isConnected ? start() : requestAnimationFrame(wait));
    requestAnimationFrame(wait);
  }
  return root;
}

// A rehearsal afternoon: the game, then "🔁 Otra vez" (same afternoon, no extra cost) or "Seguir ▶".
// onDone(best, last): the engine gets her BEST run; the next difficulty follows her latest one.
// Otra vez keeps her song and 🐢 choice, and turns 🐢 on after a run with very few notes.
export function rehearsalScreen({ song, songs, seconds = 30, difficulty = 1, tutorial = false, settings, records, onDone } = {}) {
  let best = null, last = null, game = null;
  let next = { song, difficulty, slow: undefined, tutorial };
  const slot = h('div', { class: 'rg-slot' });
  const go = h('button', {
    class: 'btn big block', type: 'button', hidden: true,
    onclick: () => { game?.stop?.(); onDone?.(best, last); },
  }, 'Seguir ▶');
  const again = h('button', {
    class: 'btn alt big block', type: 'button', hidden: true,
    onclick: () => { sfx('tap'); play(); },
  }, '🔁 Otra vez');
  function play() {
    game?.stop?.();
    go.hidden = again.hidden = true;
    game = rhythmGame({
      song: next.song, songs, seconds, mode: 'ensayo', difficulty: next.difficulty, slow: next.slow,
      tutorial: next.tutorial, settings, records,
      onDone: (r) => {
        last = r;
        if (!best || r.accuracy > best.accuracy || (r.accuracy === best.accuracy && r.hits > best.hits)) best = r;
        next = { song: r.song, difficulty: r.nextDifficulty, slow: r.accuracy < 0.4 ? true : r.slow, tutorial: false };
        go.hidden = again.hidden = false;
        go.focus?.({ preventScroll: true });
      },
    });
    slot.replaceChildren(game);
  }
  play();
  const node = h('div', { class: 'stack rg-session' }, slot, h('div', { class: 'rg-after' }, again, go));
  node.stop = () => game?.stop?.();
  return node;
}
