// Cierre de la semana (DISENO §2.7), one step at a time:
//   1. 📸 Foto de la noche   2. ✅ ⚠️ 🌤️ (cadenas de explain)   3. 📒 Motivación (contra ella misma)
//   4. 🪙 Monedas → 3 frascos (💰 Caja · 🐷 Ahorro para la meta · 🤝 Pagar a Papá) → week.closeWeek(s, split)
//   5. 🎤 Karaoke ocasional   6. Pendientes (lecciones y ¡Nuevos logros!)   7. Adelanto + "Guardar y terminar la semana"
// The photo of the night is {hermana}'s photo of this show (photo.js: the same one that goes to the album). At the end
// of the week, before saving, a small "📸 {hermana} tomó una foto" card opens the album (album.js): looking back at
// the photo is a calm way to end the session, and it doesn't compete with the show's numbers at the start.
// If closeWeek leaves s.phase in 'milestone' | 'pause' | 'end', main.js routes (we save and refresh).

import { h, money, num, plural } from '../util.js';
import {
  mount, artReady, lessonsReady, sfx, toast, confetti, metricBar, tipBox, nextTipBox, fill, scrollBehavior,
} from './core.js';
import { drainInbox } from './inbox.js';
import { karaoke, karaokeIds } from './book.js';
import * as week from '../engine/week.js';
import { goals } from '../engine/progress.js';
import { sceneNode } from './prep.js';
import { photoSvg, photoImg, photoTitle, photoAlt, photoOf, emo } from './photo.js';
import { albumModal } from './album.js';

const ROUTED = new Set(['milestone', 'pause', 'end']);
const TONE = { good: { cls: 'g', ic: '✅' }, bad: { cls: 'w', ic: '⚠️' }, neutral: { cls: 's', ic: '🌤️' } };
// Papá's rule 17: the three full headings, so she knows 🌤️ means "this was not on you".
const LABEL = { good: '✅ Lo que salió bien', bad: '⚠️ Lo que puedes mejorar', neutral: '🌤️ Lo que no dependía de ti' };
const COIN_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
const MAX_COINS = 20;

// Which metric a chain moved, from its words (for the little badge).
export function metricOf(chain) {
  const t = (chain.steps || []).join(' ').toLowerCase();
  if (/\$|caja|sombrero|ahorro|regal|papá|pag/.test(t)) return '💰';
  if (/fan|persona|vinieron|público|agotado|lugares/.test(t)) return '⭐';
  if (/ánimo|cansad|energía|descans/.test(t)) return '💛';
  if (/talento|ensay|precisión|calidad|nota/.test(t)) return '🎸';
  return '🎶';
}

// The coins of this week: what came in minus the weekly costs, never more than what the box can give.
export function coinPlan(s) {
  const p = week.closePreview(s);
  const pool = Math.max(0, Math.min(p.free, p.income - p.weekly));
  const coin = COIN_STEPS.find((c) => pool / c <= MAX_COINS) || COIN_STEPS[COIN_STEPS.length - 1];
  const coins = Math.floor(pool / coin);
  return { ...p, pool, coin, coins, rest: pool - coins * coin };
}

// 💡 Suggested split for the goal of the chapter, keeping next week's costs in the box.
export function suggestSplit(s, plan) {
  const { coin, coins, weekly, caja, pool, deuda } = plan;
  const g = goals(s).find((x) => x.money && !x.done);
  const papaGoal = g && (g.id === 'pago' || g.id === 'papa');
  const saveGoal = (g && g.id === 'ahorro') || (s.chapter === 3 && !s.recorded?.length);
  const other = Math.max(0, caja - weekly - pool);          // stays in the box anyway
  const reserve = Math.min(coins, Math.ceil(Math.max(0, weekly - other) / coin));
  const free = coins - reserve;
  const papaCap = Math.ceil(deuda / coin);   // the last coin can pay less: closeWeek leaves the change in the box
  let papa = 0, ahorro = 0, target = null, left = 0;
  if (papaGoal) {
    left = Math.max(0, g.need - g.have);
    papa = Math.min(papaCap, Math.ceil(left / coin), Math.ceil(free * 0.7));
    target = 'papa';
  } else if (saveGoal) {
    left = g?.id === 'ahorro' ? Math.max(0, g.need - g.have) : Math.max(0, 3000 - s.money.ahorro);
    ahorro = Math.min(Math.ceil(left / coin), Math.ceil(free * 0.7));
    target = 'ahorro';
  } else {
    ahorro = Math.round(free * 0.3);
    papa = Math.min(papaCap, Math.round(free * 0.2));
  }
  return { caja: coins - papa - ahorro, ahorro, papa, target, left, goal: g || null };
}

const JARS = [
  { k: 'caja', ic: '💰', name: 'Caja' },
  { k: 'ahorro', ic: '🐷', name: 'Ahorro para la meta' },
  { k: 'papa', ic: '🤝', name: 'Pagar a Papá' },
];

export async function renderClose(s, ctx = {}) {
  await Promise.all([artReady, lessonsReady]);
  const r = s.last && s.last.week === s.week ? s.last : null;
  const look = { preview: null, result: null, closed: false };
  // The engine picks the 📒 message before the piggy banks and closeWeek reuses the same one.
  try { look.preview = week.closePreview(s).motivation || null; } catch (e) { console.warn('[close] motivation', e); }

  const top = h('div');
  const left = h('div', { class: 'sh-left' });
  const right = h('div', { class: 'sh-right stack' });
  const page = h('div', { class: 'page sh-page sh-close' }, top, h('div', { class: 'sh-cols' }, left, right));
  const bar = (d = {}) => top.replaceChildren(metricBar(s, d, { onNotebook: ctx.openNotebook }));

  // Foto de la noche ({hermana}'s photo of this show, photo.js), on the left on the Mac.
  const shot = r ? showEntry(s, r) : null;
  if (r) {
    const sister = fill(s, '{hermana}');
    left.append(h('figure', { class: 'sh-photo' },
      nightPhoto(s, r, shot),
      h('figcaption', null,
        h('span', null, `📸 ${sister}`),
        h('span', null, `Semana ${r.week} · ${r.venueName}`),
        h('b', { class: 'sh-plus' }, `+${num(r.newFans)} ⭐`))));
  }
  mount(page);

  const steps = [];
  if (r) steps.push(photoStep, chainsStep);
  if (look.preview) steps.push(motivStep);
  steps.push(coinsStep);
  let i = 0;
  const next = () => { i += 1; run(); };
  const run = () => {
    page.dataset.step = String(i);
    page.classList.toggle('sh-after-photo', i > 0);
    if (i < steps.length) steps[i]();
  };
  bar(r ? { fans: r.newFans, caja: r.earned, mood: r.moodDelta } : {});
  run();

  function setRight(...nodes) {
    right.replaceChildren(...nodes.flat().filter(Boolean));
    right.querySelector('.btn')?.focus?.({ preventScroll: true });
    if (i > 0) window.scrollTo?.({ top: 0, behavior: scrollBehavior() });
  }

  function photoStep() {
    sfx('cheer');
    if (r.soldOut) confetti(0.8);
    const full = r.attendance / Math.max(1, r.cap);
    const cheer = r.soldOut ? '¡AGOTADO!' : full >= 0.7 ? '¡Casi lleno!' : r.attendance > 0 ? '¡Cada persona cuenta!' : '¡Tocaron con todo!';
    setRight(
      h('h2', null, cheer),
      h('div', { class: 'sh-big num' },
        h('span', null, emo(`🧍 ${num(r.attendance)} de ${num(r.cap)}`)),
        h('span', null, emo(`⭐ +${plural(r.newFans, 'fan', 'fans')}`)),
        h('span', null, emo(`💰 ${r.earned >= 0 ? '+' : ''}${money(r.earned)}`))),
      r.comments?.[0] ? h('p', { class: 'sh-comment' }, `💬 “${r.comments[0]}”`) : null,
      h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); next(); } }, '¿Qué pasó? 👀'));
  }

  function chainsStep() {
    const by = (t, n) => (r.chains || []).filter((c) => c.tone === t).slice(0, n);
    // Always the three: ✅ what went well · ⚠️ what to improve (if any) · 🌤️ what didn't depend on her.
    const bad = by('bad', 1);
    const neutral = by('neutral', 1);
    const list = [...by('good', bad.length ? 1 : 2), ...bad,
      ...(neutral.length ? neutral : [{ tone: 'neutral', steps: ['Esta semana todo dependió de ustedes'], calm: true }])];
    const nxt = list.find((c) => c.tone === 'bad' && c.next)?.next;
    setRight(
      h('h2', null, 'Lo que pasó'),
      h('div', { class: 'close3' }, list.length ? list.map((c, k) => {
        const tone = LABEL[c.tone] ? c.tone : 'neutral';
        // One heading per tone (two ✅ in a row share the first one).
        const head = k === 0 || list[k - 1].tone !== c.tone ? h('b', { class: 'sh-tone' }, LABEL[tone]) : null;
        return [head, h('div', { class: `${TONE[tone].cls} sh-chain` },
          h('span', { class: 'sh-m', 'aria-hidden': 'true' }, c.calm ? '💪' : metricOf(c)),
          h('span', null, c.steps.map((x) => fill(s, x)).join(' → ')))];
      }) : [h('b', { class: 'sh-tone' }, LABEL.good), h('div', { class: 'g sh-chain' }, 'Tocaron su show completo.')]),
      nxt ? nextTipBox(s, nxt) : null,
      // A new lesson from the show arrives here: after the photo and what happened, before the coins (DISENO §2.7).
      h('button', { class: 'btn big block', type: 'button', onclick: async (e) => {
        sfx('tap');
        e.currentTarget.disabled = true;
        try { await drainInbox(s, () => ctx.save?.()); } catch (err) { console.warn('[close] inbox', err); }
        next();
      } }, 'Seguir'));
  }

  function motivStep() {
    const t = look.preview;
    const m = t.match(/^([A-ZÁÉÍÓÚÑ ]+):\s*([\s\S]*)$/u);
    setRight(
      h('h2', null, emo('📒 Así vas')),
      h('div', { class: 'card sh-motiv' }, m ? [h('b', null, m[1].trim().split(/\s+/).map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')), h('span', null, m[2])] : t),
      h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); next(); } }, 'Repartir las monedas 🪙'));
  }

  function coinsStep() {
    const plan = coinPlan(s);
    if (plan.coins <= 0) {
      setRight(
        h('h2', null, emo('🪙 Las monedas')),
        h('div', { class: 'card' }, plan.weekly
          ? `Esta semana los gastos (${money(plan.weekly)}) se llevaron las monedas. ¡El próximo show suma!`
          : 'Esta semana no hubo monedas para repartir. ¡El próximo show suma!'),
        h('button', { class: 'btn big block', type: 'button', onclick: () => doClose({}) }, 'Seguir'));
      return;
    }
    const sug = suggestSplit(s, plan);
    const jar = { caja: 0, ahorro: 0, papa: 0 };
    const papaCap = Math.ceil(plan.deuda / plan.coin);
    const pesos = (k) => (k === 'papa' ? Math.min(plan.deuda, jar.papa * plan.coin) : jar[k] * plan.coin + (k === 'caja' ? plan.rest + jar.papa * plan.coin - Math.min(plan.deuda, jar.papa * plan.coin) : 0));
    // What came in this week (show + jobs + card + royalties), minus the weekly costs.
    const head = h('div', { class: 'sh-sum num' }, plan.weekly
      ? `Entraron ${money(plan.income)} − 🚌 gastos ${money(plan.weekly)} = ` : `Entraron ${money(plan.income)} = `, h('b', null, `${money(plan.pool)} 🪙`));
    const tray = h('div', { class: 'sh-tray', 'aria-label': 'Monedas por repartir' });
    const jarsBox = h('div', { class: 'pigs sh-jars' });
    const total = h('p', { class: 'small muted center' });
    const sugText = sug.target === 'papa'
      ? `💡 Meta del capítulo: ${sug.goal?.need ? `pagarle ${money(sug.goal.need)} a Papá` : 'pagarle a Papá'} (faltan ${money(sug.left)}). Prueba ${sug.papa} 🪙 a 🤝 y las demás a 💰 para los gastos.`
      : sug.target === 'ahorro'
        ? `💡 Meta del capítulo: ${sug.goal?.need ? `ahorrar ${money(sug.goal.need)}` : 'ahorrar'} (faltan ${money(sug.left)}). Prueba ${sug.ahorro} 🪙 a 🐷 y las demás a 💰 para los gastos.`
        : `💡 Deja ${sug.caja} 🪙 en 💰 para los gastos y reparte las demás.`;

    const inTray = () => plan.coins - jar.caja - jar.ahorro - jar.papa;
    const can = (k) => inTray() > 0 && (k !== 'papa' || jar.papa < papaCap);
    // from: where the coin starts (a rect) for the little flight into the jar; null = it was dropped right there.
    const add = (k, n = 1, from = tray.querySelector('.sh-coin')?.getBoundingClientRect()) => {
      if (!can(k)) return false;
      jar[k] += n; sfx('coin'); paint(); flyCoin(from, k); return true;
    };
    // A coin flies (≈0.36 s) into the jar and the jar wobbles. Pure decoration: pointer-events none, nothing waits
    // for it, and with "reducir movimiento" there is neither.
    function flyCoin(from, k) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const target = () => jarsBox.querySelector(`.pig[data-k="${k}"] .jar`);
      const wobble = () => { const j = target(); if (!j) return; j.classList.remove('wk-wobble'); void j.offsetWidth; j.classList.add('wk-wobble'); };
      const to = target()?.getBoundingClientRect();
      if (!from || !to || !from.width || typeof document.body.animate !== 'function') { wobble(); return; }
      const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
      const dx = to.left + to.width / 2 - x0, dy = to.top + to.height * 0.35 - y0;
      const c = h('span', { class: 'sh-fly', 'aria-hidden': 'true', style: { left: `${x0}px`, top: `${y0}px` } });
      document.body.append(c);
      const a = c.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - 46}px)) scale(1.08) rotate(160deg)`, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55) rotate(320deg)`, opacity: 0.9 },
      ], { duration: 360, easing: 'cubic-bezier(.35, 0, .45, 1)' });
      const done = () => { c.remove(); wobble(); };
      a.onfinish = done; a.oncancel = done;
    }
    const sub = (k) => { if (jar[k] <= 0) return; jar[k] -= 1; sfx('tap'); paint(); };

    let drag = null;
    let shone = false;   // the goal jar's shine plays once, the first time it reaches the chapter goal
    function coinNode(idx) {
      const c = h('button', { class: 'sh-coin', type: 'button', 'aria-label': `Moneda de ${money(plan.coin)}`, 'data-i': String(idx) }, '🪙');
      c.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        drag = { el: c, x: e.clientX, y: e.clientY, moved: false, ghost: null };
        try { c.setPointerCapture?.(e.pointerId); } catch { /* synthetic or gone pointer */ }
      });
      c.addEventListener('pointermove', (e) => {
        if (!drag || drag.el !== c) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
          drag.moved = true;
          drag.ghost = h('span', { class: 'sh-ghost', 'aria-hidden': 'true' }, '🪙');
          document.body.append(drag.ghost);
          c.classList.add('lift');
        }
        if (drag.ghost) {
          drag.ghost.style.left = `${e.clientX}px`;
          drag.ghost.style.top = `${e.clientY}px`;
          jarsBox.querySelectorAll('.pig').forEach((p) => p.classList.remove('sel'));
          hoverJar(e)?.classList.add('sel');
        }
      });
      const end = (e) => {
        if (!drag || drag.el !== c) return;
        const target = drag.moved ? hoverJar(e) : null;
        drag.ghost?.remove();
        c.classList.remove('lift');
        jarsBox.querySelectorAll('.pig').forEach((p) => p.classList.remove('sel'));
        const wasTap = !drag.moved;
        drag = null;
        const from = wasTap ? c.getBoundingClientRect() : null;
        if (target) add(target.dataset.k, 1, null);
        else if (wasTap) add(firstOpen(), 1, from);   // a tap moves one coin to the next jar that needs it
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', () => { drag?.ghost?.remove(); drag = null; c.classList.remove('lift'); });
      return c;
    }
    function hoverJar(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      return el?.closest?.('.sh-jars .pig') || null;
    }
    // Tap on a coin: follows the suggestion first, then the box.
    function firstOpen() {
      for (const k of ['papa', 'ahorro', 'caja']) if (jar[k] < sug[k] && can(k)) return k;
      return 'caja';
    }

    function paint() {
      const n = inTray();
      tray.replaceChildren(...(n ? Array.from({ length: n }, (_, k) => coinNode(k)) : [h('span', { class: 'muted small' }, '¡Listo! Todas repartidas.')]));
      jarsBox.replaceChildren(...JARS.map((J) => {
        const v = pesos(J.k);
        const fillPct = Math.round((100 * jar[J.k]) / Math.max(1, plan.coins));
        const closedPapa = J.k === 'papa' && papaCap <= 0;
        const note = J.k === 'papa'
          ? (plan.deuda <= 0 ? '¡PAGADO!' : `faltan ${money(Math.max(0, plan.deuda - v))}`)
          : J.k === 'ahorro' ? `van ${money(s.money.ahorro + v)}` : `quedan ${money(Math.max(0, plan.caja - plan.weekly - plan.pool) + v)}`;
        // The jar of the chapter goal lights up when its coins cover what was missing (static glow + one shine).
        const reached = sug.target === J.k && sug.left > 0 && v >= sug.left;
        const shine = reached && !shone;
        if (shine) shone = true;
        return h('div', { class: `pig sh-pig ${sug.target === J.k ? 'sh-goal' : ''}${reached ? ' wk-reached' : ''}${shine ? ' wk-shine' : ''}`, 'data-k': J.k },
          h('button', {
            class: 'sh-jar-btn', type: 'button', disabled: closedPapa || !can(J.k),
            'aria-label': `Poner una moneda en ${J.name}. Lleva ${money(v)}`, onclick: () => add(J.k),
          },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, J.ic),
          h('span', { class: 'jar', 'aria-hidden': 'true' }, h('span', { style: { height: `${fillPct}%` } })),
          h('small', null, J.name),
          h('b', null, `+${money(v)}`)),
          h('small', null, note),
          h('div', { class: 'pm' }, h('button', { type: 'button', 'aria-label': `Sacar una moneda de ${J.name}`, disabled: jar[J.k] <= 0, onclick: () => sub(J.k) }, '−')));
      }));
      total.textContent = n ? `Arrastra cada 🪙 o toca un frasco. Las que sobren se quedan en 💰 Caja.` : 'Caja + Ahorro + Papá = ' + money(plan.pool);
    }
    paint();

    const useSug = h('button', {
      class: 'btn alt block', type: 'button',
      onclick: () => { jar.caja = 0; jar.ahorro = 0; jar.papa = 0; jar.papa = Math.min(sug.papa, papaCap); jar.ahorro = sug.ahorro; jar.caja = plan.coins - jar.papa - jar.ahorro; sfx('coin'); paint(); },
    }, emo('💡 Usar la sugerencia'));
    const ok = h('button', {
      class: 'btn big block', type: 'button',
      onclick: () => {
        const leftover = inTray();
        doClose({ caja: pesos('caja') + leftover * plan.coin, ahorro: pesos('ahorro'), papa: pesos('papa') });
      },
    }, emo('🐷 Guardar en los frascos'));
    setRight(h('h2', null, emo('🪙 Reparte las monedas')), head, tipBox(sugText), tray, jarsBox, total, useSug, ok);
  }

  function doClose(split) {
    if (look.closed) return;
    look.closed = true;
    const res = week.closeWeek(s, split);
    look.result = res;
    // Logros y récord: closeWeek already put them in s.inbox as { kind: 'badge', id }; inbox.js groups them.
    sfx('coin');
    ctx.save?.();
    if (ROUTED.has(s.phase)) { ctx.refresh?.(res); return; }
    afterClose(res);
  }

  async function afterClose(res) {
    bar({});
    // 5. Karaoke ocasional (más o menos cada 2 semanas, con 2 o más frases descubiertas).
    if (res.week % 2 === 0 && karaokeIds(s).length >= 2) {
      await new Promise((resolve) => {
        const k = karaoke(s, () => resolve());
        if (!k) { resolve(); return; }
        const skip = h('button', { class: 'btn ghost block', type: 'button', onclick: () => resolve() }, 'Saltar');
        k.addEventListener('karaoke:done', () => { skip.hidden = true; });
        setRight(k, skip);
      });
    }
    // 6. Pendientes: lecciones nuevas y ¡Nuevos logros!
    setRight(h('p', { class: 'muted center' }, '🎶'));
    await drainInbox(s, () => ctx.save?.());
    ctx.save?.();
    teaserStep(res);
  }

  function teaserStep(res) {
    const extra = res.motivation && res.motivation !== look.preview ? res.motivation : null;
    const good = (r?.quality ?? 0) >= 0.6;
    setRight(
      h('h2', null, emo('🔭 La próxima semana')),
      h('div', { class: 'card sh-teaser' }, fill(s, res.teaser || '')),
      extra ? h('div', { class: 'card sh-motiv' }, extra) : null,
      streamsBox(s, res),
      shot ? tookCard(s, shot) : null,
      h('div', { class: 'sh-sum num small' },
        `💰 ${money(res.money.caja)} · 🐷 ${money(res.money.ahorro)} · 🤝 ${res.money.deuda > 0 ? `faltan ${money(res.money.deuda)}` : '¡PAGADO!'}`),
      h('button', {
        class: 'btn big block', type: 'button',
        onclick: () => {
          sfx('good');
          ctx.save?.();
          toast(good ? 'Gran show. Buen momento para descansar 🎶' : 'Buena semana. Buen momento para descansar 🎶', 3600);
          ctx.goHome?.();
        },
      }, emo('💾 Guardar y terminar la semana')));
  }
}

// This show's line in s.history (it carries the photo: { moment, seed, band }).
const showEntry = (s, r) => [...(s.history || [])].reverse().find((e) => e.week === r.week && e.venue === r.venue) || null;

// The photo of the night without the polaroid border (the .sh-photo figure is the frame). Falls back to the scene.
function nightPhoto(s, r, e) {
  const svg = e ? safe(() => photoSvg(s, e, { frame: false })) : '';
  if (!svg) return sceneNode(s, { venueId: r.venue, count: r.attendance, cap: r.cap, lit: r.quality >= 0.6 });
  return h('div', { class: 'sh-scene' }, photoImg(svg, { alt: photoAlt(s, e) }));
}
const safe = (fn) => { try { return fn(); } catch (err) { console.warn('[close] foto', err); return ''; } };

// 📸 "{hermana} tomó una foto": the polaroid (tap → big) and a button to the album, at the end of the week.
function tookCard(s, e) {
  const svg = safe(() => photoSvg(s, e, { size: 'thumb' }));
  if (!svg) return null;
  const p = photoOf(s, e);
  const open = (opts) => { sfx('tap'); albumModal(s, opts); };
  return h('div', { class: 'card al-took' },
    h('button', { class: 'al-took-pic', type: 'button', 'aria-label': `Ver en grande: ${photoTitle(s, e, p)}`, onclick: () => open({ open: e }) },
      photoImg(svg, { alt: '' })),
    h('div', { class: 'al-took-txt' },
      h('b', null, emo(fill(s, '📸 {hermana} tomó una foto'))),
      h('span', { class: 'small' }, `“${photoTitle(s, e, p)}” ya está en su álbum.`),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => open({}) }, emo('📖 Ver el álbum'))));
}

// ▶️ Once a song is recorded: this week's plays and the royalties that came in by themselves (cap. 3+).
function streamsBox(s, res) {
  const plays = res?.streamsWeek || 0;
  if (!plays && !(s.recorded || []).length) return null;
  const roy = res?.royalties || 0;
  return h('div', { class: 'box sh-streams small num' },
    h('span', null, `▶️ Esta semana escucharon sus canciones ${plural(plays, 'vez', 'veces')}. En total: ${num(s.streams || 0)}.`),
    roy > 0 ? h('span', null, `🎵 Regalías: +${money(roy)} solitas en la 💰 caja.`) : null,
    s.chapter <= 4 ? h('span', { class: 'muted' }, 'Regalías: lo que te pagan cada vez que alguien escucha tu canción.') : null);
}

// Same numbers as the screen, for QA: the coins and the suggested split in pesos.
export function suggestedPesos(s) {
  const plan = coinPlan(s);
  const sg = suggestSplit(s, plan);
  const papa = Math.min(plan.deuda, sg.papa * plan.coin);
  const ahorro = sg.ahorro * plan.coin;
  return { plan, split: { caja: plan.pool - ahorro - papa, ahorro, papa } };
}

