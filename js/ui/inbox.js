// Shows queued messages one by one: new lessons (with Papá's voice when it exists), applied and
// mastered lessons, and achievements. Several achievements at once become ONE "¡Nuevos logros!" card.
// Items it doesn't know (kind 'milestone'…) stay in s.inbox for the screen that handles them.

import { h, plural } from '../util.js';
import {
  modal, bubble, voicePlayer, hasAudio, nextTipBox, confetti, sfx, fill, starRow,
  lessonInfo, lessonList, lessonsReady, progressReady, progressMod, castName,
} from './core.js';

const LESSON_KINDS = new Set(['new', 'applied', 'mastered']);
const REWARD_KINDS = new Set(['badge', 'achievement']);
const handled = (m) => LESSON_KINDS.has(m?.kind) || REWARD_KINDS.has(m?.kind);
export const pendingInbox = (s) => (s?.inbox || []).some(handled);

export async function drainInbox(s, save) {
  if (!s?.inbox) return;
  await Promise.all([lessonsReady, progressReady]);
  for (;;) {
    const idx = s.inbox.findIndex(handled);
    if (idx < 0) break;
    const [item] = s.inbox.splice(idx, 1);
    if (REWARD_KINDS.has(item.kind)) {
      const group = [item];
      for (let i = 0; i < s.inbox.length;) {
        if (REWARD_KINDS.has(s.inbox[i]?.kind)) group.push(...s.inbox.splice(i, 1));
        else i++;
      }
      save?.(s);
      await rewards(s, group);
      continue;
    }
    save?.(s);
    const l = lessonInfo(item.id);
    if (!l && lessonList().length) continue;    // a lesson the catalog no longer has
    if (item.kind === 'new') await lessonNew(s, item.id, item.ctx);
    else await lessonLevel(s, item.id, item.kind, item.ctx);
  }
}


export function lessonNew(s, id, ctx) {
  const l = lessonInfo(id) || { id, by: 'papa', phrase: id, icon: '✨' };
  sfx('bell');
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'from' }, `${l.icon || '✨'} Nueva lección`),
    ctx ? h('div', { class: 'why' }, h('b', null, 'Por qué te llega ahora: '), fill(s, ctx)) : null,
    bubble(l.by, `“${fill(s, l.phrase)}”`),
    hasAudio(id) ? voicePlayer(id, { autoplay: true, label: `Escuchar a ${castName(s, l.by)}` }) : null,
    l.meaning ? h('p', { class: 'meaning' }, fill(s, l.meaning)) : null,
    l.tip ? nextTipBox(s, l.tip) : null,
    h('span', { class: 'tag new', style: { justifySelf: 'center' } }, '📖 Nueva carta en tu Libro de lecciones'),
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Lo tengo')),
  { label: 'Nueva lección' });
}

function lessonLevel(s, id, kind, ctx) {
  const l = lessonInfo(id) || { id, by: 'papa', phrase: id, icon: '✨' };
  const mastered = kind === 'mastered';
  const st = s.lessons?.[id];
  sfx(mastered ? 'fanfare' : 'good');
  if (mastered) confetti(1);
  const left = Math.max(0, 3 - (st?.applied || 1));
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'big-ic', 'aria-hidden': 'true' }, mastered ? '🥇' : '✅'),
    h('div', { class: 'from' }, mastered ? '¡Lección dominada!' : 'Lección aplicada'),
    h('div', { class: 'quote' }, `${l.icon || ''} “${fill(s, l.phrase)}”`),
    starRow(mastered ? 3 : 2),
    ctx ? h('div', { class: 'why good' }, h('b', null, 'Lo que hiciste: '), fill(s, ctx)) : null,
    h('p', { class: 'meaning' }, mastered
      ? 'La usaste 3 veces en momentos distintos. Tu carta ahora es dorada.'
      : `Usaste lo que aprendiste en una decisión de verdad. Úsala ${plural(left || 2, 'vez', 'veces')} más para dominarla.`),
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, mastered ? '¡Dorada! ⭐' : 'Seguir')),
  { label: mastered ? 'Lección dominada' : 'Lección aplicada' });
}

function rewardInfo(s, m) {
  const id = m.id || m.badge;
  const a = (progressMod()?.ACHIEVEMENTS || []).find((x) => x.id === id) || {};
  return { icon: m.icon || a.icon || '🏅', title: fill(s, m.title || a.title || id || 'Logro'), text: fill(s, m.text || m.desc || a.desc || '') };
}

function rewards(s, group) {
  sfx('fanfare');
  confetti(group.length > 1 ? 1.1 : 0.7);
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'big-ic', 'aria-hidden': 'true' }, '🎉'),
    h('h3', null, group.length > 1 ? '¡Nuevos logros!' : '¡Nuevo logro!'),
    h('div', { class: 'reward-list' }, group.map((m) => {
      const r = rewardInfo(s, m);
      return h('div', { class: 'reward' }, h('span', { class: 'ric', 'aria-hidden': 'true' }, r.icon),
        h('div', null, h('b', null, r.title), r.text ? h('small', null, r.text) : null));
    })),
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, '¡Genial!')),
  { label: 'Nuevos logros' });
}
