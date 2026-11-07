// Plan de la semana (DISENO §2.3): 3 tardes (lunes, miércoles y viernes) y el show del sábado, como pasos
// guiados numerados. Cada tarde elige una actividad de week.activityOptions; antes de confirmar ve el 💡 Tip
// (Prólogo y cap. 1: solo; desde el cap. 2: con el botón 💡 Pista). Después, ✅ porque… / 💡 La próxima vez…
// y las métricas rebotan. Ensayar abre el minijuego de ritmo; Componer, el de componer.

import { h, money, plural } from '../util.js';
import { app, mount, modal, sfx, toast, metricBar, tipBox, verdictBox, steps, hintMode, remindBox, motivCard } from './core.js';
import { garageScene } from './home.js';
import { drainInbox } from './inbox.js';
import * as week from '../engine/week.js';
import { STUDIO } from '../data/chapters.js';
import { composeScreen } from './compose.js';
import { rehearsalScreen, songRecords } from './rehearse.js';
import { emo } from './photo.js';

// Imanes de palabras para el coro: pop, positivas, para una niña de 9 años (sin marcas ni redes sociales).
export const WORD_BANK = [
  'sol', 'luna', 'estrellas', 'brillar', 'bailar', 'cantar', 'volar', 'soñar', 'juntas', 'amigas',
  'corazón', 'cielo', 'noche', 'verano', 'arcoíris', 'fiesta', 'ritmo', 'guitarra', 'sábado', 'mariposas',
  'chicle', 'helado', 'bici', 'patines', 'unicornio', 'escenario', 'luces', 'aplausos', 'sonrisa', 'abrazo',
  'magia', 'mar', 'nube', 'saltar', 'brillo', 'canción', 'siempre', 'hoy', 'contigo', 'libre', 'risa', 'glorieta',
  'alas', 'viento', 'colores', 'girar', 'brincar', 'aventura', 'cometa', 'planeta', 'galaxia', 'cohete',
  'chispa', 'olas', 'playa', 'domingo', 'recreo', 'pijamada', 'palomitas', 'confeti', 'globos', 'perrito',
  'melodía', 'feliz', 'mañana', 'flores', 'lluvia', 'luciérnagas', 'valiente', 'diamante',
];
// Palabras que llegan con la historia (se suman desde ese capítulo): el camino de la cochera al estadio.
export const CHAPTER_WORDS = {
  1: ['café', 'pastel', 'kermés', 'micrófono', 'teclado', 'aplaudir'],
  2: ['boletos', 'foro', 'agotado', 'fila', 'plaza', 'póster'],
  3: ['estudio', 'grabar', 'sencillo', 'audífonos', 'disco', 'eco'],
  4: ['radio', 'antena', 'placa', 'ciudad', 'sonando', 'onda'],
  5: ['carretera', 'Guadalajara', 'Monterrey', 'Puebla', 'camioneta', 'mapa', 'gira', 'montañas'],
  6: ['Palacio', 'arena', 'miles', 'multitud', 'lucecitas', 'leyenda'],
  7: ['estadio', 'millones', 'gramófono', 'gracias', 'historia', 'lleno'],
};
// The chorus magnets for her save: the base bank plus every chapter's words up to where she is.
export function wordBankFor(s) {
  const ch = Math.max(0, Number(s?.chapter) || 0);
  return [...WORD_BANK, ...Object.entries(CHAPTER_WORDS).filter(([k]) => Number(k) <= ch).flatMap(([, w]) => w)];
}

const DAYS = ['lunes', 'miércoles', 'viernes'];
const DAY_SHORT = ['Lun', 'Mié', 'Vie'];
const GO = { ensayar: '🎸 ¡A ensayar!', componer: '✍️ ¡A componer!', promover: '📣 ¡A promover!', trabajito: '💵 ¡A trabajar!', descansar: '😴 ¡A descansar!', grabar: '🎙️ ¡A grabar!' };
const ICON = { ensayar: '🎸', componer: '✍️', promover: '📣', trabajito: '💵', descansar: '😴', grabar: '🎙️' };

// Pista general antes de elegir: qué mirar esta tarde.
function dayTip(s) {
  const plan = s.week$?.plan || [];
  const workRun = plan.length >= 2 && plan.slice(-2).every((p) => p.id !== 'descansar');
  if (s.m.mood <= 35) return '💡 El 💛 ánimo está bajito. ¿Qué lo sube?';
  if (workRun) return '💡 Llevan 2 tardes seguidas de trabajo. ¿Cómo llegan con energía al sábado?';
  if (s.chapter === 0 && !s.songs.length) return '💡 Una banda necesita su propia canción.';
  if (s.chapter === 0 && !s.stats.rehearsals) return '💡 Antes del show, conviene ensayar.';
  return '💡 ¿Qué les falta para el sábado: práctica, fans o descanso?';
}

// How many times she already did each activity: from cap. 4 the 💡 Pista only shows in new situations.
const DONE = { ensayar: 'rehearsals', componer: 'composes', promover: 'promos', trabajito: 'jobs', descansar: 'rests', grabar: 'recordings' };
const isNew = (s, id) => (s.stats?.[DONE[id]] || 0) < 2;
const lowMood = (s) => s.m.mood <= 50;

// 📖 Recuerda at the moment of deciding, when the situation repeats and she already discovered the phrase.
function planRemind(s, sel) {
  // Tired band and she picks more work: Mamá's phrase is the one that matters right now.
  if (sel && sel.id !== 'descansar' && lowMood(s)) { const r = remindBox(s, 'descansar'); if (r) return r; }
  if (sel?.id === 'ensayar') return remindBox(s, 'practica');
  // Composing again: Abuela Alma's phrase, which composing applies (triggers apply it on 'componer').
  if (sel?.id === 'componer') return remindBox(s, 'suenas_a_ti');
  if (sel?.id === 'descansar' || (!sel && lowMood(s))) return remindBox(s, 'descansar');
  return null;
}

function pickSong(s) {
  const own = (s.setlist || []).map((id) => s.songs.find((x) => x.id === id)).filter(Boolean);
  return own[0] || s.songs[s.songs.length - 1] || { title: 'Riff de práctica' };
}

export function renderPlan(s, ctx, { last } = {}) {
  if (s.phase !== 'plan') return ctx.refresh();
  if (s.planDay >= 3) { s.phase = s.week$?.card ? 'card' : 'prep'; ctx.save(); return ctx.refresh(); }
  const day = s.planDay;
  const opts = week.activityOptions(s);
  let sel = null;
  const modeFor = (o) => hintMode(s, o ? isNew(s, o.id) : lowMood(s) || s.chapter < 4);
  let hintShown = modeFor(null) === 'open';

  const plan = s.week$?.plan || [];
  const stepList = [
    ...DAY_SHORT.map((d, i) => (plan[i] ? `${d} ${ICON[plan[i].id] || '✓'}` : i === day ? `${d} ?` : d)),
    'Sáb 🎤',
  ];

  const tipSlot = h('div', { class: 'stack' });
  const goBtn = h('button', { class: 'btn big block', type: 'button', hidden: true, onclick: () => { if (sel) { sfx('tap'); start(s, ctx, sel); } } });
  const paintTip = () => {
    const text = sel ? sel.tip : dayTip(s);
    const mode = modeFor(sel);
    const remind = planRemind(s, sel);
    if (hintShown && mode !== 'none') tipSlot.replaceChildren(tipBox(text), remind || '');
    else if (mode === 'none') tipSlot.replaceChildren(remind || '');
    else {
      tipSlot.replaceChildren(h('button', {
        class: 'btn alt hint-btn', type: 'button', onclick: () => { sfx('tap'); hintShown = true; paintTip(); },
      }, emo('💡 Pista')), remind || '');
    }
  };
  const buttons = opts.map((o) => {
    const b = h('button', {
      class: `ch wk-act ${o.locked ? 'off' : ''}`, type: 'button', 'aria-pressed': 'false', 'data-act': o.id,
      'aria-label': `${o.label}${o.cost ? `, cuesta ${money(o.cost)}` : ''}${o.locked ? `. ${o.locked}` : ''}`,
      onclick: () => {
        if (o.locked) { sfx('tap'); toast(o.locked, 3400); return; }
        sfx('tap');
        sel = o;
        buttons.forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        hintShown = modeFor(o) === 'open';
        paintTip();
        goBtn.replaceChildren(...[emo(GO[o.id] || `✔ ${o.label}`)].flat());
        goBtn.hidden = false;
      },
    },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, o.icon),
    h('span', null, o.label),
    // Locked for money: say so ("🐷 No alcanza", the toast gives the numbers); locked for the day: "Hoy no".
    o.locked ? h('small', null, /alcanza|\$/.test(String(o.locked)) ? `🐷 No alcanza · ${money(o.cost)}` : 'Hoy no')
      : o.cost ? h('small', null, money(o.cost)) : null);
    return b;
  });
  if (buttons.length % 2) buttons[buttons.length - 1].classList.add('wide');
  paintTip();

  mount(h('div', { class: 'page plan-page' },
    h('div', { class: 'mbar-wrap' }, metricBar(s, last?.deltas || {}, { onNotebook: ctx.openNotebook })),
    h('div', { class: 'cols' },
      h('div', { class: 'scene-art stage-banner' }, garageScene(s)),
      h('div', { class: 'stack' },
        h('div', { class: 'plan-steps' }, steps(stepList, day)),
        last ? verdictBox(last) : null,
        last?.motiv || null,
        h('h2', null, `¿Qué hacen el ${DAYS[day]}?`),
        tipSlot,
        h('div', { class: 'choices' }, buttons),
        goBtn))));
}

// ---------- Hacer la actividad ----------
function start(s, ctx, o) {
  if (o.id === 'ensayar') return rehearse(s, ctx);
  if (o.id === 'componer') return compose(s, ctx);
  if (o.id === 'grabar') return record(s, ctx);
  return apply(s, ctx, o.id);
}

function apply(s, ctx, id, perf) {
  const r = week.doActivity(s, id, perf);
  ctx.save();
  // 📒 After rehearsing: how she is doing against herself (data/motivation.js, kind B).
  if (id === 'ensayar' && !r.locked) r.motiv = motivCard(s, 'B', { accuracy: perf?.accuracy });
  if (r.locked) { toast(r.why, 3400); return renderPlan(s, ctx); }
  if (r.verdict === 'good') sfx('good'); else sfx('tap');
  if (s.phase === 'plan') {
    renderPlan(s, ctx, { last: r });
    drainInbox(s, ctx.save).catch(() => {});
    return;
  }
  // La última tarde (o una escena que entra a media semana): el resultado y luego lo que siga.
  const nextLabel = s.phase === 'card' ? '📩 Ver la carta de la semana' : s.phase === 'prep' ? '🎤 Preparar el show' : 'Seguir ▶';
  const done = s.week$.plan.length;
  mount(h('div', { class: 'page plan-page' },
    h('div', { class: 'mbar-wrap' }, metricBar(s, r.deltas || {}, { onNotebook: ctx.openNotebook })),
    h('div', { class: 'cols' },
      h('div', { class: 'scene-art stage-banner' }, garageScene(s)),
      h('div', { class: 'stack' },
        h('div', { class: 'plan-steps' }, steps([...DAY_SHORT.map((d, i) => (s.week$.plan[i] ? `${d} ${ICON[s.week$.plan[i].id] || '✓'}` : d)), 'Sáb 🎤'], done)),
        verdictBox(r),
        r.motiv || null,
        h('button', {
          class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); ctx.refresh(); },
        }, emo(nextLabel))))));
}

function rehearse(s, ctx) {
  const diff = Number.isFinite(s.flags?.difficulty) ? s.flags.difficulty : 1;
  // Game + 🔁 Otra vez (same afternoon, no extra cost). With 2+ songs she picks which one before playing.
  const screen = rehearsalScreen({
    song: pickSong(s), songs: s.songs, seconds: 30, difficulty: diff, settings: app.settings,
    tutorial: diff === 0 && !s.stats?.rehearsals, records: songRecords(s),
    onDone: (best, last) => {
      if (Number.isFinite(last?.nextDifficulty)) s.flags.difficulty = last.nextDifficulty;
      // Her best run counts. The why says "Tocaste X de Y notas": the engine needs hits and total, not only the accuracy.
      apply(s, ctx, 'ensayar', best
        ? { accuracy: best.accuracy, hits: best.hits, total: best.total }
        : { accuracy: 0.6 });
    },
  });
  mount(h('div', { class: 'page game-page' },
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Volver al plan', onclick: () => { screen.stop(); renderPlan(s, ctx); } }, '✕')),
    screen));
}

function compose(s, ctx) {
  mount(h('div', { class: 'page compose-page' }, composeScreen({
    wordBank: wordBankFor(s), chapter: s.chapter, songs: s.songs,
    onSave: (song) => apply(s, ctx, 'componer', { song }),
    onCancel: () => renderPlan(s, ctx),
  })));
}

// 🎙️ Grabar (cap. 3+): qué canción, qué estudio y cuántas tomas.
async function record(s, ctx) {
  const free = s.songs.filter((x) => !s.recorded.some((g) => g.songId === x.id));
  const budget = s.money.ahorro + Math.max(0, s.money.caja);
  // The studio she chose in card C3-01 comes preselected (if the money still reaches).
  const big = s.flags?.estudio_grande && STUDIO.bueno && STUDIO.bueno.cost <= budget;
  const pick = { songId: free[free.length - 1]?.id, studio: big ? 'bueno' : 'barato', takes: 3 };
  const res = await modal((close) => {
    const body = h('div', { class: 'stack', style: { textAlign: 'left' } });
    const chip = (on, label, fn, disabled) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(on), disabled: !!disabled, onclick: () => { sfx('tap'); fn(); draw(); } }, label);
    const draw = () => body.replaceChildren(
      h('b', null, '🎵 ¿Qué canción?'),
      h('div', { class: 'chips' }, free.map((x) => chip(pick.songId === x.id, `“${x.title}”`, () => { pick.songId = x.id; }))),
      h('b', null, '🏠 ¿Qué estudio?'),
      h('div', { class: 'chips' }, Object.entries(STUDIO).map(([k, st]) => chip(pick.studio === k, st.cost > budget ? `${st.label} · ${money(st.cost)} · 🐷 faltan ${money(st.cost - budget)}` : `${st.label} · ${money(st.cost)}`, () => { pick.studio = k; }, st.cost > budget))),
      h('b', null, '🔁 ¿Cuántas tomas?'),
      h('div', { class: 'chips' }, [1, 3, 5, 8].map((n) => chip(pick.takes === n, plural(n, 'toma', 'tomas'), () => { pick.takes = n; }))),
      tipBox('💡 Entre 3 y 5 tomas suele salir lo mejor: ni apurado ni cansado.'));
    draw();
    return h('div', { class: 'msg' },
      h('h3', null, '🎙️ Grabar en el estudio'),
      body,
      h('button', { class: 'btn block', type: 'button', onclick: () => close(true) }, '🎙️ ¡Grabar!'),
      h('button', { class: 'btn alt block', type: 'button', onclick: () => close(false) }, 'Mejor otro día'));
  }, { dismissable: true, label: 'Grabar en el estudio' });
  if (res) apply(s, ctx, 'grabar', pick);
}
