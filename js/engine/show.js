// Saturday's show: where, how much the ticket costs and how many come (DISENO §4).
//   público potencial = fans × 0.6 × alcance + promoción + gente que pasa + gente que ya oyó la canción
//   público real      = mínimo(cupo, potencial × factor de precio)
//   calidad           = 0.4 talento + 0.3 canciones propias (cover 0.3) + 0.3 ánimo ± 0.1 precisión
//   fans nuevos       = (público real − fans que vinieron) × calidad × conversión del lugar
//   dinero            = sombrero | pago fijo | boletos × (1 − parte del lugar) − renta
import { clamp, num, money } from '../util.js';
import { VENUES, VENUE_BY_ID } from '../data/venues.js';
import { LAST_CHAPTER, chapterOf, LABELS } from '../data/chapters.js';
import { showChains, fanComments, fill } from './explain.js';
import { runTriggers } from './lessons.js';
import { clampMetrics } from './state.js';
import { enterScenes } from './week.js';

const FANS_SHOW_UP = 0.6;          // de cada 10 fans, 6 llegan a un show cerca
const LISTENERS_PER_PLAY = 0.004;   // personas que llegan porque oyeron la canción grabada
const ANCHOR_WEEKS = 3;             // cuánto dura "la gente se acostumbró al precio bajo"

export const songById = (s, id) => s.songs.find((x) => x.id === id) || null;

// A place with fillGate (venues.js: el estadio) opens only when, at the fair price, the expected public reaches that
// part of its capacity: with fewer people the rent eats the tickets. The reason says how many would come today.
const round100 = (x) => Math.round(x / 100) * 100;
function gateReason(s, v) {
  if (!v.fillGate || v.pay.type !== 'door') return true;
  const want = Math.round(v.cap * v.fillGate);
  const now = Math.min(v.cap, Math.round(audience(s, v, v.fairPrice).demand));
  if (now >= want) return true;
  return `Hoy llegarían unas ${num(round100(now))} de ${num(v.cap)}. Abre cuando puedan llenarlo: unas ${num(round100(want))}. Junten más fans y reproducciones.`;
}

// The risk of a place, with her numbers at the fair price (it goes in the place's tip, which the screen shows):
// how many would come and how much they would lose. null when it leaves money.
export function venueRisk(s, v, f = forecast(s, { venueId: v.id })) {
  if (v.pay.type !== 'door' || !f || f.earnings >= 0) return null;
  return {
    level: f.expected < v.cap * 0.6 ? 'half' : 'loss', expected: f.expected, cap: v.cap, loss: -f.earnings,
    text: `⚠️ Hoy, al precio justo, llegarían unas ${num(f.expected)} de ${num(v.cap)} y perderían unos ${money(-f.earnings)}: ${v.costPlural ? 'los gastos se pagan' : 'la renta se paga'} llegue quien llegue.`,
  };
}

export function venueOptions(s) {
  const list = VENUES.filter((v) => v.chapter <= s.chapter && (v.until ?? LAST_CHAPTER) >= s.chapter).map((v) => {
    let need = v.needs ? v.needs(s) : true;
    if (need === true) need = gateReason(s, v);
    const tip = typeof v.tip === 'function' ? v.tip(s) : v.tip;
    const risk = need === true ? venueRisk(s, v) : null;
    return { venue: v, open: need === true, reason: need === true ? '' : fill(s, need), tip: fill(s, risk ? `${tip} ${risk.text}` : tip), risk };
  });
  // There is always somewhere to play: if she lost fans and no place of the chapter opens, the smallest one in the
  // city still lets them in (so the week never gets stuck without a show).
  if (list.length && !list.some((o) => o.open)) {
    const k = list.reduce((b, o, i) => (!o.venue.city && (b < 0 || o.venue.cap < list[b].venue.cap) ? i : b), -1);
    const i = k >= 0 ? k : 0;
    list[i] = { ...list[i], open: true, reason: '' };
  }
  return list;
}

export const setSize = (s) => chapterOf(s).setSize;

// Preparar el show: she picked place, price and setlist. Saved in s.week$.prep (the same field the UI already
// reads and writes) and the phase moves to 'live'. Returns the normalized choice.
export function setPrep(s, { venueId, price, setlist, songId } = {}) {
  const opts = venueOptions(s);
  const o = opts.find((x) => x.open && x.venue.id === venueId) || opts.find((x) => x.open);
  const v = o.venue;
  const p = v.pay.type === 'door' ? clamp(Math.round(price ?? v.fairPrice), v.minPrice, v.maxPrice) : 0;
  const list = normalizeSetlist(s, setlist);
  const own = list.filter((id) => id !== 'cover');
  const prep = { venueId: v.id, price: p, setlist: list, songId: own.includes(songId) ? songId : own[0] || null };
  s.week$.prep = prep;
  s.setlist = list;
  s.phase = 'live';
  return prep;
}
export const prepOf = (s) => s.week$?.prep || null;

// Her own songs first (newest last), covers fill the rest.
export function defaultSetlist(s) {
  const n = setSize(s);
  const own = s.songs.slice(-n).map((x) => x.id);
  return [...own, ...Array(Math.max(0, n - own.length)).fill('cover')];
}

function normalizeSetlist(s, setlist) {
  const n = setSize(s);
  const list = (Array.isArray(setlist) && setlist.length ? setlist : defaultSetlist(s))
    .map((id) => (id !== 'cover' && songById(s, id) ? id : 'cover')).slice(0, n);
  while (list.length < n) list.push('cover');
  return list;
}

// Ticket price: under the fair price a few more come (up to +25% free); over it, many fewer.
export function priceFactor(v, price) {
  if (v.pay.type !== 'door') return 1;
  const p = Math.max(1, price ?? v.fairPrice);
  const r = p / v.fairPrice;
  return r <= 1 ? 1 + 0.25 * (1 - r) : Math.pow(1 / r, 2);
}

function anchorHit(s, v, price) {
  const a = s.flags.priceAnchor;
  return !!(a && v.pay.type === 'door' && s.week - a.week <= ANCHOR_WEEKS && s.week > a.week && price > a.price * 1.25);
}

export function audience(s, v, price) {
  const label = s.label ? LABELS[s.label] : null;
  const promo = (s.week$.promo || 0) * (label ? label.promoMult : 1) + (s.week$.mods.promo || 0);
  const fansPool = s.m.fans * FANS_SHOW_UP * (v.reach ?? 1);
  const listeners = s.streamsWeek * LISTENERS_PER_PLAY * Math.max(0.2, v.reach ?? 1);
  const walkIns = v.walkIns;
  const potential = fansPool + promo + walkIns + listeners;
  const hit = anchorHit(s, v, price);
  const pf = priceFactor(v, price) * (hit ? 0.8 : 1);
  const demand = potential * pf;
  const attendance = Math.round(Math.min(v.cap, demand));
  const fansCame = Math.min(attendance, Math.round(attendance * (potential ? fansPool / potential : 0)));
  const fairAttendance = Math.round(Math.min(v.cap, potential));
  return { promo: Math.round(promo), fansPool, listeners, walkIns, potential, demand, attendance, fansCame, newcomers: attendance - fansCame, priceF: pf, anchorHit: hit, fairAttendance };
}

export function quality(s, setlist, accuracy = 0.7) {
  const list = normalizeSetlist(s, setlist);
  const own = list.filter((id) => id !== 'cover').length;
  const songF = (own * 1 + (list.length - own) * 0.3) / list.length;
  const accAdj = clamp((accuracy - 0.65) * 0.4, -0.1, 0.1);
  const q = 0.4 * (s.m.talent / 100) + 0.3 * songF + 0.3 * (s.m.mood / 100) + accAdj + (s.week$.mods.quality || 0);
  return { q: clamp(q, 0, 1), own, covers: list.length - own, list };
}

function money$(v, a, q, price) {
  if (v.pay.type === 'hat') return { gross: Math.round(a * (v.pay.amount + v.pay.perQuality * q)), cost: v.cost || 0 };
  if (v.pay.type === 'fixed') return { gross: v.pay.amount, cost: v.cost || 0 };
  return { gross: Math.round(price * a * (1 - v.pay.venueCut)), cost: v.cost || 0 };
}
const round10 = (x) => Math.round(x / 10) * 10;

// For the live row while she moves the price slider: who comes, how much it leaves, fans expected.
export function forecast(s, { venueId, price, setlist, accuracy = 0.7 } = {}) {
  const v = VENUE_BY_ID[venueId];
  if (!v) return { expected: 0, cap: 0, earnings: 0, newFans: 0, fair: 0 };
  const p = v.pay.type === 'door' ? price ?? v.fairPrice : 0;
  const a = audience(s, v, p);
  const { q } = quality(s, setlist, accuracy);
  const m = money$(v, a.attendance, q, p);
  const earnings = round10(m.gross - m.cost);
  // risk: '' when it leaves money; when not, the warning with her numbers (and how full it would be).
  const risk = earnings < 0
    ? `⚠️ Llegarían unas ${num(a.attendance)} de ${num(v.cap)}: ${v.costPlural ? 'los gastos se pagan' : 'la renta se paga'} llegue quien llegue y perderían unos ${money(-earnings)}.`
    : '';
  return {
    expected: a.attendance, cap: v.cap, earnings, cost: m.cost,
    newFans: Math.round(a.newcomers * q * v.conv), fair: v.fairPrice || 0, quality: q, soldOut: a.attendance >= v.cap,
    risk, half: v.cap > 20 && a.attendance < v.cap * 0.6,
  };
}

// 📸 The photo {hermana} takes at every show (ui/photo.js draws it, ui/album.js keeps them). The moment fits the
// result: an AGOTADO brings confetti, a half-empty room a sweet "los que sí vinieron", a bad night the broken string.
// Picked from a hash of the game seed, the week and the place (never from rng(s), so the game replays the same);
// the moment of the previous photo is skipped so two shows in a row don't look alike. Old saves without a photo
// get theirs from these same functions (photo.js), so a show always gets the same photo.
const DAYLIGHT = new Set(['cochera', 'cumple', 'cafe', 'kermes', 'plaza']);
export const PHOTO_MOMENTS = {
  brillitos: (h) => (h.venue === 'cochera' && h.attendance >= 2 ? 3 : 0),   // Señor Brillitos en primera fila
  letrero: (h) => (h.attendance > 0 ? 2 : 0),                               // el letrero de Juju de cerquita
  salto: (h) => (h.quality >= 0.6 ? 2 : 0),                                 // Nina en el aire
  solo: (h) => (h.quality >= 0.5 ? 1 : 0),                                  // el solo de guitarra
  coro: (h) => (h.attendance >= 10 && h.attendance >= h.cap * 0.5 ? 2 : 0), // el público canta el coro
  luces: (h) => (!DAYLIGHT.has(h.venue) && h.attendance >= 60 ? 3 : 0),     // luces de celular
  confeti: (h) => (h.soldOut && h.cap >= 20 ? 3 : 0),                       // ¡AGOTADO!
  despedida: (h) => (h.encore || h.quality >= 0.7 ? 2 : 0),                 // "¡otra, otra!"
  pocos: (h) => (h.attendance < h.cap * 0.35 ? 4 : 0),                      // poquitos, pero cantaron todo
  cuerda: (h) => (h.accuracy != null && h.accuracy < 0.6 ? 3 : 0),          // se rompió una cuerda y siguieron
  abrazo: () => 1,                                                          // el abrazo del final
};
export function photoSeed(s, week, venue) {
  let x = ((s?.seed ?? 0) ^ Math.imul(week | 0, 0x9e3779b1)) >>> 0;
  for (const c of String(venue || '')) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13;
  return x >>> 0;
}
export function photoMoment(h, seed, prev = null) {
  let list = Object.entries(PHOTO_MOMENTS).map(([id, w]) => [id, w(h)]).filter(([, w]) => w > 0);
  if (list.length > 1 && prev) list = list.filter(([id]) => id !== prev);
  const total = list.reduce((a, [, w]) => a + w, 0);
  let k = seed % total;
  for (const [id, w] of list) { if (k < w) return id; k -= w; }
  return 'abrazo';
}

export function playShow(s, { venueId, price, setlist, accuracy = 0.7, encore = false } = {}) {
  const pr = s.week$?.prep || {};
  venueId = venueId ?? pr.venueId;
  price = price ?? pr.price;
  setlist = setlist ?? pr.setlist;
  const opt = venueOptions(s).find((o) => o.venue.id === venueId && o.open) || venueOptions(s).find((o) => o.open);
  const v = opt.venue;
  const p = v.pay.type === 'door' ? clamp(Math.round(price ?? v.fairPrice), v.minPrice, v.maxPrice) : 0;
  const acc = clamp(Number.isFinite(accuracy) ? accuracy : 0.7, 0, 1);
  const list = normalizeSetlist(s, setlist);
  s.setlist = list;
  const a = audience(s, v, p);
  const moodBefore = s.m.mood;
  const qq = quality(s, list, acc);
  const q = qq.q;

  let newFans = Math.round(a.newcomers * q * v.conv * (encore && q >= 0.6 ? 1.15 : 1)) + (s.week$.mods.fans || 0);
  if (s.chapter === 0) newFans = Math.max(newFans, a.attendance);   // Mamá, Juju y Señor Brillitos: las primeras fans
  newFans = Math.max(0, newFans);
  const m = money$(v, a.attendance, q, p);
  const earned = round10(m.gross - m.cost);
  const soldOut = a.attendance >= v.cap;

  // Mood after the show: a good show lifts it; on tour, traveling tires.
  let moodDelta = q >= 0.6 ? 8 : q >= 0.4 ? 2 : -4;
  if (v.city) moodDelta -= 6;

  const prevBest = s.records.bestNewFans;
  const prevRecord = s.history.find((h) => h.newFans === prevBest && prevBest > 0);
  s.m.fans += newFans;
  s.m.mood += moodDelta;
  s.money.caja += earned;
  s.week$.income.show = earned;
  clampMetrics(s);

  const r = {
    week: s.week, chapter: s.chapter, venue: v.id, venueName: v.name, payType: v.pay.type, price: p,
    attendance: a.attendance, cap: v.cap, soldOut, newFans, earned, gross: m.gross, cost: m.cost,
    quality: Math.round(q * 100) / 100, accuracy: Math.round(acc * 100) / 100, encore: !!encore,
    fansCame: a.fansCame, newcomers: a.newcomers, promoPeople: a.promo, walkIns: a.walkIns, listeners: Math.round(a.listeners),
    demand: Math.round(a.demand), fairAttendance: a.fairAttendance, anchorHit: a.anchorHit,
    own: qq.own, covers: qq.covers, setSize: list.length, setlist: list, moodBefore, moodDelta, fansAfter: s.m.fans,
  };

  // Records, firsts and story flags.
  r.recordFans = newFans > prevBest && prevBest > 0 ? { newFans: prevBest, week: prevRecord?.week ?? s.week, venueName: prevRecord?.venueName ?? v.name } : null;
  s.records.bestNewFans = Math.max(prevBest, newFans);
  s.records.bestAccuracy = Math.max(s.records.bestAccuracy, r.accuracy);
  s.records.bestAttendance = Math.max(s.records.bestAttendance, a.attendance);
  if (soldOut && v.cap >= 20) { s.records.soldOut += 1; s.flags[`soldOut_${v.id}`] = (s.flags[`soldOut_${v.id}`] || 0) + 1; }
  if (v.id === 'cochera' && s.flags.weekCochera == null) s.flags.weekCochera = s.week;
  if (v.id === 'cafe' && s.flags.cafeWeek == null) s.flags.cafeWeek = s.week;
  if (v.id === 'cumple') s.flags.lastCumple = s.week;
  if (v.city && !s.citiesPlayed.includes(v.id)) s.citiesPlayed.push(v.id);
  if (v.pay.type === 'hat' && earned > 0 && !s.firsts.hat) { s.firsts.hat = earned; s.firsts.hatWeek = s.week; }
  if (s.firsts.accuracy == null) s.firsts.accuracy = r.accuracy;
  if (v.id === 'foro' && s.firsts.attendanceForo == null) s.firsts.attendanceForo = a.attendance;
  if (v.pay.type === 'door' && p < v.fairPrice * 0.75) s.flags.priceAnchor = { week: s.week, price: p, venue: v.id };
  s.stats.shows += 1;

  r.chains = showChains(s, r, v);
  r.comments = fanComments(s, r);
  const entry = {
    week: s.week, chapter: s.chapter, venue: v.id, venueName: v.name, attendance: a.attendance, cap: v.cap,
    newFans, earned, quality: r.quality, accuracy: r.accuracy, soldOut, price: p, fansAfter: s.m.fans,
  };
  // 📸 { moment, seed, band }: band = who was on stage that night (the album shows the band as it was then).
  const seed = photoSeed(s, s.week, v.id);
  entry.photo = { moment: photoMoment({ ...entry, encore: !!encore }, seed, s.history[s.history.length - 1]?.photo?.moment), seed, band: s.members.slice(0, 5) };
  s.history.push(entry);
  s.last = r;
  s.week$.show = r;
  r.lessons = runTriggers('afterShow', s, { result: r, venue: v });
  if (s.week$.prep) s.week$.prep.done = true;
  // Scenes with trigger 'after_show' go before the close (phase 'scene', then 'close').
  r.scenes = enterScenes(s, 'after_show', 'close');
  return r;
}

