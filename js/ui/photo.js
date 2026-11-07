// 📸 La foto de cada show: la toma {hermana} (la fotógrafa de la banda) y va al álbum (album.js) y al cierre (close.js).
// photoSvg(s, entry) draws a polaroid: the place of that night (art.sceneSvg, without the band), the band as it was
// that night (art.castSvg, placed like sceneSvg places them), as many people as came, Juju and her sign, the moment
// she caught (show.PHOTO_MOMENTS) and a handwritten caption. Pure strings, no ids shared between photos: every photo
// goes into its own <img> (photoImg), so 40 of them in a grid are 40 pictures, not 40 big SVG trees in the page.
// Nothing here is saved: the save only keeps entry.photo = { moment, seed, band } (show.js).

import { h, num, plural } from '../util.js';
import * as store from '../store.js';
import { art, fill } from './core.js';
import { VENUE_BY_ID } from '../data/venues.js';
import { photoSeed, photoMoment } from '../engine/show.js';

// Venue → art.js place (same table as prep.js) and where art.js puts the band on each stage (art.js PLACES[].band).
const PLACE = {
  cochera: 'cochera', cumple: 'cumple', cafe: 'cafe', kermes: 'kermes', foro: 'foro', plaza: 'plaza',
  indie: 'indierocks', nave: 'foro_mediano', gdl: 'gira', mty: 'gira', pue: 'gira', arena: 'palacio',
  palacio: 'palacio', estadio: 'estadio',
};
const STAGE = {
  cochera: { y: 166, s: 0.6, x0: 132, x1: 228 }, cafe: { y: 166, s: 0.58, x0: 140, x1: 232 },
  cumple: { y: 166, s: 0.56, x0: 124, x1: 222 }, kermes: { y: 152, s: 0.56, x0: 128, x1: 232 },
  foro: { y: 150, s: 0.58, x0: 118, x1: 242 }, plaza: { y: 148, s: 0.54, x0: 124, x1: 236 },
  indierocks: { y: 142, s: 0.52, x0: 112, x1: 248 }, foro_mediano: { y: 148, s: 0.5, x0: 116, x1: 244 },
  gira: { y: 138, s: 0.5, x0: 114, x1: 246 }, palacio: { y: 136, s: 0.3, x0: 160, x1: 200 },
  estadio: { y: 132, s: 0.31, x0: 158, x1: 202 },
};
const DAYTIME = new Set(['cochera', 'cumple', 'cafe', 'kermes', 'plaza']);
const DRUMMERS = new Set(['tambo', 'vale', 'emilio']);
// Who joined in which chapter (the auditions: cards ch1, ch2 and ch5), for old photos saved without `band`.
const JOINS = [['teclas', 1], ['bateria', 2], ['bajo', 5]];

const HAND = `font-family="'Marker Felt','Chalkboard SE','Comic Sans MS',cursive"`;
const INK = '#2E2240';
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// mulberry32 on a copy of the photo seed: confetti and lights land in the same place every time.
const rand = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ---------------------------------------------------------------- Los momentos
// Title (big view), and two notes in {hermana}'s voice: the seed picks one. ≤ 25 words each; the people line adds ≤ 8.
export const MOMENTS = {
  brillitos: { title: 'Señor Brillitos en primera fila', notes: ['Señor Brillitos no se perdió ni una canción. Juju dice que se sabe todas.', 'Le guardamos la mejor silla a Señor Brillitos. Como siempre.'] },
  letrero: { title: 'El letrero de Juju', notes: ['Juju se volteó para enseñarme su letrero. Lo trae a todos los shows.', 'Juju levantó su letrero justo cuando disparé. ¡Salió perfecto!'] },
  salto: { title: '¡Nina en el aire!', notes: ['Nina saltó en el coro y la atrapé en el aire.', 'Conté hasta tres y Nina ya estaba volando. ¡Salió a la primera!'] },
  solo: { title: 'Tu solo de guitarra', notes: ['Tu solo, {nombre}. Todos se quedaron callados escuchando.', 'Así te ves cuando tocas, {nombre}: con los ojos cerrados y sonriendo.'] },
  coro: { title: 'Todos cantaron el coro', notes: ['El público cantó el coro sin que nadie le dijera. Se me puso la piel chinita.', 'En el coro ya no se oía a Nina: cantaba todo el lugar.'] },
  luces: { title: 'Un cielo de lucecitas', notes: ['Se prendieron las lucecitas de los celulares. Parecía un cielo lleno de estrellas.', 'En la canción lenta todos levantaron sus lucecitas. Tuve que tomar tres fotos.'] },
  confeti: { title: '¡Lluvia de confeti!', notes: ['¡AGOTADO! Cayó confeti hasta en mi cámara.', 'No cabía nadie más. Hasta Juju terminó con confeti en el pelo.'] },
  despedida: { title: '¡Otra, otra!', notes: ['Al final todos gritaban “¡otra, otra!”. Los saludos del final son mis favoritos.', 'Ya se iban a bajar y el público pidió otra. Miren esas caras.'] },
  pocos: { title: 'Los que sí vinieron', notes: ['Éramos poquitos, pero cantaron todo. Esta foto me encanta: se ve quién vino por ustedes.', 'Sobraron lugares, pero nadie se fue antes del final. Cada persona cuenta.'] },
  cuerda: { title: 'La cuerda rota', notes: ['Se rompió una cuerda a media canción. {nombre} la cambió y siguieron. ¡Eso también es tocar en vivo!', 'Una cuerda dijo “¡pum!” y nadie se rindió. Le puse a la foto “la valiente”.'] },
  abrazo: { title: 'El abrazo del final', notes: ['El abrazo de la banda al terminar. Es la foto que más me gusta tomar.', 'Terminaron y se abrazaron todos. Esa es la foto que va en la pared de la cochera.'] },
};

// ---------------------------------------------------------------- Datos de la foto
// The band on stage that night: entry.photo.band, or (old saves) Mariel and Nina plus whoever had joined by then.
function bandThen(s, e) {
  const out = ['me', 'nina'];
  for (const [role, ch] of JOINS) {
    const id = s.roles?.[role];
    const wk = s.flags?.[`${role}Week`];
    if (id && (e.chapter > ch || (e.chapter === ch && wk != null && e.week >= wk))) out.push(id);
  }
  return out;
}

// { moment, seed, band } for an entry of s.history. `prev` is the moment of the photo before (old saves only).
export function photoOf(s, e, prev = null) {
  const p = e?.photo;
  if (p && MOMENTS[p.moment] && Number.isFinite(p.seed)) return { moment: p.moment, seed: p.seed, band: Array.isArray(p.band) && p.band.length ? p.band : bandThen(s, e) };
  const seed = photoSeed(s, e?.week, e?.venue);
  return { moment: photoMoment(e || {}, seed, prev), seed, band: bandThen(s, e || {}) };
}

// Every show with its photo, in story order (old ones derive theirs one after the other, like show.js does).
export function photosOf(s) {
  let prev = null;
  return (s?.history || []).filter((e) => e && e.venue).map((e, i) => {
    const p = photoOf(s, e, prev);
    prev = p.moment;
    return { entry: e, photo: p, i };
  });
}

const venueName = (e) => e?.venueName || VENUE_BY_ID[e?.venue]?.name || 'El escenario';
const people = (n) => plural(Math.max(0, Math.round(n || 0)), 'persona', 'personas');
const myLook = () => {
  const look = store.currentProfile?.()?.look;
  return look && Object.keys(look).length > 1 ? look : art()?.MARIEL_LOOK;
};

// The photographer's note under the big photo (≤ 40 words): the moment plus who came.
export function photoNote(s, e, p = photoOf(s, e)) {
  const m = MOMENTS[p.moment] || MOMENTS.abrazo;
  const line = m.notes[p.seed % m.notes.length];
  const who = e.chapter === 0 && e.venue === 'cochera' && e.attendance <= 3
    ? 'Público: Mamá, Juju y Señor Brillitos.'
    : e.soldOut ? `${num(e.attendance)} personas: ¡AGOTADO!` : `Vinieron ${people(e.attendance)}.`;
  return fill(s, `${line} ${who}`);
}
export const photoTitle = (s, e, p = photoOf(s, e)) => fill(s, (MOMENTS[p.moment] || MOMENTS.abrazo).title);
// One line for screen readers: "Foto de Luciana: ¡Nina en el aire! Café La Glorieta, semana 4."
const dot = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
export const photoAlt = (s, e, p = photoOf(s, e)) => `Foto de ${fill(s, '{hermana}')}: ${dot(photoTitle(s, e, p))} ${venueName(e)}, semana ${e.week}.`;

// ---------------------------------------------------------------- Dibujo
const figCache = new Map();
// A cast member as a <g> placed with its feet at (x, y) and scale sc (like art.js put()). The SVG of each figure is
// made once per pose and look and reused (each photo is its own <img>, so repeated ids never meet).
function fig(A, id, { x, y, sc, pose = 'play', look, extra = '', rot = 0, op = 1, juju } = {}) {
  const key = `${id}|${pose}|${id === 'me' ? JSON.stringify(look || {}) : ''}|${juju ? `${juju.sign}${juju.level}` : ''}`;
  let inner = figCache.get(key);
  if (inner == null) {
    const o = { pose, glow: false };
    if (id === 'me') o.look = look;
    if (juju) { o.sign = juju.sign; o.signLevel = juju.level; }
    inner = String(A.castSvg(id, o) || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<style>[\s\S]*?<\/style>/, '');
    if (figCache.size > 120) figCache.clear();
    figCache.set(key, inner);
  }
  const rotate = rot ? ` rotate(${rot} 50 138)` : '';
  return `<g transform="translate(${r1(x - 50 * sc)} ${r1(y - 138 * sc)}) scale(${r1(sc * 1000) / 1000})${rotate}"${op < 1 ? ` opacity="${op}"` : ''}>${inner}${extra}</g>`;
}

// Where each member stands: the same math as art.js sceneInner (drums at the back in the middle).
function slots(band, st) {
  const list = band.slice(0, 5);
  const d = list.findIndex((m) => DRUMMERS.has(m));
  const front = list.filter((_, i) => i !== d);
  const { y, s, x0, x1 } = st;
  const n = d >= 0 ? front.length + 1 : front.length;
  const xs = n === 1 ? [(x0 + x1) / 2] : Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  if (n !== front.length) xs.splice(Math.ceil(front.length / 2), 1);
  const out = front.map((id, i) => ({ id, x: xs[i], y, sc: s }));
  if (d >= 0) {
    const all = Array.from({ length: front.length + 1 }, (_, i) => x0 + ((x1 - x0) * i) / Math.max(1, front.length));
    out.unshift({ id: list[d], x: front.length ? all[Math.ceil(front.length / 2)] : (x0 + x1) / 2, y: y - 8 * s, sc: s * 0.94, drums: true });
  }
  return out;
}

const heart = (x, y, sc, c = '#FF4F9A') => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${r1(sc * 100) / 100})" d="M0 4C-5.4 .4 -5.2 -4 -2.6 -4C-1.2 -4 0 -3 0 -1.8C0 -3 1.2 -4 2.6 -4C5.2 -4 5.4 .4 0 4Z" fill="${c}" stroke="#fff" stroke-width=".8"/>`;
const noteMk = (x, y, sc, c) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(sc * 100) / 100}) rotate(-10)"><ellipse rx="2.7" ry="2.1" fill="${c}"/><path d="M2.3 0V-10Q6.4 -8.2 6 -3.6" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`;
const sparkle = (x, y, sc, c = '#FFE36E') => `<path transform="translate(${r1(x)} ${r1(y)}) scale(${r1(sc * 100) / 100})" d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4Z" fill="${c}"/>`;
const COLORS = ['#FF4F9A', '#FFD23D', '#5EC8F2', '#8B5CF6', '#5EE6C8', '#FF8A3D'];

// The frame of the camera inside the 360×220 scene: wide, on the band, or on the chairs.
function cropOf(moment, st, crowd) {
  if (['salto', 'solo', 'cuerda', 'abrazo', 'despedida'].includes(moment)) {
    const hh = clamp(150 * st.s * 1.9, 70, 220), ww = (hh * 360) / 220;
    const cx = clamp((st.x0 + st.x1) / 2, ww / 2, 360 - ww / 2), cy = clamp(st.y - 62 * st.s, hh / 2, 220 - hh / 2);
    return [cx - ww / 2, cy - hh / 2, ww, hh];
  }
  if (moment === 'brillitos' && crowd === 'chairs') return [70, 86, 220, 134];
  return [0, 0, 360, 220];
}

// The photo itself (360×220, scene coordinates): place + crowd from sceneSvg, then the band and the moment on top.
function shot(A, s, e, p, { lod = 0 } = {}) {
  const place = PLACE[e.venue] || 'cochera';
  const st = STAGE[place] || STAGE.cochera;
  const crowdKind = place === 'cochera' ? 'chairs' : place === 'palacio' || place === 'estadio' ? 'huge' : 'rows';
  const mo = p.moment;
  const R = rand(p.seed ^ 0x5bd1e995);
  const night = !DAYTIME.has(e.venue);
  const sign = String(fill(s, '{nombre}') || 'Mariel').toUpperCase();
  const signLevel = Math.min(2, (e.chapter || 0) >> 1);
  const count = Math.max(0, Math.round(e.attendance || 0));
  const bigJuju = mo === 'letrero';
  let scene = '';
  try {
    scene = A.sceneSvg({
      place, members: [], night, city: ['gdl', 'mty', 'pue'].includes(e.venue) ? e.venue : undefined, band: s.band?.name,
      garageLevel: Math.min(2, e.chapter || 0),
      poster: { band: s.band?.name || fill(s, '{nombre} y Nina'), logo: s.band?.logo, stage: e.soldOut ? 'soldout' : (e.chapter || 0) >= 2 ? 'color' : 'copy' },
      crowd: { count, cap: e.cap || 1, lit: mo === 'luces' || (night && e.quality >= 0.6), juju: !bigJuju && count > 0, sign: { text: sign, level: signLevel } },
    });
  } catch (err) { console.warn('[foto] sceneSvg', err); }
  // Inner markup of the scene, with square corners (a photo, not a rounded card).
  const inner = scene.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/(<clipPath id="[^"]+"><rect width="360" height="220") rx="18"/, '$1');

  // The band of that night, in the pose of the moment.
  const look = myLook();
  const who = slots(p.band, st);
  const mid = (st.x0 + st.x1) / 2;
  let band = '';
  let over = '';
  for (const m of who) {
    let { x, y, sc } = m;
    let pose = 'play', rot = 0, op = 1;
    if (!m.drums) {
      if (mo === 'abrazo') { pose = 'stand'; x = mid + (x - mid) * 0.55; rot = x < mid ? 5 : -5; }
      if (mo === 'despedida') pose = 'wave';
      if (mo === 'salto' && m.id === 'nina') { y -= 30 * sc; over += `<ellipse cx="${r1(m.x)}" cy="${r1(m.y)}" rx="${r1(18 * sc)}" ry="${r1(3.5 * sc)}" fill="${INK}" opacity=".22"/>` + [-9, 0, 9].map((dx) => `<path d="M${r1(m.x + dx * sc)} ${r1(m.y - 6 * sc)}v${r1(-14 * sc)}" stroke="#fff" stroke-width="${r1(2.2 * sc)}" stroke-linecap="round" opacity=".85"/>`).join('') + sparkle(m.x - 22 * sc, y - 120 * sc, sc) + sparkle(m.x + 24 * sc, y - 96 * sc, sc * 0.8, '#FF8CC6'); }
      if (mo === 'solo') { if (m.id === 'me') { sc *= 1.14; y += 4 * m.sc; } else op = 0.8; }
      if (mo === 'cuerda' && m.id === 'nina') pose = 'wave';
    }
    const extra = mo === 'cuerda' && m.id === 'me'
      ? ['#2E2240" stroke-width="3', '#F4EFFA" stroke-width="1.5'].map((st2) => `<path d="M95 66q10 -6 5 -13q-5 -7 4 -11q9 -4 3 -12q-5 -6 3 -10" stroke="${st2}" fill="none" stroke-linecap="round"/>`).join('') : '';
    band += fig(A, m.id, { x, y, sc, pose, look, rot, op, extra });
  }
  if (mo === 'solo') {
    const me = who.find((m) => m.id === 'me') || who[0];
    if (me) band = `<path d="M${r1(me.x - 8)} 0L${r1(me.x - 40 * me.sc)} ${r1(me.y + 2)}H${r1(me.x + 40 * me.sc)}L${r1(me.x + 8)} 0Z" fill="#FFF3B0" opacity=".32"/>` + band + [0, 1, 2].map((k) => noteMk(me.x + (k - 1) * 30 * me.sc, me.y - (118 + k * 14) * me.sc, me.sc * 1.6, COLORS[k])).join('');
  }
  if (mo === 'cuerda') {
    const me = who.find((m) => m.id === 'me') || who[0];
    if (me) over += `<g transform="translate(${r1(me.x - 78 * me.sc)} ${r1(me.y - 150 * me.sc)}) rotate(-6) scale(${r1(me.sc * 1.5 * 100) / 100})"><rect x="-2" y="-12" width="44" height="22" fill="#FFE36E" stroke="${INK}" stroke-width=".8"/><text x="20" y="3" font-size="7.4" text-anchor="middle" fill="${INK}" ${HAND}>¡Cuerda nueva!</text></g>`;
  }
  if (mo === 'abrazo') over += [-1, 0, 1].map((k) => heart(mid + k * 26 * st.s, st.y - (130 + (k === 0 ? 14 : 0)) * st.s, st.s * 2.2, COLORS[k + 1])).join('');
  if (mo === 'despedida') {
    over += Array.from({ length: 6 }, (_, k) => heart(st.x0 - 14 + R() * (st.x1 - st.x0 + 28), st.y - (150 + R() * 36) * st.s, st.s * 2.2, COLORS[k % 3 ? 0 : 3])).join('');
    over += `<g transform="translate(${r1(clamp(st.x0 - 20, 30, 300))} ${r1(st.y - 115 * st.s)}) rotate(-8) scale(${r1(Math.max(0.6, st.s * 1.6) * 100) / 100})"><path d="M-22 -10H22V8H4L-2 15L-4 8H-22Z" fill="#fff" stroke="${INK}" stroke-width="1.2"/><text y="4" font-size="12" text-anchor="middle" font-weight="700" fill="#E0338A" ${HAND}>¡OTRA!</text></g>`;
  }

  // Wide moments: things in the air over the whole place.
  if (mo === 'confeti') {
    over += Array.from({ length: lod ? 26 : 44 }, (_, k) => `<rect x="${r1(R() * 356)}" y="${r1(R() * 200)}" width="${r1(3 + R() * 3)}" height="${r1(2 + R() * 2)}" rx=".6" fill="${COLORS[k % COLORS.length]}" transform="rotate(${Math.round(R() * 90 - 45)} ${r1(R() * 360)} ${r1(R() * 220)})"/>`).join('');
    over += `<path d="M0 8Q60 40 120 6M240 6Q300 40 360 8" stroke="#FFD23D" stroke-width="2.4" fill="none"/><path d="M40 0Q90 30 150 2M210 2Q270 30 320 0" stroke="#FF4F9A" stroke-width="2" fill="none"/>`;
  }
  if (mo === 'luces') {
    const pts = Array.from({ length: lod ? 18 : 30 }, () => [10 + R() * 340, (crowdKind === 'huge' ? 70 : 150) + R() * (crowdKind === 'huge' ? 140 : 60)]);
    over += `<rect width="360" height="220" fill="#140f1c" opacity=".18"/>` +
      `<path d="${pts.map(([x, y]) => `M${r1(x)} ${r1(y)}h0`).join('')}" stroke="#FFF6C8" stroke-width="13" stroke-linecap="round" opacity=".22"/>` +
      `<path d="${pts.map(([x, y]) => `M${r1(x)} ${r1(y)}h0`).join('')}" stroke="#FFFBE6" stroke-width="3.6" stroke-linecap="round"/>`;
  }
  if (mo === 'coro') over += Array.from({ length: 9 }, (_, k) => noteMk(20 + R() * 320, (crowdKind === 'huge' ? 80 : 150) + R() * 40, 1.3 + R() * 0.6, COLORS[k % COLORS.length])).join('');
  if (mo === 'pocos') over += Array.from({ length: 5 }, (_, k) => heart(120 + R() * 120, 176 + R() * 12, 1.4 + R() * 0.6, COLORS[k % 2 ? 0 : 3])).join('');
  if (mo === 'brillitos' && crowdKind === 'chairs') over += [0, 1, 2, 3].map((k) => sparkle(130 + k * 34 + R() * 10, 150 + R() * 18, 1 + R() * 0.5, k % 2 ? '#C9A7FF' : '#FFE36E')).join('');
  if (bigJuju) {
    // Juju turned around to show the camera her sign: big, in front, cut by the edge of the photo.
    over += fig(A, 'juju', { x: 68, y: 262, sc: 1.36, pose: 'stand', juju: { sign, level: signLevel } });
  }
  // A camera date stamp in the corner of the frame, like the old film cameras ("SEM 12").
  const [cx, cy, cw, ch] = cropOf(mo, st, crowdKind);
  const k = cw / 360;
  over += `<text x="${r1(cx + cw - 10 * k)}" y="${r1(cy + ch - 8 * k)}" font-size="${r1(10 * k)}" font-weight="700" text-anchor="end" fill="#FFA24A" stroke="#2E2240" stroke-width="${r1(2.2 * k)}" stroke-linejoin="round" paint-order="stroke" font-family="ui-monospace,Menlo,monospace" letter-spacing="${r1(k)}">SEM ${esc(e.week)}</text>`;

  return { inner: inner + band + over, view: `${r1(cx)} ${r1(cy)} ${r1(cw)} ${r1(ch)}` };
}

// Polaroid: 400×330 (photo 360×220 + white border and a handwritten caption). opts.frame === false: just the photo.
//   size: 'thumb' (album grid, a little lighter) | 'big' (big view, close screen) | 'export' (the 1080 px PNG)
export function photoSvg(s, entry, { size = 'big', frame = true, photo } = {}) {
  const A = art();
  if (!A?.sceneSvg || !A?.castSvg || !entry) return '';
  const e = entry;
  const p = photo || photoOf(s, e);
  const { inner, view } = shot(A, s, e, p, { lod: size === 'thumb' ? 1 : 0 });
  const label = esc(photoAlt(s, e, p));
  const pic = (x, y) => `<svg x="${x}" y="${y}" width="360" height="220" viewBox="${view}" preserveAspectRatio="xMidYMid slice" overflow="hidden"><rect x="-400" y="-400" width="1200" height="1200" fill="#2A2140"/>${inner}</svg>`;
  if (!frame) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" role="img" aria-label="${label}">${pic(0, 0)}</svg>`;
  const line1 = `${venueName(e)} · Semana ${e.week}`;
  const line2 = e.soldOut ? `¡AGOTADO! · ${people(e.attendance)}` : people(e.attendance);
  const f1 = Math.min(24, Math.round(660 / Math.max(10, line1.length)));
  const tape = size === 'thumb' ? '' : `<rect x="170" y="-8" width="60" height="22" fill="#F3E9B5" opacity=".85" transform="rotate(-3 200 3)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -10 400 340" role="img" aria-label="${label}">` +
    `<rect x="0" y="0" width="400" height="330" rx="6" fill="#FFFDF6"/><rect x="0.5" y="0.5" width="399" height="329" rx="6" fill="none" stroke="#E7DFCF"/>` +
    pic(20, 20) + `<rect x="20" y="20" width="360" height="220" fill="none" stroke="#00000022"/>` +
    `<text x="200" y="${f1 >= 20 ? 280 : 278}" font-size="${f1}" text-anchor="middle" fill="#2B2350" ${HAND}>${esc(line1)}</text>` +
    `<text x="200" y="312" font-size="19" text-anchor="middle" fill="${e.soldOut ? '#D61F45' : '#5B4F78'}" font-weight="${e.soldOut ? 700 : 400}" ${HAND}>${esc(line2)}</text>` +
    tape + `</svg>`;
}

// SVG markup → <img> through a blob URL (the browser draws it once, like any picture). The URL is freed when the
// picture is drawn, or, with `keep`, pushed to that array so the album frees them all when it closes.
export function photoImg(svg, { alt = '', cls = '', keep = null } = {}) {
  const img = h('img', { class: `al-img ${cls}`, alt, decoding: 'async', draggable: 'false', style: { width: '100%', height: 'auto', display: 'block' } });
  if (!svg) return img;
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    if (keep) keep.push(url);
    else {
      const free = () => setTimeout(() => URL.revokeObjectURL(url), 1500);
      img.addEventListener('load', free, { once: true });
      img.addEventListener('error', free, { once: true });
    }
    img.src = url;
  } catch { img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  return img;
}

export const EXPORT_W = 1080;
export const EXPORT_H = Math.round((EXPORT_W * 340) / 400);
