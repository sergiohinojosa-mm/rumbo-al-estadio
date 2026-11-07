// 🗺️ Camino a la fama (8 paradas, metas del capítulo y récords personales) y 📒 La libreta de Papá
// (números completos, préstamo, alcancías, historial de shows y la tabla de qué mueve qué).
// Las dos son ventanas encima de la pantalla actual: no interrumpen el plan ni la carta.

import { h, money, num, plural } from '../util.js';
import { modal, sfx, fill, goalMeter } from './core.js';
import { goalsOf } from './home.js';
import { CHAPTERS, chapterOf } from '../data/chapters.js';
import { VENUE_BY_ID } from '../data/venues.js';
import { ACTIVITIES } from '../data/activities.js';

const closeBtn = (close) => h('button', { class: 'btn block', type: 'button', onclick: () => { sfx('tap'); close(); } }, 'Cerrar');

// ---------- Mapa ----------
export function openMap(s) {
  const cur = Math.min(s.chapter, CHAPTERS.length - 1);
  const last = CHAPTERS.length - 1;
  const stops = [];
  let hidden = 0;
  const flushHidden = () => {
    if (!hidden) return;
    stops.push(h('div', { class: 'qs', role: 'img', 'aria-label': `${hidden} lugares por descubrir` },
      Array.from({ length: hidden }, () => h('i', { 'aria-hidden': 'true' }, '?'))));
    hidden = 0;
  };
  CHAPTERS.forEach((c, i) => {
    if (i < cur) { stops.push(h('div', { class: 'pt done' }, `✅ ${c.icon} ${c.short}`)); return; }
    if (i === cur) {
      stops.push(h('div', { class: 'pt cur' },
        h('span', null, `${c.icon} ${c.short}`, h('span', { class: 'tag new', style: { marginLeft: '8px' } }, 'Aquí van')),
        goalsOf(s).map((g) => goalMeter(g))));
      return;
    }
    if (i === cur + 1 || i === last) { flushHidden(); stops.push(h('div', { class: 'pt q' }, `${c.icon} ${c.short}`)); return; }
    hidden += 1;
  });
  flushHidden();
  const r = s.records || {};
  const recs = [
    r.bestNewFans ? `⭐ Mejor show: +${num(r.bestNewFans)} fans` : null,
    r.bestAttendance ? `👥 Más público: ${plural(r.bestAttendance, 'persona', 'personas')}` : null,
    r.bestAccuracy ? `🎯 Mejor show: ${Math.round(r.bestAccuracy * 10)} de cada 10 notas` : null,
    r.soldOut ? `🎟️ AGOTADOS: ${r.soldOut}` : null,
    `🎵 ${plural(s.songs?.length || 0, 'canción propia', 'canciones propias')}`,
  ].filter(Boolean);
  return modal((close) => h('div', { class: 'msg map-modal' },
    h('h3', null, '🗺️ Camino a la fama'),
    h('div', { class: 'map', style: { textAlign: 'left' } }, stops),
    h('div', { class: 'box', style: { textAlign: 'left' } }, h('b', null, '🏅 Tus récords'), recs.map((t) => h('span', null, t))),
    closeBtn(close)),
  { dismissable: true, wide: true, label: 'Camino a la fama' });
}

// ---------- Libreta de Papá ----------
// Qué mueve qué (según el motor). Se llena cuando ya probó esa acción; si no, sale con "?".
const MOVES = {
  ensayar: ['·', '·', '↑↑', '↓'],
  componer: ['·', '·', '↑', '↓'],
  promover: ['↑', '↓', '·', '↓'],
  trabajito: ['·', '↑↑', '·', '↓↓'],
  descansar: ['·', '·', '·', '↑↑'],
  grabar: ['↑', '↓↓', '·', '↓'],
  show: ['↑↑', '↑', '·', '↑'],
};
const TRIED = { ensayar: 'rehearsals', componer: 'composes', promover: 'promos', trabajito: 'jobs', descansar: 'rests', grabar: 'recordings', show: 'shows' };

const line = (label, value) => h('div', { class: 'ln' }, h('span', null, label), h('b', null, value));
const arrow = (a, b, fmt = String) => (a == null || a === b ? fmt(b) : `${fmt(a)} → ${fmt(b)}`);

export function openNotebook(s) {
  const ch = chapterOf(s);
  const snaps = s.snapshots || [];
  const from = snaps[snaps.length - 1] || null;     // cómo empezó esta semana
  const fansGoal = goalsOf(s).find((g) => g.id === 'fans');
  const rows = [...ACTIVITIES.filter((a) => a.from <= s.chapter).map((a) => [a.id, `${a.icon} ${a.label}`]), ['show', '🎤 Show']];
  const shows = (s.history || []).slice(-6).reverse();
  return modal((close) => h('div', { class: 'msg notebook-modal' },
    h('h3', null, `📒 La libreta de Papá · semana ${s.week}`),
    h('div', { class: 'cols even', style: { textAlign: 'left' } },
      h('div', { class: 'stack' },
        h('div', { class: 'box notebook' },
          h('small', { class: 'muted' }, 'Desde el lunes → ahora'),
          line('⭐ Fans', `${arrow(from?.m?.fans, s.m.fans, num)}${fansGoal ? ` · meta ${num(fansGoal.need)}` : ''}`),
          line('🎸 Talento', `${arrow(from?.m?.talent, s.m.talent)} de 100`),
          line('💛 Ánimo', `${arrow(from?.m?.mood, s.m.mood)} de 100`)),
        h('div', { class: 'box notebook' },
          h('small', { class: 'muted' }, 'Alcancías'),
          line('💰 Caja', arrow(from?.money?.caja, s.money.caja, money)),
          line('🐷 Ahorro', money(s.money.ahorro)),
          line('🤝 Préstamo de Papá', s.money.deuda ? `faltan ${money(s.money.deuda)}` : '¡PAGADO!'),
          line('✅ Ya le pagaron', money(s.money.pagado)),
          line('🧾 Gastos de cada semana', money(ch.weekly))),
        // ▶️ Their recorded music: plays and royalties (regalías = what they pay you each time someone listens).
        (s.recorded || []).length ? h('div', { class: 'box notebook' },
          h('small', { class: 'muted' }, '▶️ Su música grabada'),
          line('🎙️ Canciones grabadas', num(s.recorded.length)),
          line('▶️ Reproducciones', num(s.streams || 0)),
          line('▶️ La semana pasada', num(s.streamsWeek || 0)),
          line('🎵 Regalías cobradas', money(s.royalties || 0)),
          h('small', { class: 'muted' }, 'Regalías: lo que te pagan cada vez que alguien escucha tu canción.')) : null),
      h('div', { class: 'stack' },
        h('div', { class: 'box' },
          h('b', null, '¿Qué mueve qué?'),
          h('table', { class: 'nb-table' },
            h('thead', null, h('tr', null, h('th', null, ''), ['⭐', '💰', '🎸', '💛'].map((x) => h('th', { scope: 'col' }, x)))),
            h('tbody', null, rows.map(([id, label]) => {
              const known = (s.stats?.[TRIED[id]] || 0) > 0;
              return h('tr', { class: known ? '' : 'unk' }, h('td', null, label), (known ? MOVES[id] : ['?', '?', '?', '?']).map((x) => h('td', null, x)));
            }))),
          h('small', { class: 'muted' }, '💛 baja más a la tercera tarde de trabajo sin descanso.'),
          h('small', { class: 'muted' }, 'El show suena mejor con 🎸 talento (lo que más pesa), 🎵 canciones propias y 💛 ánimo.')),
        h('div', { class: 'box' },
          h('b', null, '🎤 Shows'),
          shows.length ? h('table', { class: 'nb-table' },
            h('thead', null, h('tr', null, ['Sem.', 'Lugar', '👥', '⭐', '💰'].map((x) => h('th', { scope: 'col' }, x)))),
            h('tbody', null, shows.map((x) => h('tr', null,
              h('td', null, String(x.week)),
              h('td', null, fill(s, x.venueName || VENUE_BY_ID[x.venue]?.name || x.venue)),
              h('td', null, `${num(x.attendance)}${x.cap ? `/${num(x.cap)}` : ''}`),
              h('td', null, `+${num(x.newFans || 0)}`),
              h('td', null, money(x.earned || 0))))))
            : h('span', { class: 'small muted' }, 'Todavía no hay shows.')))),
    closeBtn(close)),
  { dismissable: true, wide: true, label: 'La libreta de Papá' });
}
