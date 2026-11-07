// Libro de lecciones: collectible cards with 3 stars (descubierta → aplicada → dominada), grouped by
// chapter, shown as "¿?" until she discovers them. Each card opens with how she learned it.
// Also the karaoke "Completa la frase" with Nina: RECALL[id] = [respuesta, distractor, distractor].

import { h } from '../util.js';
import {
  mount, modal, bubble, voicePlayer, hasAudio, nextTipBox, sfx, fill, starRow, castName,
  lessonList, lessonInfo, recallFor, lessonsReady, chaptersMod,
} from './core.js';

export const LEVELS = ['Por descubrir', 'Descubierta', 'Aplicada', 'Dominada'];
const FALLBACK_CH = ['Prólogo · La cochera', 'Capítulo 1 · Primer escenario', 'Capítulo 2 · Boletos agotados', 'Capítulo 3 · Primer sencillo',
  'Capítulo 4 · Sonando en todos lados', 'Capítulo 5 · De gira', 'Capítulo 6 · Palacio de los Deportes', 'Final · Estadio lleno'];
const chapterName = (s, ch) => fill(s, chaptersMod()?.CHAPTERS?.[ch]?.name || FALLBACK_CH[ch] || `Capítulo ${ch}`);
const lv = (s, id) => s.lessons?.[id]?.level ?? 0;

// Mounts the book. back() returns to the previous screen; save(s) persists the "seen" marks.
export async function renderBook(s, back, save) {
  await lessonsReady;
  const draw = () => mount(bookView(s, { onBack: back, save, redraw: draw }));
  draw();
}

export function bookView(s, { onBack, save, redraw } = {}) {
  const list = lessonList();
  const found = list.filter((l) => lv(s, l.id) > 0).length;
  const groups = new Map();
  for (const l of list) {
    const ch = l.chapter ?? 0;
    if (!groups.has(ch)) groups.set(ch, []);
    groups.get(ch).push(l);
  }
  const chapters = [...groups.keys()].sort((a, b) => a - b);
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' },
      onBack ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Volver', onclick: () => { sfx('tap'); onBack(); } }, '←') : null,
      h('h2', null, '📖 Tu Libro de lecciones'),
      h('span', { class: 'tag', 'aria-label': `${found} de ${list.length} descubiertas` }, `${found}/${list.length}`)),
    h('p', { class: 'muted' }, 'Cada carta tiene 3 estrellas: ⭐ la descubriste, ⭐⭐ la usaste, ⭐⭐⭐ la dominaste.'),
    list.length ? null : h('div', { class: 'card' }, 'Todavía no hay frases. ¡Juega tu primera semana!'),
    chapters.map((ch) => h('section', { class: 'book-ch' },
      h('h3', null, chapterName(s, ch)),
      h('div', { class: 'book-grid' }, groups.get(ch).map((l) => lessonCard(s, l, { save, redraw }))))));
}

export function lessonCard(s, l, { save, redraw } = {}) {
  const level = lv(s, l.id);
  if (!level) {
    return h('div', { class: 'lcard lock', 'aria-label': 'Frase por descubrir' },
      h('span', { 'aria-hidden': 'true' }, '¿?'), h('small', null, 'Sigue jugando para descubrirla'));
  }
  const st = s.lessons[l.id];
  return h('button', { class: `lcard l${level}`, type: 'button', onclick: () => { sfx('tap'); openLesson(s, l.id, { save }).then(() => redraw?.()); } },
    st && st.seen === false ? h('span', { class: 'tag new' }, '✨ nueva') : null,
    h('span', { class: 'ic', 'aria-hidden': 'true' }, l.icon || '📖'),
    h('b', null, fill(s, l.phrase)),
    h('span', { class: 'who' }, castName(s, l.by)),
    starRow(level));
}

export function openLesson(s, id, { save } = {}) {
  const l = lessonInfo(id);
  const st = s.lessons?.[id];
  if (!l || !st) return Promise.resolve();
  if (!st.seen) { st.seen = true; save?.(s); }
  const level = st.level || 1;
  const applied = st.applied || 0;
  const when = st.week ? `semana ${st.week}` : st.day != null ? `día ${st.day}` : '';
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'from' }, `${l.icon || '📖'} ${LEVELS[level]}`),
    starRow(level),
    bubble(l.by, `“${fill(s, l.phrase)}”`),
    hasAudio(id) ? voicePlayer(id, { label: `Escuchar a ${castName(s, l.by)}` }) : null,
    l.meaning ? h('p', { class: 'meaning' }, fill(s, l.meaning)) : null,
    l.tip ? nextTipBox(s, l.tip) : null,
    st.ctx ? h('div', { class: 'why' }, h('b', null, `Cómo la aprendiste${when ? ` (${when})` : ''}: `), fill(s, st.ctx)) : null,
    st.lastCtx ? h('div', { class: 'why good' }, h('b', null, 'La última vez que la usaste: '), fill(s, st.lastCtx)) : null,
    level < 3 ? h('p', { class: 'muted small' }, level === 1
      ? 'Úsala en una decisión de verdad para ganar la segunda estrella.'
      : `Úsala ${3 - applied === 1 ? '1 vez' : `${Math.max(1, 3 - applied)} veces`} más para dominarla.`) : null,
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Cerrar')),
  { dismissable: true, label: 'Lección' });
}

// ---- Karaoke "Completa la frase" with Nina ----
const shuffled = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const fold = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Lessons she already discovered that have a RECALL entry.
export const karaokeIds = (s) => lessonList().filter((l) => lv(s, l.id) > 0 && recallFor(l.id)?.length >= 3).map((l) => l.id);

// Returns a Node (or null if there's no phrase to sing yet). onDone({ id, firstTry, tries }).
export function karaoke(s, onDone, { id: forceId } = {}) {
  const ids = karaokeIds(s);
  const id = forceId && recallFor(forceId) ? forceId : ids[Math.floor(Math.random() * ids.length)];
  if (!id) return null;
  const l = lessonInfo(id);
  const [answer, ...wrong] = recallFor(id);
  const phrase = fill(s, l?.phrase || '');
  const at = fold(phrase).indexOf(fold(answer));
  const before = at >= 0 ? phrase.slice(0, at) : `${phrase} `;
  const after = at >= 0 ? phrase.slice(at + answer.length) : '';
  const blank = h('span', { class: 'blank' }, '___');
  const line = h('p', { class: 'line', 'aria-live': 'polite' }, '♪ ', before, blank, after, ' ♪');
  let nina = bubble('nina', '¡Cantemos tu frase! ¿Qué palabra falta? 🎤');
  let tries = 0;
  let finished = false;
  const next = h('button', { class: 'btn block', type: 'button', hidden: true, onclick: () => onDone?.({ id, firstTry: tries === 1, tries }) }, 'Seguir 🎶');
  const say = (text) => { const b = bubble('nina', text); nina.replaceWith(b); nina = b; };
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Opciones' }, shuffled([answer, ...wrong.slice(0, 2)]).map((opt) => h('button', {
    class: 'chip', type: 'button',
    onclick: (e) => {
      if (finished) return;
      tries += 1;
      const btn = e.currentTarget;
      if (fold(opt) === fold(answer)) {
        finished = true;
        btn.classList.add('on');
        blank.textContent = answer;
        chips.querySelectorAll('button').forEach((b) => { if (b !== btn) b.disabled = true; });
        sfx('sing');
        say(`♪ ¡${phrase}! ♪ ${tries === 1 ? '¡A la primera! 🌟' : '¡Eso! 🌟'}`);
        next.hidden = false;
        next.focus({ preventScroll: true });
        // Whoever hosts the karaoke can hide its "Saltar" now: there is one way forward, "Seguir 🎶".
        next.dispatchEvent(new CustomEvent('karaoke:done', { bubbles: true }));
      } else {
        btn.classList.add('no');
        btn.disabled = true;
        sfx('tap');
        say(`“${opt}”… ¡jaja, así no va! Prueba otra 🎶`);
      }
    },
  }, opt)));
  return h('div', { class: 'karaoke card' },
    h('h3', null, '🎤 Karaoke con Nina'),
    nina, line, chips, next);
}
