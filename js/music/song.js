// Songs: the data model, the arrangement (intro, verse, chorus, ending) and a lookahead scheduler
// that plays them with synth.js. Everything is in a major key and the riff uses the major
// pentatonic scale, so any riff a kid draws sounds good over any of the chord progressions.
//
// Song = { id, title, tempo: 'lento'|'bailable'|'rapido', mood: 'alegre'|'sonador'|'valiente',
//          style: 'pop'|'balada'|'latino'|'disco'|'electro', riff: [16 ints 0..4 or -1], chorus: ['palabra', ...] }
// The riff is 16 eighth notes (2 bars). Form: 2 intro bars, then [4 verse + 4 chorus] bars per loop.
// The style only changes the band around her riff (drums, bass, keys): key, riff, grid, form and crowd stay.
// Old saves have no style: they play as pop.

import * as S from './synth.js';

export const TEMPOS = ['lento', 'bailable', 'rapido'];
export const MOODS = ['alegre', 'sonador', 'valiente'];
export const BPM = { lento: 84, bailable: 108, rapido: 128 };
// chapter = from which chapter (0 Prólogo .. 7 Final) the style can be picked in the compose screen.
// tempo = the speed the compose screen suggests when she picks it. place/where = the story stop where it
// opens (data/chapters.js + data/venues.js), shown on the locked teaser chip: short on the chip, long in the toast.
export const STYLES = [
  { id: 'pop', icon: '🎤', label: 'Pop', chapter: 0, tempo: 'bailable', place: 'En la cochera', where: 'en la cochera' },
  { id: 'balada', icon: '💗', label: 'Balada', chapter: 1, tempo: 'lento', place: 'En el café', where: 'en el Café La Glorieta' },
  { id: 'latino', icon: '🌴', label: 'Pop latino', chapter: 2, tempo: 'bailable', place: 'En el foro', where: 'en el Foro Cachito' },
  { id: 'disco', icon: '🪩', label: 'Disco', chapter: 3, tempo: 'rapido', place: 'En el estudio', where: 'cuando graben su primer sencillo' },
  { id: 'electro', icon: '🤖', label: 'Electro', chapter: 4, tempo: 'rapido', place: 'En la radio', where: 'cuando suenen en la radio' },
];
export const STYLE_IDS = STYLES.map((x) => x.id);
export const stylesFor = (chapter = 0) => STYLES.filter((x) => x.chapter <= (Number(chapter) || 0));
// The styles that open exactly in this chapter (for the milestone: "✨ Nuevo estilo: Disco").
export const newStylesAt = (chapter = 0) => STYLES.filter((x) => x.chapter === (Number(chapter) || 0) && x.chapter > 0);
export const INTRO_BARS = 2;
const VERSE_BARS = 4;
const CHORUS_BARS = 4;
const LOOP_BARS = VERSE_BARS + CHORUS_BARS;

const PENTA = [0, 2, 4, 7, 9];                    // major pentatonic, semitones over the tonic
const TONIC = { alegre: 67, sonador: 62, valiente: 69 }; // G4, D4, A4 (riff register)
// Chord = [root semitone over tonic, minor?]
const CH = { I: [0, 0], ii: [2, 1], iii: [4, 1], IV: [5, 0], V: [7, 0], vi: [9, 1] };
const PROG = {
  alegre: ['I', 'V', 'vi', 'IV'],
  sonador: ['vi', 'IV', 'I', 'V'],
  valiente: ['I', 'IV', 'vi', 'V'],
};

export const laneOf = (deg) => (deg <= 1 ? 0 : deg === 2 ? 1 : 2);

// ---------- model ----------
const DEFAULT_WORDS = ['sol', 'bailar', 'contigo', 'luna', 'volar', 'amigas', 'brillar', 'cantar',
  'estrellas', 'juntas', 'cielo', 'hoy', 'corazón', 'sueños', 'noche', 'gritar', 'bicis', 'mar'];
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

export function normalizeSong(song = {}) {
  const riff = Array.from({ length: 16 }, (_, i) => {
    const v = Math.round(Number(song.riff?.[i]));
    return Number.isFinite(v) && v >= 0 && v <= 4 ? v : -1;
  });
  const chorus = (Array.isArray(song.chorus) ? song.chorus : [])
    .map((w) => String(w).trim()).filter(Boolean).slice(0, 6);
  return {
    ...song,
    id: song.id || 'song-' + Date.now().toString(36),
    title: String(song.title || '').trim() || (chorus[0] ? cap(chorus[0]) : 'Mi canción'),
    tempo: TEMPOS.includes(song.tempo) ? song.tempo : 'bailable',
    mood: MOODS.includes(song.mood) ? song.mood : 'alegre',
    style: STYLE_IDS.includes(song.style) ? song.style : 'pop',
    riff,
    chorus,
  };
}

export function isValidSong(s) {
  return !!s && typeof s.id === 'string' && s.id.length > 0 && typeof s.title === 'string' && s.title.trim().length > 0
    && TEMPOS.includes(s.tempo) && MOODS.includes(s.mood) && (s.style == null || STYLE_IDS.includes(s.style))
    && Array.isArray(s.riff) && s.riff.length === 16 && s.riff.every((v) => Number.isInteger(v) && v >= -1 && v <= 4)
    && Array.isArray(s.chorus) && s.chorus.length >= 3 && s.chorus.length <= 6 && s.chorus.every((w) => typeof w === 'string' && w);
}

// rng: a () => [0,1) function, a util.js-style state ({ seed }) or nothing (Math.random).
function toRand(rng) {
  if (typeof rng === 'function') return rng;
  if (rng && typeof rng.seed === 'number') {
    return () => {
      let t = (rng.seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  return Math.random;
}

// A pleasant riff: a short motif (call) answered by a variation that lands on the tonic or fifth.
export function randomRiff(rng) {
  const r = toRand(rng);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const rhythms = [
    [1, 0, 1, 0, 1, 1, 0, 1], [1, 0, 0, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1, 0],
    [1, 0, 1, 1, 0, 1, 0, 0], [1, 0, 1, 0, 1, 0, 1, 0], [1, 0, 0, 1, 1, 0, 1, 0],
  ];
  const rh = pick(rhythms);
  let deg = pick([0, 1, 2, 3]);
  let dir = r() < 0.5 ? 1 : -1;
  let same = 0;
  const a = rh.map((on, i) => {
    if (!on) return -1;
    if (i > 0) { // a melodic walk that bounces off the ends and doesn't repeat a note 3 times
      if (r() < 0.3) dir = -dir;
      let next = deg + dir * (r() < 0.75 ? 1 : 2);
      if (next < 0 || next > 4) { dir = -dir; next = deg + dir; }
      if (next === deg && ++same >= 2) { next = deg + dir; same = 0; }
      deg = Math.max(0, Math.min(4, next));
    }
    return deg;
  });
  const b = a.map((v, i) => (v < 0 || i < 4 ? v : Math.max(0, Math.min(4, v + pick([0, 0, -1, 1])))));
  const last = b.map((v, i) => (v >= 0 ? i : -1)).filter((i) => i >= 0).pop();
  if (last != null) b[last] = pick([0, 3]);
  return [...a, ...b];
}

// styles: optional list of style ids (or STYLES entries) to pick from, e.g. stylesFor(chapter). Default: pop.
export function randomSong(rng, wordBank = DEFAULT_WORDS, styles = null) {
  const r = toRand(rng);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const pool = [...(wordBank && wordBank.length >= 3 ? wordBank : DEFAULT_WORDS)];
  const n = 3 + Math.floor(r() * 3);
  const chorus = [];
  while (chorus.length < n && pool.length) chorus.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return normalizeSong({
    id: 'song-' + Math.floor(r() * 1e9).toString(36),
    title: chorus.length > 1 ? `${cap(chorus[0])} y ${chorus[1]}` : cap(chorus[0] || 'Mi canción'),
    tempo: pick(TEMPOS),
    mood: pick(MOODS),
    style: (() => {
      const ok = (Array.isArray(styles) ? styles : []).map((x) => (typeof x === 'string' ? x : x?.id)).filter((x) => STYLE_IDS.includes(x));
      return ok.length ? pick(ok) : 'pop';
    })(),
    riff: randomRiff(r),
    chorus,
  });
}

// ---------- harmony ----------
function chordAt(mood, bar) {
  const prog = PROG[mood];
  const name = bar < INTRO_BARS ? [prog[0], prog[3]][bar] : prog[(bar - INTRO_BARS) % 4];
  const [root, minor] = CH[name];
  return { name, root, tones: [root, root + (minor ? 3 : 4), root + 7] };
}
const tpc = (mood) => TONIC[mood] % 12;
function inRange(pc, lo) { // smallest midi >= lo with pitch class pc
  let m = lo + ((pc - lo) % 12 + 12) % 12;
  return m;
}
const riffMidi = (mood, deg) => TONIC[mood] + PENTA[deg];

export function songTiming(song) {
  const s = normalizeSong(song);
  const bpm = BPM[s.tempo];
  const step = 60 / bpm / 2;
  return { bpm, step, beat: step * 2, bar: step * 8, intro: step * 8 * INTRO_BARS };
}

// ---------- notes for the rhythm game ----------
// difficulty 0..2 (fractions allowed). Each riff step gets a "tier"; it becomes a note when tier <= difficulty.
// Notes only exist where the guitar actually plays the riff (after the intro), so they line up with the audio.
export function songNotes(song, seconds = 30, difficulty = 1) {
  const s = normalizeSong(song);
  const { step } = songTiming(s);
  const d = Math.max(0, Math.min(2, Number(difficulty) || 0));
  const fast = s.tempo === 'rapido';
  const notes = [];
  const lastT = seconds - 0.4;
  for (let bar = INTRO_BARS; ; bar++) {
    const barT = bar * 8 * step;
    if (barT > lastT) break;
    const half = (bar - INTRO_BARS) % 2; // the 16-step riff spans two bars
    const inBar = [];
    for (let i = 0; i < 8; i++) {
      const k = half * 8 + i;
      const deg = s.riff[k];
      if (deg < 0) continue;
      const prevOn = k > 0 && s.riff[k - 1] >= 0;
      const tier = i % 4 === 0 ? 0 : i % 2 === 0 ? (fast ? 0.8 : 0.3) : prevOn ? 1.9 : 1.2;
      if (tier > d + 1e-9) continue;
      const t = barT + i * step;
      if (t > lastT) continue;
      inBar.push({ t, lane: laneOf(deg), deg, step: k, bar });
    }
    if (!inBar.length) { // never leave a bar empty: a note on the downbeat, on the chord's lane
      const t = barT;
      if (t <= lastT) inBar.push({ t, lane: (bar - INTRO_BARS) % 3, deg: -1, step: half * 8, bar, fill: true });
    }
    notes.push(...inBar);
  }
  return notes;
}

// Next difficulty from this run's accuracy (the caller stores it, e.g. in the song or the save).
export function nextDifficulty(difficulty = 1, accuracy = 0) {
  const d = Number(difficulty) || 0;
  if (accuracy >= 0.85) return Math.min(2, d + 0.5);
  if (accuracy < 0.5) return Math.max(0, d - 0.5);
  return d;
}

// ---------- arrangement ----------
const DRUMS = {
  //            kick steps        snare      hats: 'c' closed 'o' open '' none (8 eighths)
  lento: { kick: [0, 5], snare: [2, 6], hats: ['c', '', 'c', '', 'c', '', 'c', 'c'], hv: 0.55 },
  bailable: { kick: [0, 3, 4], snare: [2, 6], hats: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'o'], hv: 0.7 },
  rapido: { kick: [0, 2, 4, 6], snare: [2, 6], hats: ['c', 'o', 'c', 'o', 'c', 'o', 'c', 'o'], hv: 0.6 },
};
const BASS = { // [step, 'r' root | 'f' fifth | 'o' octave, length in steps]
  lento: [[0, 'r', 4], [4, 'r', 2], [6, 'f', 2]],
  bailable: [[0, 'r', 2], [2, 'r', 1], [3, 'r', 1], [4, 'r', 2], [6, 'o', 1], [7, 'r', 1]],
  rapido: [[0, 'r', 1], [1, 'r', 1], [2, 'r', 1], [3, 'r', 1], [4, 'r', 1], [5, 'r', 1], [6, 'o', 1], [7, 'f', 1]],
};

// One groove per style: drums, bass and keys for one eighth step. g = { P (bus), t, i (step in bar 0..7),
// bar, step (seconds), s (song), chord, pc (tonic pitch class), v (pad voicing), chorus, intro, soft }.
// The count-in, the fill into the verse, the crashes and the ending are shared by every style (playSong).
const hum = () => 0.9 + Math.random() * 0.2;
function bassNote(g, kind, len, vel, at = 0) {
  const root = inRange((g.pc + g.chord.root) % 12, 36);
  const m = kind === 'o' ? root + 12 : kind === 'f' ? root + 7 : root;
  S.bass(g.P, g.t + at, m, len * g.step * 0.92, vel);
}
const sorted = (v) => [...v].sort((a, b) => a - b);

const GROOVES = {
  // The original band: pads, electric-piano stabs and a beat that follows the tempo.
  pop: {
    drums({ P, t, i, s, chorus, soft }) {
      const D = DRUMS[s.tempo];
      if (D.kick.includes(i)) S.kick(P, t, (i === 0 ? 1 : 0.85) * soft);
      if (D.snare.includes(i)) {
        S.snare(P, t, (chorus ? 0.95 : 0.8) * soft);
        if (chorus || s.tempo !== 'lento') S.clap(P, t + 0.004, chorus ? 0.75 : 0.35);
      }
      const hat = D.hats[i];
      if (hat) S.hihat(P, t, { open: hat === 'o' && chorus, vel: D.hv * (i % 2 ? 0.75 : 1) * hum() });
    },
    bass(g) {
      for (const [st, kind, len] of BASS[g.s.tempo]) if (st === g.i) bassNote(g, kind, len, g.i === 0 ? 1 : 0.85);
    },
    // pad on the downbeat (always for lento/sonador and in the chorus), EP stabs on the offbeats
    keys({ P, t, i, s, v, step, chorus, intro }) {
      const padAlways = s.tempo === 'lento' || s.mood === 'sonador';
      if (i === 0 && (padAlways || chorus || intro)) S.keys(P, t, v, step * 7.6, { style: 'pad', vel: chorus ? 1 : 0.8 });
      if (!intro && s.tempo !== 'lento' && (i % 2 === 1)) S.keys(P, t, v.map((m) => m + 12), step * 0.8, { style: 'ep', vel: chorus ? 0.7 : 0.55 });
      if (!intro && s.tempo === 'lento' && (i === 0 || i === 3 || i === 6)) S.keys(P, t, [v[0] + 12, v[2] + 12], step * 2, { style: 'ep', vel: 0.5 });
    },
  },
  // Balada: a piano plays the chord as a broken arpeggio; rim clicks in the verse, soft snare in the chorus.
  balada: {
    drums({ P, t, i, chorus, soft }) {
      if (i === 0) S.kick(P, t, 0.95 * soft);
      if (i === 5) S.kick(P, t, 0.65 * soft);
      if (i === 2 || i === 6) {
        if (chorus) { S.snare(P, t, 0.7 * soft); S.clap(P, t + 0.004, 0.3); } else S.rim(P, t, 0.7 * soft);
      }
      if (i % 2 === 0) S.hihat(P, t, { vel: 0.36 * hum() });
      else if (chorus) S.hihat(P, t, { vel: 0.22 * hum() });
    },
    bass(g) {
      const pat = { 0: ['r', 4], 4: ['f', 2], 6: ['r', 2] }[g.i];
      if (pat) bassNote(g, pat[0], pat[1], g.i === 0 ? 0.95 : 0.75);
    },
    keys({ P, t, i, v, step, chorus }) {
      const n = sorted(v);
      const tones = [n[0], n[1], n[2], n[0] + 12, n[1] + 12];
      const k = [0, 2, 3, 4, 3, 2, 1, 2][i];
      S.piano(P, t, tones[k], step * 3, (i === 0 ? 0.95 : 0.7) * (chorus ? 1.1 : 1));
      if (i === 0 && chorus) S.keys(P, t, v, step * 7.6, { style: 'pad', vel: 0.55 });
    },
  },
  // Pop latino: cumbia-pop. Shaker on every sixteenth, a light dembow on the rim, bouncing root-fifth bass
  // and the keyboard's "chucu" on the offbeats.
  latino: {
    drums({ P, t, i, step, chorus, soft }) {
      if (i === 0 || i === 4) S.kick(P, t, (i === 0 ? 1 : 0.9) * soft);
      if (i === 2 || i === 6) S.kick(P, t, 0.55 * soft);
      if (i === 1 || i === 5) S.rim(P, t + step / 2, 0.6 * soft);
      if (i === 3 || i === 7) {
        S.rim(P, t, 0.65 * soft);
        if (chorus) { S.snare(P, t, 0.5 * soft); S.clap(P, t + 0.004, 0.5); }
      }
      S.shaker(P, t, { vel: (i % 2 ? 0.55 : 0.75) * hum(), long: i % 2 === 0 });
      S.shaker(P, t + step / 2, { vel: 0.4 * hum() });
    },
    bass(g) {
      const pat = { 0: ['r', 2], 3: ['f', 1], 4: ['r', 2], 6: ['f', 1], 7: ['o', 1] }[g.i];
      if (pat) bassNote(g, pat[0], pat[1], g.i === 0 || g.i === 4 ? 1 : 0.8);
    },
    keys({ P, t, i, v, step, chorus, intro }) {
      if (i === 0 && (chorus || intro)) S.keys(P, t, v, step * 7.6, { style: 'pad', vel: 0.6 });
      if (!intro && i % 2 === 1) S.keys(P, t, v.map((m) => m + 12), step * 0.5, { style: 'ep', vel: chorus ? 0.62 : 0.5 });
    },
  },
  // Disco: four on the floor, open hats on every offbeat, octave-jumping bass, strings and funky stabs.
  disco: {
    drums({ P, t, i, chorus, soft }) {
      if (i % 2 === 0) S.kick(P, t, (i === 0 ? 1 : 0.9) * soft);
      if (i === 2 || i === 6) { S.snare(P, t, 0.75 * soft); S.clap(P, t + 0.004, chorus ? 0.75 : 0.55); }
      if (i % 2 === 0) S.hihat(P, t, { vel: 0.4 * hum() });
      else S.hihat(P, t, { open: true, vel: 0.42 * hum() });
    },
    bass(g) {
      bassNote(g, g.i % 2 ? 'o' : 'r', 1, g.i === 0 ? 1 : g.i % 2 ? 0.7 : 0.85);
    },
    keys({ P, t, i, v, step, chorus, intro }) {
      if (i === 0) S.keys(P, t, v, step * 7.6, { style: 'pad', vel: chorus ? 0.95 : 0.7 });
      if (!intro && i % 2 === 1) S.keys(P, t, v.map((m) => m + 12), step * 0.6, { style: 'ep', vel: chorus ? 0.62 : 0.5 });
    },
  },
  // Electro: synth-pop. Four on the floor with claps, an eighth-note synth bass, a bubbling arpeggio and a
  // pad that "pumps" with the kick.
  electro: {
    drums({ P, t, i, chorus, soft }) {
      if (i % 2 === 0) S.kick(P, t, (i === 0 ? 1 : 0.95) * soft);
      if (i === 2 || i === 6) { S.clap(P, t, 0.8 * soft); S.snare(P, t, 0.4 * soft); }
      if (i % 2 === 1) S.hihat(P, t, { vel: 0.5 * hum() });
      else if (chorus) S.hihat(P, t, { vel: 0.25 * hum() });
    },
    bass(g) {
      bassNote(g, g.i === 7 ? 'o' : 'r', 0.85, g.i === 0 ? 1 : g.i % 2 ? 0.7 : 0.85);
    },
    keys({ P, t, i, v, step, chorus }) {
      if (i === 0) S.synthPad(P, t, v, step * 8, { beat: step * 2, vel: chorus ? 1 : 0.8 });
      const n = sorted(v);
      S.synthArp(P, t, [n[0], n[1], n[2], n[0] + 12, n[2], n[1], n[2], n[0] + 12][i], step * 0.8, chorus ? 0.95 : 0.8);
    },
  },
};

let current = null; // the one thing playing (song or preview)

export function stopMusic(fade = 0.25) {
  if (current) { const c = current; current = null; c.stop(fade); }
}

function voicing(mood, chord) {
  const pc = tpc(mood);
  return chord.tones.map((x) => inRange((pc + x) % 12, 55));
}

// The crowd's "la la la oh" line: one syllable per chorus word, on chord tones, per 2-bar phrase.
function crowdLine(n) {
  const k = Math.max(3, Math.min(6, n || 4));
  const pos = Array.from({ length: k }, (_, i) => Math.round((i * 12) / k));
  return pos.map((p, i) => ({ step: p, len: (i < k - 1 ? pos[i + 1] : 16) - p, last: i === k - 1, i }));
}

/**
 * playSong(song, { parts, loops, onBeat, onEnd, delay, crowdFrom, chorusFrom, endAt, volume })
 * - parts: subset of ['drums','bass','keys','guitar','crowd'] (default: all).
 * - loops: verse+chorus cycles before the ending (default Infinity). endAt (song seconds) ends sooner.
 * - crowdFrom / chorusFrom (song seconds): crowd sings only after, and from then on it's all chorus.
 * - onBeat({ beat, bar, beatInBar, section, chord, crowd, time }) fires on each quarter note, in sync.
 * Returns { stop(fade), startTime, bpm, step, songTime(), endTime }. Song time 0 = startTime.
 */
export function playSong(song, opts = {}) {
  const offline = !!opts.offline; // renderSong: schedule everything now, no timers, don't touch live music
  if (!offline) stopMusic(0.08);
  const s = normalizeSong(song);
  const parts = new Set(opts.parts || ['drums', 'bass', 'keys', 'guitar', 'crowd']);
  const loops = opts.loops ?? Infinity;
  const { bpm, step } = songTiming(s);
  const c = S.getContext();
  const bus = c ? S.createBus({ level: opts.volume ?? 1 }) : null;
  const startTime = (c ? c.currentTime : 0) + (opts.delay ?? (offline ? 0.05 : 0.12));
  const lastBar = Math.min(INTRO_BARS + loops * LOOP_BARS, opts.endAt != null ? Math.ceil(opts.endAt / (step * 8) - 1e-6) : Infinity);
  const timers = new Set();
  let n = 0;          // next eighth step to schedule
  let done = false;
  let interval = null;
  const handle = {
    startTime, bpm, step, song: s,
    endTime: Number.isFinite(lastBar) ? lastBar * 8 * step : Infinity,
    songTime: () => (c ? c.currentTime - startTime : 0),
    stop(fade = 0.25) {
      if (done && !interval) return;
      done = true;
      clearInterval(interval); interval = null;
      timers.forEach(clearTimeout); timers.clear();
      if (bus) { bus.fade(fade); bus.dispose(fade + 0.1); }
      if (current === handle) current = null;
    },
  };
  if (!offline) current = handle;
  if (!c || !bus) return handle;

  const G = GROOVES[s.style] || GROOVES.pop;
  const P = bus;
  const crowdLineSteps = crowdLine(s.chorus.length);
  const later = (fn, at) => {
    if (offline) return;
    const id = setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, (at - c.currentTime) * 1000));
    timers.add(id);
  };
  const sectionOf = (bar) => {
    if (bar < INTRO_BARS) return 'intro';
    if (bar >= lastBar) return 'end';
    const barT = bar * 8 * step;
    if (opts.chorusFrom != null && barT >= opts.chorusFrom - 1e-6) return 'chorus';
    return (bar - INTRO_BARS) % LOOP_BARS < VERSE_BARS ? 'verse' : 'chorus';
  };
  const crowdOn = (bar) => parts.has('crowd') && sectionOf(bar) === 'chorus'
    && (opts.crowdFrom == null || bar * 8 * step >= opts.crowdFrom - 1e-6);

  function scheduleStep(k, t) {
    const bar = Math.floor(k / 8);
    const i = k % 8;
    const sec = sectionOf(bar);
    const chord = chordAt(s.mood, bar);
    const pc = tpc(s.mood);
    const late = t < c.currentTime - 0.02; // fell behind (background tab): keep time, skip sound

    if (i % 2 === 0 && opts.onBeat) {
      const info = { beat: k / 2, bar, beatInBar: i / 2, section: sec, chord: chord.name, crowd: crowdOn(bar), time: k * step };
      later(() => { try { opts.onBeat(info); } catch (e) { console.error(e); } }, t);
    }
    if (late) return;

    if (sec === 'end') { // final hit: crash, kick, tonic chord ringing, guitar tonic
      if (i !== 0) return;
      const tonic = { name: 'I', root: 0, tones: [0, 4, 7] };
      if (parts.has('drums')) { S.kick(P, t, 1); S.crash(P, t, 1); }
      if (parts.has('bass')) S.bass(P, t, inRange(pc, 36), step * 8, 1);
      if (parts.has('keys')) S.keys(P, t, voicing(s.mood, tonic), step * 8, { style: 'pad', vel: 1.1 });
      if (parts.has('guitar')) { S.guitar(P, t, riffMidi(s.mood, 0), step * 10, 0.9); S.guitar(P, t + 0.02, riffMidi(s.mood, 3), step * 10, 0.6); }
      if (crowdOn(bar - 1)) S.choir(P, t, inRange(pc, 62), step * 8, { vowel: 'o', vel: 1 });
      done = true;
      later(() => { handle.stop(0.6); opts.onEnd?.(); }, t + step * 8 + 0.4);
      return;
    }

    const chorus = sec === 'chorus';
    const intro = sec === 'intro';
    const soft = s.mood === 'sonador' ? 0.85 : 1;
    const g = { P, t, i, bar, step, s, chord, pc, v: voicing(s.mood, chord), chorus, intro, soft };

    // drums (the style's pattern; count-in, fill and crashes are the same for every style)
    if (parts.has('drums')) {
      if (intro && bar === 0) {
        if (i % 2 === 0) S.hihat(P, t, { vel: i === 0 ? 0.9 : 0.6 });
        if (i === 0) S.kick(P, t, 0.8);
      } else {
        G.drums(g);
        if (bar === INTRO_BARS - 1 && i >= 6) S.snare(P, t, 0.6 + (i - 6) * 0.2); // fill into the verse
        const barInLoop = (bar - INTRO_BARS) % LOOP_BARS;
        if (i === 0 && (bar === INTRO_BARS || (chorus && (barInLoop === VERSE_BARS || barInLoop === 0)))) S.crash(P, t, 0.8);
      }
    }

    // bass and keys: the style's groove
    if (parts.has('bass') && !(intro && bar === 0)) G.bass(g);
    if (parts.has('keys')) G.keys(g);

    // guitar: her riff (2 bars), every bar after the intro
    if (parts.has('guitar') && !intro) {
      const k16 = ((bar - INTRO_BARS) % 2) * 8 + i;
      const deg = s.riff[k16];
      if (deg >= 0) {
        let len = 1;
        while (len < 4 && s.riff[(k16 + len) % 16] < 0) len++;
        S.guitar(P, t, riffMidi(s.mood, deg), len * step + 0.05, i % 2 ? 0.85 : 1);
      }
    }

    // crowd: "la la la ... oh"
    if (crowdOn(bar)) {
      const k16 = ((bar - INTRO_BARS) % 2) * 8 + i;
      for (const note of crowdLineSteps) {
        if (note.step !== k16) continue;
        const cb = chordAt(s.mood, bar);
        const pick = note.last ? 0 : [1, 2, 1, 0, 2, 1][note.i % 6];
        const m = inRange((pc + cb.tones[pick]) % 12, 62);
        S.choir(P, t, m, Math.max(1, note.len) * step * 0.95, { vowel: note.last ? 'o' : 'a', vel: note.last ? 1 : 0.9 });
      }
    }
  }

  const tick = () => {
    if (done) return;
    const horizon = c.currentTime + 0.3; // room for a busy frame (the rhythm game draws while the music plays)
    while (!done && startTime + n * step < horizon) {
      scheduleStep(n, startTime + n * step);
      n++;
    }
  };
  if (offline) { // the end step sets done; the cap is only a guard against a song that never ends
    while (!done && n < 8 * 400) { scheduleStep(n, startTime + n * step); n++; }
    return handle;
  }
  interval = setInterval(tick, 25);
  tick();
  return handle;
}

// The whole song (intro, `loops` verse+chorus, ending) rendered to an AudioBuffer, for exporting.
// The crowd sings every chorus. Resolves to null when the browser can't render offline.
export function renderSong(song, { loops = 2 } = {}) {
  const s = normalizeSong(song);
  const { step } = songTiming(s);
  const seconds = (INTRO_BARS + loops * LOOP_BARS + 1) * 8 * step + 2.5;
  return S.renderOffline(seconds, () => playSong(s, { loops, offline: true }));
}

// Hear just the riff over its chords (2 bars). onStep(i) lights the grid; returns { stop, duration }.
// Pop keeps its light practice band; the other styles play their chorus groove so she hears the style.
export function previewRiff(riff, mood = 'alegre', { tempo = 'bailable', style = 'pop', onStep, onEnd } = {}) {
  stopMusic(0.05);
  const s = normalizeSong({ riff, mood, tempo, style, chorus: [] });
  const c = S.getContext();
  const { step } = songTiming(s);
  const duration = step * 16 + 0.6;
  const timers = [];
  let bus = null;
  const handle = {
    duration,
    stop(fade = 0.1) {
      timers.forEach(clearTimeout);
      if (bus) { bus.fade(fade); bus.dispose(fade + 0.1); bus = null; }
      if (current === handle) current = null;
    },
  };
  current = handle;
  if (!c) return handle;
  bus = S.createBus({ level: s.style === 'pop' ? 1 : 0.75 }); // full grooves are busier: same loudness as pop's
  const t0 = c.currentTime + 0.06;
  const pc = tpc(s.mood);
  for (let k = 0; k < 16; k++) {
    const t = t0 + k * step;
    const chord = chordAt(s.mood, INTRO_BARS + (k < 8 ? 0 : 1));
    if (s.style !== 'pop') {
      const g = { P: bus, t, i: k % 8, bar: INTRO_BARS + (k < 8 ? 0 : 1), step, s, chord, pc, v: voicing(s.mood, chord), chorus: true, intro: false, soft: 0.8 };
      const G = GROOVES[s.style];
      G.drums(g); G.bass(g); G.keys(g);
    } else if (k % 8 === 0) {
      S.keys(bus, t, voicing(s.mood, chord), step * 7.8, { style: 'pad', vel: 0.7 });
      S.bass(bus, t, inRange((pc + chord.root) % 12, 36), step * 4, 0.7);
      S.kick(bus, t, 0.7);
    }
    if (s.style === 'pop' && k % 4 === 2) S.snare(bus, t, 0.45);
    if (s.style === 'pop' && k % 2 === 0) S.hihat(bus, t, { vel: 0.4 });
    const deg = s.riff[k];
    if (deg >= 0) {
      let len = 1;
      while (len < 4 && k + len < 16 && s.riff[k + len] < 0) len++;
      S.guitar(bus, t, riffMidi(s.mood, deg), len * step + 0.05);
    }
    if (onStep) timers.push(setTimeout(() => onStep(k), Math.max(0, (t - c.currentTime) * 1000)));
  }
  timers.push(setTimeout(() => { onStep?.(-1); handle.stop(0.4); onEnd?.(); }, (t0 - c.currentTime + duration) * 1000));
  return handle;
}

// One riff note, right now (the compose grid). Doesn't stop other music.
let noteBus = null;
export function riffNote(deg, mood = 'alegre') {
  const c = S.getContext();
  if (!c || deg < 0 || deg > 4) return;
  noteBus = noteBus || S.createBus();
  S.guitar(noteBus, c.currentTime + 0.01, riffMidi(MOODS.includes(mood) ? mood : 'alegre', deg), 0.5);
}

// Soft "you got it" chime for the rhythm game, in the song's key.
export function hitSound(deg, mood = 'alegre', perfect = false) {
  const c = S.getContext();
  if (!c) return;
  noteBus = noteBus || S.createBus();
  const m = riffMidi(MOODS.includes(mood) ? mood : 'alegre', deg >= 0 ? deg : 0) + 12;
  S.chime(noteBus, c.currentTime + 0.005, m, perfect ? 0.8 : 0.55);
}
