// Carta de la semana (DISENO §2.4): quién habla, el dilema, el 💡 tip antes de decidir (Prólogo y cap. 1:
// solo; desde el cap. 2: con 💡 Pista), el recordatorio si ya aprendió esa frase, y opciones grandes.
// Al elegir: ✅ porque… / 💡 La próxima vez… porque…, las métricas rebotan y habla quien sigue (card.after).
// Las audiciones (kind 'audition') muestran 3 fichas: retrato, nombre, su frase, lo que aporta y lo que cuesta.

import { h, money } from '../util.js';
import {
  mount, sfx, fill, bubble, scrollBehavior, remindBox, metricBar, tipBox, verdictBox, voicePlayer, hasAudio, castInfo, castName, art, hintMode,
} from './core.js';
import * as week from '../engine/week.js';
import { candidates } from '../engine/state.js';
import { LABELS } from '../data/chapters.js';
import { emo } from './photo.js';

const ROLE_ICON = { teclas: '🎹', bateria: '🥁', bajo: '🎸' };
const ROLES = ['teclas', 'bateria', 'bajo'];

const whoOf = (s, who) => (ROLES.includes(who) ? s.roles?.[who] || who : who || 'papa');

// "Toca exacto y organiza todo: con ella…" → "Toca exacto y organiza todo". Long ones are cut at a word
// with "…" (never at the first comma: "Cuando toca, …" alone means nothing).
const short = (t) => {
  const a = String(t || '').split(/[:;.]/)[0].trim();
  if (a.length <= 70) return a;
  const cut = a.slice(0, 66);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,\s]+$/, '')}…`;
};

function candId(c, o, i) {
  const e = o.effects || {};
  return o.cand || o.candidate || e.member?.id || (typeof e.member === 'string' ? e.member : null)
    || o.member?.id || candidates(c.role)[i]?.id || null;
}

function candFace(id) {
  const A = art();
  let m = null;
  try { m = A?.castSvg?.(id, { size: 76, glow: false }); } catch { m = null; }
  return m ? h('span', { class: 'cand-face', html: m, 'aria-hidden': 'true' })
    : h('span', { class: 'cand-face ini', 'aria-hidden': 'true' }, (castInfo(id).name || '?')[0]);
}

export function renderCard(s, ctx) {
  const c = week.currentCard(s);
  if (!c) { week.resolveCard(s, 0); ctx.save(); return ctx.refresh(); }
  const audition = c.kind === 'audition';
  const result = h('div', { class: 'stack', 'aria-live': 'polite' });
  // The 💡 steps back little by little: by itself (caps. 0–1), a button (caps. 2–3), only on new cards (cap. 4+).
  const mode = hintMode(s, !(s.seenCards || []).includes(c.id));
  let hintShown = mode === 'open';
  const tipSlot = h('div');
  const paintTip = () => tipSlot.replaceChildren(hintShown ? tipBox(c.tip) : h('button', {
    class: 'btn alt hint-btn', type: 'button', onclick: () => { sfx('tap'); hintShown = true; paintTip(); },
  }, emo('💡 Pista')));
  if (c.tip && mode !== 'none') paintTip();

  // Same 📖 Recuerda as the plan and the price: the phrase, who said it, and ▶ when Papá recorded it.
  const remind = (c.reminder?.id && remindBox(s, c.reminder.id)) || (c.reminder?.phrase ? h('div', { class: 'remind stack' },
    h('span', null, `📖 Recuerda: “${fill(s, c.reminder.phrase)}”`),
    c.reminder.by === 'papa' && hasAudio(c.reminder.id) ? voicePlayer(c.reminder.id) : null) : null);

  const bar = h('div', { class: 'mbar-wrap' }, metricBar(s, {}, { onNotebook: ctx.openNotebook }));
  let chosen = false;
  const buttons = [];

  // Options that cost money the band doesn't have yet: the engine marks them { disabled, reason } (week.currentCard).
  // They stay visible, greyed out, with a kind reason. If every option came disabled, none is (never a dead end).
  const allLocked = c.options.length > 0 && c.options.every((o) => o.disabled);
  const locked = (o) => !!o.disabled && !allLocked;
  const reasonOf = (o) => fill(s, o.reason || 'Todavía no les alcanza el dinero para esta.');

  const choose = (i) => {
    if (chosen || locked(c.options[i])) return;
    chosen = true;
    const before = { pagado: s.money.pagado, deuda: s.money.deuda, ahorro: s.money.ahorro, label: s.label };
    const res = week.resolveCard(s, i);
    ctx.save();
    if (res.verdict === 'good') sfx('good'); else sfx('tap');
    buttons.forEach((b, k) => { b.classList.add(k === i ? 'sel' : 'off'); b.disabled = true; b.setAttribute('aria-pressed', String(k === i)); });
    bar.replaceChildren(metricBar(s, res.deltas, { onNotebook: ctx.openNotebook }));
    const extra = [];
    const paid = s.money.pagado - before.pagado;
    if (paid > 0) extra.push(`🤝 Le pagaron ${money(paid)} a Papá. ${s.money.deuda ? `Faltan ${money(s.money.deuda)}.` : '¡Préstamo PAGADO!'}`);
    const saved = s.money.ahorro - before.ahorro;
    if (saved > 0) extra.push(`🐷 Ahorro: +${money(saved)}`);
    if (s.label && s.label !== before.label) {
      const L = LABELS[s.label];
      extra.push(`📝 Decidieron: ${L?.label || s.label}${L?.advance ? `. Adelanto: ${money(L.advance)}` : ''}`);
    }
    // resolveCard already fills the voice that speaks after the choice (option.after or card.after).
    const after = res.after || null;
    result.replaceChildren(...[
      verdictBox(res),
      extra.length ? h('div', { class: 'box small' }, extra.map((t) => h('span', null, emo(t)))) : null,
      after?.text ? bubble(whoOf(s, after.who || c.who), after.text, { right: after.who === 'me' }) : null,
      h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); ctx.refresh(); } }, emo(s.phase === 'scene' ? 'Seguir ▶' : '🎤 Preparar el show ▶'))].filter(Boolean));
    result.scrollIntoView?.({ behavior: scrollBehavior(), block: 'nearest' });
  };

  let options;
  if (audition) {
    options = h('div', { class: 'cands' }, c.options.map((o, i) => {
      const id = candId(c, o, i);
      const info = id ? castInfo(id) : {};
      const off = locked(o);
      const b = h('button', {
        class: `cand${off ? ' locked' : ''}`, type: 'button', 'aria-pressed': 'false', disabled: off || null, onclick: () => choose(i),
      },
        id ? candFace(id) : null,
        h('span', { class: 'cand-txt' },
          h('b', null, fill(s, info.name || o.label)),
          info.line ? h('i', { class: 'small' }, `“${fill(s, info.line)}”`) : null,
          info.pro ? h('span', { class: 'small' }, `👍 ${short(info.pro)}`) : null,
          info.con ? h('span', { class: 'small' }, `👎 ${short(info.con)}`) : null,
          off ? h('span', { class: 'small opt-why' }, `🐷 ${reasonOf(o)}`) : null));
      buttons.push(b);
      return b;
    }));
  } else {
    options = h('div', { class: 'opts' }, c.options.map((o, i) => {
      const off = locked(o);
      const b = h('button', {
        class: `opt${off ? ' locked' : ''}`, type: 'button', 'aria-pressed': 'false', disabled: off || null, onclick: () => choose(i),
      }, off ? h('span', { class: 'opt-txt' }, h('span', null, emo(fill(s, o.label))), h('span', { class: 'small opt-why' }, `🐷 ${reasonOf(o)}`))
        : emo(fill(s, o.label)));
      buttons.push(b);
      return b;
    }));
  }

  mount(h('div', { class: 'page card-page' },
    bar,
    h('div', { class: 'cols' },
      h('div', { class: `stack dl-card${audition ? ' dl-aud' : ''}` },
        h('p', { class: 'eyebrow' }, audition ? `${ROLE_ICON[c.role] || '🎶'} Audición` : '📩 Carta de la semana'),
        h('h2', null, fill(s, c.title)),
        audition ? null : bubble(whoOf(s, c.who), c.text, { name: castName(s, whoOf(s, c.who)) }),
        remind),
      h('div', { class: 'stack' },
        tipSlot,
        audition ? h('b', null, '¿A quién eligen?') : null,
        options,
        result))));
}
