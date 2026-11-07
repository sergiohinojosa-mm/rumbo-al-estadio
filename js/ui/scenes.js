// Historia: escenas con globos uno por uno, el flujo de creación del Prólogo (nombre y logo, préstamo de
// Papá, primera canción, primer ensayo, show para 3 sillas), el hito del capítulo, "La banda se toma un
// descanso" y el final con el Gramófono.
//
// Escenas (data/story.js): { id, trigger, place, beats: [ { who, text, lesson?, voice?, remind?, card? } ],
//   screen?, next? }. `screen` es la mecánica que entra después de los globos; `card` es una tarjeta de
//   datos de TARJETAS (story/chN.js); `next` es el 💡 La próxima vez de la escena.

import { h, money, num, plural } from '../util.js';
import {
  app, mount, sfx, fill, bubble, voicePlayer, hasAudio, lessonInfo, nextTipBox, tipBox, verdictBox,
  metricBar, goalMeter, confetti, art, chaptersMod, toast, motivCard,
} from './core.js';
import { artBox, bandPoster, bandLogo, garageScene, posterStage, chapterName, goalsOf, myLook } from './home.js';
import { wordBankFor } from './plan.js';
import * as week from '../engine/week.js';
import * as progress from '../engine/progress.js';
import { level } from '../engine/lessons.js';
import * as Story from '../data/story.js';
import * as S0 from '../data/story/ch0.js';
import * as S1 from '../data/story/ch1.js';
import * as S2 from '../data/story/ch2.js';
import * as S3 from '../data/story/ch3.js';
import * as S4 from '../data/story/ch4.js';
import * as S5 from '../data/story/ch5.js';
import * as S6 from '../data/story/ch6.js';
import * as S7 from '../data/story/ch7.js';
import { VENUES } from '../data/venues.js';
import { composeScreen } from './compose.js';
import { newStylesAt } from '../music/song.js';
import { rehearsalScreen, songRecords } from './rehearse.js';

const allScenes = () => {
  const l = Story.SCENES || Story.STORY || Story.default || [];
  return Array.isArray(l) ? l : [];
};
const sceneById = (id) => (id ? (Story.SCENE_BY_ID?.[id] || allScenes().find((x) => x.id === id) || null) : null);
const TARJETAS = Object.assign({}, ...[S0, S1, S2, S3, S4, S5, S6, S7].map((m) => m.TARJETAS || {}));
const ROLES = ['teclas', 'bateria', 'bajo'];
const safeWhen = (sc, s) => { try { return typeof sc.when !== 'function' || !!sc.when(s); } catch { return false; } };

// Para no repetir en bucle una escena que el motor sigue ofreciendo (escenas que se repiten, como la pausa).
let lastFinished = null;
let lastShown = null;
export const alreadyShown = (s, sc) => !!lastFinished && lastFinished.id === sc?.id && lastFinished.week === s.week && lastFinished.phase === s.phase;

// Termina la escena con el motor. Si la escena fue un interludio (fase ≠ 'scene'), la fase se queda igual.
function endScene(s, id) {
  const before = s.phase;
  try { week.finishScene(s, id); } catch (e) { console.warn('[escenas] finishScene:', e); }
  if (before !== 'scene') s.phase = before;   // milestone / pause / end: the phase stays
  lastFinished = { id, week: s.week, phase: s.phase };
}

// ---------- Escenario de fondo según el lugar ----------
const PLACE_ART = [
  [/^cochera_apagada|^cochera_noche/, { place: 'cochera', night: true }],
  [/^cochera/, { place: 'cochera' }],
  [/^cafe/, { place: 'cafe' }],
  [/^(cumple|fiesta|jardin_fiesta)/, { place: 'cumple' }],
  [/^kermes/, { place: 'kermes' }],
  [/^(foro_mediano|nave|arena)/, { place: 'foro_mediano', night: true }],
  [/^(foro|banqueta_foro)/, { place: 'foro', night: true }],
  [/^plaza/, { place: 'plaza' }],
  [/^indie/, { place: 'indierocks', night: true }],
  [/^estudio/, { place: 'estudio' }],
  [/^palacio/, { place: 'palacio', night: true }],
  [/^estadio/, { place: 'estadio', night: true }],
  // Only the tour stages wear the "GIRA · CIUDAD" banner; the car, hotel or restaurant use the emoji stage
  // (the car ride of cap. 1 is in CDMX and used to say "GIRA · GUADALAJARA").
  [/^(puebla|pue)/, { place: 'gira', city: 'pue' }],
  [/^(mty|monterrey)/, { place: 'gira', city: 'mty' }],
  [/^(gira|gdl|guadalajara)/, { place: 'gira', city: 'gdl' }],
];
// Home and small places without a drawn stage: her avatar with an emoji of the place.
const PLACE_EMOJI = { coche: '🚗', viaducto: '🚗', camion: '🚐', burra: '🚐', estacionamiento: '🚐', hotel: '🏨', restaurante: '🍽️', cuarto: '🛏️', cocina_mapa: '🗺️', cocina_pagare: '📝', cocina: '🍳', pagare: '📝', super: '🛒', sala: '🛋️', premio: '🏆' };
// How full the place is, from the scene's name: estadio_vacio → empty, foro_lleno → full…
const crowdOf = (p) => (/_vacio|_puerta|_salida|^banqueta/.test(p) ? 0 : /_lleno/.test(p) ? 1 : /_medio/.test(p) ? 0.5 : /_cachito/.test(p) ? 0.15 : 0.7);

function homeStage(s, p) {
  const key = Object.keys(PLACE_EMOJI).find((k) => p.startsWith(k));
  const A = art();
  let me = null;
  try { me = A?.avatarSvg?.(myLook(), { size: 120, guitar: p === 'cuarto', glow: false }); } catch { me = null; }
  return h('div', { class: 'art-box art-fallback stage-art home-stage', 'aria-hidden': 'true' },
    me ? h('span', { class: 'home-me', html: me }) : null,
    h('span', { class: 'home-ic' }, PLACE_EMOJI[key] || '🎶'));
}

export function sceneStage(s, place = 'cochera') {
  const p = String(place || 'cochera');
  const hit = PLACE_ART.find(([re]) => re.test(p));
  if (!hit) {
    if (p === 'premio') {
      let tr = null;
      try { tr = art()?.trophySvg?.({ size: 160 }); } catch { tr = null; }
      if (tr) return artBox(tr, 'stage-art trophy-art', '🏆');
    }
    return homeStage(s, p);
  }
  const { place: artPlace, night, city } = hit[1];
  if (artPlace === 'cochera') {
    const lvl = p === 'cochera_vieja' ? 0 : p === 'cochera_luces' ? Math.max(1, s.unlocks?.garage || 0) : undefined;
    const chairs = p === 'cochera_sillas';
    const st = { ...s, unlocks: { ...s.unlocks, garage: lvl ?? s.unlocks?.garage } };
    return garageScene(st, { night, crowd: chairs ? { count: 3, cap: 3, juju: true, sign: fill(s, '{NOMBRE}') } : undefined });
  }
  const A = art();
  const v = VENUES.find((x) => x.id === artPlace || (artPlace === 'indierocks' && x.id === 'indie'));
  const cap = v?.cap || 100;
  const count = Math.round(cap * crowdOf(p));
  let m = null;
  try {
    m = A?.sceneSvg?.({ place: artPlace, night, city, members: s.members, look: myLook(), band: s.band?.name,
      garageLevel: Math.min(2, s.unlocks?.garage || 0),
      poster: { band: s.band?.name, logo: s.band?.logo, stage: posterStage(s) },
      crowd: { count, cap, juju: count > 0, sign: fill(s, '{NOMBRE}') } });
  } catch (e) { console.warn('[arte]', e); }
  return artBox(m, 'stage-art', '🎶');
}

// ---------- Tarjetas de datos (beat.card) ----------
function dataCard(s, key, { max = 99 } = {}) {
  const fn = TARJETAS[key];
  let t = null;
  try { t = typeof fn === 'function' ? fn(s) : null; } catch (e) { console.warn('[tarjeta]', key, e); }
  if (!t) return null;
  const rows = (t.rows || []).filter((r) => r && (r.text || (r.then && r.now))).slice(0, max);
  if (!rows.length) return null;
  const twoCols = rows.some((r) => r.then);
  return h('div', { class: 'box tcard' },
    h('b', null, fill(s, t.title || '')),
    twoCols ? h('div', { class: 'tc-head', 'aria-hidden': 'true' }, h('span'), h('span', null, 'Así empezó'), h('span', null, 'Así va')) : null,
    rows.map((r) => (r.text
      ? h('div', { class: 'tc-row one' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, r.icon || '•'),
        h('span', null, h('b', null, fill(s, r.label || '')), ' ', fill(s, r.text)))
      : h('div', { class: 'tc-row' }, h('span', { class: 'ic', title: r.label || '' }, r.icon || '•'),
        h('span', null, fill(s, r.then)), h('span', null, h('b', null, fill(s, r.now)))))),
    t.foot ? h('p', { class: 'small muted' }, fill(s, t.foot)) : null);
}

// ---------- Un globo ----------
function speaker(s, who) {
  if (ROLES.includes(who)) {
    const id = s.roles?.[who];
    return id ? { id, name: null } : { id: who, name: fill(s, `{${who}}`) };
  }
  return { id: who, name: null };
}

const lessonOf = (b) => (typeof b.lesson === 'string' ? { discover: b.lesson } : b.lesson || null);

function beatNode(s, sc, b, { fresh }) {
  const out = [];
  const card = b.card ? dataCard(s, b.card) : null;
  if (card) out.push(card);
  else if (b.who === 'narrador' || b.who === 'tarjeta' || !b.who) out.push(h('div', { class: 'narr' }, fill(s, b.text)));
  else {
    const sp = speaker(s, b.who);
    out.push(bubble(sp.id, b.text, { right: b.who === 'me', ...(sp.name ? { name: sp.name } : {}) }));
  }
  // La lección del globo la descubre el motor (triggers con sus números, o finishScene): aquí solo se marca.
  const L = lessonOf(b);
  const lid = L?.discover || L?.apply || null;
  if (fresh && lid && !(s.lessons?.[lid]?.level > 0) && lessonInfo(lid)) {
    out.push(h('span', { class: 'tag new', style: { justifySelf: 'start' } }, '✨ Frase nueva para tu Libro'));
  }
  const voice = b.voice || (lid && b.who === 'papa' ? lid : null);
  if (fresh && voice && hasAudio(voice)) out.push(voicePlayer(voice, { autoplay: true }));
  // Only remind a phrase she already discovered (level ≥ 1): never one she hasn't lived yet.
  if (b.remind && level(s, b.remind) >= 1) {
    const l = lessonInfo(b.remind);
    if (l?.phrase) {
      out.push(h('div', { class: 'remind' }, `📖 Recuerda: “${fill(s, l.phrase)}”`));
      if (fresh && !voice && hasAudio(b.remind) && l.by === 'papa') out.push(voicePlayer(b.remind));
    }
  }
  return h('div', { class: `beat ${fresh ? '' : 'old'}` }, out);
}

// Globos uno por uno. Se ven el globo actual y, atenuado, el anterior (menos de 40 palabras en pantalla).
function playBeats(s, ctx, sc, onEnd) {
  const beats = (sc.beats || []).filter((b) => b && (b.text || b.card));
  if (!beats.length) { onEnd(); return; }
  const stage = sceneStage(s, sc.place);
  let i = 0;
  const draw = () => {
    const last = i === beats.length - 1;
    const next = h('button', {
      class: 'btn big block', type: 'button',
      onclick: () => { sfx('tap'); if (last) { ctx.save(); onEnd(); } else { i += 1; draw(); } },
    }, last ? 'Seguir ▶' : 'Siguiente ▶');
    const nextTip = last && typeof sc.next === 'string' && sc.next.trim().startsWith('💡') ? nextTipBox(s, sc.next) : null;
    mount(h('div', { class: 'page scene-page' },
      h('div', { class: 'cols' },
        h('div', { class: 'scene-art' }, stage),
        h('div', { class: 'stack' },
          h('div', { class: 'beats', 'aria-live': 'polite' },
            i > 0 ? beatNode(s, sc, beats[i - 1], { fresh: false }) : null,
            beatNode(s, sc, beats[i], { fresh: true })),
          nextTip,
          h('div', { class: 'row between' },
            h('span', { class: 'dots', role: 'img', 'aria-label': `Globo ${i + 1} de ${beats.length}` },
              beats.map((_, k) => h('i', { class: k <= i ? 'on' : '' }))),
            h('span', { class: 'small muted' }, `${i + 1} de ${beats.length}`)),
          next))));
  };
  draw();
}

// ---------- renderScene ----------
export function renderScene(s, ctx, override) {
  let sc = override || sceneById(s.week$?.scene);
  if (!sc && s.phase === 'scene' && typeof week.pendingScene === 'function') {
    try { sc = week.pendingScene(s); } catch { sc = null; }
  }
  if (!sc) { endScene(s, s.week$?.scene || null); ctx.save(); return ctx.refresh(); }
  // sceneView llena todos los nombres ({bateria.quirk}…) y el 💡 de la escena.
  try { sc = (typeof week.sceneView === 'function' && week.sceneView(s, sc)) || sc; } catch { /* la escena tal cual */ }
  lastShown = { id: sc.id, trigger: sc.trigger, week: s.week };
  playBeats(s, ctx, sc, () => afterBeats(s, ctx, sc));
}

function afterBeats(s, ctx, sc) {
  const done = () => { endScene(s, sc.id); ctx.save(); ctx.refresh(); };
  const runScreen = () => {
    switch (sc.screen) {
      case 'band_name': return nameScreen(s, ctx, () => { if (!s.flags.logo && !allScenes().some((x) => x.screen === 'logo')) logoScreen(s, ctx, done); else done(); });
      case 'logo': return logoScreen(s, ctx, done);
      case 'compose': return composeStep(s, ctx, sc);
      case 'rehearse_slow': return rehearseStep(s, ctx, sc);
      case 'show': return showStep(s, ctx, sc);
      case 'goals': return goalsStep(s, ctx, sc);
      default: return done();
    }
  };
  // El préstamo de Papá entra justo después de que Papá lo explica (o antes de la primera canción).
  if (s.chapter === 0 && !s.flags?.prestamo && (sc.id === 'p_trato' || sc.place === 'pagare' || sc.screen === 'compose')) {
    return loanScreen(s, ctx, runScreen);
  }
  return runScreen();
}

// ---------- Prólogo: lo que falta si la historia no lo trajo ----------
export const needsSetup = (s) => s.chapter === 0 && (!s.band?.name || !s.flags?.logo || !s.flags?.prestamo);

export function renderSetup(s, ctx) {
  const next = () => {
    ctx.save();
    if (!s.band?.name) return nameScreen(s, ctx, next);
    if (!s.flags?.logo) return logoScreen(s, ctx, next);
    if (!s.flags?.prestamo) return loanScreen(s, ctx, next);
    return ctx.refresh();
  };
  next();
}

// 1. Nombre de la banda
const NAME_IDEAS = ['Las Estrellas Fugaces', 'Cochera Pop', 'Chicle Eléctrico', 'Las Princesas Dinosaurio'];

function nameScreen(s, ctx, done) {
  let name = s.band?.name || '';
  const prev = h('div', { class: 'logo-prev' });
  const paint = () => prev.replaceChildren(bandLogo({ band: { ...s.band, name: name.trim() } }, { size: 150 }));
  const ok = h('button', {
    class: 'btn big block', type: 'button', disabled: !name.trim(),
    onclick: () => {
      s.band.name = name.trim().replace(/\s+/g, ' ').slice(0, 24);
      sfx('fanfare');
      ctx.save();
      done();
    },
  }, '✔ ¡Así se llama!');
  const input = h('input', {
    class: 'text-input', type: 'text', value: name, maxlength: 24, placeholder: 'Nombre de la banda', 'aria-label': 'Nombre de la banda',
    autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', spellcheck: 'false',
    oninput: (e) => { name = e.target.value; ok.disabled = !name.trim(); paint(); },
    onkeydown: (e) => { if (e.key === 'Enter' && name.trim()) ok.click(); },
  });
  paint();
  mount(h('div', { class: 'page setup-page' },
    h('div', { class: 'cols' },
      h('div', { class: 'stack center' }, prev),
      h('div', { class: 'stack' },
        h('h2', null, '¿Cómo se llama tu banda?'),
        input,
        h('p', { class: 'small muted' }, 'Ideas:'),
        h('div', { class: 'chips' }, NAME_IDEAS.map((n) => h('button', {
          class: 'chip', type: 'button',
          onclick: () => { sfx('tap'); name = n; input.value = n; ok.disabled = false; paint(); },
        }, n))),
        ok))));
  setTimeout(() => input.focus({ preventScroll: true }), 80);
}

// 2. Logo
const FALLBACK_SHAPES = [{ id: 'star', label: 'Estrella' }, { id: 'heart', label: 'Corazón' }, { id: 'bolt', label: 'Rayo' }, { id: 'circle', label: 'Círculo' }, { id: 'cassette', label: 'Casete' }];
const SHAPE_IC = { star: '⭐', heart: '💖', bolt: '⚡', circle: '⚪', cassette: '📼' };
const FALLBACK_COLORS = ['#E0338A', '#8B5CF6', '#3C8CF2', '#1FB58F', '#FFB020', '#FF6B4A'];
const STAMPS = ['🎸', '⭐', '⚡', '🌙', '💖', '🦄', '🔥', '🎤'];

function logoScreen(s, ctx, done) {
  const A = art() || {};
  const shapes = A.LOGO_SHAPES || FALLBACK_SHAPES;
  const colors = A.LOGO_COLORS || FALLBACK_COLORS;
  const logo = { shape: 'star', color: colors[0], icon: '🎸', ...(s.band?.logo || {}) };
  const prev = h('div', { class: 'logo-prev' });
  const groups = h('div', { class: 'stack' });
  const pick = (k, v) => { sfx('tap'); logo[k] = v; draw(); };
  const draw = () => {
    prev.replaceChildren(bandLogo({ band: { name: s.band?.name, logo } }, { size: 170 }));
    groups.replaceChildren(
      h('b', null, 'Forma'),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Forma' }, shapes.map((x) => h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(logo.shape === x.id), onclick: () => pick('shape', x.id),
      }, `${SHAPE_IC[x.id] || ''} ${x.label}`))),
      h('b', null, 'Color'),
      h('div', { class: 'sws', role: 'group', 'aria-label': 'Color' }, colors.map((c) => h('button', {
        class: 'sw', type: 'button', style: { background: c }, 'aria-label': `Color ${c}`, 'aria-pressed': String(logo.color === c), onclick: () => pick('color', c),
      }))),
      h('b', null, 'Estampa'),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Estampa' }, STAMPS.map((e) => h('button', {
        class: 'chip stamp', type: 'button', 'aria-pressed': String(logo.icon === e), 'aria-label': `Estampa ${e}`, onclick: () => pick('icon', e),
      }, e))));
  };
  draw();
  mount(h('div', { class: 'page setup-page' },
    h('div', { class: 'cols' },
      h('div', { class: 'stack center' }, h('h2', null, fill(s, '🎨 El logo de {banda}')), prev),
      h('div', { class: 'stack' },
        groups,
        h('button', {
          class: 'btn big block', type: 'button',
          onclick: () => { s.band.logo = { shape: logo.shape, color: logo.color, icon: logo.icon }; s.flags.logo = true; sfx('good'); ctx.save(); done(); },
        }, '✔ ¡Así es nuestro logo!')))));
}

// 3. El préstamo de Papá y las 3 alcancías
function loanScreen(s, ctx, done) {
  mount(h('div', { class: 'page setup-page' },
    h('div', { class: 'cols' },
      h('div', { class: 'stack' },
        h('h2', null, '🤝 El préstamo de Papá'),
        h('div', { class: 'box center' },
          h('b', { class: 'big-num' }, money(5000)),
          h('span', null, 'para amplificador, micrófono y cables'),
          h('span', { class: 'tag ok' }, 'Intereses: $0'))),
      h('div', { class: 'stack' },
        h('b', null, 'Cada sábado repartes lo que ganen en 3 alcancías:'),
        h('div', { class: 'pigs' },
          h('div', { class: 'pig' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '💰'), h('b', null, 'Caja'), h('small', null, 'gastos de la banda')),
          h('div', { class: 'pig' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '🐷'), h('b', null, 'Ahorro'), h('small', null, 'para la meta')),
          h('div', { class: 'pig' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '🤝'), h('b', null, 'Papá'), h('small', null, 'pagar el préstamo'))),
        // Sin frase-lección aquí: "Cumple lo que prometes" se vive y se descubre en el cap. 2 (reglas 15 y 16).
        h('div', { class: 'narr' }, 'Prometen pagarle con lo que ganen, sin prisa.'),
        h('button', {
          class: 'btn big block', type: 'button',
          onclick: () => { s.flags.prestamo = true; sfx('coin'); ctx.save(); done(); },
        }, '🤝 ¡Trato hecho!')))));
}

// Resultado de una actividad hecha dentro de la historia (✅ porque… + métricas que rebotan).
function resultView(s, ctx, r, title) {
  if (r?.verdict === 'good') sfx('good'); else sfx('tap');
  mount(h('div', { class: 'page scene-page' },
    metricBar(s, r?.deltas || {}, { onNotebook: ctx.openNotebook }),
    h('div', { class: 'cols' },
      h('div', { class: 'scene-art' }, garageScene(s)),
      h('div', { class: 'stack' },
        h('h2', null, title),
        r?.why ? verdictBox(r) : null,
        h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); ctx.refresh(); } }, 'Seguir ▶')))));
}

// 4. Primera canción
function composeStep(s, ctx, sc) {
  mount(h('div', { class: 'page compose-page' }, composeScreen({
    wordBank: wordBankFor(s), chapter: s.chapter, songs: s.songs,
    onSave: (song) => {
      // First close the scene (the engine marks it seen and remembers where the week goes), then the activity:
      // doActivity may open the next 'week' scene by itself.
      endScene(s, sc.id);
      let r;
      if (s.planDay < 3) r = week.doActivity(s, 'componer', { song });
      else {
        const made = week.makeSong(s, song);
        s.songs.push(made);
        s.stats.composes += 1;
        r = { verdict: 'good', why: `✅ Compusieron “${made.title}”.`, deltas: {} };
      }
      ctx.save();
      resultView(s, ctx, r, `🎵 “${s.songs[s.songs.length - 1]?.title || 'Nuestra canción'}”`);
    },
  })));
}

// 5. Primer ensayo (despacito)
function rehearseStep(s, ctx, sc) {
  const song = s.songs[0] || { title: 'Riff de práctica' };
  // Papá says "a la mitad de velocidad": the first rehearsal plays at the slow tempo (spread: the song keeps its
  // id and style). First run ever: the game shows when to tap the first notes. 🔁 Otra vez keeps her best run.
  const screen = rehearsalScreen({
    song: { ...song, tempo: 'lento' }, seconds: 20, difficulty: 0, settings: app.settings,
    tutorial: !s.stats?.rehearsals, records: songRecords(s),
    onDone: (best, last) => {
      s.flags.difficulty = last?.nextDifficulty ?? 0.5;
      endScene(s, sc.id);
      const r = week.doActivity(s, 'ensayar', best
        ? { accuracy: best.accuracy, hits: best.hits, total: best.total }
        : { accuracy: 0.6 });
      ctx.save();
      resultView(s, ctx, r, '🎸 ¡Primer ensayo!');
    },
  });
  mount(h('div', { class: 'page game-page' },
    tipBox('🐢 Despacito también cuenta: toca cuando la bolita llegue a la línea.'),
    screen));
}

// 6. Show para 3 sillas
function showStep(s, ctx, sc) {
  const left = Math.max(0, 3 - (s.planDay || 0));
  const askLeft = left === 1 ? 'Antes del sábado les queda 1 tarde. ¿Cómo la usan?' : `Antes del sábado les quedan ${left} tardes. ¿Cómo las usan?`;
  mount(h('div', { class: 'page scene-page' },
    h('div', { class: 'cols' },
      h('div', { class: 'scene-art' }, sceneStage(s, 'cochera_sillas')),
      h('div', { class: 'stack' },
        h('h2', null, '🎤 ¡Su primer show!'),
        h('p', null, 'Es el sábado en la cochera. Público: 3 sillas.'),
        left ? tipBox(askLeft) : null,
        h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); endScene(s, sc.id); ctx.save(); ctx.refresh(); } }, '¡Vamos! ▶')))));
}

// Metas del capítulo (al abrir un capítulo)
function goalsStep(s, ctx, sc) {
  mount(h('div', { class: 'page scene-page' },
    h('div', { class: 'card stack' },
      h('p', { class: 'eyebrow' }, 'Metas del capítulo'),
      h('h2', null, chapterName(s)),
      goalsOf(s).map((g) => goalMeter(g)),
      h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); endScene(s, sc.id); ctx.save(); ctx.refresh(); } }, '¡Vamos! ▶'))));
}

// ---------- Hito del capítulo ----------
const POSTERS = ['mano', 'foto', 'agotado', 'sencillo', 'disco', 'gira', 'lona', 'estadio'];

function thenNow(s, m) {
  const first = s.history?.[0];
  const line = (icon, txt) => h('span', null, `${icon} ${txt}`);
  return h('div', { class: 'then-now' },
    h('div', { class: 'box' },
      h('b', null, 'Así empezó'),
      h('small', { class: 'muted' }, 'Semana 1'),
      line('🪑', `${first?.venue === 'cochera' ? first.attendance : 3} sillas`),
      line('⭐', '0 fans'),
      line('🎵', '0 canciones')),
    h('div', { class: 'box now' },
      h('b', null, 'Así va'),
      h('small', { class: 'muted' }, `Semana ${m.week || Math.max(1, s.week - 1)}`),
      line('👥', plural(s.records?.bestAttendance || first?.attendance || 3, 'persona', 'personas')),
      line('⭐', plural(s.m?.fans || 0, 'fan', 'fans')),
      line('🎵', plural(s.songs?.length || 0, 'canción', 'canciones'))));
}

export function renderMilestone(s, ctx) {
  const lc = s.lastClose || {};
  const chs = chaptersMod()?.CHAPTERS || [];
  const m = { ...(chs[Math.max(0, s.chapter - 1)]?.milestone || {}), ...(lc.milestone || {}), week: lc.week };
  const mch = Number.isFinite(m.chapter) ? m.chapter : Math.max(0, s.chapter - 1);
  const after = posterStage(s, POSTERS[mch] || s.unlocks?.poster);
  const before = mch > 0 ? posterStage(s, POSTERS[mch - 1]) : null;
  const step2 = () => {
    sfx('tap');
    const venues = VENUES.filter((v) => v.chapter === s.chapter);
    const goals = goalsOf(s);
    mount(h('div', { class: 'page milestone-page' },
      h('div', { class: 'cols' },
        h('div', { class: 'scene-art' }, garageScene(s)),
        h('div', { class: 'stack' },
          h('h2', null, '🎁 ¡Sorpresas!'),
          h('div', { class: 'reward-list' },
            before !== after ? h('div', { class: 'reward' }, h('span', { class: 'ric', 'aria-hidden': 'true' }, '🖼️'), h('b', null, after === 'soldout' ? 'Póster con AGOTADO' : after === 'color' ? 'Póster nuevo, a color' : 'Su primer póster')) : null,
            s.chapter <= 2 ? h('div', { class: 'reward' }, h('span', { class: 'ric', 'aria-hidden': 'true' }, '💡'), h('b', null, 'La cochera cambió')) : null,
            ...newStylesAt(s.chapter).map((st) => h('div', { class: 'reward' }, h('span', { class: 'ric', 'aria-hidden': 'true' }, st.icon),
              h('div', null, h('b', null, `✨ Nuevo estilo: ${st.label}`), h('small', null, 'Ya lo puedes usar al componer.')))),
            venues.length ? h('div', { class: 'reward' }, h('span', { class: 'ric', 'aria-hidden': 'true' }, '📍'),
              h('div', null, h('b', null, 'Nuevos escenarios'), h('small', null, venues.slice(0, 3).map((v) => `${v.icon} ${v.name}`).join(' · ')))) : null),
          h('div', { class: 'box' },
            h('p', { class: 'eyebrow' }, 'Lo que sigue'),
            h('b', null, chapterName(s)),
            goals.length ? h('span', { class: 'small' }, goals.map((g) => `${g.icon} ${fill(s, g.label)}${g.need > 1 ? `: ${g.money ? money(g.need) : num(g.need)}` : ''}`.replace(/\s+/g, ' ')).join(' · ')) : null),
          h('button', {
            class: 'btn big block', type: 'button',
            onclick: () => { sfx('tap'); week.startWeek(s); ctx.save(); ctx.refresh(); },
          }, `🎸 ¡Al ${s.chapter >= (chs.length - 1) ? 'Final' : `capítulo ${s.chapter}`}!`)))));
  };
  confetti(1.2);
  sfx('fanfare');
  mount(h('div', { class: 'page milestone-page' },
    h('div', { class: 'stack center' },
      h('p', { class: 'eyebrow' }, `${m.icon || '🏆'} Hito del capítulo`),
      h('h1', { class: 'milestone-title' }, fill(s, m.title || '¡Lo lograron!'))),
    h('div', { class: 'cols' },
      h('div', { class: 'poster-pair' },
        before ? h('div', { class: 'stack center' }, bandPoster(s, { stage: before }), h('small', { class: 'muted' }, 'Antes')) : null,
        before ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, '➜') : null,
        h('div', { class: 'stack center' }, bandPoster(s, { stage: after }), h('small', { class: 'muted' }, 'Nuevo póster'))),
      h('div', { class: 'stack' },
        m.text ? h('p', { class: 'lead' }, fill(s, m.text)) : null,
        thenNow(s, m),
        h('button', { class: 'btn big block', type: 'button', onclick: step2 }, 'Siguiente ▶')))));
}

// ---------- La banda se toma un descanso ----------
export function renderPause(s, ctx) {
  const review = () => pauseReview(s, ctx);
  // Con el motor nuevo, main ya mostró las escenas de la pausa (pendingScene en la fase 'pause').
  if (typeof week.pendingScene === 'function' || (lastShown?.trigger === 'pause' && lastShown.week === s.week)) { lastShown = null; return review(); }
  const sc = allScenes().find((x) => x.trigger === 'pause' && safeWhen(x, s));
  if (!sc) return review();
  lastShown = { id: sc.id, trigger: 'pause', week: s.week };
  playBeats(s, ctx, sc, review);
}

function pauseReview(s, ctx) {
  const lc = s.lastClose || {};
  let pause = lc.pause;
  if (!pause) { try { pause = progress.checkPause(s); } catch { pause = null; } }
  const mood = (pause?.reason || 'mood') === 'mood';
  const snaps = s.snapshots || [];
  const target = snaps[Math.max(0, snaps.length - 3)]?.week || Math.max(1, s.week - 2);
  const weekly = chaptersMod()?.CHAPTERS?.[s.chapter]?.weekly ?? 0;
  const lessons = Object.values(s.lessons || {}).filter((l) => (l?.level || 0) > 0).length;
  // If the money went in the last show (a big place half empty), say that: it is what she can change.
  const show = (s.history || []).at(-1);
  const lostShow = !mood && show && show.week >= s.week - 1 && (show.earned || 0) < 0 ? show : null;
  const numbers = mood
    ? `💛 Ánimo: ${lc.m?.mood ?? s.m.mood} de 100`
    : lostShow
      ? `🎟️ ${fill(s, lostShow.venueName || 'El último show')}: llegaron ${num(lostShow.attendance)} de ${num(lostShow.cap)} y la renta costó ${money(-lostShow.earned)} más que los boletos. · gastos de cada semana: ${money(weekly)}`
      : `💰 Caja: ${money(lc.money?.caja ?? s.money.caja)} · gastos de cada semana: ${money(weekly)}`;
  const tip = mood
    ? '💡 La próxima vez, mete 1 tarde 😴 cada semana, porque así el 💛 no se acaba.'
    : lostShow
      ? '💡 La próxima vez, mira cuántos "llegarían" antes de elegir el lugar, porque la renta se paga aunque no se llene.'
      : `💡 La próxima vez, revisa la caja antes de gastar, porque cada semana se van ${money(weekly)} en gastos de la banda.`;
  mount(h('div', { class: 'page pause-page' },
    h('div', { class: 'cols' },
      h('div', { class: 'scene-art' }, garageScene(s, { night: true, crowd: { count: 0, cap: 3 } })),
      h('div', { class: 'stack' },
        h('h2', null, '🌙 La banda se toma un descanso'),
        h('p', null, mood ? (s.members?.length > 2 ? 'Toda la banda necesita descansar.' : 'Nina y tú necesitan descansar.') : 'La caja se quedó sin dinero.'),
        h('div', { class: 'papa' }, h('span', { class: 'phrase-ic', 'aria-hidden': 'true' }, '📒'),
          h('div', null, h('span', { class: 'who' }, 'Papá revisa contigo'), h('br'), numbers)),
        nextTipBox(s, tip),
        motivCard(s, 'E', { rewindWeek: target }, { max: 2 })
          || h('p', { class: 'small' }, `Te quedas con 🎵 ${s.songs.length} · 📖 ${lessons} · 🏅 ${(s.achievements || []).length}`),
        h('button', {
          class: 'btn big block', type: 'button',
          onclick: () => {
            sfx('good');
            try { progress.rewind(s); week.startWeek(s); } catch (e) { console.error(e); toast('No se pudo regresar. Intenta otra vez.'); return; }
            ctx.save(); ctx.refresh();
          },
        }, `🎸 Volver a la semana ${target}`)))));
}

// ---------- Final: Gramófono de Oro ----------
export function renderEnd(s, ctx) {
  const A = art();
  let trophy = null;
  try { trophy = A?.trophySvg?.({ size: 220 }); } catch { trophy = null; }
  const lc = s.lastClose || {};
  const m = lc.milestone || chaptersMod()?.CHAPTERS?.[s.chapter]?.milestone || {};
  // Every row (up to 11): 📖 Lecciones and 🏆 Premio are the ones that reward most. The card scrolls inside if needed.
  const fin = dataCard(s, 'final');
  confetti(1.5);
  sfx('fanfare');
  mount(h('div', { class: 'page end-page' },
    h('div', { class: 'stack center' },
      h('p', { class: 'eyebrow' }, 'Final'),
      h('h1', { class: 'milestone-title' }, '🏆 ¡Gramófono de Oro!')),
    h('div', { class: 'cols' },
      h('div', { class: 'stack center' }, artBox(trophy, 'trophy-art', '🏆'), m.text ? h('p', { class: 'lead' }, fill(s, m.text)) : null),
      h('div', { class: 'stack' },
        fin || thenNow(s, { week: s.week }),
        h('button', {
          class: 'btn big block', type: 'button',
          onclick: () => { sfx('tap'); s.flags.ended = true; week.startWeek(s); ctx.save(); ctx.refresh(); },
        }, '🎸 Seguir tocando'),
        h('button', { class: 'btn alt block', type: 'button', onclick: () => { sfx('tap'); ctx.openBook(); } }, '📖 Mis lecciones')))));
}

