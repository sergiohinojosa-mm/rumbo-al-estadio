// Shared UI pieces: screen mounting, modal, toast, confetti, sounds, Papá's voice (one audio element),
// story bubbles, the metric bar, 💡 tip / ✅ verdict boxes and the goal meter.
//
// Modules written by other agents (art.js, data/cast.js, data/lessons.js, data/chapters.js,
// engine/state.js, music/synth.js) load with tolerant dynamic imports: if one is missing or fails,
// the UI still works with a simple fallback (initial in a circle, local text filling…).
// `await ready` before the first screen to have them all.

import { h, money, num } from '../util.js';
import { RECORDED } from '../audio/recorded.js';
import * as store from '../store.js';

export const app = {
  s: null,
  settings: (() => { try { return store.loadSettings(); } catch { return { sound: true, music: true }; } })(),
  screen: null,
};

// A new screen slides in (CSS #app > [data-enter]); redrawing the same screen (next bubble, a tap) doesn't.
let lastScreen = '';
export function mount(node) {
  const root = document.getElementById('app');
  stopVoice();
  const key = typeof node?.className === 'string' ? node.className : '';
  if (key !== lastScreen && node?.setAttribute) node.setAttribute('data-enter', '');
  lastScreen = key;
  root.replaceChildren(node);
  window.scrollTo?.(0, 0);
}

export function saveSettingsNow() {
  try { store.saveSettings(app.settings); } catch { /* storage blocked */ }
}

// ---- Optional modules (never block, never break) ----
const opt = { art: null, cast: null, lessons: null, state: null, chapters: null, synth: null, progress: null };
const load = (key, path) => import(path).then((m) => { opt[key] = m; return m; }).catch(() => null);
export const artReady = load('art', './art.js');
export const castReady = load('cast', '../data/cast.js');
export const lessonsReady = load('lessons', '../data/lessons.js');
const stateReady = load('state', '../engine/state.js');
const chaptersReady = load('chapters', '../data/chapters.js');
const synthReady = load('synth', '../music/synth.js');
export const progressReady = load('progress', '../engine/progress.js');
export const ready = Promise.all([artReady, castReady, lessonsReady, stateReady, chaptersReady, synthReady, progressReady]);
export const art = () => opt.art;
export const chaptersMod = () => opt.chapters;
export const progressMod = () => opt.progress;

// ---- Lessons catalog (js/data/lessons.js) ----
let lessonOverride = null;
// QA pages (or main.js before the catalog exists) can hand in their own catalog.
export function setLessonData(mod) { lessonOverride = mod; }
const lessonMod = () => lessonOverride || opt.lessons || {};
export function lessonList() {
  const m = lessonMod();
  const list = m.LESSONS || m.default || [];
  return Array.isArray(list) ? list : [];
}
export function lessonInfo(id) {
  const m = lessonMod();
  return m.LESSON_BY_ID?.[id] || lessonList().find((l) => l.id === id) || null;
}
export const recallFor = (id) => lessonMod().RECALL?.[id] || null;

// ---- Cast: names and colors (js/data/cast.js), with a fallback for every character ----
const FALLBACK_CAST = {
  me: { name: '{nombre}', color: '#c2185b' },
  nina: { name: 'Nina', color: '#e0a100' },
  papa: { name: 'Papá', color: '#2f5fc4' },
  mama: { name: 'Mamá', color: '#7b2fbf' },
  alma: { name: 'Abuela Alma', color: '#17794a' },
  hermana: { name: '{hermana}', color: '#a3530f' },
  juju: { name: 'Juju', color: '#ff5fa8' },
  romi: { name: 'Romi', color: '#2d6a8e' },
  tambo: { name: 'Tambo', color: '#a3530f' },
  bruno: { name: 'Bruno', color: '#615776' },
  beto: { name: 'Don Beto', color: '#8a5a2b' },
  rocio: { name: 'Doña Rocío', color: '#b3123a' },
  ines: { name: 'Inés', color: '#2d6a8e' },
  max: { name: 'Max Ferrer', color: '#241a33' },
};
export function castInfo(id) {
  const m = opt.cast || {};
  let c = m.CAST_BY_ID?.[id];
  if (!c) {
    const list = Array.isArray(m.CAST) ? m.CAST : Array.isArray(m.default) ? m.default : m.CAST && typeof m.CAST === 'object' ? Object.values(m.CAST) : [];
    c = list.find((x) => x?.id === id);
  }
  if (!c) for (const l of Object.values(m.CANDIDATES || {})) { c = (l || []).find((x) => x?.id === id); if (c) break; }
  const fb = FALLBACK_CAST[id] || {};
  return { id, ...fb, ...(c || {}), name: c?.name || fb.name || (id ? id[0].toUpperCase() + id.slice(1) : '?'), color: c?.color || fb.color || '#615776' };
}
export const castName = (s, id) => fill(s ?? app.s, castInfo(id).name);

// ---- {nombre}, {banda}, {hermana}, {teclas}, {bateria}, {bajo} ----
const ROLE_DEFAULT = { teclas: 'quien toca los teclados', bateria: 'quien toca la batería', bajo: 'quien toca el bajo' };
function localFill(s, text) {
  const name = s.player?.name || store.currentProfile?.()?.name || 'Mariel';
  const sister = s.player?.sister || (name === 'Luciana' ? 'Mariel' : 'Luciana');
  const band = s.band?.name || 'la banda';
  return text
    .replace(/\{nombre\}/g, name).replace(/\{NOMBRE\}/g, name.toUpperCase())
    .replace(/\{banda\}/g, band).replace(/\{BANDA\}/g, band.toUpperCase())
    .replace(/\{hermana\}/g, sister).replace(/\{HERMANA\}/g, sister.toUpperCase())
    .replace(/\{(teclas|bateria|bajo)\}/g, (_, r) => {
      const id = s.roles?.[r];
      const n = id ? castInfo(id).name : '';
      return n && !n.includes('{') ? n : ROLE_DEFAULT[r];
    });
}
export function fill(s, text) {
  if (typeof text !== 'string' || !text.includes('{')) return text;
  s = s || app.s || {};
  const fn = opt.state?.fillText;
  if (fn) { try { const out = fn(s, text); if (typeof out === 'string') return localFill(s, out); } catch { /* fall back */ } }
  return localFill(s, text);
}
const asText = (t) => (typeof t === 'string' ? fill(app.s, t) : t);

// ---- Modal (one at a time; resolves when closed; closing always stops Papá's voice) ----
let closeOpen = null;
export function modal(content, { dismissable = false, label = '', wide = false } = {}) {
  const overlay = document.getElementById('overlay');
  closeOpen?.(null);
  return new Promise((resolve) => {
    let done = false;
    const before = document.activeElement;
    const close = (value) => {
      if (done) return;
      done = true;
      stopVoice();
      closeOpen = null;
      overlay.replaceChildren();
      overlay.onclick = null;
      document.removeEventListener('keydown', onKey);
      try { before?.focus?.({ preventScroll: true }); } catch { /* gone */ }
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(null); };
    document.addEventListener('keydown', onKey);
    const box = h('div', { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label || null },
      typeof content === 'function' ? content(close) : content);
    overlay.replaceChildren(box);
    overlay.onclick = dismissable ? (e) => { if (e.target === overlay) close(null); } : null;
    closeOpen = close;
    setTimeout(() => box.querySelector('button, [href], input')?.focus({ preventScroll: true }), 50);
  });
}
export const closeModal = (value) => closeOpen?.(value);

export function toast(text, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, asText(text));
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

// 'smooth' scrolling only when she hasn't asked for less motion (JS behavior ignores the CSS rule).
export const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

// ---- Confetti ----
export function confetti(power = 1) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.getElementById('confetti');
  if (!c?.getContext) return;
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = innerWidth, H = innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#ff5fa8', '#ffc23d', '#86a9ff', '#4fd18f', '#c2185b', '#7b2fbf'];
  const parts = Array.from({ length: Math.round(140 * power) }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 140, y: H * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 4, c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
  }));
  // Time-based, not frame-based: with a slow or throttled tab (rAF at 1–3 fps) 150 frames lasted almost a
  // minute and the confetti stayed painted over the next screens.
  const t0 = performance.now();
  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W, H);
  };
  tick();
}

// ---- Sounds (synthesized, no files). Shares music/synth.js's AudioContext when it exists (iOS). ----
let actx = null;
let noise = null;
function audioCtx() {
  if (actx) return actx;
  try { actx = opt.synth?.getContext?.() || null; } catch { actx = null; }
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; actx = AC ? new AC() : null; }
  return actx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  const t0 = actx.currentTime + start;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function hiss(start, dur, vol = 0.12, freq = 1200) {
  if (!noise) {
    noise = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = actx.currentTime + start;
  const src = actx.createBufferSource();
  src.buffer = noise;
  const f = actx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}
export function sfx(kind) {
  if (app.settings?.sound === false) return;
  try {
    if (!audioCtx()) return;
    if (actx.state === 'suspended') actx.resume();
    if (kind === 'tap') tone(660, 0, 0.06, 'triangle', 0.05);
    else if (kind === 'coin') { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.07, 0.18, 'square', 0.05); }
    else if (kind === 'good') [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle'));
    else if (kind === 'bad') [392, 330].forEach((f, i) => tone(f, i * 0.14, 0.3, 'sine', 0.1));
    else if (kind === 'fanfare') [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle'));
    else if (kind === 'bell') { tone(1568, 0, 0.6, 'sine', 0.08); tone(2093, 0.02, 0.5, 'sine', 0.04); }
    else if (kind === 'sing') [523, 587, 659, 784, 659, 784, 880, 784].forEach((f, i) => tone(f, i * 0.16, 0.22, 'triangle', 0.07));
    else if (kind === 'cheer') {
      hiss(0, 1.6, 0.16, 900); hiss(0.1, 1.4, 0.1, 2200);
      for (let i = 0; i < 9; i++) hiss(0.1 + i * 0.13 + Math.random() * 0.05, 0.08, 0.18, 1500 + Math.random() * 800);
      [784, 988].forEach((f, i) => tone(f, 0.15 + i * 0.12, 0.35, 'triangle', 0.05));
    }
  } catch { /* audio not available */ }
}

// ---- Papá's voice: ONE HTMLAudioElement for the whole game ----
export const hasAudio = (id) => RECORDED.includes(id);
const voiceUrl = (id) => new URL(`../../audio/${id}.m4a`, import.meta.url).href;
let voice = null;
let voiceId = null;
const voiceSubs = new Set();
function voiceEl() {
  if (voice) return voice;
  voice = new Audio();
  voice.preload = 'none';
  const notify = () => voiceSubs.forEach((fn) => fn());
  ['play', 'playing', 'pause', 'ended', 'timeupdate', 'error', 'emptied'].forEach((ev) => voice.addEventListener(ev, notify));
  return voice;
}
// The ⚙️ Sonido switch "🔊 Efectos y voz de Papá" also silences his voice (autoplay and ▶).
export const voiceMuted = () => app.settings?.sound === false;
export function playVoice(id) {
  if (!hasAudio(id) || voiceMuted()) return Promise.resolve(false);
  const a = voiceEl();
  if (voiceId !== id) { a.src = voiceUrl(id); voiceId = id; }
  else if (a.ended) a.currentTime = 0;
  return a.play().then(() => true).catch(() => false);
}
export function stopVoice() {
  if (!voice) return;
  voice.pause();
  try { voice.currentTime = 0; } catch { /* not loaded */ }
}
export const voicePlaying = (id) => !!voice && !voice.paused && (id == null || voiceId === id);

// ▶ button + progress track bound to the shared element. Null if that id has no recording.
export function voicePlayer(id, { autoplay = false, label = 'Escuchar a Papá' } = {}) {
  if (!hasAudio(id)) return null;
  const btn = h('button', { class: 'play', type: 'button', 'aria-label': label }, '▶');
  const bar = h('i');
  const wrap = h('div', { class: 'voice' }, btn, h('div', { class: 'track', 'aria-hidden': 'true' }, bar));
  const sync = () => {
    if (!wrap.isConnected && wrap.dataset.mounted) { voiceSubs.delete(sync); return; }
    const mine = voiceId === id && voice;
    const playing = mine && !voice.paused;
    btn.textContent = playing ? '❚❚' : '▶';
    btn.setAttribute('aria-label', playing ? 'Pausa' : label);
    bar.style.width = mine && voice.duration ? `${(100 * voice.currentTime) / voice.duration}%` : '0%';
  };
  voiceSubs.add(sync);
  requestAnimationFrame(() => { if (wrap.isConnected) wrap.dataset.mounted = '1'; });
  btn.onclick = () => {
    if (voicePlaying(id)) { voice.pause(); return; }
    if (voiceMuted()) { toast('🔇 El sonido está apagado. Préndelo en ⚙️ Sonido.', 3200); return; }
    sfx('tap'); playVoice(id);
  };
  if (autoplay) setTimeout(() => { if (wrap.isConnected) playVoice(id); }, 350);
  wrap.stop = stopVoice;
  return wrap;
}

// ---- Portraits ----
const svgNode = (markup) => {
  if (!markup) return null;
  if (markup instanceof Node) return markup;
  const t = document.createElement('template');
  t.innerHTML = String(markup).trim();
  return t.content.firstElementChild;
};
const myLook = () => app.s?.look || store.currentProfile?.()?.look || opt.art?.MARIEL_LOOK || {};
const hasLook = (look) => look && Object.keys(look).length > 0;
// art.js: faceSvg(look, size) draws a player's face; castSvg(id) a full figure, cropped here to the face.
function artPortrait(id, size) {
  const a = opt.art;
  if (!a) return null;
  try {
    if (id === 'me') return a.faceSvg ? svgNode(a.faceSvg(myLook(), size)) : null;
    if (!a.castSvg || (Array.isArray(a.CAST_IDS) && !a.CAST_IDS.includes(id))) return null;
    // The photographer sister: Luciana by default; when Luciana plays, her sister Mariel (MARIEL_LOOK).
    const sister = id === 'hermana' ? fill(app.s, '{hermana}') : '';
    const look = sister === 'Mariel' ? a.MARIEL_LOOK : undefined;
    // No glow: the round frame already has its own background (the glow made an extra oval behind the face).
    const n = svgNode(a.castSvg(id, { size, glow: false, look }));
    if (n) { n.setAttribute('viewBox', '16 8 68 68'); n.setAttribute('width', '100%'); n.setAttribute('height', '100%'); n.removeAttribute('style'); }
    return n;
  } catch { return null; }
}
const initial = (name) => h('span', { class: 'ini', 'aria-hidden': 'true' }, (String(name || '?').trim()[0] || '?').toUpperCase());

// A round face for a cast member (bubble, lesson cards). Upgrades to art.js's SVG when it loads.
export function portrait(whoId, { size = 52, cls = 'say-face' } = {}) {
  const c = castInfo(whoId);
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.style.setProperty('--who', c.color);
  const put = () => { const n = artPortrait(whoId, size); if (n) { el.replaceChildren(n); return true; } return false; };
  if (!put()) { el.append(initial(fill(app.s, c.name))); artReady.then(() => put()); }
  return el;
}

// A player's face from her look (profiles). Uses art.avatarSvg if present; else her color + initial.
export function lookFace(look = {}, { name = '', big = false } = {}) {
  const el = h('span', { class: `face ${big ? 'big' : ''}`, 'aria-hidden': 'true' });
  const put = () => {
    const a = opt.art;
    if (!a?.faceSvg || !hasLook(look)) return false;
    try { const n = svgNode(a.faceSvg(look, big ? 120 : 72)); if (n) { el.replaceChildren(n); el.style.background = ''; return true; } } catch { /* fallback */ }
    return false;
  };
  if (!put()) {
    el.style.background = /^#[0-9a-f]{3,8}$/i.test(look.color || '') ? look.color : '#7b2fbf';
    el.append(initial(name));
    artReady.then(() => put());
  }
  return el;
}

// ---- Story bubble: portrait + name + text ----
export function bubble(whoId, text, { right = false, name } = {}) {
  const c = castInfo(whoId);
  const who = name || fill(app.s, c.name);
  const el = h('div', { class: `say ${right ? 'right' : ''}` },
    portrait(whoId),
    h('div', { class: 'say-box' },
      h('span', { class: 'say-who' }, who),
      h('span', { class: 'say-text' }, asText(text))));
  el.style.setProperty('--who', c.color);
  return el;
}

// ---- Metric bar: ⭐ Fans · 💰 Dinero · 🎸 Talento · 💛 Ánimo, with +/− "rebote" ----
const FAN_GOALS = [10, 60, 300, 1500, 5000, 20000, 50000, 87000];
function fansGoal(s) {
  try {
    const g = opt.chapters?.chapterOf?.(s)?.goals?.find((x) => x.id === 'fans');
    if (g?.need) return g.need;
  } catch { /* fallback */ }
  return FAN_GOALS[Math.min(FAN_GOALS.length - 1, s.chapter || 0)];
}
const face = (r) => (r >= 0.66 ? '😄' : r >= 0.33 ? '🙂' : '😐');
const signedOf = (v, fmt) => (v > 0 ? '+' : '−') + fmt(Math.abs(v));

export function metricBar(s, deltas = {}, { onNotebook } = {}) {
  const d = deltas || {};
  const ch = s.chapter || 0;
  const M = [
    { k: 'fans', icon: '⭐', label: 'Fans', v: s.m?.fans ?? 0, max: fansGoal(s), fmt: num },
    { k: 'caja', icon: '💰', label: 'Dinero en la caja', v: s.money?.caja ?? 0, max: 5000 * 2 ** Math.max(0, ch - 1), fmt: money },
    { k: 'talent', icon: '🎸', label: 'Talento', v: s.m?.talent ?? 0, max: 100, fmt: String },
    { k: 'mood', icon: '💛', label: 'Ánimo', v: s.m?.mood ?? 0, max: 100, fmt: String },
  ];
  const items = M.map((m) => {
    const r = Math.max(0, Math.min(1, m.v / m.max));
    const dv = Math.round(d[m.k] || 0);
    const dTxt = dv ? signedOf(dv, m.fmt === String ? String : m.fmt) : '';
    return h('div', {
      class: `metric ${dv ? 'bump' : ''}`, 'data-k': m.k, role: 'img',
      'aria-label': `${m.label}: ${m.fmt(m.v)}${dv ? `, ${dv > 0 ? 'sube' : 'baja'} ${m.fmt(Math.abs(dv))}` : ''}`,
    },
    h('span', { class: 'mi', 'aria-hidden': 'true' }, m.icon, face(r)),
    dv ? h('b', { class: `delta ${dv < 0 ? 'dn' : ''}`, 'aria-hidden': 'true' }, dTxt) : null,
    h('div', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: { width: `${Math.round(r * 100)}%` } })),
    h('span', { class: 'val', 'aria-hidden': 'true' }, m.fmt(m.v)));
  });
  return h('div', { class: 'mbar' }, items,
    onNotebook ? h('button', { class: 'lib', type: 'button', 'aria-label': 'La libreta de Papá', onclick: () => { sfx('tap'); onNotebook(); } }, '📒') : null);
}

// A leading emoji ("💡 …", "✅ …", "📖 Recuerda…") goes in its own <span class="lead-ic"> so CSS can give it a
// steady gap (Safari's ::first-letter is unreliable with emoji). Only the markup changes: textContent stays the same.
const LEAD_IC = /^(\s*)((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u20E3|[\u{1F3FB}-\u{1F3FF}]|\u200D\p{Extended_Pictographic}|\p{Regional_Indicator})*)([\s\S]*)$/u;
export function leadIcon(t) {
  if (typeof t === 'string') {
    const m = t.match(LEAD_IC);
    return m && m[3] ? [m[1] || null, h('span', { class: 'lead-ic' }, m[2]), m[3]] : t;
  }
  if (typeof Node !== 'undefined' && t instanceof Node) {
    const f = t.firstChild;
    if (f?.nodeType === 1) leadIcon(f);
    else if (f?.nodeType === 3) {
      const m = f.data.match(LEAD_IC);
      if (m && (m[3] || f.nextSibling)) {
        const ic = h('span', { class: 'lead-ic' }, m[2]);
        t.insertBefore(ic, f);
        if (m[1]) t.insertBefore(document.createTextNode(m[1]), ic);
        if (m[3]) f.data = m[3]; else f.remove();
      }
    }
  }
  return t;
}

// ---- 💡 Tip (before deciding) and ✅ / 💡 verdict (after) ----
export function tipBox(text) {
  const t = asText(text);
  const body = typeof t === 'string' && !/^\s*💡/u.test(t) ? `💡 ${t}` : t;
  return h('div', { class: 'tip' }, leadIcon(body));
}

// 📖 Recuerda: a phrase she ALREADY discovered (level ≥ 1), said by its character at the moment of deciding.
// Returns null if she hasn't discovered it yet (never remind what she hasn't lived).
export function remindBox(s, id) {
  if (!id || !((s?.lessons?.[id]?.level || 0) >= 1)) return null;
  const l = lessonInfo(id);
  if (!l?.phrase) return null;
  const by = l.by === 'hermana' ? '{hermana}' : castInfo(l.by || 'papa').name;
  return h('div', { class: 'remind stack' },
    h('span', null, leadIcon(`📖 Recuerda: “${fill(s, l.phrase)}”${by ? ` (${fill(s, by)})` : ''}`)),
    l.by === 'papa' && hasAudio(id) ? voicePlayer(id) : null);
}

// 📒 A progress message from data/motivation.js (B after rehearsing, E in the pause, G when she comes back), compared
// only with herself. Rotates by week so the same one doesn't repeat. Returns a card node or null.
// Loaded on the side: if the data file has a problem, the game keeps working without these messages.
let MOT = null;
import('../data/motivation.js').then((m) => { MOT = m; }).catch((e) => console.warn('[core] motivation', e));
export function motivCard(s, kind, extra = {}, { max = 1 } = {}) {
  if (!MOT?.messages) return null;
  let list = [];
  try { list = MOT.messages(s, kind, extra) || []; } catch { list = []; }
  if (!list.length) return null;
  const start = (s.week || 0) % list.length;
  const picked = [...list.slice(start), ...list.slice(0, start)].slice(0, max);
  // "TAMBO: "…"" → **Tambo** "…" (the same look as the 📒 of the close).
  const line = (txt) => {
    const mm = String(txt).match(/^([A-ZÁÉÍÓÚÑÜ ]{2,}):\s*([\s\S]*)$/u);
    if (!mm) return h('span', null, txt);
    const who = mm[1].trim().split(/\s+/).map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
    return h('span', null, h('b', null, `${who}: `), mm[2]);
  };
  return h('div', { class: 'card sh-motiv motiv-line' }, picked.map((m) => line(fill(s, MOT.say ? MOT.say(m) : m.text))));
}

// 💡 Pista that steps back little by little (DISENO §2, regla 24):
//   Prólogo y cap. 1: the tip shows by itself · caps. 2 y 3: a "💡 Pista" button · from cap. 4: the button only
//   in new situations (a repeated one shows just the 📖 Recuerda, if any).
export function hintMode(s, isNew = true) {
  const ch = s?.chapter || 0;
  if (ch < 2) return 'open';
  if (ch < 4) return 'button';
  return isNew ? 'button' : 'none';
}

// "💡 La próxima vez…" of a lesson, with those words in bold.
export function nextTipBox(s, tip) {
  const t = String(fill(s, tip) || '').trim();
  const m = t.match(/^💡\s*(La próxima vez)([\s\S]*)$/u);
  if (m) return tipBox(h('span', null, '💡 ', h('b', null, m[1]), m[2]));
  return tipBox(h('span', null, h('b', null, '💡 La próxima vez: '), t.replace(/^💡\s*/u, '')));
}

export function verdictBox({ verdict = 'good', why = '', next = '' } = {}) {
  const v = ['good', 'ok', 'bad'].includes(verdict) ? verdict : 'ok';
  let w = asText(why) || '';
  // A why that already opens with its own icon (✅ 💡 ⚠️ 🌤️ 👍…) keeps it: "💡 La próxima vez 👍 Descansaron…" read wrong.
  if (typeof w === 'string' && w && !/^\s*\p{Extended_Pictographic}/u.test(w)) w = (v === 'good' ? '✅ ¡Gran decisión! ' : '💡 La próxima vez ') + w;
  let n = asText(next);
  // resolveCard copies a "💡 La próxima vez…" why into next too: never say the same thing twice.
  const same = (a, b) => String(a).replace(/\s+/g, ' ').trim() === String(b).replace(/\s+/g, ' ').trim();
  if (typeof n === 'string' && typeof w === 'string' && (same(n, w) || w.includes(n.trim()))) n = '';
  return h('div', { class: `verdict ${v}`, role: 'status' },
    w ? h('span', null, leadIcon(w)) : null,
    n ? h('span', { class: 'next' }, leadIcon(n)) : null);
}

// ---- Goal of the chapter: icon + have · meter · 🏁 need ----
export function goalMeter(goal = {}) {
  const fmt = goal.money ? money : num;
  const need = Math.max(1, goal.need || 1);
  const have = Math.max(0, goal.have || 0);
  const r = Math.min(1, have / need);
  const yesNo = need === 1 && !goal.money;
  return h('div', {
    class: `goal ${goal.done || r >= 1 ? 'done' : ''}`, role: 'meter',
    'aria-label': fill(app.s, goal.label || 'Meta'), 'aria-valuemin': '0', 'aria-valuemax': String(need), 'aria-valuenow': String(Math.min(have, need)),
  },
  goal.label ? h('span', { class: 'goal-label' }, fill(app.s, goal.label)) : null,
  h('span', null, `${goal.icon || '🎯'} ${yesNo ? (have >= 1 ? '✓ ¡Listo!' : 'todavía no') : fmt(have)}`),
  h('div', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: { width: `${Math.round(r * 100)}%` } })),
  h('span', null, yesNo ? '🏁' : `🏁 ${fmt(need)}`));
}

// ---- Small helpers for screens ----
// Numbered guided steps: steps(['Elige ritmo', 'Arma el riff', 'Escribe el coro'], 1)
export function steps(list, now = 0) {
  return h('ol', { class: 'steps', style: { listStyle: 'none', padding: 0, margin: 0 } }, list.map((label, i) =>
    h('li', { class: `step ${i < now ? 'done' : i === now ? 'now' : ''}`, 'aria-current': i === now ? 'step' : null },
      h('span', { class: 'n', 'aria-hidden': 'true' }, i < now ? '✓' : String(i + 1)), asText(label))));
}

// ★★☆ for lesson levels 0..3
export function starRow(level = 0) {
  return h('span', { class: 'stars', role: 'img', 'aria-label': `${level} de 3 estrellas` },
    [0, 1, 2].map((i) => h('span', { class: i < level ? 'on' : 'off', 'aria-hidden': 'true' }, i < level ? '★' : '☆')));
}
