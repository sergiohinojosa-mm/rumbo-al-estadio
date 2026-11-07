// Cause → effect chains for the show and the week, with the numbers of her game:
//   ✅ good  "Ensayaste 2 tardes → el show sonó muy bien → 14 fans nuevos"
//   ⚠️ bad   lo que puede mejorar, siempre con su 💡 La próxima vez (chain.next)
//   🌤️ neutral  lo que no dependía de ella
// Same pattern as La Directora's explain(): { tone, steps } plus `next` and a weight `w` for ordering.
// Also: motivation (only against herself, HISTORIA §5), the teaser of next week and fan comments, chosen from the
// templates of data/motivation.js (they name the band members she really chose).
import { money, plural, num, rng } from '../util.js';
import { CHAPTERS, chapterOf } from '../data/chapters.js';
import { VENUES } from '../data/venues.js';
import { fillText } from './state.js';
import { messages, facts, say } from '../data/motivation.js';

// {nombre}, {banda}, {hermana}, {cancion1}, {teclas}, {bateria}, {bajo} → her names (state.fillText).
export const fill = fillText;

const plays = (n) => `${num(n)}${n >= 1e6 ? ' de' : ''} reproducciones`;
const count = (plan, id) => plan.filter((p) => p.id === id).length;
// El plan son 3 tardes (lunes, miércoles y viernes): siempre "tardes", nunca "días seguidos".
const days = (n) => plural(n, 'tarde', 'tardes');
// Sin porcentajes ni "calidad" (no es una de sus 4 métricas): cómo sonó el show, en palabras.
export const sono = (q) => (q >= 0.8 ? 'increíble' : q >= 0.6 ? 'muy bien' : q >= 0.45 ? 'bien' : 'apagadito');
// El lugar con su artículo, a media frase: "en la cochera", "a la Arena" (venues.js: en).
const enLugar = (v) => v?.en || v?.name || 'el show';
const cap1 = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);

function order(chains, max = { good: 3, bad: 2, neutral: 2 }) {
  const out = [];
  for (const tone of ['good', 'bad', 'neutral']) {
    out.push(...chains.filter((c) => c.tone === tone).sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, max[tone]));
  }
  return out.map(({ w, ...c }) => c);
}

// r: the show result being built (attendance, cap, newFans, quality, earned, …) and ctx with the inputs.
export function showChains(s, r, v) {
  const plan = s.week$.plan;
  const rehearsed = count(plan, 'ensayar');
  const promoted = count(plan, 'promover');
  const rested = count(plan, 'descansar');
  const c = [];
  const door = v.pay.type === 'door';
  const fair = v.fairPrice || 0;

  // ✅ Wins
  if (rehearsed && r.quality >= 0.55) {
    c.push({ tone: 'good', w: 5, steps: [`Ensayaste ${days(rehearsed)}`, `el show sonó ${sono(r.quality)}`, plural(r.newFans, 'fan nuevo', 'fans nuevos')] });
  }
  if (promoted && r.promoPeople > 0) {
    c.push({ tone: 'good', w: 4, steps: [`Promoviste ${days(promoted)}`, `${plural(r.promoPeople, 'persona más se enteró', 'personas más se enteraron')}`, `vinieron ${num(r.attendance)}`] });
  }
  if (r.soldOut && r.cap >= 20) {
    c.push({ tone: 'good', w: 6, steps: [door && r.price >= fair * 0.9 ? `Boleto justo de ${money(r.price)}` : r.promoPeople > 0 ? `${v.name} con buena promoción` : `${v.name} con buena fama`, `${num(r.attendance)} de ${num(r.cap)} lugares`, '¡AGOTADO!'] });
  }
  if (r.own > 0 && r.own >= r.setSize / 2) {
    c.push({ tone: 'good', w: 3, steps: [`${plural(r.own, 'canción propia', 'canciones propias')} en el setlist`, 'la gente se acuerda de quién es la canción', `sonó ${sono(r.quality)}`] });
  }
  if (rested && r.moodBefore >= 70) {
    c.push({ tone: 'good', w: 2, steps: [`Descansaste ${days(rested)}`, `ánimo en ${r.moodBefore}`, 'tocaron con energía'] });
  }
  if (r.accuracy >= 0.85) {
    c.push({ tone: 'good', w: 2, steps: ['Casi no se te escapó ninguna nota', 'el show sonó parejo', `${plural(r.newFans, 'fan nuevo', 'fans nuevos')}`] });
  }
  if (v.pay.type === 'hat' && r.earned > 0) {
    c.push({ tone: 'good', w: 1, steps: [`Pasaron el sombrero con ${plural(r.attendance, 'persona', 'personas')}`, `sonó ${sono(r.quality)}`, `${money(r.earned)} para la caja`] });
  }
  if (v.pay.type === 'fixed') {
    c.push({ tone: 'good', w: 1, steps: ['Fiesta con pago fijo', `${money(r.earned)} seguros`, 'la caja respira'] });
  }

  // ⚠️ What to improve (each one with its 💡)
  if (planStreak(plan) >= 3 && r.moodBefore < 70) {
    c.push({ tone: 'bad', w: 4, key: 'racha', steps: ['Las tres tardes trabajando, sin descanso', `ánimo en ${r.moodBefore} al subir al escenario`, `el show sonó ${sono(r.quality)}`],
      next: '💡 La próxima vez, después de dos tardes de trabajo mete una de descanso, porque descansar también es ensayar.' });
  }
  if (r.moodBefore < 40) {
    c.push({ tone: 'bad', w: 6, key: 'animo', steps: [`Ánimo en ${r.moodBefore}`, 'tocaron sin energía', `el show sonó ${sono(r.quality)}`],
      next: '💡 La próxima vez, mete una tarde de descanso antes del show, porque con el ánimo bajo el show suena apagado.' });
  }
  if (!rehearsed && s.m.talent < 70 && r.quality < 0.6) {
    c.push({ tone: 'bad', w: 4, key: 'ensayo', steps: ['No ensayaron esta semana', `talento en ${s.m.talent}`, `el show sonó ${sono(r.quality)}`],
      next: '💡 La próxima vez, ensaya al menos una tarde, porque el talento es casi la mitad de lo bien que suena el show.' });
  }
  if (r.covers > r.setSize / 2) {
    c.push({ tone: 'bad', w: 4, steps: [`${plural(r.covers, 'cover', 'covers')} en el setlist`, 'la gente no sabe de quién es la canción', `solo ${plural(r.newFans, 'fan nuevo', 'fans nuevos')}`],
      next: '💡 La próxima vez, compón una canción nueva, porque una canción propia suena más a ustedes que un cover.' });
  }
  if (door && r.price > fair * 1.15 && !r.soldOut) {
    c.push({ tone: 'bad', w: 5, key: 'precio', steps: [`Boleto de ${money(r.price)} (el justo es como ${money(fair)})`, `vinieron ${num(r.attendance)} de ${num(r.cap)}`, `con precio justo venían unas ${num(r.fairAttendance)}`],
      next: `💡 La próxima vez, pon el boleto cerca de ${money(fair)}, porque un boleto caro deja gente en su casa.` });
  }
  if (door && r.soldOut && r.demand > r.cap * 1.25 && r.price < fair) {
    c.push({ tone: 'bad', w: 3, steps: [`Boleto de ${money(r.price)} y se llenó`, `${plural(Math.round(r.demand - r.cap), 'persona se quedó', 'personas se quedaron')} afuera`, `con ${money(fair)} igual se llenaba`],
      next: '💡 La próxima vez, si el lugar se llena con mucha gente afuera, cobra el precio justo, porque igual se llena.' });
  }
  // Only when it really left people at home: with the place AGOTADO, "hoy vinieron menos" would contradict the ✅.
  if (r.anchorHit && !r.soldOut) {
    c.push({ tone: 'bad', w: 5, key: 'precio', steps: ['Hace poco bajaron mucho el boleto', 'la gente se acostumbró al precio bajo', `vinieron ${num(r.attendance)} de ${num(r.cap)}`],
      next: '💡 La próxima vez, piensa antes de bajar mucho el boleto, porque volver a subirlo cuesta trabajo.' });
  }
  if (r.cap > 20 && r.attendance < r.cap * 0.4) {
    c.push({ tone: 'bad', w: 5, steps: [`Vinieron ${num(r.attendance)} a un lugar de ${num(r.cap)}`, 'se vio vacío', v.cost ? `la renta de ${money(v.cost)} costó lo mismo` : 'pocos fans nuevos'],
      next: '💡 La próxima vez, llena primero un lugar más chico, porque un lugar lleno se siente mejor que uno vacío.' });
  }
  if (r.earned < 0) {
    c.push({ tone: 'bad', w: 7, steps: [`${v.city ? 'Viáticos' : 'Renta y producción'}: ${money(v.cost)}`, `boletos: ${money(r.gross)}`, `perdieron ${money(-r.earned)}`],
      next: '💡 La próxima vez, mira cuántos "llegarían" antes de elegir el lugar, porque la renta se paga aunque llegue poca gente.' });
  }
  if (r.soldOut && r.newcomers < r.cap * 0.25 && r.cap >= 20 && r.cap < 10000 && !v.city) {
    c.push({ tone: 'bad', w: 3, steps: [`${cap1(enLugar(v))} se llenó con sus fans`, `solo ${plural(r.newcomers, 'persona nueva', 'personas nuevas')}`, 'casi no hubo fans nuevos'],
      next: '💡 La próxima vez, busquen un lugar más grande, porque sus fans ya no dejan lugar para gente nueva.' });
  }
  if (r.accuracy < 0.6) {
    c.push({ tone: 'bad', w: 2, steps: ['Se te escaparon varias notas en vivo', 'el show sonó un poquito menos'],
      next: '💡 La próxima vez, ensaya la canción despacito antes del show, porque así los dedos se la aprenden.' });
  }

  // 🌤️ What didn't depend on her
  if (s.chapter === 0 && v.id === 'cochera') {
    c.push({ tone: 'good', w: 7, steps: ['Primer show en la cochera', 'Mamá, Juju y Señor Brillitos en sus sillas', `¡${plural(r.newFans, 'fan', 'fans')}!`] });
  }
  if (r.walkIns > 0 && v.reach > 0 && !['cochera', 'cumple'].includes(v.id)) {
    c.push({ tone: 'neutral', w: 2, steps: [`${plural(Math.round(r.walkIns), 'persona pasaba', 'personas pasaban')} por ${enLugar(v)}`, `${plural(r.newcomers, 'persona nueva', 'personas nuevas')} en el público`] });
  }
  if (r.listeners >= 1) {
    c.push({ tone: 'neutral', w: 3, steps: [`${plural(Math.round(r.listeners), 'persona ya conocía', 'personas ya conocían')} su canción grabada`, 'llegaron solitas'] });
  }
  if (v.reach > 0 && v.reach < 1 && s.m.fans > 0) {
    c.push({ tone: 'neutral', w: 2, steps: [`No todos sus fans viven cerca de ${enLugar(v)}`, `llegaron ${plural(r.fansCame, 'fan', 'fans')}`] });
  }
  if (v.id === 'cumple') {
    c.push({ tone: 'neutral', w: 2, steps: ['En la fiesta casi todos eran niños chiquitos', plural(r.newFans, 'fan nuevo', 'fans nuevos')] });
  }
  for (const e of s.week$.events) if (e && e.steps) c.push({ w: 4, ...e });

  // Nothing went wrong: a small, concrete improvement taken from this same show (never invented). If the show
  // really had nothing to improve, there is no ⚠️.
  if (!c.some((x) => x.tone === 'bad')) {
    const small = smallImprovement(s, r, v);
    if (small) c.push({ tone: 'bad', w: 0, small: true, ...small });
  }
  return order(c);
}

const WORK = ['ensayar', 'componer', 'promover', 'trabajito', 'grabar'];
function planStreak(plan) {
  let run = 0; let max = 0;
  for (const p of plan || []) { run = WORK.includes(p.id) ? run + 1 : 0; max = Math.max(max, run); }
  return max;
}

// The biggest thing still left on the table in a show that went well, with its numbers. First match wins:
// tired band → empty seats without promotion → people left outside a place that is already small → covers in the
// setlist → talent → notes that got away → a ticket much cheaper than fair.
export function smallImprovement(s, r, v) {
  const plan = s.week$?.plan || [];
  const fair = v.fairPrice || 0;
  const empty = Math.max(0, (r.cap || 0) - (r.attendance || 0));
  const ch = chapterOf(s);
  const bigger = r.soldOut && s.chapter >= 1 && r.demand > r.cap * 1.1 ? biggerOpen(s, v) : null;
  if (r.moodBefore < 60 && !count(plan, 'descansar')) {
    return { key: 'animo', steps: [`Ánimo en ${r.moodBefore} al subir al escenario`, 'tocaron con poquita energía'],
      next: '💡 La próxima vez, mete una tarde de descanso esa semana, porque con el ánimo arriba de 60 el show suena mejor.' };
  }
  if (!r.soldOut && empty >= 3 && s.chapter >= 1 && !count(plan, 'promover') && ch.promo.people > 0) {
    return { key: 'promo', steps: [`Quedaron ${plural(empty, 'lugar vacío', 'lugares vacíos')} en ${enLugar(v)}`, 'esta semana no promovieron'],
      next: `💡 La próxima vez, dedica una tarde a promover, porque cada promoción trae como ${num(ch.promo.people)} personas más.` };
  }
  if (bigger) {
    return { key: 'lugar', steps: [`${plural(Math.round(r.demand - r.cap), 'persona se quedó', 'personas se quedaron')} afuera`, `${cap1(enLugar(v))} ya les queda chico`],
      next: `💡 La próxima vez, prueben ${bigger.en || bigger.name}, porque ya tienen más público del que cabe aquí.` };
  }
  if (r.covers > 0 && s.songs.length < (ch.setSize || 0)) {
    return { key: 'covers', steps: [`${plural(r.covers, 'cover', 'covers')} en el setlist`, 'una canción propia suena más a ustedes'],
      next: '💡 La próxima vez, compón otra canción, porque cada canción propia en el setlist hace que el show suene más a ustedes.' };
  }
  if (s.m.talent < 80 && count(plan, 'ensayar') < 2) {
    return { key: 'ensayo', steps: [`Talento en ${s.m.talent}`, `${plural(count(plan, 'ensayar'), 'tarde', 'tardes')} de ensayo esta semana`],
      next: '💡 La próxima vez, ensaya una tarde más, porque con más talento el show suena todavía mejor.' };
  }
  if (r.accuracy < 0.8) {
    return { key: 'notas', steps: [`Tocaste ${de10(r.accuracy)} de cada 10 notas en vivo`, 'se escaparon algunas'],
      next: '💡 La próxima vez, ensaya despacito la parte difícil antes del show, porque así los dedos se la aprenden.' };
  }
  if (v.pay?.type === 'door' && !r.soldOut && fair && r.price < fair * 0.8) {
    return { key: 'precio', steps: [`Boleto de ${money(r.price)} (el justo es como ${money(fair)})`, `entraron ${money(r.gross)} de boletos`],
      next: `💡 La próxima vez, prueba un boleto más cerca de ${money(fair)}, porque con el precio justo entra más dinero a la caja.` };
  }
  return null;
}
const safeNeeds = (x, s) => { try { return x.needs(s) === true; } catch { return false; } };
const de10 = (acc) => Math.round((acc || 0) * 10);
// A bigger place she can already play this chapter (venues.js, the same filter as show.venueOptions).
function biggerOpen(s, v) {
  const list = (VENUES || []).filter((x) => x.chapter <= s.chapter && (x.until ?? 99) >= s.chapter && x.cap > v.cap && !x.city
    && (!x.needs || safeNeeds(x, s)));
  list.sort((a, b) => a.cap - b.cap);
  return list[0] || null;
}

// Chains of the whole week (money, plan, streams), merged with the show's at closeWeek.
export function weekChains(s, w) {
  const c = [];
  const plan = s.week$.plan;
  const ch = chapterOf(s);
  if (w.maxStreak >= 3) {
    c.push({ tone: 'bad', w: 6, key: 'racha', steps: ['Las tres tardes trabajando, sin descanso', 'ánimo −6 extra', `ánimo en ${s.m.mood}`],
      next: '💡 La próxima vez, después de dos tardes de trabajo mete una de descanso, porque descansar también es ensayar.' });
  }
  if (!count(plan, 'ensayar') && w.talentLoss && s.m.talent < 85) {
    c.push({ tone: 'bad', w: 3, key: 'ensayo', steps: ['Una semana sin ensayar', `el talento bajó ${w.talentLoss}`, `talento en ${s.m.talent}`],
      next: '💡 La próxima vez, ensaya al menos una tarde, porque los dedos se olvidan si no practican.' });
  }
  if (w.weekly > 0) {
    const tone = w.net >= 0 ? 'good' : 'bad';
    c.push({ tone, w: tone === 'bad' ? 5 : 1, steps: [`Entraron ${money(w.income)}`, `gastos de la semana: ${money(w.weekly)}`, `caja: ${money(s.money.caja)}`],
      next: tone === 'bad' ? `💡 La próxima vez, junta al menos ${money(w.weekly)} para los gastos de la semana, porque los gastos de la banda se pagan siempre.` : undefined });
  }
  if (w.covered > 0) {
    c.push({ tone: 'bad', w: 7, steps: ['La caja no alcanzó', `tomaron ${money(w.covered)} del ahorro`, `ahorro: ${money(s.money.ahorro)}`],
      next: '💡 La próxima vez, deja dinero en la caja al repartir, porque el ahorro es para la meta.' });
  }
  if (w.streamsWeek > 0) {
    c.push({ tone: 'good', w: 2, steps: [`${plays(w.streamsWeek)} esta semana`, `regalías: ${money(w.royalties)}`, `${plural(w.streamFans, 'fan nuevo', 'fans nuevos')} que los oyeron`] });
  }
  if (w.wom > 0) {
    c.push({ tone: 'neutral', w: 1, steps: ['Los fans les contaron a sus amigos', plural(w.wom, 'fan nuevo', 'fans nuevos')] });
  }
  if (w.paid > 0) {
    c.push({ tone: 'good', w: 3, steps: [`Le pagaron ${money(w.paid)} a Papá`, `ya van ${money(s.money.pagado)} de $5,000`, 'Papá lo apunta con flechita verde'] });
  }
  if (w.saved > 0) {
    c.push({ tone: 'good', w: 2, steps: [`Guardaron ${money(w.saved)}`, `ahorro: ${money(s.money.ahorro)}`, 'más cerca de la meta'] });
  }
  if (ch.weekly === 0 && !c.length) c.push({ tone: 'neutral', w: 0, steps: ['En el prólogo no hay gastos', 'la cochera es gratis'] });
  return c;
}

// The show already said it (same key): the week doesn't repeat it. A small ⚠️ of the show only stays when the week
// has no real ⚠️ of its own.
export function mergeChains(showC = [], weekC = []) {
  const keys = new Set(showC.map((x) => x.key).filter(Boolean));
  const week = weekC.filter((x) => !x.key || !keys.has(x.key));
  const realBad = [...showC, ...week].some((x) => x.tone === 'bad' && !x.small);
  const show = showC.filter((x) => !(x.small && realBad && week.some((y) => y.tone === 'bad')));
  const all = [...show.map((x, i) => ({ ...x, w: x.small ? 0 : 10 - i })), ...week];
  return order(all, { good: 3, bad: 2, neutral: 2 });
}

// 💡 La próxima vez: the one that goes with the main ⚠️ (first bad chain). If nothing went wrong,
// a gentle look at the goal.
export function nextTip(s, chains) {
  const bad = chains.find((c) => c.tone === 'bad' && c.next);
  if (bad) return bad.next;
  const fans = chapterOf(s).goals.find((g) => g.id === 'fans');
  if (fans && s.m.fans < fans.need) return `💡 Vas muy bien. Te ${fans.need - s.m.fans === 1 ? 'falta 1 fan' : `faltan ${num(fans.need - s.m.fans)} fans`} para la meta: repite lo que te funcionó esta semana.`;
  return '💡 Vas muy bien: descansar, ensayar y cuidar a la banda ya les está funcionando.';
}

// 📒 Motivation: compares her only with herself, with real data of her game (HISTORIA §5).
// The texts live in data/motivation.js (templates by kind, with the lines of each candidate); here we only choose.
// motivation(s, w) picks the message and remembers it (closeWeek). motivationFor(s, w?) only reads it, so the close
// screen can show it BEFORE the piggy banks; closeWeek then reuses that same message (s.week$.motivPreview).
export function motivation(s, w) {
  const pre = s.week$?.motivPreview;
  const pick = pre && pre.week === s.week ? pre : motivationPick(s, w);
  s.motivLog = [...(s.motivLog || []), pick.id].slice(-6);
  if (pick.id === 'c_completo') s.flags.motivPagado = true;   // the PAGADO sticker is celebrated once
  if (s.week$) s.week$.motivPreview = null;
  return pick.text;
}

export function motivationFor(s, w = {}) {
  const last = s.last && s.last.week === s.week ? s.last : null;
  const pick = motivationPick(s, { recordFans: last?.recordFans || null, streamsWeek: 0, paid: 0, ...w });
  if (s.week$) s.week$.motivPreview = { ...pick, week: s.week };
  return pick.text;
}

// How much each template weighs this week (higher = more about what just happened). A template that is not here
// is not used in the 📒 of the close. h = facts(s) of data/motivation.js. Ratios are capped at 4 so that no
// template wins every week just because its number keeps growing (the record, 5, and PAGADO, 8, stay on top).
const cap4 = (x) => Math.min(4, x);
const MOTIV_SCORE = {
  a_sillas: (s, h) => (s.chapter >= 4 ? 1.5 : cap4(h.publico_hoy / 12)),
  a_capitulo: (s, h) => cap4(s.m.fans / Math.max(1, h.fans_inicio_cap) - 1),
  a_record: 5,
  a_sombrero: (s, h) => cap4(h.reparto_hoy / Math.max(1, h.primer_sombrero) - 1),
  a_canciones: (s, h) => cap4(h.canciones / Math.max(1, h.canciones_en_rechazo) - 1),
  a_precio: 2,
  a_nina_letra: 1.2,
  a_grafica: 1,
  a_streams: 1.5,
  c_pagado: 1.5,
  c_falta: 1,
  c_ahorro: (s, h) => cap4((h.ahorro - h.ahorro_hace4) / Math.max(500, h.ahorro_hace4)),
  c_completo: 8,
  d_antes_record: 3.5,
  d_talento: 3,
  d_cuatro: 2.5,
  d_juju: 0.5,
  d_abuela: 0.1,
  j_grafica_baja: 0.6,
  j_grafica_sube: 0.4,
  j_pared: 0.3,
  j_letrero: 0.3,
  j_mapa: 0.2,
};

function motivationPick(s, w = {}) {
  const extra = { week: w };
  const h = facts(s, extra);
  const recent = s.motivLog || [];
  const opts = [];
  for (const kind of ['A', 'C', 'D', 'J']) {
    for (const m of messages(s, kind, extra)) {
      const sc = MOTIV_SCORE[m.id];
      if (sc == null) continue;
      let score = 0;
      try { score = typeof sc === 'function' ? sc(s, h) : sc; } catch { score = 0; }
      if (!Number.isFinite(score)) score = 0;
      // Variety: what she read in the last weeks weighs less.
      score -= 1.5 * recent.filter((x) => x === m.id).length;
      opts.push({ id: m.id, score, text: fill(s, say(m)) });
    }
  }
  if (!opts.length) opts.push({ id: 'd_abuela', score: 0, text: 'ABUELA ALMA: "A ver, cuéntame qué salió bien. Algo salió bien. Siempre sale algo bien."' });
  // No same template three weeks in a row.
  const l2 = recent.slice(-2);
  const pool = opts.filter((o) => !(l2.length === 2 && l2.every((x) => x === o.id)));
  pool.sort((a, b) => b.score - a.score);
  const pick = pool[0] || opts[0];
  return { id: pick.id, text: pick.text };
}

// Adelanto de la próxima semana: curiosity, never pressure. Neutral lines by chapter + the K templates of
// data/motivation.js (the ones of each candidate only when that candidate is in the band).
const TEASERS = {
  0: ['Mamá ya está pensando en el póster. Dice que lleva brillantina.'],
  1: ['Don Beto dice que el sábado hay tres leches recién hecho.', 'Nina tiene una idea para un coro. Dice que es "pegajosísimo".'],
  2: ['Iker dice que ya se sabe la canción nueva. Todavía no existe.', 'Doña Rocío pasó por la cochera "nomás a ver".', '{teclas} trae una gráfica nueva. Tiene flechas.'],
  3: ['Inés dice que el estudio huele a té y a cables nuevos.', 'Juju tiene prohibido hablar en el estudio. Está practicando.'],
  4: ['El contador de reproducciones no deja de moverse.', 'Max Ferrer dejó un mensaje con muchos signos de admiración.'],
  5: ['Don Memo le está poniendo aire a las llantas de La Burra.', '{bateria} ya tiene lista su calificación de comida de la gira: de 1 a 5 baquetas.'],
  6: ['Señor Brillitos quiere su gafete de ACCESO TOTAL.', '{hermana} está probando la "cámara del letrero".'],
  7: ['Juju dice que su letrero para el estadio ya está listo. No se lo enseña a nadie.', 'El estadio está vacío y esperando.'],
};
// Final: el adelanto del letrero no repite el secreto cuando ya salió en la pantalla gigante, y en el modo libre
// (después del Premio) no hay "estadio esperando".
const TEASERS_FREE = ['La cochera sigue abierta. Nina dice que tiene un coro nuevo. Bueno: dos palabras.', 'Juju volvió a poner las tres sillas. Por si acaso.'];
function teasersOf(s, ch) {
  if (ch.id === 7 && s.flags?.ended) return TEASERS_FREE;
  const list = TEASERS[ch.id] || TEASERS[1];
  if (ch.id === 7 && (s.seenScenes || []).includes('c7_letrero')) return list.filter((x) => !/letrero/.test(x));
  return list;
}

export function teaser(s, w) {
  if (w.milestone) {
    const nx = CHAPTERS[s.chapter];
    return nx && w.milestone.chapter < s.chapter ? `Próxima semana: empieza ${nx.name}.` : '¡Lo lograron! La cochera los espera para una más.';
  }
  const ch = chapterOf(s);
  const kermes = (s.history || []).filter((h) => h.venue === 'kermes').length;
  if (ch.id >= 1 && ch.id <= 2 && (s.week + 1) % 2 === 0 && kermes < 2 && !(s.flags?.teaserLog || []).includes('kermes')) {
    return remember(s, 'kermes', 'La próxima semana hay kermés en la escuela. Ya huele a esquites.');
  }
  const g = ch.goals.find((x) => x.id === 'fans');
  if (g && s.m.fans < g.need && s.m.fans >= g.need * 0.8) return `${g.need - s.m.fans === 1 ? 'Les falta 1 fan' : `Les faltan ${num(g.need - s.m.fans)} fans`} para la meta. ¿Llegarán la próxima semana?`;
  // No repeat: the same teaser doesn't come back until every other one of the moment was read (s.flags.teaserLog).
  const own = teasersOf(s, ch);
  const tag = own === TEASERS_FREE ? 'tf' : `t${ch.id}`;
  const base = own === TEASERS_FREE ? TEASERS_FREE : TEASERS[ch.id] || TEASERS[1];
  // Ids by position in the full list (teaserLog keeps them), so filtering one out doesn't rename the others.
  const list = [...own.map((text) => ({ id: `${tag}_${base.indexOf(text)}`, text })), ...messages(s, 'K').map((m) => ({ id: m.id, text: say(m) }))];
  const log = s.flags?.teaserLog || [];
  const fresh = list.filter((x) => !log.includes(x.id));
  const pool = fresh.length ? fresh : list.filter((x) => !log.slice(-3).includes(x.id));
  const pick = (pool.length ? pool : list)[s.week % (pool.length || list.length)];
  return remember(s, pick.id, fill(s, pick.text));
}
function remember(s, id, text) {
  if (s.flags) {
    const log = (s.flags.teaserLog || []).filter((x) => x !== id);
    s.flags.teaserLog = [...log, id].slice(-40);
  }
  return text;
}

// Fan comments of the night: one that notices her progress (H) and one with humor (I), from data/motivation.js,
// plus a few lines of the late chapters. They are read with this show as s.last (playShow saves it after this).
const COMMENTS = {
  3: [{ text: 'Cuando gritaron "¡YA!" se me enchinó la piel.', when: (s) => (s.seenScenes || []).includes('ch3-ya') },
    { text: 'Vine por mi prima y me quedé por la guitarra.' },
    { text: 'Me aprendí el coro en el camión de la escuela. Ahora lo canta todo el camión.' }],
  4: [{ text: 'La escuché en el súper, en la sección de frutas.' }, { text: 'Mi mamá la canta en el coche. Mal, pero la canta.' },
    { text: 'Ya me sé la acústica y la normal.', when: (s) => !!s.flags?.acustica }],
  // Each `when` reads THIS show as s.last (fanComments passes the view): city lines only in that city.
  5: [{ text: '¡Vinieron hasta mi ciudad! No lo puedo creer.', when: (s) => ['gdl', 'mty', 'pue'].includes(s.last?.venue) }, { text: 'Tocaron en el estacionamiento y fue el mejor show de mi vida.', when: (s) => (s.seenScenes || []).includes('c5_monterrey') },
    { text: 'La torta ahogada aprueba esta banda.', when: (s) => s.last?.venue === 'gdl' }],
  6: [{ text: 'La cámara del letrero me enfocó. Lloré.', when: (s) => !!s.flags?.camaraLetrero }, { text: '24,500 lucecitas. Nunca lo voy a olvidar.', when: (s) => s.last?.venue === 'palacio' && !!s.last?.soldOut },
    { text: 'Desde hasta arriba se oía increíble.' }],
  7: [{ text: 'Vi el letrero de Juju en la pantalla gigante. La letra sigue al revés.', when: (s) => (s.seenScenes || []).includes('c7_letrero') },
    { text: 'Todo el lugar gritando "¡YA!". Se me enchinó la piel.' }, { text: 'Los vi en el café hace mucho. Hoy ya no caben en ningún café.', when: (s) => s.flags?.cafeWeek != null }],
};

// Each comment comes out at most twice per game (s.flags.fanSeen counts them), the ones she read less first, so the
// same fan line doesn't show up 5 to 8 times. Ids: the template id, or `x{chapter}_{i}` for the COMMENTS lines.
const FAN_MAX = 2;
export function fanComments(s, r) {
  const view = { ...s, last: { ...r, week: s.week } };
  const seen = (s.flags && s.flags.fanSeen) || {};
  const pickOne = (list) => {
    const ok = list.filter((x) => (seen[x.id] || 0) < FAN_MAX);
    if (!ok.length) return null;
    const least = Math.min(...ok.map((x) => seen[x.id] || 0));
    const pool = ok.filter((x) => (seen[x.id] || 0) === least);
    return pool[Math.floor(rng(s) * pool.length)];
  };
  const progress = messages(view, 'H').map((m) => ({ id: m.id, text: m.text }));
  const extra = (COMMENTS[s.chapter] || []).map((c, i) => ({ ...c, id: `x${s.chapter}_${i}` }))
    .filter((c) => { try { return !c.when || c.when(view); } catch { return false; } });
  const humor = [...messages(view, 'I').map((m) => ({ id: m.id, text: m.text })), ...extra];
  const a = pickOne(progress);
  const b = pickOne(humor);
  for (const x of [a, b]) if (x && s.flags) s.flags.fanSeen = { ...(s.flags.fanSeen || {}), [x.id]: ((s.flags.fanSeen || {})[x.id] || 0) + 1 };
  // The screen shows the first one: half the nights it is the one about her progress.
  const out = a && b ? (rng(s) < 0.5 ? [a, b] : [b, a]) : [a || b].filter(Boolean);
  if (!out.length) out.push({ text: '¡Otra! ¡Otra!' });
  return out.map((x) => fill(s, x.text));
}
