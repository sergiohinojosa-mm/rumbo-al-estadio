// Arte de "Rumbo al Estadio": todo en SVG como strings, sin imágenes externas.
// Estilo: ilustración plana, formas redondeadas, contorno morado tinta (#2E2240) tipo sticker.
// Cada llamada usa ids únicos (contador) para que varias copias convivan en la misma página.
import { h } from '../util.js';

let SEQ = 0;
const RUN = Math.random().toString(36).slice(2, 4);
const nid = () => 'r' + RUN + (++SEQ).toString(36);
const INK = '#2E2240';
// Contornos por clase (ahorra bytes). Cada <svg> trae su <style>; los nombres llevan prefijo para no chocar.
const OL = 'class="rao"';
const OLT = 'class="rat"';
const STYLE = `<style>.rao{stroke:${INK};stroke-width:1.4px;stroke-linejoin:round}.rat{stroke:${INK};stroke-width:1px;stroke-linejoin:round}.ral{fill:none;stroke-linecap:round;stroke-linejoin:round}.raa{fill:none;stroke:${INK};stroke-width:8.8px;stroke-linecap:round}.rab{fill:none;stroke-width:6px;stroke-linecap:round}</style>`;
// Nivel de detalle: 1 = figuras chicas dentro de escenas y pósters (sin brillitos ni detalles finos).
let LOD = 0;
const withLod = (lod, fn) => { const prev = LOD; LOD = lod; try { return fn(); } finally { LOD = prev; } };
// Biblioteca de trazos dentro de una escena/póster: un mismo "d" se define una vez y se reusa con <use>.
let LIB = null;
const P = (d, attrs = '') => {
  if (!LIB || d.length < 48) return `<path d="${d}" ${attrs}/>`;
  if (!LIB.m.has(d)) LIB.m.set(d, LIB.m.size.toString(36));
  return `<use href="#${LIB.id}${LIB.m.get(d)}" ${attrs}/>`;
};
const withLib = (fn) => { const prev = LIB; LIB = { id: nid() + 'L', m: new Map() }; try { const out = fn(); return { out, defs: [...LIB.m].map(([d, k]) => `<path id="${LIB.id}${k}" d="${d}"/>`).join('') }; } finally { LIB = prev; } };
// Muchos puntos en un solo path (estrellas, motas de fotocopia): "M x y h0" con punta redonda.
const dots = (pts, c, w = 2, op = 1) => `<path d="${pts.map(([x, y]) => `M${r1(x)} ${r1(y)}h0`).join('')}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const FONT = `font-family="ui-rounded,'SF Pro Rounded','Arial Rounded MT Bold','Avenir Next',system-ui,sans-serif"`;
const HAND = `font-family="'Marker Felt','Chalkboard SE','Comic Sans MS',cursive"`;
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const jit = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// Compacta el markup: sin espacio antes de negativos en trazos, hex cortos y sin scale(1).
const minify = (m) => m.replace(/ (d|points)="([^"]*)"/g, (_, k, v) => ` ${k}="${v.replace(/ -/g, '-').replace(/([A-Za-z]) /g, '$1')}"`)
  .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3(?![0-9a-fA-F])/g, '#$1$2$3').replace(/ scale\(1\)/g, '');
// Envoltura <svg>. Con size fija ancho/alto; sin size se estira al 100% del contenedor.
function svg(w, hgt, body, { size, label = '', cls = '' } = {}) {
  const dim = size ? `width="${size}" height="${r1((size * hgt) / w)}"` : 'style="width:100%;height:auto;display:block"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" ${dim} role="img" aria-label="${esc(label)}"${cls ? ` class="${cls}"` : ''}>${STYLE}${minify(body)}</svg>`;
}

// ---------------------------------------------------------------- Opciones del look
const o = (id, label, x = {}) => ({ id, label, ...x });
export const LOOKS = {
  skin: [o('porcelana', 'Porcelana', { color: '#FCE6D8' }), o('clara', 'Clara', { color: '#F7D5C0' }), o('miel', 'Miel', { color: '#E6B08A' }),
    o('canela', 'Canela', { color: '#C4865D' }), o('cacao', 'Cacao', { color: '#8B5A3C' })],
  hair: [o('caramelo', 'Caramelo', { color: '#A86F3E', tip: '#E6BA80' }), o('chocolate', 'Chocolate', { color: '#5B3521', tip: '#80553A' }),
    o('negro', 'Negro', { color: '#2A1F22', tip: '#4A3840' }), o('rubio', 'Rubio', { color: '#E0B464', tip: '#F7E0A8' }),
    o('cobrizo', 'Cobrizo', { color: '#B4532D', tip: '#E08A55' }), o('rosa', 'Rosa pop', { color: '#F27BB8', tip: '#C9A7FF', lock: true })],
  style: [o('ondulado', 'Largo ondulado'), o('lacio', 'Lacio'), o('chongos', 'Chongos'), o('rizado', 'Rizado'), o('corto', 'Corto'), o('coleta', 'Coleta'), o('recogido', 'Chongo bajo')],
  eyes: [o('grisazul', 'Azul grisáceo', { color: '#6F90A8' }), o('cafe', 'Café', { color: '#6B4329' }), o('verde', 'Verde', { color: '#5F8F58' }), o('miel', 'Miel', { color: '#A9772F' })],
  outfit: [o('playera', 'Playera', { icon: '👕' }), o('vestido', 'Vestido', { icon: '👗' }), o('sudadera', 'Sudadera', { icon: '🧥' }),
    o('overol', 'Overol', { icon: '👖' }), o('rayas', 'Suéter de rayas', { icon: '🧶' }), o('chamarra', 'Chamarra rockera', { icon: '🤘', lock: true })],
  color: [o('blanco', 'Blanco', { color: '#FBF8FF', accent: '#69B4F0' }), o('chicle', 'Chicle', { color: '#FF6FAE', accent: '#FFE36E' }),
    o('cielo', 'Cielo', { color: '#6CB6F2', accent: '#FF6FAE' }), o('lila', 'Lila', { color: '#B48CF2', accent: '#FFE36E' }),
    o('menta', 'Menta', { color: '#58CFA6', accent: '#FF6FAE' }), o('sol', 'Sol', { color: '#FFC83D', accent: '#E0338A' }),
    o('grafito', 'Grafito', { color: '#4A4656', accent: '#FFC83D' })],
  acc: [o('ninguno', 'Nada'), o('cadenita', 'Cadenita con púa'), o('flores', 'Diadema de flores'), o('audifonos', 'Audífonos', { lock: true }),
    o('lentes', 'Lentes'), o('mono', 'Moño'), o('arracadas', 'Arracadas')],
  guitar: [o('cielo', 'Azul cielo', { color: '#7CC6F4' }), o('chicle', 'Chicle', { color: '#FF77B5' }), o('morado', 'Morado', { color: '#9A6BF0', lock: true }),
    o('menta', 'Menta', { color: '#4FD1A8', lock: true }), o('sol', 'Sol', { color: '#FFC83D', lock: true }), o('galaxia', 'Galaxia', { color: '#2D2766', lock: true })],
  sticker: [o('estrella', 'Estrella'), o('corazon', 'Corazón'), o('rayo', 'Rayo', { lock: true })],
};
export const DEFAULT_LOOK = { skin: 'clara', hair: 'chocolate', style: 'coleta', eyes: 'cafe', outfit: 'playera', color: 'cielo', acc: 'ninguno', guitar: 'cielo', sticker: 'estrella' };
export const MARIEL_LOOK = { skin: 'clara', hair: 'caramelo', style: 'ondulado', eyes: 'grisazul', outfit: 'vestido', color: 'blanco', acc: 'cadenita', guitar: 'cielo', sticker: 'estrella' };
// Luciana (12): castaño oscuro a chongo bajo con mechones ondulados, ojos cafés, arracadas, playera gris con girasoles
// en cuadritos y sus tres pulseras. print y wrist son extras del preset (el editor no los cambia).
export const LUCIANA_LOOK = { skin: 'clara', hair: 'chocolate', style: 'recogido', eyes: 'cafe', outfit: 'playera', color: 'grafito', acc: 'arracadas', guitar: 'chicle', sticker: 'corazon', print: 'girasol', wrist: 'tres' };

// ¿Está libre esta opción? Guitarra y calcomanía usan unlocks.guitar; lo demás, unlocks.look.
export function isUnlocked(kind, id, unlocks = {}) {
  const opt = (LOOKS[kind] || []).find((x) => x.id === id);
  if (!opt || !opt.lock) return true;
  const list = (kind === 'guitar' || kind === 'sticker' ? unlocks.guitar : unlocks.look) || [];
  return list.includes(id);
}

const pick = (kind, v) => LOOKS[kind].find((x) => x.id === v) || LOOKS[kind][0];
const colorOf = (kind, v) => (typeof v === 'string' && v[0] === '#' ? v : pick(kind, v).color);

function lookSpec(look = {}) {
  const L = { ...DEFAULT_LOOK, ...look };
  const hair = pick('hair', L.hair), col = pick('color', L.color);
  return {
    kind: 'kid', skin: colorOf('skin', L.skin), hair: colorOf('hair', L.hair), tip: hair.tip, style: pick('style', L.style).id,
    eyes: colorOf('eyes', L.eyes), lash: true, mouth: 'calm', outfit: pick('outfit', L.outfit).id, top: colorOf('color', L.color),
    accent: col.accent || '#FF6FAE', acc: [pick('acc', L.acc).id], bracelet: true, print: L.print, wrist: L.wrist,
    kind: L.kind || 'kid', mouth: L.mouth || 'calm', brow: L.brow,
    guitar: { color: colorOf('guitar', L.guitar), sticker: pick('sticker', L.sticker).id, galaxy: L.guitar === 'galaxia' },
  };
}

// ---------------------------------------------------------------- Piezas chicas
const STICK = {
  estrella: '<path d="M0 -4.6L1.4 -1.5L4.6 -1.3L2.1 .9L2.9 4.3L0 2.5L-2.9 4.3L-2.1 .9L-4.6 -1.3L-1.4 -1.5Z" fill="#FF4FA0" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/>',
  corazon: '<path d="M0 4C-5.4 .4 -5.2 -4 -2.6 -4C-1.2 -4 0 -3 0 -1.8C0 -3 1.2 -4 2.6 -4C5.2 -4 5.4 .4 0 4Z" fill="#FF3D6E" stroke="#fff" stroke-width="1.1"/>',
  rayo: '<path d="M1.2 -5L-3.2 1H-.2L-1.2 5L3.2 -1H.2Z" fill="#FFD23D" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>',
  dino: '<path d="M-4 3L-4 0Q-4 -2 -1 -2L1 -2L2 -4.4Q4.6 -4.6 4.6 -2.6L3.4 -1.6L3 1L4 3H2.4L1.6 1.6L-1.6 1.6L-2.4 3Z" fill="#2E9E5B" stroke="#fff" stroke-width=".9" stroke-linejoin="round"/>',
};
const PRINT = {
  girasol: () => (LOD ? dots([[-5, -3], [5, -3], [0, 4]], '#FFC83D', 3.4) : `<path d="M-9 -7h6v6h-6zM3 -7h6v6h-6zM-3 -1h6v6h-6zM-9 5h6v6h-6zM3 5h6v6h-6z" fill="#6A6578"/>` +
    [[-6, -4], [6, -4], [0, 2], [-6, 8], [6, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#FFC83D"/><circle cx="${x}" cy="${y}" r=".9" fill="#7A4A2C"/>`).join('')),
  star: (c) => `<path d="M0 -4.6L1.4 -1.5L4.6 -1.3L2.1 .9L2.9 4.3L0 2.5L-2.9 4.3L-2.1 .9L-4.6 -1.3L-1.4 -1.5Z" fill="${c}"/>`,
  heart: (c) => `<path d="M0 4C-5.4 .4 -5.2 -4 -2.6 -4C-1.2 -4 0 -3 0 -1.8C0 -3 1.2 -4 2.6 -4C5.2 -4 5.4 .4 0 4Z" fill="${c}"/>`,
  bolt: (c) => `<path d="M1.6 -6.4L-4 1.2H-.3L-1.6 6.4L4 -1.2H.3Z" fill="${c}" ${OLT}/>`,
};
function note(x, y, c, rot = -10) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="2.7" ry="2.1" fill="${c}"/><path d="M2.3 0V-10Q6.4 -8.2 6 -3.6" stroke="${c}" stroke-width="1.5" class="ral"/></g>`;
}

function guitarMk(x, y, ang, g = {}) {
  const c = g.color || '#7CC6F4', nl = g.bass ? 50 : 40, s = g.scale || 1;
  const stk = g.sticker && STICK[g.sticker] ? `<g transform="translate(-8 3.6) rotate(-12) scale(.95)">${STICK[g.sticker]}</g>` : '';
  const extra = g.bass && g.sticker === 'dino' ? `<g transform="translate(-10 -4) scale(.7)">${STICK.dino}</g>` : '';
  const sparkle = g.galaxy ? '<g fill="#fff"><circle cx="-11" cy="-4" r=".8"/><circle cx="8" cy="5" r=".7"/><circle cx="-4" cy="8" r=".6"/><circle cx="6" cy="-8" r=".7"/></g>' : '';
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${ang}) scale(${s})">` +
    `<rect x="6" y="-2.3" width="${nl}" height="4.6" rx="1.2" fill="#A06E40" ${OLT}/>` +
    `<path d="M${nl + 5} -3.6L${nl + 14} -5.4Q${nl + 16.5} 0 ${nl + 14} 5.4L${nl + 5} 3.6Z" fill="${c}" ${OLT}/>` +
    (LOD ? '' : dots([[nl + 9, -3], [nl + 12, -3.4], [nl + 9, 3], [nl + 12, 3.4]], '#F4EFFA', 1.8)) +
    P('M-15.5 0C-16.5 -9 -9 -13.5 -4 -9.5C-1 -12.5 6 -13.5 8.5 -8.5C11 -6.5 12.5 -3 12.5 0C12.5 3 11 6.5 8.5 8.5C6 13.5 -1 12.5 -4 9.5C-9 13.5 -16.5 9 -15.5 0Z', `fill="${c}" ${OL}`) + sparkle +
    P('M-11.5 3.5C-12.5 -3 -7 -6 -2 -4.5H6V4.5H-2C-5 8.5 -10.5 8.5 -11.5 3.5Z', 'fill="#fff" opacity=".88"') +
    (LOD ? '' : `<path d="M.6 -3V3M4.6 -3V3" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`) +
    (LOD ? '' : `<rect x="-8.5" y="-3.2" width="2" height="6.4" rx=".6" fill="#B9B1C9"/><path d="M-7.5 -1.2H${nl + 6}M-7.5 1.2H${nl + 6}" stroke="#F4EFFA" stroke-width=".5"/><circle cx="7.5" cy="6" r="1.2" fill="#F4EFFA" ${OLT}/>`) + `${stk}${extra}</g>`;
}

function keytarMk(x, y, ang) {
  return `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M-18 -6.5H14L25 -3V3L14 6.5H-18Q-21.5 0 -18 -6.5Z" fill="#8B5CF6" ${OL}/>` +
    `<rect x="-14" y="-3.6" width="26" height="7.2" rx="1" fill="#fff" ${OLT}/><path d="M-10 -3.6v4.2M-6 -3.6v4.2M-1 -3.6v4.2M3 -3.6v4.2M7 -3.6v4.2" stroke="${INK}" stroke-width="1.7"/>` +
    `<rect x="24" y="-2.2" width="13" height="4.4" rx="2.2" fill="#6D3FD8" ${OLT}/><circle cx="-16" cy="0" r="1.5" fill="#FFC83D"/><circle cx="18" cy="0" r="1.3" fill="#5EE6C8"/></g>`;
}

function micMk(H, rot = -14) {
  return `<g transform="translate(${r1(H[0])} ${r1(H[1])}) rotate(${rot})"><rect x="-1.8" y="-3" width="3.6" height="12" rx="1.6" fill="#4A4458" ${OLT}/>` +
    `<circle cy="-6.4" r="4.2" fill="#CFCADB" ${OLT}/><path d="M-3.2 -7.4h6.4M-3.6 -5.2h7.2" stroke="#8C869C" stroke-width=".7"/>` +
    `<path d="M1.8 1q5 1 6.2 5.6M1.8 1q5 -2.4 7.4 0" stroke="#FFD23D" stroke-width="1.9" class="ral"/></g>`;
}

function unicornMk(x, y, s = 1, sleepy = false) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><path d="M-6 10v5M-1 11v5M4 11v5M8 10v4" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M-6 10v5M-1 11v5M4 11v5M8 10v4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>` +
    `<ellipse cx="1" cy="6" rx="10" ry="7.5" fill="#fff" ${OL}/><path d="M10 4q5 -1 5 5q-3 -2 -5 -1z" fill="#C9A7FF" ${OLT}/>` +
    `<circle cx="-2" cy="-6" r="8" fill="#fff" ${OL}/><path d="M-4 -13L-2 -25L1 -13Z" fill="#FFC83D" ${OLT}/><path d="M-3.4 -16l3 -1M-2.8 -19.5l2.6 -1" stroke="#E09A1C" stroke-width=".7"/>` +
    `<path d="M-9 -11L-10.5 -17.5L-5.5 -13Z" fill="#fff" ${OLT}/><path d="M3 -11Q10 -12 10.5 -5Q7.5 -8 3.5 -8.5Z" fill="#fff" ${OLT}/>` +
    `<g ${OLT}><circle cx="-9" cy="-9" r="3" fill="#FF8CC6"/><circle cx="-10.5" cy="-4.5" r="3" fill="#C9A7FF"/><circle cx="-10" cy=".5" r="2.8" fill="#8FD3FF"/></g>` +
    `<ellipse cx="-1" cy="-2.6" rx="5" ry="3.4" fill="#FFE1EE"/><circle cx="-3" cy="-2.4" r=".7" fill="${INK}"/><circle cx="1" cy="-2.4" r=".7" fill="${INK}"/>` +
    (sleepy ? `<path d="M-6 -7.5q1.5 1.4 3 0M0 -7.5q1.5 1.4 3 0" stroke="${INK}" stroke-width="1" class="ral"/>` : `<circle cx="-4.5" cy="-7.6" r="1.2" fill="${INK}"/><circle cx="1.5" cy="-7.6" r="1.2" fill="${INK}"/>`) +
    `<circle cx="4.5" cy="-4" r="1.6" fill="#FF8CC6" opacity=".6"/></g>`;
}

// Letrero de Juju: "VAMOS {NOMBRE}" letra por letra, chuequito, con la N al revés.
// Si el nombre no tiene N (MARIEL), voltea la S de VAMOS para que conserve el chiste.
function signMk(name, cx, cy, wpx, level = 0) {
  const l2 = String(name || 'MARIEL').toUpperCase().slice(0, 12);
  const adv = 7.6, W = Math.max(5, l2.length) * adv + 12, H = 34;
  const hasN = l2.includes('N');
  const line = (txt, y, col, li) => {
    const ch = [...txt], xs = ch.map((_, i) => r1((i - (ch.length - 1) / 2) * adv)), rot = ch.map((_, i) => Math.round((jit(i + li * 7) - 0.5) * 16));
    const flip = ch.map((c) => c === 'N' || (!hasN && li === 0 && c === 'S'));
    const plain = ch.map((c, i) => (flip[i] ? ' ' : esc(c))).join('');
    return `<text x="${xs.join(' ')}" y="${y}" rotate="${rot.join(' ')}" fill="${col}" xml:space="preserve">${plain}</text>` +
      ch.map((c, i) => (flip[i] ? `<text transform="translate(${xs[i]} ${y}) rotate(${rot[i]}) scale(-1 1)" fill="${col}">${c}</text>` : '')).join('');
  };
  const deco = level > 0 ? `<g fill="#FFC83D" ${OLT}><path d="M${-W / 2 + 4} ${-H / 2 + 6}l1.5 -4 1.5 4 -4 -2.4h5z"/><path d="M${W / 2 - 8} ${H / 2 - 5}l1.5 -4 1.5 4 -4 -2.4h5z"/></g>` : '';
  const glit = level > 1 ? `<path d="M${-W / 2 + 2} ${-H / 2 + 2}H${W / 2 - 2}V${H / 2 - 2}H${-W / 2 + 2}Z" fill="none" stroke="#FF6FAE" stroke-width="2" stroke-dasharray="1 3" stroke-linecap="round"/>` : '';
  return `<g transform="translate(${r1(cx)} ${r1(cy)}) scale(${r1((wpx / W) * 100) / 100})"><path d="M${-W / 2} ${-H / 2 + 1.5}L${W / 2 - 1} ${-H / 2}L${W / 2} ${H / 2 - 1.5}L${-W / 2 + 1.5} ${H / 2}Z" fill="#DDA56B" ${OL}/>${glit}${deco}` +
    `<g font-size="11" font-weight="700" text-anchor="middle" ${HAND}>${line('VAMOS', -3, '#E0338A', 0)}${line(l2, 12, '#6B3FD0', 1)}</g></g>`;
}

// ---------------------------------------------------------------- Cabeza (coordenadas locales: cara centrada en 0,0)
const MOUTH = {
  calm: '<path d="M-3.8 12.2Q0 15.6 3.8 12.2" stroke="#9A3D4E" stroke-width="1.5" class="ral"/>',
  open: '<path d="M-4.6 11.5Q0 12.6 4.6 11.5Q4.2 17.6 0 17.6Q-4.2 17.6 -4.6 11.5Z" fill="#8E2F45" stroke="#8E2F45" stroke-width=".8" stroke-linejoin="round"/><path d="M-2.4 16.2Q0 14.6 2.4 16.2Q0 17.4 -2.4 16.2Z" fill="#F27D8D"/>',
  grin: '<path d="M-5 11.4Q0 12.8 5 11.4Q4.4 17.2 0 17.2Q-4.4 17.2 -5 11.4Z" fill="#8E2F45"/><path d="M-4.4 12.1Q0 13.2 4.4 12.1L4 13.8Q0 14.6 -4 13.8Z" fill="#fff"/>',
  smirk: '<path d="M-3.4 13.2Q1 15 4.4 11.6" stroke="#9A3D4E" stroke-width="1.5" class="ral"/>',
  o: '<ellipse cx="0" cy="13.6" rx="2.4" ry="3" fill="#8E2F45"/>',
  line: '<path d="M-2.6 13.4Q0 14.2 2.6 13.4" stroke="#9A3D4E" stroke-width="1.5" class="ral"/>',
};

function face(sp) {
  const sk = sp.skin, dk = mix(sk, '#7A3B2E', 0.35);
  let s = (LOD ? '' : `<circle cx="-19.5" cy="4" r="4" fill="${sk}" ${OL}/><circle cx="19.5" cy="4" r="4" fill="${sk}" ${OL}/>`) +
    P('M-20 -2C-20 -15 -11 -21 0 -21C11 -21 20 -15 20 -2C20 12 11 21 0 21C-11 21 -20 12 -20 -2Z', `fill="${sk}" ${OL}`);
  if (sp.eyeShape === 'happy') s += `<path d="M-10.5 4Q-7.5 -.4 -4.5 4M4.5 4Q7.5 -.4 10.5 4" stroke="${INK}" stroke-width="1.8" class="ral"/>`;
  else {
    if (LOD) s += `<ellipse cx="-7.5" cy="3" rx="3.4" ry="4" fill="#1E1626"/><ellipse cx="7.5" cy="3" rx="3.4" ry="4" fill="#1E1626"/>${dots([[-6.3, 1.6], [8.7, 1.6]], '#fff', 2.2)}`;
    else s += [-7.5, 7.5].map((x) => `<ellipse cx="${x}" cy="3" rx="3.3" ry="3.9" fill="${sp.eyes}"/><circle cx="${x}" cy="3.6" r="1.8" fill="#1E1626"/><circle cx="${x + 1.1}" cy="1.7" r="1.15" fill="#fff"/>`).join('');
    if (!LOD) s += `<path d="M-11.3 .6Q-8 -1.9 -4.3 -.2M4.3 -.2Q8 -1.9 11.3 .6" stroke="#1E1626" stroke-width="${sp.lash ? 1.6 : 1.1}" class="ral"/>`;
    if (sp.lash && !LOD) s += '<path d="M-11.3 .6l-1.8 -1.1M11.3 .6l1.8 -1.1" stroke="#1E1626" stroke-width="1.1" stroke-linecap="round"/>';
  }
  if (sp.brows !== false && !LOD) s += `<path d="M-10.5 -5Q-7.5 -7.2 -4.5 -5.7M4.5 -5.7Q7.5 -7.2 10.5 -5" stroke="${sp.brow || mix(sp.hair, INK, 0.3)}" stroke-width="${sp.browW || 1.5}" class="ral"/>`;
  const bl = sp.blush || 0.5;
  s += LOD ? dots([[-12.6, 9.6], [12.6, 9.6]], '#F37E92', 5, bl) : `<ellipse cx="-12.6" cy="9.6" rx="3.7" ry="2.3" fill="#F37E92" opacity="${bl}"/><ellipse cx="12.6" cy="9.6" rx="3.7" ry="2.3" fill="#F37E92" opacity="${bl}"/>`;
  if (sp.freckles && !LOD) s += `<g fill="${dk}"><circle cx="-13.5" cy="6.6" r=".7"/><circle cx="-11" cy="7.4" r=".7"/><circle cx="-12.4" cy="5" r=".6"/><circle cx="13.5" cy="6.6" r=".7"/><circle cx="11" cy="7.4" r=".7"/><circle cx="12.4" cy="5" r=".6"/></g>`;
  if (!LOD) s += `<path d="M-1 7.6Q0 8.7 1 7.6" stroke="${dk}" stroke-width="1.1" class="ral"/>`;
  const m = MOUTH[sp.mouth] || MOUTH.calm;
  s += sp.lips ? m.replaceAll('#9A3D4E', sp.lips) : m;
  return s;
}

function hairParts(sp, ctx) {
  const c = sp.hair, tip = sp.tip || mix(c, '#ffffff', 0.25), hl = mix(c, '#ffffff', 0.3);
  let fill = c, defs = '';
  if (sp.style === 'ondulado' || sp.style === 'lacio') {
    const gid = ctx.id + 'g';
    defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${tip}"/></linearGradient>`;
    fill = `url(#${gid})`;
  }
  const F = `fill="${fill}" ${OL}`, C = `fill="${c}" ${OL}`;
  const tie = sp.tie || '#FF6FAE';
  const curls = (list) => { const cs = list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join(''); return `<g fill="${c}" stroke="${INK}" stroke-width="2.8">${cs}</g><g fill="${c}">${cs}</g>`; };
  const shine = (d) => LOD ? '' : `<path d="${d}" stroke="${hl}" stroke-width="1.6" class="ral" opacity=".75"/>`;
  let back = '', front = '';
  switch (sp.style) {
    case 'ondulado':
      back = `${P('M0 -27C-17 -27 -26 -16 -24 -2C-22 10 -30 18 -26 30C-23 40 -31 48 -24 57C-18 63 -9 60 -5 55L5 55C9 60 18 63 24 57C31 48 23 40 26 30C30 18 22 10 24 -2C26 -16 17 -27 0 -27Z', F)}` +
        shine('M-26 34C-24 41 -28 46 -23 52M26 34C24 41 28 46 23 52');
      front = `${P('M0 -27C-15 -27 -23 -18 -23 -5C-23 5 -19 10 -23 18C-27 26 -21 31 -23 39C-16 36 -15 28 -17 21C-19 14 -15 8 -16 0C-16 -9 -9 -15 0 -16.5ZM0 -27C15 -27 23 -18 23 -5C23 5 19 10 23 18C27 26 21 31 23 39C16 36 15 28 17 21C19 14 15 8 16 0C16 -9 9 -15 0 -16.5Z', F)}` +
        shine('M-19 -10C-21 -2 -17 4 -20 12M19 -10C21 -2 17 4 20 12M-9 -22Q-14 -19 -16 -13');
      break;
    case 'lacio':
      back = `${P('M0 -27C-17 -27 -24 -16 -24 -2L-25 52L-17 56L-8 53L0 56L8 53L17 56L25 52L24 -2C24 -16 17 -27 0 -27Z', F)}`;
      front = `${P('M7 -27C-12 -28 -23 -17 -23 -2L-23 36L-17.5 36L-16.5 0C-14 -10 -6 -12 7 -17C10 -12 14 -8 16.5 -2L17.5 36L23 36L23 -2C24 -17 18 -27 7 -27Z', F)}` + shine('M-13 -20Q-18 -14 -19 -4M14 -22Q19 -16 20 -6');
      break;
    case 'chongos':
      back = `<circle cx="-15" cy="-23" r="9.5" ${C}/><circle cx="15" cy="-23" r="9.5" ${C}/>${P('M-21 6C-25 -18 -12 -27 0 -27C12 -27 25 -18 21 6Z', C)}` + shine('M-19 -26Q-15 -30 -10 -27M10 -27Q15 -30 19 -26');
      front = `${P('M0 -26C-14 -26 -21 -18 -21 -4C-19 -3 -17 -2 -16 0C-16 -9 -9 -15 0 -16.5ZM0 -26C14 -26 21 -18 21 -4C19 -3 17 -2 16 0C16 -9 9 -15 0 -16.5Z', C)}` +
        `<path d="M-21 -18Q-15 -13 -9 -17M9 -17Q15 -13 21 -18" stroke="${tie}" stroke-width="2.6" class="ral"/>`;
      break;
    case 'rizado':
      back = curls([[-24, -8, 9], [-26, 6, 9], [-25, 20, 9], [-21, 31, 8], [24, -8, 9], [26, 6, 9], [25, 20, 9], [21, 31, 8], [-17, -21, 10], [0, -27, 10], [17, -21, 10], [-9, -26, 9], [9, -26, 9], [-12, 30, 7], [12, 30, 7]]);
      front = curls([[-15, -15, 6.5], [-6, -19.5, 7], [5, -19.5, 7], [14, -15, 6.5], [19.5, -7, 5], [-19.5, -7, 5]]) + shine('M-8 -24Q-4 -26 0 -24M12 -20Q16 -19 17 -16');
      break;
    case 'corto':
      back = `${P('M-24 14C-27 -14 -14 -27 0 -27C14 -27 27 -14 24 14C21 18 15 18 13 15L-13 15C-15 18 -21 18 -24 14Z', C)}`;
      front = `${P('M-23 14C-25 -16 -12 -27 0 -27C12 -27 25 -16 23 14L18 14C18 2 17 -6 15 -10C10 -7 4 -9 0 -12C-4 -9 -10 -7 -15 -10C-17 -6 -18 2 -18 14Z', C)}` + shine('M-10 -22Q-15 -19 -17 -12M8 -23Q12 -22 14 -19');
      break;
    case 'coleta':
      back = `${P('M10 -24C30 -31 37 -8 31 12C28 24 34 32 27 41C23 32 19 26 20 13C21 0 18 -10 10 -14Z', C)}${P('M-21 4C-24 -18 -11 -27 0 -27C11 -27 24 -18 21 4Z', C)}` + shine('M27 -6Q31 6 26 18');
      front = `${P('M-21 2C-23 -20 -10 -27 2 -27C14 -27 23 -19 21 0C18 -9 12 -15 3 -16.5C-6 -16 -15 -11 -21 2Z', C)}<circle cx="16" cy="-21" r="3.6" fill="${tie}" ${OLT}/>` + shine('M-12 -21Q-16 -17 -18 -10');
      break;
    case 'chongosBajos':
      back = `<circle cx="-21" cy="-1" r="8.5" ${C}/><circle cx="21" cy="-1" r="8.5" ${C}/>${P('M-21 4C-24 -18 -11 -27 0 -27C11 -27 24 -18 21 4Z', C)}`;
      front = `${P('M-21 2C-23 -20 -11 -27 0 -27C11 -27 23 -20 21 2C20 -5 19 -8 18 -9.5L-18 -9.5C-19 -8 -20 -5 -21 2Z', C)}` + shine('M-10 -22Q-4 -24.5 2 -24');
      break;
    case 'coletas':
      back = `${P('M-19 -8C-31 -10 -36 6 -31 18C-28 11 -24 6 -18 4Z', C)}${P('M19 -8C31 -10 36 6 31 18C28 11 24 6 18 4Z', C)}${P('M-21 4C-24 -18 -11 -27 0 -27C11 -27 24 -18 21 4Z', C)}`;
      front = `${P('M0 -26C-14 -26 -21 -18 -21 -4C-19 -3 -17 -2 -16 0C-16 -9 -9 -15 0 -16.5ZM0 -26C14 -26 21 -18 21 -4C19 -3 17 -2 16 0C16 -9 9 -15 0 -16.5Z', C)}` +
        `<circle cx="-20" cy="-6" r="3.4" fill="${tie}" ${OLT}/><circle cx="20" cy="-6" r="3.4" fill="${tie}" ${OLT}/>`;
      break;
    case 'chongo':
      back = `<circle cx="0" cy="-29" r="9.5" ${C}/>${P('M-21 6C-25 -18 -12 -27 0 -27C12 -27 25 -18 21 6Z', C)}`;
      front = `${P('M-21 2C-23 -20 -10 -26.5 0 -26.5C10 -26.5 23 -20 21 2C18 -9 10 -15 0 -16.5C-10 -15 -18 -9 -21 2Z', C)}` + shine('M-12 -21Q-17 -16 -18 -8M-4 -33Q0 -36 5 -33');
      break;
    case 'medioRecogido':
      back = `<circle cx="0" cy="-30" r="7.5" ${C}/>` + curls([[-14, -20, 9], [0, -25, 9], [14, -20, 9], [-23, -6, 8], [-25, 8, 8], [-25, 22, 8], [-23, 35, 7.5], [-16, 44, 7], [23, -6, 8], [25, 8, 8], [25, 22, 8], [23, 35, 7.5], [16, 44, 7]]);
      front = `${P('M-21 2C-23 -20 -10 -26.5 0 -26.5C10 -26.5 23 -20 21 2C18 -9 10 -15 0 -16.5C-10 -15 -18 -9 -21 2Z', C)}` + curls([[-20.5, 5, 4.6], [20.5, 5, 4.6]]) + shine('M-12 -21Q-17 -16 -18 -8M8 -24Q14 -22 17 -17');
      break;
    case 'bobLado':
      back = P('M-24 14C-27 -14 -14 -27 0 -27C14 -27 27 -14 24 14C21 18 15 18 13 15L-13 15C-15 18 -21 18 -24 14Z', C);
      front = P('M8 -27C-12 -28 -25 -16 -23 15L-18 15C-19 2 -16 -8 -11 -12C-3 -12 4 -14 8 -17.5C12 -12 16 -7 18 1L18 15L23 15C25 -16 18 -27 8 -27Z', C) +
        `<path d="M-20 -6Q-21 4 -20 12M-14 -20Q-6 -22 4 -21M14 -20Q20 -12 20 0" stroke="${tip}" stroke-width="2" class="ral" opacity=".8"/>` + shine('M-8 -24Q-2 -25.5 6 -24');
      break;
    case 'recogido':
      back = P('M-21 6C-25 -18 -12 -27 0 -27C12 -27 25 -18 21 6Z', C);
      front = P('M15 10C24 10 28 18 25 28C23 36 27 42 22 48C18 40 16 34 17 26C18 20 16 16 13 15Z', C) + `<path d="M13 12Q17 16 21 13" stroke="${tie}" stroke-width="2.4" class="ral"/>` + `${P('M-21 2C-23 -20 -10 -26.5 0 -26.5C10 -26.5 23 -20 21 2C18 -9 10 -15 0 -16.5C-10 -15 -18 -9 -21 2Z', C)}` +
        `<path d="M-18 -8q-4 6 -1 10t-1 9M18 -8q4 6 1 10t1 9" stroke="${c}" stroke-width="2" class="ral"/>` + shine('M-12 -21Q-17 -16 -18 -8M2 -24Q10 -24 15 -19');
      break;
    case 'chongoAlto':
      back = `<circle cx="3" cy="-31" r="8.5" ${C}/>${P('M-21 6C-25 -18 -12 -27 0 -27C12 -27 25 -18 21 6Z', C)}`;
      front = `${P('M-21 2C-23 -20 -10 -26.5 0 -26.5C10 -26.5 23 -20 21 2C18 -9 10 -15 0 -16.5C-10 -15 -18 -9 -21 2Z', C)}<path d="M-3 -25Q3 -27 9 -24" stroke="${tie}" stroke-width="2.6" class="ral"/>` +
        `<path d="M-17 -8q-3 6 0 11M16 -9q4 5 1 10M-4 -16q-3 4 -1 8" stroke="${c}" stroke-width="1.8" class="ral"/>` + shine('M-12 -21Q-17 -16 -18 -8');
      break;
    case 'papa': {
      const grey = '#9A9590';
      front = curls([[-13, -17, 6.5], [-5, -23, 7.5], [4, -24, 7.5], [12, -19, 6.5], [-17, -10, 4.5], [17, -10, 4.5]]) +
        `<g fill="${grey}" ${OLT}><circle cx="-20" cy="-5" r="4.4"/><circle cx="-20.5" cy="2" r="3.6"/><circle cx="20" cy="-5" r="4.4"/><circle cx="20.5" cy="2" r="3.6"/></g>` +
        (LOD ? '' : dots([[-10, -20], [6, -27], [14, -17]], grey, 2.4));
      break;
    }
    case 'rizadoCorto':
      front = curls([[-18, -11, 7], [-12, -19.5, 7.5], [-3, -23, 7.5], [7, -22, 7.5], [15, -17, 7], [19.5, -8.5, 6], [-20, -3, 4.5]]);
      break;
    case 'calvo':
      back = `${P('M-20 9C-25 -2 -23 -11 -17 -13C-16 -5 -16 2 -15 9ZM20 9C25 -2 23 -11 17 -13C16 -5 16 2 15 9Z', C)}`;
      front = '<ellipse cx="-6" cy="-15" rx="5" ry="2.4" fill="#fff" opacity=".35" transform="rotate(-20 -6 -15)"/>';
      break;
    case 'chico':
      back = `${P('M-20 4C-23 -10 -20 -21 0 -25C20 -21 23 -10 20 4Z', C)}`;
      front = `${P('M-21 -1C-23 -19 -12 -27.5 1 -27.5C13 -27.5 23 -19 21 -1C19 -9 15 -12 11 -12.5L7.5 -8L4.5 -13.5C-2 -11 -10 -12 -16 -9C-18 -7 -20 -4 -21 -1Z', C)}` + shine('M-8 -23Q-2 -25.5 4 -24');
      break;
    case 'fleco':
      back = `${P('M-21 8C-24 -10 -20 -22 0 -26C20 -22 24 -10 21 8Z', C)}`;
      front = `${P('M-22 5C-24 -18 -12 -27.5 0 -27.5C12 -27.5 24 -18 22 5C20 -1 18.5 -2 17.5 -3L14.5 1.5L11.5 -3.5L7.5 .5L4 -3.5L0 .5L-4 -3.5L-7.5 .5L-11.5 -3.5L-14.5 1.5L-17.5 -3C-18.5 -2 -20 -1 -22 5Z', C)}` + shine('M-10 -22Q-4 -25 3 -24');
      break;
    default: break;
  }
  return { defs, back, front };
}

function headAcc(sp) {
  let s = '';
  for (const a of sp.acc || []) {
    if (a === 'lentes') s += `<g fill="#fff" fill-opacity=".22" stroke="${sp.glasses || '#5A3A6A'}" stroke-width="1.7"><circle cx="-7.5" cy="3" r="5.8"/><circle cx="7.5" cy="3" r="5.8"/><path d="M-1.7 2.2Q0 .8 1.7 2.2M-13.2 2L-19.5 .5M13.2 2L19.5 .5" fill="none"/></g>`;
    if (a === 'shades') s += `<path d="M-14.5 -1.5H-1.5L-2.6 5.6Q-8 9.4 -13.4 5.6ZM14.5 -1.5H1.5L2.6 5.6Q8 9.4 13.4 5.6Z" fill="${sp.shadeColor || '#1E1A26'}" ${OLT}/><path d="M-1.5 -.6H1.5M-14.5 -1L-19.5 -.6M14.5 -1L19.5 -.6" stroke="${INK}" stroke-width="1.4"/><path d="M-11.6 .6l3 3M4 .6l3 3" stroke="#fff" stroke-width="1" opacity=".6"/>` +
      (sp.shadeStars ? '<g fill="#FFD23D"><path d="M-8 2.4l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/><path d="M8 2.4l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/></g>' : '');
    if (a === 'flores') {
      const cols = ['#FF6FAE', '#FFD23D', '#7CC6F4', '#FF8C6B', '#B48CF2'];
      s += [-150, -122, -90, -58, -30].map((deg, i) => { const t = (deg * Math.PI) / 180, x = r1(21 * Math.cos(t)), y = r1(-4 + 24 * Math.sin(t));
        return `<ellipse cx="${x + 2.6}" cy="${y + 2}" rx="2.4" ry="1.2" fill="#5CC27A"/><circle cx="${x}" cy="${y}" r="3.6" fill="${cols[i]}" ${OLT}/><circle cx="${x}" cy="${y}" r="1.3" fill="#FFF3B0"/>`; }).join('');
    }
    if (a === 'audifonos') s += `<path d="M-22 2C-25 -32 25 -32 22 2" fill="none" stroke="${INK}" stroke-width="5.4"/><path d="M-22 2C-25 -32 25 -32 22 2" fill="none" stroke="#FF6FAE" stroke-width="3"/>` +
      `<rect x="-27" y="-4" width="8.5" height="13" rx="4" fill="#FF6FAE" ${OLT}/><rect x="18.5" y="-4" width="8.5" height="13" rx="4" fill="#FF6FAE" ${OLT}/><circle cx="-22.7" cy="2.5" r="2" fill="#FFE36E"/><circle cx="22.7" cy="2.5" r="2" fill="#FFE36E"/>`;
    if (a === 'lentesRect') s += `<g fill="#fff" fill-opacity=".2" stroke="${sp.glasses || '#4A2A5A'}" stroke-width="2"><rect x="-13.6" y="-1.4" width="11.6" height="8.6" rx="2"/><rect x="2" y="-1.4" width="11.6" height="8.6" rx="2"/><path d="M-2 1.4H2M-13.6 1L-19.5 0M13.6 1L19.5 0" fill="none"/></g>` +
      (LOD ? '' : dots([[-12, 0], [-9, 7], [12.6, 4], [4, -1.2], [-3, 6]], '#B5652A', 1.6));
    if (a === 'arracadas') s += `<circle cx="-20" cy="10" r="2.6" fill="none" stroke="#E8B53C" stroke-width="1.3"/><circle cx="20" cy="10" r="2.6" fill="none" stroke="#E8B53C" stroke-width="1.3"/>`;
    if (a === 'mono') s += `<g transform="translate(14 -23) rotate(18)"><path d="M0 0L-9 -5.5Q-11.5 0 -9 5.5ZM0 0L9 -5.5Q11.5 0 9 5.5Z" fill="#FF4F9A" ${OLT}/><circle r="2.6" fill="#FF4F9A" ${OLT}/></g>`;
  }
  return s;
}

// ---------------------------------------------------------------- Cuerpo
const GEO = {
  kid: { hy: 44, hs: 1, sh: 70, hip: 102, foot: 137, w: 13 },
  tall: { hy: 40, hs: 0.95, sh: 65, hip: 101, foot: 138, w: 13.5 },
  adult: { hy: 33, hs: 0.86, sh: 55, hip: 99, foot: 138, w: 15 },
  small: { hy: 62, hs: 0.93, sh: 87, hip: 113, foot: 138, w: 11 },
};

function outfitMk(sp, g, ctx) {
  const { sh, hip, foot, w } = g, L = 50 - w, R = 50 + w;
  const col = sp.top, acc = sp.accent || '#FFFFFF', kind = sp.outfit || 'playera';
  const yw = r1(sh + (hip - sh) * 0.62);
  const torsoD = `M${L} ${sh + 5}Q${L} ${sh - 1} ${L + 6} ${sh - 1}H${R - 6}Q${R} ${sh - 1} ${R} ${sh + 5}L${R + 1} ${hip}Q50 ${hip + 2.5} ${L - 1} ${hip}Z`;
  const skirt = kind === 'vestido' ? null : sp.skirt;
  const bare = kind === 'vestido' || skirt;
  const legD = `M41.5 ${hip - 4}h6.5v${foot - hip + 3}h-6.5zM52 ${hip - 4}h6.5v${foot - hip + 3}h-6.5z`;
  let legs = P(legD, `fill="${bare ? sp.tights || sp.skin : kind === 'overol' ? col : sp.bottom || '#4A5E9C'}" ${OL}`);
  if (sp.platform) legs += `<path d="M37.5 ${foot + 1}h12v5h-12zM50.5 ${foot + 1}h12v5h-12z" fill="#C77DFF" ${OLT}/><path d="M39 ${foot + 3.5}h9M52 ${foot + 3.5}h9" stroke="#fff" stroke-width="1.4" stroke-dasharray="1 2"/>`;
  const ft = sp.platform ? foot - 1 : foot;
  legs += P([43.5, 56.5].map((cx) => `M${cx - 6} ${ft + 3.5}Q${cx - 6} ${ft - 3} ${cx} ${ft - 3}Q${cx + 6} ${ft - 3} ${cx + 6} ${ft + 3.5}Z`).join(''), `fill="${sp.shoe || '#FFFFFF'}" ${OL}`) +
    (LOD ? '' : `<path d="M38 ${ft + 2.2}h11M51 ${ft + 2.2}h11" stroke="${sp.sole || '#FF6FAE'}" stroke-width="1.7"/>`);
  if (sp.lights) legs += `<g><circle cx="40" cy="${ft + 2.2}" r="1.2" fill="#FFE36E"/><circle cx="44" cy="${ft + 2.2}" r="1.2" fill="#7CF0FF"/><circle cx="54" cy="${ft + 2.2}" r="1.2" fill="#FF6FAE"/><circle cx="58" cy="${ft + 2.2}" r="1.2" fill="#FFE36E"/></g>`;
  let under = '', t = '', defs = '';
  const neck = `<path d="M45.5 ${sh - 1}Q50 ${sh + 4.5} 54.5 ${sh - 1}Z" fill="${mix(sp.skin, '#7A3B2E', 0.14)}" ${OLT}/>`;
  if (kind === 'vestido') {
    t = P(`M${L + 1} ${yw}H${R - 1}L${R + 7} ${hip + 11}Q50 ${hip + 15} ${L - 7} ${hip + 11}Z`, `fill="${col}" ${OL}`) +
      (LOD ? '' : `<path d="M${L + 2} ${yw + 6}Q50 ${yw + 9} ${R - 2} ${yw + 6}" stroke="${mix(col, INK, 0.12)}" stroke-width="1" fill="none"/>`) +
      P(`M${L} ${sh + 5}Q${L} ${sh - 1} ${L + 6} ${sh - 1}H${R - 6}Q${R} ${sh - 1} ${R} ${sh + 5}L${R - 1} ${yw + 1}H${L + 1}Z`, `fill="${col}" ${OL}`) + (LOD ? '' : neck) +
      `<rect x="${L}" y="${yw - 2.2}" width="${2 * w}" height="4.4" rx="1.6" fill="${acc}" ${OLT}/>` + (LOD ? '' : `<path d="M${R - 3} ${yw}l-5 -3.4v6.8zM${R - 3} ${yw}l5 -3.4v6.8z" fill="${acc}" ${OLT}/>`);
  } else {
    if (skirt) t += `<path d="M${L} ${hip - 7}H${R}L${R + 5} ${hip + 9}Q50 ${hip + 12} ${L - 5} ${hip + 9}Z" fill="${skirt}" ${OL}/>`;
    if (kind === 'sudadera') under = `<path d="M38 ${sh + 1}Q50 ${sh - 10} 62 ${sh + 1}Z" fill="${mix(col, INK, 0.2)}" ${OL}/>`;
    const tcol = kind === 'overol' ? sp.tee || '#FBF8FF' : col;
    t += P(torsoD, `fill="${tcol}" ${OL}`);
    if (kind === 'rayas') {
      defs = `<clipPath id="${ctx.id}c"><path d="${torsoD}"/></clipPath>`;
      t += `<g clip-path="url(#${ctx.id}c)" stroke="${acc}" stroke-width="2.8">` + [5, 11, 17, 23, 29, 35].map((d) => `<path d="M30 ${sh + d}H70"/>`).join('') + '</g>';
    }
    if (kind === 'chamarra') t += `<path d="M45 ${sh - 1}H55L54 ${hip + 1}H46Z" fill="${sp.tee || '#FBF8FF'}" ${OLT}/><path d="M45 ${sh - 1}L42 ${sh + 9}L46 ${sh + 12}M55 ${sh - 1}L58 ${sh + 9}L54 ${sh + 12}" stroke="${INK}" stroke-width="1" fill="${mix(col, '#ffffff', 0.12)}"/>`;
    if (kind === 'overol') t += `<path d="M43 ${yw - 9}H57L${R + 1} ${hip}Q50 ${hip + 2.5} ${L - 1} ${hip}Z" fill="${col}" ${OL}/><path d="M44 ${yw - 8}L${L + 3} ${sh}M56 ${yw - 8}L${R - 3} ${sh}" stroke="${col}" stroke-width="2.8"/>` +
      `<circle cx="45" cy="${yw - 6}" r="1.3" fill="${acc}"/><circle cx="55" cy="${yw - 6}" r="1.3" fill="${acc}"/><path d="M46 ${yw - 2}h8v5h-8z" fill="none" stroke="${mix(col, INK, 0.3)}" stroke-width="1"/>`;
    if (kind === 'sudadera') t += `<path d="M43 ${hip - 1}V${hip - 8}Q50 ${hip - 11} 57 ${hip - 8}V${hip - 1}" fill="none" stroke="${mix(col, INK, 0.35)}" stroke-width="1.2"/><path d="M47.5 ${sh + 1}v8M52.5 ${sh + 1}v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`;
    if (kind !== 'sudadera' && kind !== 'chamarra' && !LOD) t += neck;
    if (sp.print && PRINT[sp.print]) t += `<g transform="translate(50 ${sh + 13})">${PRINT[sp.print](acc)}</g>`;
  }
  const bracelet = !!sp.bracelet;
  return { legs, under, torso: t, defs, sleeve: kind === 'sudadera' || kind === 'chamarra' || kind === 'rayas' ? 'long' : 'short', sleeveColor: kind === 'overol' ? sp.tee || '#FBF8FF' : col, bracelet };
}

function armMk(S, [E, H], sp, sleeve, sleeveColor, bracelet, palm) {
  const d = `M${r1(S[0])} ${r1(S[1])}Q${r1(E[0])} ${r1(E[1])} ${r1(H[0])} ${r1(H[1])}`;
  const long = (sp.sleeve || sleeve) === 'long', sc = sp.sleeveColor || sleeveColor;
  let s = `<path d="${d}" class="raa"/><path d="${d}" class="rab" stroke="${long ? sc : sp.skin}"/>`;
  if (!long && (sp.sleeve || sleeve) !== 'none') s += `<path d="M${r1(S[0])} ${r1(S[1])}L${r1((S[0] + E[0]) / 2)} ${r1((S[1] + E[1]) / 2)}" stroke="${sc}" stroke-width="7.6" stroke-linecap="round"/>`;
  if (bracelet && !LOD && sp.wrist === 'tres') {
    const dx = E[0] - H[0], dy = E[1] - H[1], ln = Math.hypot(dx, dy) || 1, ux = dx / ln, uy = dy / ln;
    s += [['#FF8CC6', 4.2, 2], ['#FBF8FF', 6.2, 1.2], ['#3FC17A', 8, 1.8]].map(([cl, k, w]) => { const px = H[0] + ux * k, py = H[1] + uy * k; return `<path d="M${r1(px - uy * 3.2)} ${r1(py + ux * 3.2)}L${r1(px + uy * 3.2)} ${r1(py - ux * 3.2)}" stroke="${cl}" stroke-width="${w}" stroke-linecap="round"/>`; }).join('');
  } else if (bracelet && !LOD) {
    const dx = E[0] - H[0], dy = E[1] - H[1], ln = Math.hypot(dx, dy) || 1, ux = dx / ln, uy = dy / ln, px = H[0] + ux * 4.6, py = H[1] + uy * 4.6;
    s += ['#FF6FAE', '#FFD23D', '#5EC8F2'].map((cl, i) => `<circle cx="${r1(px - uy * (i - 1) * 2.3)}" cy="${r1(py + ux * (i - 1) * 2.3)}" r="1.35" fill="${cl}"/>`).join('');
  }
  s += `<circle cx="${r1(H[0])}" cy="${r1(H[1])}" r="${palm ? 4.3 : 3.6}" fill="${sp.skin}" ${OLT}/>`;
  if (palm && !LOD) s += `<path d="M${r1(H[0] - 2)} ${r1(H[1] - 1)}h3M${r1(H[0] - 2)} ${r1(H[1] + 1)}h4" stroke="#3B4FB8" stroke-width=".7"/>`;
  return s;
}

// Dibuja una figura completa en coordenadas 100×150 (pies en y≈138). Devuelve markup sin <svg>.
function figure(sp, pose = 'stand') {
  const ctx = { id: nid() };
  const g = { ...GEO[sp.kind || 'kid'] };
  if (sp.w) g.w = sp.w;
  const { hy, hs, sh, hip, foot, w } = g;
  const k = (hip - sh) / 32;
  const SL = [50 - w + 2.5, sh + 3], SR = [50 + w - 2.5, sh + 3];
  let aL = [[SL[0] - 4, SL[1] + 15 * k], [SL[0] - 3, SL[1] + 29 * k]];
  let aR = [[SR[0] + 4, SR[1] + 15 * k], [SR[0] + 3, SR[1] + 29 * k]];
  let inst = '';
  const gx = 45, gy = hip - 7;
  if (sp.inst === 'guitar' || sp.inst === 'bass') {
    const bass = sp.inst === 'bass', sc = bass ? 1.1 : 1.12, fx = bass ? 42 : 32;
    aL = [[SL[0] - 8, SL[1] + 17 * k], [gx + 1, gy]];
    aR = [[SR[0] + 10, SR[1] + 19 * k], [gx + fx * sc * 0.883, gy - fx * sc * 0.469]];
    const horn = [gx + 2.8 * sc, gy - 11.7 * sc];
    inst = `<path d="M${r1(horn[0])} ${r1(horn[1])}L${r1(SR[0] + 1)} ${sh - 1}" stroke="${sp.strap || '#3A2F55'}" stroke-width="2.6" stroke-linecap="round"/>` +
      guitarMk(gx, gy, -28, { ...(sp.guitar || {}), bass, scale: sc });
  } else if (sp.inst === 'keytar') {
    aL = [[SL[0] - 7, SL[1] + 18 * k], [41, hip - 8]];
    aR = [[SR[0] + 7, SR[1] + 18 * k], [58, hip - 12]];
    inst = `<path d="M33 ${hip - 4}L${SR[0]} ${sh - 1}" stroke="#FF6FAE" stroke-width="3.4" stroke-linecap="round"/><path d="M33 ${hip - 4}L${SR[0]} ${sh - 1}" stroke="#FFD23D" stroke-width="1.2" stroke-linecap="round"/>` + keytarMk(49, hip - 9, -14);
  }
  if (sp.inst === 'drums' && pose === 'play') {
    aL = [[SL[0] - 9, SL[1] + 10], [32, hip - 12]];
    aR = [[SR[0] + 9, SR[1] + 4], [SR[0] + 9, SR[1] - 12]];
    inst = drumsMk(g, sp.drum);
  }
  if (pose === 'wave') aR = [[SR[0] + 13, SR[1] - 3], [SR[0] + 15, SR[1] - 22]];
  if (sp.arms) { const r = sp.arms({ g, pose, aL, aR, SL, SR, k }); if (r && r[0]) aL = r[0]; if (r && r[1]) aR = r[1]; }
  const hp = hairParts(sp, ctx);
  const of = outfitMk(sp, g, ctx);
  const ht = `translate(50 ${hy}) scale(${hs})`;
  const api = { g, pose, aL, aR, SL, SR };
  let s = hp.defs || of.defs ? `<defs>${hp.defs}${of.defs}</defs>` : '';
  if (!LOD) s += `<ellipse cx="50" cy="${foot + 4}" rx="22" ry="3.4" fill="${INK}" opacity=".13"/>`;
  if (sp.behind) s += sp.behind(api);
  s += `<g transform="${ht}">${sp.headBack || ''}${hp.back}</g>`;
  s += of.legs + of.under;
  s += `<path d="M45.5 ${sh - 9}h9v11h-9z" fill="${mix(sp.skin, '#7A3B2E', 0.14)}" ${OL}/>`;
  s += of.torso;
  if ((sp.acc || []).includes('cadenita') && !LOD) s += `<path d="M45.6 ${sh - 1}Q50 ${sh + 8} 54.4 ${sh - 1}" stroke="#E8B53C" stroke-width="1" fill="none"/><path d="M47.6 ${sh + 5.6}Q50 ${sh + 4.8} 52.4 ${sh + 5.6}Q51.8 ${sh + 9} 50 ${sh + 10.6}Q48.2 ${sh + 9} 47.6 ${sh + 5.6}Z" fill="#35C2C9" stroke="#C99520" stroke-width=".8"/>`;
  if (sp.bodyFront) s += sp.bodyFront(api);
  s += `<g transform="${ht}">${face(sp)}${hp.front}${headAcc(sp)}${sp.headFront || ''}</g>`;
  s += inst;
  if (sp.preArms) s += sp.preArms(api);
  s += armMk(SL, aL, sp, of.sleeve, of.sleeveColor, of.bracelet, sp.palm && pose !== 'stand');
  s += armMk(SR, aR, sp, of.sleeve, of.sleeveColor, false, false);
  if (sp.inst === 'drums' && pose === 'play') s += sticks(aL[1], -110) + sticks(aR[1], 25);
  if (sp.hands) s += sp.hands(api);
  if (pose === 'play' && sp.notes !== false && !LOD) s += note(84, 46, '#FF4FA0') + note(16, 58, '#8B5CF6', 12);
  return s;
}

// ---------------------------------------------------------------- Elenco
function drumsMk(g, c = '#E0338A') {
  const { hip, foot } = g;
  return `<path d="M76 ${hip - 20}V${foot + 2}M70 ${foot + 2}L76 ${foot - 6}L82 ${foot + 2}" stroke="${INK}" stroke-width="1.3" fill="none"/><ellipse cx="76" cy="${hip - 21}" rx="12" ry="2.8" fill="#FFD45C" ${OLT}/>` +
    `<path d="M57 ${hip - 13}h15v7h-15z" fill="#FF6FAE" ${OLT}/><ellipse cx="64.5" cy="${hip - 13}" rx="7.5" ry="2" fill="#fff" ${OLT}/>` +
    `<path d="M22 ${hip - 6}h18v8h-18z" fill="#7CC6F4" ${OLT}/><ellipse cx="31" cy="${hip - 6}" rx="9" ry="2.4" fill="#fff" ${OLT}/>` +
    `<circle cx="50" cy="${foot - 16}" r="19" fill="${INK}"/><circle cx="50" cy="${foot - 16}" r="17.6" fill="#FBF8FF" stroke="${c}" stroke-width="3.4"/>` +
    `<g transform="translate(50 ${foot - 16}) scale(2.3)">${PRINT.bolt('#FFC83D')}</g>`;
}
function sticks(H, ang) {
  return `<g transform="translate(${r1(H[0])} ${r1(H[1])}) rotate(${ang})"><path d="M0 2V-16" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M0 2V-16" stroke="#E8C48A" stroke-width="2" stroke-linecap="round"/></g>`;
}

const CAST = {
  me: (o) => ({ ...lookSpec(o.look || MARIEL_LOOK), inst: 'guitar' }),
  // Nina (la amiga de Mariel): pelo largo lacio castaño, ojos cafés, sonrisa enorme, gorra verde (sin logo),
  // playera rosita con corazón, jeans y sus pulseras de la amistad.
  nina: () => ({
    name: 'Nina', skin: '#EDC3A2', hair: '#6A4029', tip: '#9C6A45', style: 'lacio', eyes: '#5B3A26', lash: true, mouth: 'open',
    outfit: 'playera', top: '#F9CFDC', accent: '#E0338A', print: 'heart', bottom: '#5B86C7', bracelet: true, wrist: 'tres', palm: true, sole: '#FF6FAE',
    headFront: `<path d="M-21.5 -5C-23 -23 -11 -30 0 -30C11 -30 23 -23 21.5 -5C14 -9 -14 -9 -21.5 -5Z" fill="#1F7A4D" ${OL}/>` +
      `<path d="M-23 -5.5Q0 -12.5 23 -5.5Q24.5 -1.4 20.5 -.8Q0 -6.4 -20.5 -.8Q-24.5 -1.4 -23 -5.5Z" fill="#17603C" ${OL}/>` +
      `<g transform="translate(0 -18.5) scale(1.1)">${PRINT.star('#FFE36E')}</g><circle cx="0" cy="-29.2" r="1.6" fill="#17603C" ${OLT}/>`,
    arms: ({ pose, SL, SR, g }) => {
      if (pose === 'play') return [[[SL[0] - 10, SL[1] - 2], [SL[0] - 15, SL[1] - 19]], [[SR[0] + 9, SR[1] + 12], [56, g.sh - 2]]];
      const mic = [[SR[0] + 7, SR[1] + 15], [55, g.sh + 12]];
      if (pose === 'wave') return [[[SL[0] - 13, SL[1] - 3], [SL[0] - 15, SL[1] - 22]], mic];
      return [null, mic];
    },
    preArms: ({ aR, pose }) => micMk(aR[1], pose === 'play' ? -24 : -8),
  }),
  romi: () => ({
    name: 'Romi', skin: '#EBC1A0', hair: '#231A1E', style: 'chongosBajos', eyes: '#4A3326', mouth: 'smirk', acc: ['lentes'], glasses: '#E23B3B',
    outfit: 'rayas', top: '#5CC9A7', accent: '#FFF4D6', skirt: '#3A3060', tights: '#B48CF2', sole: '#E23B3B', inst: 'keytar',
  }),
  tambo: () => ({
    name: 'Tambo', skin: '#C98E6B', hair: '#4A2E1E', style: 'chico', eyes: '#4A2E1E', eyeShape: 'happy', mouth: 'grin', freckles: true,
    outfit: 'playera', top: '#FF8A3D', accent: '#FFE15A', print: 'bolt', bottom: '#3D4A7A', sole: '#E23B4B',
    headBack: `<path d="M6 -23C16 -31 30 -29 33 -22C25 -21 15 -19 8 -16Z" fill="#C92D3E" ${OL}/>`,
    headFront: `<path d="M-21.5 -5C-23 -23 -11 -30 0 -30C11 -30 23 -23 21.5 -5C14 -9 -14 -9 -21.5 -5Z" fill="#E23B4B" ${OL}/><path d="M-6 -6.6Q0 -13 6 -6.6Z" fill="#4A2E1E" ${OLT}/><circle cx="0" cy="-29" r="1.6" fill="#C92D3E" ${OLT}/>`,
    behind: ({ g, pose }) => (pose === 'play' ? '' : `${sticks([62, g.hip + 4], 22)}${sticks([65, g.hip + 4], 34)}`),
    inst: 'drums',
  }),
  bruno: () => ({
    name: 'Bruno', kind: 'tall', skin: '#8B5A3C', hair: '#1F1714', style: 'fleco', eyes: '#3A2618', mouth: 'line', brows: false,
    outfit: 'sudadera', top: '#6CC46A', accent: '#FFB13D', bottom: '#33456E', sole: '#B5E655', inst: 'bass', guitar: { color: '#B5E655', sticker: 'dino' }, strap: '#2E7D4F',
    behind: ({ g }) => `<path d="M34 ${g.sh + 3}l3 -8 4 6 2 -9 4 7 3 -9 3 9 4 -7 2 9 4 -6 3 8z" fill="#FFB13D" ${OLT}/>`,
    bodyFront: ({ g }) => `<path d="M40 ${g.sh + 1}Q50 ${g.sh + 9} 60 ${g.sh + 1}" stroke="${INK}" stroke-width="4" fill="none"/><path d="M40 ${g.sh + 1}Q50 ${g.sh + 9} 60 ${g.sh + 1}" stroke="#4A4458" stroke-width="2.2" fill="none"/>` +
      `<rect x="34" y="${g.sh - 4}" width="9" height="12" rx="4.5" fill="#2F2A3E" ${OL}/><rect x="57" y="${g.sh - 4}" width="9" height="12" rx="4.5" fill="#2F2A3E" ${OL}/><circle cx="38.5" cy="${g.sh + 2}" r="2.2" fill="#5EE6C8"/><circle cx="61.5" cy="${g.sh + 2}" r="2.2" fill="#5EE6C8"/>`,
  }),
  // Papá (Sergio), mánager: rizos cortos negros con canas en las sienes y entradas, barba completa con canas en la
  // barbilla, sonrisa grande, suéter azul marino sobre camisa blanca. Libreta "MÁNAGER", pluma en la oreja y café
  // (o celular cuando saluda).
  papa: () => ({
    name: 'Papá', kind: 'adult', w: 17, skin: '#D8A07A', hair: '#1E1A1C', style: 'papa', eyes: '#4A2E1E', mouth: 'grin', brow: '#1E1A1C',
    outfit: 'playera', top: '#1E2A55', sleeve: 'long', bottom: '#3B3F55', shoe: '#6B4A33', sole: '#3B2A1F',
    headFront: `<path d="M-20 1C-21 20 -10 26 0 26C10 26 21 20 20 1C17 8 14 10 10 10.5C6 9 -6 9 -10 10.5C-14 10 -17 8 -20 1Z" fill="#1E1A1C" ${OL}/><path d="M-7 20Q0 26.5 7 20Q4 26 0 26Q-4 26 -7 20Z" fill="#A9A49F"/>` +
      `<path d="M-6.5 11.6Q0 8.6 6.5 11.6" stroke="#1E1A1C" stroke-width="3.4" class="ral"/><path d="M-5.6 12.6Q0 13.6 5.6 12.6Q5 18.4 0 18.4Q-5 18.4 -5.6 12.6Z" fill="#8E2F45"/><path d="M-5 12.9Q0 13.9 5 12.9L4.6 14.6Q0 15.4 -4.6 14.6Z" fill="#fff"/>` +
      `<path d="M17 -12L25 -24" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M17 -12L25 -24" stroke="#4F7FD0" stroke-width="1.8" stroke-linecap="round"/>`,
    bodyFront: ({ g }) => `<path d="M43 ${g.sh - 1}Q50 ${g.sh + 6} 57 ${g.sh - 1}" stroke="#16204A" stroke-width="3" fill="none"/><path d="M45 ${g.sh - 2}L50 ${g.sh + 3}L44 ${g.sh + 5}ZM55 ${g.sh - 2}L50 ${g.sh + 3}L56 ${g.sh + 5}Z" fill="#FBF8FF" ${OLT}/>` +
      (LOD ? '' : `<path d="M${50 - 16} ${g.hip - 3}H${50 + 17}" stroke="#16204A" stroke-width="2.4"/>`),
    arms: ({ pose, SL, SR, g }) => [[[SL[0] - 8, SL[1] + 16], [44, g.sh + 22]], pose === 'wave' ? null : [[SR[0] + 7, SR[1] + 16], [SR[0] + 4, SR[1] + 23]]],
    preArms: ({ aL, aR, pose }) => `<g transform="translate(${r1(aL[1][0] - 6)} ${r1(aL[1][1] - 13)}) rotate(-8)"><rect width="16" height="21" rx="2" fill="#E0338A" ${OL}/><rect x="2.5" y="6" width="11" height="5" rx="1" fill="#fff"/><text x="8" y="10" font-size="3.4" font-weight="800" text-anchor="middle" fill="${INK}" ${FONT}>MÁNAGER</text></g>` +
      (pose === 'wave' ? '' : `<g transform="translate(${r1(aR[1][0] - 2)} ${r1(aR[1][1] - 9)})"><path d="M8 3q5 0 5 4t-5 4" fill="none" ${OL}/><rect width="9" height="11" rx="2" fill="#FBF8FF" ${OL}/><path d="M2 -2q1 -2 0 -4M5.5 -2q1 -2 0 -4" stroke="#B9B1C9" stroke-width="1" class="ral"/></g>`),
    hands: ({ aR, pose }) => (pose === 'wave' ? `<g transform="translate(${r1(aR[1][0] + 2)} ${r1(aR[1][1] - 12)}) rotate(12)"><rect width="7" height="12" rx="1.6" fill="#2F2A3E" ${OL}/><rect x="1.2" y="1.5" width="4.6" height="8" rx=".8" fill="#9AD3FF"/></g>` : ''),
  }),
  // Mamá (Marcela): rizos sueltos casi negros a medio recoger (con su lápiz), pecas, sonrisa amplia,
  // aretes dorados, blusa de punto ciruela sin mangas y pulseras finas. Cinta métrica y rollo de póster.
  mama: () => ({
    name: 'Mamá', kind: 'adult', skin: '#F3CBAE', hair: '#2E1E1A', style: 'medioRecogido', eyes: '#5A3A22', lash: true, mouth: 'grin', freckles: true, blush: 0.55,
    outfit: 'playera', top: '#9B4F7A', accent: '#C77DA0', sleeve: 'none', bottom: '#4A5E9C', sole: '#9B4F7A',
    headBack: '<path d="M-8 -38L12 -24" stroke="#2E2240" stroke-width="3.6" stroke-linecap="round"/><path d="M-8 -38L12 -24" stroke="#FFC83D" stroke-width="2" stroke-linecap="round"/>',
    headFront: dots([[-20, 10], [20, 10]], '#E8B53C', 3.2),
    bodyFront: ({ g, aR }) => `<path d="M38 ${g.sh + 6}h24M37.5 ${g.sh + 14}h25M37 ${g.sh + 22}h26M36.5 ${g.sh + 30}h27" stroke="#7E3B62" stroke-width="1" stroke-dasharray="1.5 1.5"/>` +
      `<path d="M44 ${g.sh - 1}Q41 ${g.sh + 10} 43 ${g.sh + 24}M56 ${g.sh - 1}Q59 ${g.sh + 10} 57 ${g.sh + 20}" stroke="${INK}" stroke-width="4.2" class="ral"/><path d="M44 ${g.sh - 1}Q41 ${g.sh + 10} 43 ${g.sh + 24}M56 ${g.sh - 1}Q59 ${g.sh + 10} 57 ${g.sh + 20}" stroke="#FFD23D" stroke-width="2.6" class="ral"/>` +
      (LOD ? '' : `<path d="M44 ${g.sh - 1}Q41 ${g.sh + 10} 43 ${g.sh + 24}M56 ${g.sh - 1}Q59 ${g.sh + 10} 57 ${g.sh + 20}" stroke="${INK}" stroke-width="1.6" fill="none" stroke-dasharray=".5 2.4"/>`),
    arms: ({ SL }) => [[[SL[0] - 7, SL[1] + 10], [SL[0] - 1, SL[1] + 24]], null],
    preArms: ({ g }) => `<g transform="translate(26 ${g.sh + 14}) rotate(-34)"><rect x="-4" y="-22" width="9" height="40" rx="4.5" fill="#FF8CC6" ${OL}/><path d="M-4 -12h9M-4 -2h9M-4 8h9" stroke="#fff" stroke-width="2"/><ellipse cx=".5" cy="-22" rx="4.5" ry="1.8" fill="#FFE1EE" ${OLT}/></g>`,
    hands: ({ aR }) => { const [E, H] = aR, x = H[0] + (E[0] - H[0]) * 0.18, y = H[1] + (E[1] - H[1]) * 0.18; return `<path d="M${r1(x - 3.4)} ${r1(y - 1)}l6.8 1.6M${r1(x - 3.4)} ${r1(y + 1.2)}l6.8 1.6" stroke="#E8B53C" stroke-width="1" stroke-linecap="round"/>`; },
  }),
  // Abuela Alma: bob castaño con luces a la barbilla y raya de lado, lentes rectangulares morados de carey con
  // cadenita, cara redonda, sonrisa amplia, blusa coral con óvalos blancos y su lata de galletas.
  // Con { shawl: true } (escenas de noche) se pone el chal tejido de colores.
  alma: (o) => ({
    name: 'Abuela Alma', kind: 'adult', skin: '#DDA882', hair: '#7A5236', tip: '#B98A5E', style: 'bobLado', eyes: '#5A3A22', mouth: 'grin', blush: 0.6,
    brow: '#5A3A26', acc: ['lentesRect'], glasses: '#4A2A5A', outfit: 'playera', top: '#FF8C6B', bottom: '#5A4A6E', shoe: '#8B5A3C', sole: '#5A3A22', w: 16,
    headFront: '<path d="M-19.5 1Q-24 16 -12 24M19.5 1Q24 16 12 24" stroke="#FFC83D" stroke-width="1.6" fill="none" stroke-dasharray="1.2 1.4" stroke-linecap="round"/>',
    bodyFront: ({ g }) => {
      const { sh } = g, L = 32, R = 68;
      let t = LOD ? '' : '<g fill="none" stroke="#fff" stroke-width="1.1" opacity=".9">' + [[42, sh + 9], [52, sh + 9], [47, sh + 18], [57, sh + 18], [42, sh + 27], [52, sh + 27], [58, sh + 34], [41, sh + 36]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="2.8"/><ellipse cx="${x + 3}" cy="${y}" rx="4.4" ry="2.8"/>`).join('') + '</g>';
      if (o.shawl) t += `<path d="M${L} ${sh + 3}Q50 ${sh - 5} ${R} ${sh + 3}L${R + 1} ${sh + 20}L50 ${sh + 33}L${L - 1} ${sh + 20}Z" fill="#B48CF2" ${OL}/>` +
        `<g fill="none" stroke-width="2.6"><path d="M${L + 1} ${sh + 8}L50 ${sh + 15}L${R - 1} ${sh + 8}" stroke="#FFD23D"/><path d="M${L + 1} ${sh + 13}L50 ${sh + 21}L${R - 1} ${sh + 13}" stroke="#4FD1A8"/><path d="M${L + 1} ${sh + 18}L50 ${sh + 27}L${R - 1} ${sh + 18}" stroke="#FF6FAE"/></g>` +
        `<path d="M${L} ${sh + 21}l-1 4M${L + 5} ${sh + 25}l-1 4M${L + 10} ${sh + 28}l-1 4M${R} ${sh + 21}l1 4M${R - 5} ${sh + 25}l1 4M${R - 10} ${sh + 28}l1 4" stroke="#B48CF2" stroke-width="1.6" stroke-linecap="round"/>`;
      return t;
    },
    arms: ({ SR }) => [null, [[SR[0] + 8, SR[1] + 12], [SR[0] + 2, SR[1] + 24]]],
    preArms: ({ g }) => `<g transform="translate(73 ${g.sh + 25})"><rect x="-9" y="-7" width="18" height="14" rx="3" fill="#4F7FD0" ${OL}/><ellipse cy="-7" rx="9" ry="3" fill="#7FA6F0" ${OL}/><g fill="#fff"><circle cx="-5" cy="0" r="1.2"/><circle cx="0" cy="2" r="1.2"/><circle cx="5" cy="0" r="1.2"/></g></g>`,
  }),
  // 'hermana': Luciana con su cámara (LUCIANA_LOOK). Si juega Luciana, pasa look: MARIEL_LOOK.
  hermana: (o) => {
    const base = o.look ? lookSpec(o.look) : { ...lookSpec(LUCIANA_LOOK), name: 'Luciana', kind: 'tall', mouth: 'smirk', brow: '#2A1A14', browW: 1.9 };
    return {
      ...base, guitar: null,
      bodyFront: ({ g }) => `<path d="M41 ${g.sh - 1}L46 ${g.sh + 14}M59 ${g.sh - 1}L54 ${g.sh + 14}" stroke="#E0338A" stroke-width="2.4" stroke-dasharray="2.4 1.2"/>`,
      arms: ({ pose, SL, SR, g }) => [[[SL[0] - 6, SL[1] + 16], [43, g.sh + 16]], pose === 'wave' ? null : [[SR[0] + 9, SR[1] + 10], [SR[0] + 6, SR[1] - 2]]],
      preArms: ({ g }) => `<g transform="translate(50 ${g.sh + 16})"><rect x="-10" y="-6.5" width="20" height="13" rx="3" fill="#3A3550" ${OL}/><rect x="-7" y="-9" width="6" height="3" rx="1" fill="#3A3550" ${OLT}/><circle r="5" fill="#9AD3FF" ${OL}/><circle r="2.2" fill="${INK}"/><circle cx="1.4" cy="-1.4" r=".9" fill="#fff"/><circle cx="7" cy="-3.5" r="1.1" fill="#FF6FAE"/></g>`,
      hands: ({ aR, pose }) => (pose === 'wave' ? '' : `<g transform="translate(${r1(aR[1][0] - 3)} ${r1(aR[1][1] - 10)}) rotate(8)"><rect width="7" height="12" rx="1.6" fill="#FF6FAE" ${OL}/><rect x="1.2" y="1.5" width="4.6" height="8" rx=".8" fill="#BFE6FF"/></g>`),
    };
  },
  // Juju (Julia, 5): chongo alto con mechoncitos, ojos cafés traviesos, mejillas muy rosadas, sonrisa de lado,
  // playera rosa pálido, pantalón claro con florecitas, tenis con luces, Señor Brillitos y su letrero.
  juju: (o) => ({
    name: 'Juju', kind: 'small', skin: '#F8D8C4', hair: '#4A2E22', style: 'chongoAlto', tie: '#FF6FAE', eyes: '#5A3A22', lash: true, blush: 0.85,
    mouth: o.mouth || 'smirk', outfit: 'playera', top: '#FFD3E4', accent: '#FF6FAE', print: 'heart', bottom: '#F3EEE2', shoe: '#FBF8FF', sole: '#B48CF2', lights: true, notes: false,
    bodyFront: ({ g }) => (LOD ? '' : ['#FF8CC6', '#FFD23D', '#8FD3FF', '#FF8CC6', '#B48CF2'].map((c, i) => `<circle cx="${[44, 46, 55, 56, 44][i]}" cy="${g.hip + [3, 15, 7, 19, 24][i]}" r="1.4" fill="${c}"/>`).join('')),
    arms: ({ pose, SL, SR }) => {
      if (pose === 'cheer') return [[[SL[0] - 8, SL[1] - 6], [SL[0] - 4, SL[1] - 22]], [[SR[0] + 8, SR[1] - 6], [SR[0] + 4, SR[1] - 22]]];
      return [[[SL[0] - 8, SL[1] - 4], [SL[0] - 10, SL[1] - 18]], [[SR[0] + 7, SR[1] + 8], [SR[0] + 1, SR[1] + 16]]];
    },
    preArms: ({ pose, g }) => (pose === 'cheer' ? '' : unicornMk(66, g.sh + 22, 0.82)),
    behind: ({ pose, SL }) => (pose === 'cheer' || o.noSign ? '' : `<path d="M${SL[0] - 10} 30V${SL[1] + 30}" stroke="#A9773F" stroke-width="2.6"/>${signMk(o.sign, 24, 20, 46, o.signLevel || 0)}`),
  }),
  beto: () => ({
    name: 'Don Beto', kind: 'adult', w: 19, skin: '#E0A982', hair: '#CFCAC6', style: 'calvo', eyes: '#3A2618', eyeShape: 'happy', mouth: 'grin', brow: '#B9B1A9',
    outfit: 'playera', top: '#FBF8FF', bottom: '#5A4A3A', shoe: '#5A3A22', sole: '#3B2A1F',
    headFront: `<path d="M0 9C-4 6 -13 5 -17 12C-12 11 -6 13 0 12C6 13 12 11 17 12C13 5 4 6 0 9Z" fill="#E4E0DC" ${OL}/>`,
    bodyFront: ({ g }) => `<path d="M38 ${g.sh + 6}H62L${69} ${g.hip + 10}Q50 ${g.hip + 13} ${31} ${g.hip + 10}Z" fill="#8A5A34" ${OL}/><path d="M40 ${g.sh + 6}Q50 ${g.sh - 4} 60 ${g.sh + 6}" stroke="#8A5A34" stroke-width="2" fill="none"/><rect x="43" y="${g.sh + 24}" width="14" height="9" rx="2" fill="#A06E40" ${OLT}/><text x="50" y="${g.sh + 18}" font-size="5" text-anchor="middle" fill="#F6E3C6" ${HAND}>Glorieta</text>`,
    arms: ({ SR, pose }) => (pose === 'wave' ? null : [null, [[SR[0] + 12, SR[1] + 4], [SR[0] + 10, SR[1] - 10]]]),
    hands: ({ aR, pose }) => (pose === 'wave' ? '' : `<g transform="translate(${r1(aR[1][0])} ${r1(aR[1][1] - 4)})"><ellipse rx="15" ry="3.4" fill="#C9C2D6" ${OL}/><path d="M-9 -2L7 -6V-12L-9 -8Z" fill="#FFF3D6" ${OLT}/><path d="M-9 -8L7 -12L9 -10L-7 -6Z" fill="#fff" ${OLT}/><path d="M-9 -4L7 -8" stroke="#F2C27A" stroke-width="1.6"/><circle cx="3" cy="-12.5" r="2.2" fill="#E23B4B" ${OLT}/></g>`),
  }),
  rocio: () => ({
    name: 'Doña Rocío', kind: 'adult', skin: '#D9A27A', hair: '#1E1A22', style: 'corto', eyes: '#3A2618', mouth: 'smirk', lips: '#C92D3E', acc: ['shades'],
    outfit: 'chamarra', top: '#4A78B8', tee: '#2A2438', bottom: '#2A2438', shoe: '#2A2438', sole: '#E23B4B',
    headFront: '<path d="M8 -24Q14 -20 16 -10" stroke="#B9B1C9" stroke-width="2.4" class="ral"/>',
    bodyFront: ({ g }) => `<circle cx="40" cy="${g.sh + 14}" r="3.4" fill="#FF6FAE" ${OLT}/><g transform="translate(59 ${g.sh + 22})">${PRINT.star('#FFD23D')}</g><rect x="56" y="${g.sh + 6}" width="7" height="5" rx="1" fill="#5EE6C8" ${OLT}/><path d="M38 ${g.sh + 28}h6" stroke="#E23B4B" stroke-width="2.4"/>`,
    arms: ({ SL, g }) => [[[SL[0] - 6, SL[1] + 16], [44, g.sh + 22]], null],
    preArms: ({ aL }) => `<g transform="translate(${r1(aL[1][0] - 8)} ${r1(aL[1][1] - 16)}) rotate(-6)"><rect width="17" height="23" rx="2" fill="#A06E40" ${OL}/><rect x="2" y="3" width="13" height="18" fill="#fff"/><rect x="5" y="-1.5" width="7" height="4" rx="1" fill="#B9B1C9" ${OLT}/><path d="M4 8h9M4 11h9M4 14h6" stroke="#B9B1C9" stroke-width="1"/><path d="M4 17l2 2 4 -4" stroke="#1F9D63" stroke-width="1.4" fill="none"/></g>`,
  }),
  iker: () => ({
    name: 'Iker', skin: '#E6B08A', hair: '#3A2620', style: 'chico', eyes: '#4A2E1E', mouth: 'open', freckles: true,
    outfit: 'playera', top: '#FBF8FF', bottom: '#4A5E9C', sole: '#FFC83D',
    headFront: `<g transform="translate(-12.5 9) scale(.8)">${PRINT.star('#FF4FA0')}</g>`,
    behind: ({ g }) => `<g transform="translate(34 ${g.sh - 4}) rotate(-18)"><rect x="-3" y="-16" width="6" height="22" rx="3" fill="#FFC83D" ${OL}/></g><g transform="translate(66 ${g.sh - 6}) rotate(14)"><rect x="-3" y="-18" width="6" height="24" rx="3" fill="#FF8CC6" ${OL}/></g><g transform="translate(70 ${g.sh - 10}) rotate(30)"><rect x="-2.6" y="-12" width="5.2" height="16" rx="2.6" fill="#7CC6F4" ${OL}/></g>`,
    bodyFront: ({ g }) => `<path d="M40 ${g.sh}L41 ${g.hip - 6}M60 ${g.sh}L59 ${g.hip - 6}" stroke="#E23B4B" stroke-width="3" stroke-linecap="round"/><text x="50" y="${g.sh + 15}" font-size="8.5" font-weight="700" text-anchor="middle" fill="#8B5CF6" transform="rotate(-6 50 ${g.sh + 12})" ${HAND}>FAN</text><path d="M44 ${g.sh + 19}q6 3 12 -1" stroke="#FF4FA0" stroke-width="1.2" fill="none"/>`,
  }),
  dafne: () => ({
    name: 'Dafne', kind: 'tall', skin: '#F0C6A4', hair: '#2A1F2E', tip: '#9A55E8', style: 'lacio', eyes: '#5F8F58', lash: true, mouth: 'smirk',
    outfit: 'chamarra', top: '#2A2438', tee: '#5EE6C8', bottom: '#3A2F55', shoe: '#E8D6FF', sole: '#C77DFF', platform: true, inst: 'guitar',
    guitar: { color: '#C77DFF' }, strap: '#5EE6C8',
    headFront: '<path d="M-19 -6L-20 32M19 -4L20 32M-10 -21Q-14 -16 -15 -10" stroke="#B266FF" stroke-width="2.6" class="ral"/>',
    bodyFront: ({ SR, g }) => `<g transform="translate(56 ${g.sh + 6})"><path d="M-4 0Q-4 -6 0 -6Q4 -6 4 0Q4 2 3 3L4 6M1 3L1.5 6M-1 3L-1.5 6M-3 3L-4 6" fill="#FF6FAE" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/><circle cx="-1.4" cy="-2.4" r=".7" fill="${INK}"/><circle cx="1.4" cy="-2.4" r=".7" fill="${INK}"/></g>`,
  }),
  ines: () => ({
    name: 'Inés', kind: 'adult', skin: '#E6B08A', hair: '#2A1F22', style: 'corto', eyes: '#3A2618', lash: true, mouth: 'calm',
    outfit: 'sudadera', top: '#3A3550', accent: '#5EC8F2', bottom: '#2A2438', sole: '#5EC8F2',
    headFront: `<path d="M-14 -22Q-19 -12 -18 2" stroke="#3C8CF2" stroke-width="3.6" class="ral"/><path d="M-22 4C-25 -31 25 -31 22 4" fill="none" stroke="${INK}" stroke-width="5"/><path d="M-22 4C-25 -31 25 -31 22 4" fill="none" stroke="#5A566E" stroke-width="3"/>` +
      `<rect x="-28" y="-5" width="10" height="15" rx="4.5" fill="#2F2A3E" ${OLT}/><rect x="18" y="-5" width="10" height="15" rx="4.5" fill="#2F2A3E" ${OLT}/><circle cx="-23" cy="2.5" r="2.4" fill="#5EC8F2"/><circle cx="23" cy="2.5" r="2.4" fill="#5EC8F2"/>`,
    arms: ({ SR, pose }) => (pose === 'wave' ? null : [null, [[SR[0] + 9, SR[1] + 14], [SR[0] + 6, SR[1] + 20]]]),
    hands: ({ aR, pose }) => (pose === 'wave' ? '' : `<g transform="translate(${r1(aR[1][0] - 3)} ${r1(aR[1][1] - 8)})"><path d="M8 3q4.5 0 4.5 3.5t-4.5 3.5" fill="none" ${OL}/><path d="M0 0h9v8q0 4 -4.5 4t-4.5 -4z" fill="#7FD6B0" ${OL}/><path d="M4.5 0V-4h3" stroke="#B9B1C9" stroke-width=".8" fill="none"/><rect x="6" y="-6" width="3.4" height="3" fill="#FFC83D"/><path d="M2 -2q1 -2 0 -4" stroke="#B9B1C9" stroke-width=".9" fill="none"/></g>`),
  }),
  max: () => ({
    name: 'Max Ferrer', kind: 'adult', skin: '#F1C59C', hair: '#C9A13A', style: 'chico', eyes: '#3A2618', mouth: 'grin', acc: ['shades'], shadeColor: '#3A1F5E', shadeStars: true,
    outfit: 'chamarra', top: '#8E3FE0', tee: '#FFD23D', bottom: '#7A30C8', shoe: '#FBF8FF', sole: '#FFD23D',
    bodyFront: ({ g }) => `<path d="M50 ${g.sh + 2}l-2.4 5h4.8z" fill="#E23B4B"/><path d="M49 ${g.sh + 7}h2l1.4 14 -2.4 3 -2.4 -3z" fill="#E23B4B" ${OLT}/><g fill="#fff" opacity=".7"><circle cx="38" cy="${g.sh + 10}" r=".9"/><circle cx="62" cy="${g.sh + 16}" r=".9"/><circle cx="40" cy="${g.sh + 30}" r=".9"/></g>`,
    arms: ({ SL, g }) => [[[SL[0] - 7, SL[1] + 14], [42, g.sh + 20]], null],
    preArms: ({ aL, g }) => {
      const x = r1(aL[1][0] - 9), y = r1(aL[1][1] - 12);
      return `<path d="M${x + 2} ${y + 18}C${x - 2} ${y + 40} ${x + 10} ${y + 50} ${x + 6} ${g.foot + 4}H${x + 18}C${x + 22} ${y + 50} ${x + 10} ${y + 40} ${x + 15} ${y + 18}Z" fill="#fff" ${OLT}/><path d="M${x + 4} ${y + 28}h8M${x + 4} ${y + 36}h8M${x + 6} ${y + 44}h8M${x + 7} ${y + 52}h9" stroke="#B9B1C9" stroke-width="1"/>` +
        `<rect x="${x}" y="${y}" width="18" height="22" rx="3" fill="#2F2A3E" ${OL}/><rect x="${x + 2}" y="${y + 2}" width="14" height="18" rx="1.4" fill="#E8F1FF"/><path d="M${x + 4} ${y + 6}h10M${x + 4} ${y + 9}h10M${x + 4} ${y + 12}h7" stroke="#8E3FE0" stroke-width="1"/>`;
    },
  }),
};
// Candidatos de las audiciones (3 por instrumento; Romi, Tambo y Bruno son uno de cada trío).
const star = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -4.6L1.4 -1.5L4.6 -1.3L2.1 .9L2.9 4.3L0 2.5L-2.9 4.3L-2.1 .9L-4.6 -1.3L-1.4 -1.5Z" fill="${c}" ${OLT}/>`;
PRINT.sun = (c) => `<circle r="3.6" fill="${c}" ${OLT}/><path d="M0 -6.6V-5M0 5V6.6M-6.6 0H-5M5 0H6.6M-4.7 -4.7l1.2 1.2M3.5 3.5l1.2 1.2M-4.7 4.7l1.2 -1.2M3.5 -3.5l1.2 -1.2" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/><path d="M-1.4 0a1.4 1.4 0 1 0 1.4 -1.4" stroke="${INK}" stroke-width=".8" fill="none"/>`;
Object.assign(CAST, {
  // Luz, 9 · teclas · soñadora: pinzas de estrella en su pelo rizado, ojos felices.
  luz: () => ({ name: 'Luz', skin: '#8B5A3C', hair: '#1E1416', style: 'rizado', eyes: '#3A2618', eyeShape: 'happy', lash: true, mouth: 'open',
    outfit: 'overol', top: '#FFC83D', accent: '#FF6FAE', tee: '#FF8CC6', sole: '#FFC83D', inst: 'keytar',
    headFront: star(-15, -19, 1.1, '#FFE36E') + star(13, -22, .9, '#7CF0FF') + star(20, -12, .7, '#FFE36E') }),
  // Santi, 12 · teclas · formalito: moño rojo de concierto y lentes negros.
  santi: () => ({ name: 'Santi', kind: 'tall', skin: '#E6B08A', hair: '#3A2620', style: 'chico', eyes: '#4A3326', mouth: 'calm', acc: ['lentes'], glasses: '#2E2240',
    outfit: 'playera', top: '#FBF8FF', bottom: '#2E3A5E', shoe: '#2E2240', sole: '#2E2240', inst: 'keytar',
    bodyFront: ({ g }) => `<path d="M50 ${g.sh + 2}l-6 -3.4v6.8zM50 ${g.sh + 2}l6 -3.4v6.8z" fill="#E23B4B" ${OLT}/><circle cx="50" cy="${g.sh + 2}" r="1.8" fill="#C92D3E" ${OLT}/><path d="M50 ${g.sh + 8}v20" stroke="#B9B1C9" stroke-width="1" stroke-dasharray="1 4"/>` }),
  // Vale, 11 · batería · deportista: banda en la frente y coleta alta.
  vale: () => ({ name: 'Vale', skin: '#C4865D', hair: '#B4532D', style: 'coleta', tie: '#5EE6C8', eyes: '#5F8F58', mouth: 'grin', freckles: true,
    outfit: 'playera', top: '#5EE6C8', accent: '#FFFFFF', print: 'star', bottom: '#3A3060', sole: '#FF4F9A', inst: 'drums', drum: '#5EE6C8',
    headFront: `<path d="M-20.5 -10Q0 -17 20.5 -10L20 -5Q0 -12 -20 -5Z" fill="#FF4F9A" ${OLT}/>` }),
  // Emilio, 10 · batería · rockero: paliacate rojo de puntos.
  emilio: () => ({ name: 'Emilio', skin: '#FCE6D8', hair: '#E0B464', style: 'chico', eyes: '#6F90A8', mouth: 'smirk', freckles: true,
    outfit: 'playera', top: '#2A2438', accent: '#FF8A3D', print: 'star', bottom: '#4A5E9C', sole: '#FF8A3D', inst: 'drums', drum: '#FF8A3D',
    headFront: `<path d="M-21.5 -6C-23 -24 -11 -29.5 0 -29.5C11 -29.5 23 -24 21.5 -6C14 -12 -14 -12 -21.5 -6Z" fill="#E23B4B" ${OL}/><g fill="#fff"><circle cx="-12" cy="-16" r="1.3"/><circle cx="-3" cy="-22" r="1.3"/><circle cx="7" cy="-19" r="1.3"/><circle cx="15" cy="-12" r="1.2"/></g><path d="M20 -8l7 -1 -3 6zM20 -8l6 4 -6 3z" fill="#E23B4B" ${OLT}/>` }),
  // Paz, 12 · bajo · tranquila: gorro tejido con pompón y pin de paz.
  paz: () => ({ name: 'Paz', kind: 'tall', skin: '#F7D5C0', hair: '#2A1F22', style: 'lacio', eyes: '#6B4329', eyeShape: 'happy', mouth: 'calm', lash: true,
    outfit: 'sudadera', top: '#B48CF2', accent: '#FFE36E', bottom: '#3A3060', sole: '#5EE6C8', inst: 'bass', guitar: { color: '#FF9F45', sticker: 'corazon' }, strap: '#5EE6C8',
    headFront: `<path d="M-22 -8C-24 -28 -10 -32 0 -32C10 -32 24 -28 22 -8Z" fill="#5EE6C8" ${OL}/><path d="M-22.5 -8.5H22.5V-13H-22.5Z" fill="#3FC1A8" ${OLT}/><path d="M-14 -14V-26M-7 -14V-30M0 -14V-31M7 -14V-30M14 -14V-26" stroke="#3FC1A8" stroke-width="1.2"/><circle cx="0" cy="-34" r="4.6" fill="#FFE36E" ${OLT}/>`,
    bodyFront: ({ g }) => `<g transform="translate(58 ${g.sh + 9})"><circle r="3.4" fill="#fff" ${OLT}/><path d="M0 -3.2V3.2M0 .6L-2.3 2.4M0 .6L2.3 2.4" stroke="${INK}" stroke-width=".8"/></g>` }),
  // Ollin, 9 · bajo · puro movimiento: sudadera naranja con sol y tenis de colores.
  ollin: () => ({ name: 'Ollin', skin: '#A86A45', hair: '#1E1416', style: 'rizadoCorto', eyes: '#3A2618', mouth: 'open',
    outfit: 'sudadera', top: '#FF8A3D', accent: '#FFE15A', print: 'sun', bottom: '#2E3A5E', shoe: '#5EE6C8', sole: '#FF4F9A', inst: 'bass', guitar: { color: '#3FC1C9', sticker: 'rayo' }, strap: '#FFE15A' }),
});
export const CAST_IDS = Object.keys(CAST).filter((k) => k !== 'me');

function castSpec(id, o = {}) {
  const f = CAST[id] || CAST.nina;
  return f(o);
}

// ---------------------------------------------------------------- API de personajes
// Foco suave detrás de la figura: casi invisible en claro, en oscuro separa el pelo oscuro del fondo.
const spot = () => { const id = nid(); return `<defs><radialGradient id="${id}" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#FFF1F8" stop-opacity=".95"/><stop offset=".62" stop-color="#FCE3F1" stop-opacity=".55"/><stop offset="1" stop-color="#FCE3F1" stop-opacity="0"/></radialGradient></defs><ellipse cx="50" cy="74" rx="50" ry="74" fill="url(#${id})"/>`; };
export function avatarSvg(look, { size = 120, guitar = true, pose = 'stand', glow = true } = {}) {
  const sp = lookSpec(look);
  if (guitar) sp.inst = 'guitar';
  return svg(100, 150, (glow ? spot() : '') + figure(sp, pose), { size, label: 'Tu personaje' });
}

export function faceSvg(look, size = 64) {
  const id = nid(), sp = lookSpec(look);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 10 68 68" width="${size}" height="${size}" role="img" aria-label="Retrato">${STYLE}<defs><clipPath id="${id}"><circle cx="50" cy="44" r="33"/></clipPath></defs>` +
    `<circle cx="50" cy="44" r="33" fill="#FFE1EE"/><circle cx="50" cy="44" r="33" fill="none" stroke="#FFC6DF" stroke-width="5" stroke-dasharray="2 6"/><g clip-path="url(#${id})">${minify(figure(sp, 'stand'))}</g><circle cx="50" cy="44" r="33" fill="none" stroke="${INK}" stroke-width="1.6"/></svg>`;
}

export function castSvg(id, { size = 120, pose = 'stand', look, sign, signLevel, shawl, glow = true } = {}) {
  const sp = id === 'me' ? { ...lookSpec(look || MARIEL_LOOK), inst: 'guitar' } : castSpec(id, { look, sign, signLevel, shawl });
  return svg(100, 150, (glow ? spot() : '') + figure(sp, pose), { size, label: sp.name || id });
}

function memberFigure(m, look, pose = 'play') {
  const id = typeof m === 'string' ? m : m.id;
  if (id === 'me') return figure({ ...lookSpec((m && m.look) || look || MARIEL_LOOK), inst: 'guitar' }, pose);
  return figure(castSpec(id, typeof m === 'object' ? m : {}), pose);
}
// Coloca una figura (100×150, pies en 138) con pies en (x, y) y escala s.
const put = (markup, x, y, s) => `<g transform="translate(${r1(x - 50 * s)} ${r1(y - 138 * s)}) scale(${s})">${markup}</g>`;

// ---------------------------------------------------------------- Público
const DAY_PAL = ['#7D6BC0', '#E27BA6', '#5DA2D6', '#F0A45E', '#5FC2A0', '#B38BE8'];
const DARK_PAL = ['#4B3D72', '#5D4A8C', '#3E517F', '#6E4A7E', '#2F4A6B', '#55407A'];
const HEAD = 'M-10 0C-10 -9 -6 -12 0 -12C6 -12 10 -9 10 0ZM6.2 -19.7A6.2 6.2 0 1 1 -6.2 -19.7A6.2 6.2 0 1 1 6.2 -19.7Z';
function crowdDefs(id) {
  return `<path id="${id}p" d="${HEAD}"/><path id="${id}q" d="${HEAD}M3 -24Q12 -22 9.5 -11Q7 -16 2.5 -17Z"/>` +
    `<path id="${id}a" d="${HEAD}M-7 -10L-13 -28L-9.5 -29L-4 -11ZM7 -10L13 -28L9.5 -29L4 -11Z"/><path id="${id}l" d="${HEAD}M6 -10L11 -28L14.5 -27L9.5 -10Z"/>` +
    `<radialGradient id="${id}g"><stop offset="0" stop-color="#FFF6C8" stop-opacity=".95"/><stop offset="1" stop-color="#FFF6C8" stop-opacity="0"/></radialGradient>`;
}
const ROWS = [{ y: 226, x0: 18, x1: 342, n: 11, s: 1.12 }, { y: 209, x0: 26, x1: 334, n: 13, s: 0.95 }, { y: 194, x0: 36, x1: 324, n: 15, s: 0.8 }];
function slotList(rows) {
  const out = [];
  rows.forEach((r, ri) => { for (let i = 0; i < r.n; i++) { const x = r.x0 + ((r.x1 - r.x0) * i) / Math.max(1, r.n - 1); out.push({ x: x + (jit(ri * 31 + i) - 0.5) * 7, y: r.y + (jit(ri * 17 + i * 3) - 0.5) * 3, s: r.s, d: Math.abs(x - 180) + ri * 42, i: ri * 50 + i }); } });
  return out.sort((a, b) => a.d - b.d);
}
// Siluetas de espaldas, del centro-frente hacia afuera: medio lleno se ve como un grupito cerca del escenario.
function crowdMk(id, cr, o = {}) {
  const cap = Math.max(1, cr.cap || 1), ratio = clamp((cr.count || 0) / cap, 0, 1);
  let sl = slotList(o.rows || ROWS);
  if (cr.juju) sl = sl.filter((p) => !(p.x < 78 && p.y > 200));
  sl = sl.slice(0, Math.min(sl.length, cap));
  const n = cr.count > 0 ? Math.max(1, Math.round(sl.length * ratio)) : 0;
  const pal = o.pal || DAY_PAL;
  const people = sl.slice(0, n).sort((a, b) => a.y - b.y);
  const glow = [], screens = [], hats = [];
  // agrupados por escala: <g transform="scale(s)"> y <use x y> en coordenadas de esa escala
  const byS = new Map();
  people.forEach((p, j) => {
    const r = jit(p.i + 5), lit = cr.lit && r < 0.55, up = !lit && ratio >= 0.7 && r > 0.6;
    const v = lit ? 'l' : up ? 'a' : r < 0.3 ? 'q' : 'p';
    const x = r1(p.x / p.s), y = r1(p.y / p.s);
    if (!byS.has(p.s)) byS.set(p.s, []);
    byS.get(p.s).push(`<use href="#${id}${v}" x="${x}" y="${y}" fill="${pal[(p.i * 7) % pal.length]}"/>`);
    if (lit) { glow.push([p.x + 13 * p.s, p.y - 31 * p.s]); screens.push([p.x + 13 * p.s, p.y - 31 * p.s]); }
    if (o.hats) hats.push(`<path d="M${r1(p.x - 4.6 * p.s)} ${r1(p.y - 24.6 * p.s)}l${r1(4.6 * p.s)}-${r1(11.4 * p.s)} ${r1(4.6 * p.s)} ${r1(11.4 * p.s)}z" fill="${['#FFD23D', '#FF6FAE', '#5EE6C8'][j % 3]}" ${OLT}/>`);
  });
  let s = '';
  for (const [sc, list] of byS) s += sc === 1 ? list.join('') : `<g transform="scale(${sc})">${list.join('')}</g>`;
  s += hats.join('');
  if (glow.length) s += dots(glow, '#FFF6C8', 15, 0.28) + dots(screens, '#FFFBE6', 5);
  return s;
}
// Mar de gente para lugares enormes: patrón de cabezas (y luces) recortado al porcentaje de lleno.
function seaDefs(id, pal, lit) {
  const pat = (k, sc) => `<pattern id="${id}${k}" width="10" height="9" patternUnits="userSpaceOnUse" patternTransform="scale(${sc})"><circle cx="2.5" cy="3" r="2.9" fill="${pal[0]}"/><circle cx="7.5" cy="7.5" r="2.9" fill="${pal[2]}"/><circle cx="7.5" cy="-1.5" r="2.9" fill="${pal[2]}"/>` +
    (lit ? '<circle cx="2.5" cy="1.2" r="1.1" fill="#FFF6C8"/><circle cx="7.5" cy="5.6" r=".9" fill="#FFE08A"/>' : '') + '</pattern>';
  return pat('n', 1) + pat('m', 0.62) + pat('f', 0.36);
}
// areas: [{d, pat:'n'|'m'|'f', x0, x1}] de adelante hacia atrás. Llena la proporción ratio.
function seaMk(id, areas, ratio, pid = id) {
  const per = 1 / areas.length;
  return areas.map((a, i) => {
    const f = clamp((ratio - i * per) / per, 0, 1);
    if (f <= 0) return '';
    const cid = `${id}s${i}`, wd = (a.x1 - a.x0) * f, cx = (a.x0 + a.x1) / 2;
    return `<clipPath id="${cid}"><path d="${a.d}"/></clipPath><rect clip-path="url(#${cid})" x="${r1(cx - wd / 2)}" y="0" width="${r1(wd)}" height="220" fill="url(#${pid}${a.pat})"/>`;
  }).join('');
}

// ---------------------------------------------------------------- Fondos
const stars = (n, y1 = 90) => dots(Array.from({ length: n }, (_, i) => [jit(i) * 360, jit(i + 99) * y1]), '#FFF6C8', 2.2, 0.85) + dots(Array.from({ length: n >> 2 }, (_, i) => [jit(i + 40) * 360, jit(i + 140) * y1]), '#fff', 3.4);
function papelPicado(y, n, x0 = 0, x1 = 360, sag = 14) {
  const cols = ['#FF4F9A', '#FFD23D', '#5EC8F2', '#8B5CF6', '#5EE6C8', '#FF8A3D'];
  let s = `<path d="M${x0} ${y}Q${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" stroke="${INK}" stroke-width=".8" fill="none"/>`;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, yy = y + 2 * sag * 2 * t * (1 - t);
    s += `<path transform="translate(${r1(x)} ${r1(yy)}) rotate(${r1((t - 0.5) * 18)})" d="M-8 0H8V13L5 11L2 13L-2 11L-5 13L-8 11Z" fill="${cols[i % cols.length]}"/>`;
  }
  return s;
}
function bulbs(id, y, sag, n, x0 = 0, x1 = 360) {
  const cols = ['#FF4F9A', '#FFD23D', '#5EC8F2', '#5EE6C8', '#FF8A3D'];
  let s = `<path d="M${x0} ${y}Q${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" stroke="${INK}" stroke-width="1" fill="none"/>`;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = r1(x0 + (x1 - x0) * t), yy = r1(y + 2 * sag * 2 * t * (1 - t) + 4), c = cols[i % cols.length];
    s += `<circle cx="${x}" cy="${yy}" r="7" fill="${c}" opacity=".28"/><ellipse cx="${x}" cy="${yy}" rx="2.6" ry="3.6" fill="${c}" ${OLT}/>`;
  }
  return s;
}
function beams(cols, op = 0.2) {
  return cols.map(([x, c], i) => `<path d="M${x} 18L${x - 36 + i * 4} 168H${x + 40 - i * 4}Z" fill="${c}" opacity="${op}"/>`).join('');
}
function miniPoster(p, x, y, w, rot = 0) {
  const st = (p && p.stage) || 'copy', hg = r1(w * 1.4), lc = (p && p.logo && p.logo.color) || '#E0338A', copy = st === 'copy';
  const full = String((p && p.band) || 'BANDA').toUpperCase(), nm = full.length > 14 ? `${full.slice(0, 13).trim()}…` : full; // the font shrinks to fit
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="${w}" height="${hg}" fill="${copy ? '#F3F1EC' : lc}" ${OLT}/>`;
  if (!copy) s += `<rect y="${r1(hg * 0.62)}" width="${w}" height="${r1(hg * 0.38)}" fill="#8B5CF6"/>`;
  s += `<circle cx="${w / 2}" cy="${r1(hg * 0.42)}" r="${r1(w * 0.2)}" fill="${copy ? '#666' : '#FFE36E'}"/><circle cx="${r1(w * 0.3)}" cy="${r1(hg * 0.5)}" r="${r1(w * 0.12)}" fill="${copy ? '#999' : '#fff'}"/>`;
  s += `<text x="${w / 2}" y="${r1(hg * 0.2)}" font-size="${r1((w * 1.3) / Math.max(5, nm.length))}" text-anchor="middle" font-weight="800" fill="${copy ? '#222' : '#fff'}" ${FONT}>${esc(nm)}</text>`;
  if (st === 'soldout') s += `<g transform="rotate(-20 ${w / 2} ${hg * 0.6})"><rect x="-3" y="${r1(hg * 0.55)}" width="${w + 6}" height="${r1(w * 0.24)}" fill="#E5243B"/><text x="${w / 2}" y="${r1(hg * 0.55 + w * 0.18)}" font-size="${r1(w * 0.17)}" text-anchor="middle" font-weight="900" fill="#fff" ${FONT}>AGOTADO</text></g>`;
  return s + `<rect x="${r1(w / 2 - 6)}" y="-3" width="12" height="6" fill="#F3E9B5" opacity=".85"/></g>`;
}
function stageDeck(x0, x1, y, c = '#C98F5E', skirt = '#E0338A') {
  return `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="16" fill="${c}" ${OL}/><path d="M${x0} ${y + 5}H${x1}" stroke="${mix(c, INK, 0.25)}" stroke-width="1"/><rect x="${x0}" y="${y + 16}" width="${x1 - x0}" height="10" fill="${skirt}" ${OL}/>` +
    `<path d="M${x0 + 10} ${y + 16}v10M${x0 + 40} ${y + 16}v10M${x1 - 40} ${y + 16}v10M${x1 - 10} ${y + 16}v10" stroke="${mix(skirt, INK, 0.3)}" stroke-width="1"/>`;
}
const CITY = {
  gdl: { label: 'GUADALAJARA', art: (n) => { const c = n ? '#4D3F80' : '#E8C9A0', t = n ? '#6A5AA8' : '#F2C94C';
    return `<g transform="translate(176 22) scale(.82)"><g fill="${c}" ${OLT}><rect x="140" y="62" width="80" height="60"/><rect x="146" y="40" width="18" height="40"/><rect x="196" y="40" width="18" height="40"/><path d="M180 62L170 76H190Z"/></g>` +
      `<path d="M143 40L155 6L167 40ZM193 40L205 6L217 40Z" fill="${t}" ${OLT}/><path d="M149 30h12M197 30h12M151 22h8M199 22h8" stroke="${n ? '#6C8BD9' : '#3C6FD0'}" stroke-width="2"/><circle cx="180" cy="90" r="9" fill="${n ? '#FFE08A' : '#8FC9F0'}" ${OLT}/></g>` + `<path d="M0 132h40v-22a14 14 0 0 1 28 0v22h8v-22a14 14 0 0 1 28 0v22h4" fill="${c}" ${OLT}/>`; } },
  mty: { label: 'MONTERREY', art: (n) => `<path d="M20 130L110 50L150 80L175 66L210 26L270 96L340 130Z" fill="${n ? '#4D3F80' : '#9C8AC9'}" ${OLT}/><path d="M198 40L210 26L222 42" stroke="${n ? '#6A5AA8' : '#D9CCF2'}" stroke-width="4" class="ral"/>` +
    `<g fill="${n ? '#2B2250' : '#7A6AA8'}"><rect x="90" y="104" width="14" height="26"/><rect x="108" y="96" width="12" height="34"/><rect x="230" y="100" width="16" height="30"/><rect x="250" y="108" width="12" height="22"/></g>` },
  pue: { label: 'PUEBLA', art: (n) => `<path d="M40 124L100 54L118 60L170 124Z" fill="${n ? '#3B2F66' : '#A79BC9'}" ${OLT}/><path d="M86 70L100 54L118 60L112 70L100 64Z" fill="#fff"/><path d="M104 50q-6 -10 2 -16q10 -6 6 -14" stroke="${n ? '#8E86B0' : '#D9D4E8'}" stroke-width="5" class="ral"/>` +
    `<path d="M190 124Q230 70 250 74Q270 64 330 124Z" fill="${n ? '#33295C' : '#9A8EC0'}" ${OLT}/><path d="M228 84Q244 70 252 76Q262 68 278 84Q262 80 252 84Q240 80 228 84Z" fill="#fff"/>` +
    `<g transform="translate(0 112)">${Array.from({ length: 12 }, (_, i) => `<g transform="translate(${15 + i * 30} 0)"><rect x="-13" y="-8" width="26" height="16" fill="#FBF8FF" ${OLT}/><path d="M0 -6L6 0L0 6L-6 0Z" fill="#2F5FC2"/><circle r="1.8" fill="#FFD23D"/></g>`).join('')}</g>` },
};
const PLACES = {
  cochera: (c) => {
    const wall = c.night ? '#5B4668' : '#F1D7B4', floor = c.night ? '#4A3E52' : '#C2B6AA', lv = c.garageLevel;
    let b = `<rect width="360" height="220" fill="${wall}"/><g stroke="${mix(wall, INK, 0.1)}" stroke-width="1" fill="none"><path d="M0 50H360M0 80H360M0 110H360"/><path d="M40 20V50M120 20V50M200 20V50M280 20V50M80 50V80M160 50V80M240 50V80M320 50V80M40 80V110M120 80V110M200 80V110M280 80V110M80 110V142M160 110V142M240 110V142M320 110V142"/></g>` +
      `<rect x="-2" y="-2" width="364" height="22" fill="#D9CBBB" ${OL}/><path d="M0 7H360M0 13H360" stroke="#B9A894" stroke-width="1.4"/>` +
      `<path d="M296 78H352M296 112H352" stroke="#8A5A34" stroke-width="4"/><rect x="300" y="88" width="20" height="24" fill="#D9A066" ${OL}/><rect x="324" y="94" width="14" height="18" rx="2" fill="#7CC6F4" ${OL}/><rect x="302" y="62" width="12" height="16" rx="2" fill="#FF8C6B" ${OL}/><rect x="318" y="58" width="22" height="20" fill="#D9A066" ${OL}/>` +
      `<g fill="none" stroke-width="2.6"><circle cx="30" cy="126" r="13" stroke="${INK}"/><circle cx="74" cy="126" r="13" stroke="${INK}"/><path d="M30 126L46 104H66L74 126M46 104L52 126L66 104M42 98H52M66 104L64 96H71" stroke="#E23B4B" stroke-linecap="round"/></g>` +
      `<rect y="142" width="360" height="78" fill="${floor}"/><path d="M0 142H360" stroke="${INK}" stroke-width="1.2" opacity=".35"/><ellipse cx="312" cy="200" rx="24" ry="4" fill="${INK}" opacity=".08"/>` +
      `<rect x="258" y="124" width="30" height="36" rx="3" fill="#2F2A3E" ${OL}/><circle cx="273" cy="143" r="10" fill="#4A4458" ${OLT}/><circle cx="273" cy="143" r="4" fill="#2F2A3E"/><path d="M262 129h22" stroke="#FFC83D" stroke-width="1.6"/>`;
    let defs = '';
    if (lv < 1) {
      defs = `<radialGradient id="${c.id}b"><stop offset="0" stop-color="#FFF3A8" stop-opacity=".75"/><stop offset="1" stop-color="#FFF3A8" stop-opacity="0"/></radialGradient>`;
      b += `<path d="M180 20V40" stroke="${INK}" stroke-width="1.2"/><circle cx="180" cy="48" r="${c.night ? 90 : 60}" fill="url(#${c.id}b)"/><rect x="176" y="38" width="8" height="5" fill="#9A93A8" ${OLT}/><circle cx="180" cy="48" r="6.5" fill="#FFF3A8" ${OLT}/><path d="M178 47q2 -3 4 0" stroke="#E0A31C" stroke-width=".8" fill="none"/>`;
    } else {
      b += bulbs(c.id, 24, 14, 16) + `<ellipse cx="180" cy="168" rx="130" ry="18" fill="#E86FA6" ${OL}/><ellipse cx="180" cy="168" rx="104" ry="13" fill="none" stroke="#FFD1E6" stroke-width="3"/><ellipse cx="180" cy="168" rx="76" ry="8.5" fill="none" stroke="#9A6BF0" stroke-width="3"/>`;
    }
    if (lv >= 2) {
      b += [[110, 48, -8, '#7CC6F4'], [138, 42, 6, '#FF8CC6'], [166, 52, -4, '#FFD23D'], [124, 76, 9, '#5EE6C8'], [154, 80, -6, '#B48CF2']].map(([x, y, r, cl]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-11" y="-12" width="22" height="25" fill="#fff" ${OLT}/><rect x="-8.5" y="-9.5" width="17" height="15" fill="${cl}"/><circle cx="-2" cy="0" r="3" fill="#FFF6C8"/><circle cx="4" cy="1" r="2.4" fill="#fff" opacity=".8"/></g>`).join('') +
        miniPoster(c.poster || { stage: 'color', band: c.band }, 218, 36, 38, 3);
    }
    return { b, defs, band: { y: 166, s: 0.6, x0: 132, x1: 228 }, crowd: 'chairs' };
  },
  cafe: (c) => {
    const n = c.night, wall = n ? '#5E4458' : '#F6E3C6';
    let b = `<rect width="360" height="220" fill="${wall}"/><text x="70" y="34" font-size="16" fill="#C2264B" text-anchor="middle" ${HAND}>Café La Glorieta</text>` +
      `<rect y="112" width="360" height="40" fill="#B97A4C"/><path d="M0 112H360" stroke="${INK}" stroke-width="1.2"/><path d="M30 112v40M70 112v40M110 112v40M150 112v40M190 112v40M230 112v40M270 112v40M310 112v40M350 112v40" stroke="#9A6038" stroke-width="1"/>` +
      `<rect x="258" y="18" width="88" height="62" rx="3" fill="#2F3B37" stroke="#A06E40" stroke-width="4"/><text x="302" y="38" font-size="10" text-anchor="middle" fill="#F4F2EE" ${HAND}>Tres leches</text><text x="302" y="54" font-size="12" text-anchor="middle" fill="#FFE36E" ${HAND}>$35</text><path d="M286 70h32l-4 -8h-24z" fill="none" stroke="#FF8CC6" stroke-width="1.4"/>` +
      `<rect x="8" y="78" width="66" height="74" rx="3" fill="#6B3E22" ${OL}/><rect x="12" y="104" width="58" height="10" fill="#FBF8FF" ${OLT}/><path d="M18 104v6M24 104v6M32 104v6M38 104v6M46 104v6M52 104v6M60 104v6" stroke="${INK}" stroke-width="1.8"/><rect x="34" y="66" width="12" height="12" rx="2" fill="#E0338A" ${OLT}/><circle cx="36" cy="60" r="6" fill="#5CC27A" ${OLT}/><circle cx="44" cy="62" r="5" fill="#4FAE6A" ${OLT}/>` +
      [130, 236].map((x, i) => `<path d="M${x} 0V30" stroke="${INK}" stroke-width="1"/><ellipse cx="${x}" cy="46" rx="${n ? 40 : 26}" ry="${n ? 26 : 16}" fill="#FFE9A8" opacity="${n ? 0.35 : 0.3}"/><path d="M${x - 10} 40L${x - 5} 30H${x + 5}L${x + 10} 40Z" fill="${i ? '#FFC83D' : '#E0338A'}" ${OLT}/>`).join('') +
      `<rect x="282" y="116" width="70" height="36" rx="3" fill="#DFF3FF" opacity=".9" ${OL}/><path d="M290 140a8 8 0 0 1 16 0zM312 140a8 8 0 0 1 16 0zM332 140a7 7 0 0 1 14 0z" fill="#FF8CC6"/><circle cx="298" cy="131" r="1.6" fill="#E23B4B"/>` +
      `<rect y="152" width="360" height="68" fill="#C98F5E"/><path d="M0 152H360M0 176H360M0 200H360" stroke="#B07A4C" stroke-width="1"/><ellipse cx="186" cy="166" rx="76" ry="10" fill="#7B5CC4" ${OL}/>`;
    if (c.poster) b += miniPoster(c.poster, 210, 52, 30, -4);
    if (n) b += `<rect width="360" height="152" fill="#1A1033" opacity=".18"/>`;
    return { b, band: { y: 166, s: 0.58, x0: 140, x1: 232 }, pal: n ? DARK_PAL : DAY_PAL };
  },
  cumple: (c) => {
    const n = c.night;
    let b = `<rect width="360" height="220" fill="${n ? '#2C2A5E' : '#BDE7FF'}"/>${n ? stars(26, 80) : `<g fill="#fff"><ellipse cx="300" cy="34" rx="24" ry="9"/><ellipse cx="316" cy="28" rx="14" ry="9"/><ellipse cx="70" cy="22" rx="18" ry="7"/></g>`}` +
      `<rect y="92" width="360" height="62" fill="${n ? '#8A6A58' : '#E9B98A'}"/>${Array.from({ length: 19 }, (_, i) => `<path d="M${i * 20 + 1} 154V96l9 -8 9 8V154" fill="${n ? '#9A7A66' : '#F2CBA0'}" ${OLT}/>`).join('')}` +
      papelPicado(6, 14, 0, 360, 8) +
      `<path d="M70 44Q180 58 290 44V62Q180 76 70 62Z" fill="#FF4F9A" ${OL}/><text x="180" y="62" font-size="13" font-weight="800" text-anchor="middle" fill="#fff" ${FONT}>¡FELIZ CUMPLE, SANTI!</text>` +
      `<path d="M40 150Q38 120 30 92M40 150Q44 116 52 86M40 150Q40 118 42 100" stroke="${INK}" stroke-width=".8" fill="none"/>` +
      [[30, 84, '#FF6FAE'], [52, 78, '#FFD23D'], [42, 94, '#5EC8F2'], [22, 100, '#8B5CF6']].map(([x, y, cl]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="11" fill="${cl}" ${OL}/><path d="M${x - 3} ${y - 5}q2 -3 4 -2" stroke="#fff" stroke-width="1.6" fill="none"/>`).join('') +
      `<path d="M300 0V64" stroke="${INK}" stroke-width="1"/><g transform="translate(300 80)"><ellipse rx="20" ry="13" fill="#F2B04A" ${OL}/><path d="M-18 6h-4M18 6h4M-10 12v6M10 12v6" stroke="#F2B04A" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="-10" r="10" fill="#F2B04A" ${OL}/><path d="M10 -16Q18 -28 28 -16Z" fill="#E23B4B" ${OL}/><path d="M16 -24h4" stroke="#FFD23D" stroke-width="2"/><circle cx="22" cy="-10" r="1.4" fill="${INK}"/><circle cx="27" cy="-6" r="2" fill="${INK}"/><path d="M-20 -6q-8 -10 -4 -16" stroke="#FF6FAE" stroke-width="3" fill="none"/></g>` +
      `<rect x="262" y="130" width="84" height="30" fill="#FF8CC6" ${OL}/><path d="M262 140q10 6 21 0t21 0t21 0t21 0" stroke="#fff" stroke-width="2" fill="none"/><rect x="286" y="110" width="36" height="20" rx="3" fill="#FFF3D6" ${OL}/><path d="M286 118q9 4 18 0t18 0" stroke="#FF6FAE" stroke-width="2.4" fill="none"/><text x="304" y="108" font-size="12" font-weight="900" text-anchor="middle" fill="#8B5CF6" ${FONT}>7</text>` +
      `<rect y="154" width="360" height="66" fill="${n ? '#3F7A4A' : '#8FD27E'}"/><path d="M20 170l3 -5 3 5M120 196l3 -5 3 5M250 178l3 -5 3 5M330 208l3 -5 3 5" stroke="${n ? '#2F5E38' : '#6CB65C'}" stroke-width="1.4" fill="none"/>`;
    return { b, band: { y: 166, s: 0.56, x0: 124, x1: 222 }, hats: true, rows: ROWS.map((r) => ({ ...r, s: r.s * 0.86 })) };
  },
  kermes: (c) => {
    const n = c.night;
    let b = `<rect width="360" height="220" fill="${n ? '#2A2153' : '#A9DEFF'}"/>${n ? stars(30, 60) : ''}` +
      `<rect x="40" y="46" width="280" height="96" fill="${n ? '#6A5A80' : '#F4D9A6'}" ${OL}/><rect x="40" y="46" width="280" height="10" fill="${n ? '#5A4A70' : '#E0B97A'}"/>` +
      Array.from({ length: 6 }, (_, i) => `<rect x="${58 + i * 44}" y="66" width="26" height="22" fill="${n ? '#FFE9A8' : '#8FC9F0'}" ${OLT}/>`).join('') +
      `<rect x="150" y="47" width="60" height="14" rx="3" fill="#2F5FC2" ${OLT}/><text x="180" y="58" font-size="9" font-weight="800" text-anchor="middle" fill="#fff" ${FONT}>ESCUELA</text>` +
      papelPicado(18, 16, 0, 360, 10) + papelPicado(36, 12, 30, 330, 8) +
      [[0, 'LOTERÍA', '#E23B4B'], [282, 'ESQUITES', '#2FA36B']].map(([x, t, cl]) => `<rect x="${x + 6}" y="108" width="72" height="46" fill="#FBF8FF" ${OL}/><path d="M${x} 108l6 -16h72l6 16z" fill="${cl}" ${OL}/><path d="M${x + 18} 92l-4 16M${x + 34} 92v16M${x + 50} 92v16M${x + 66} 92l4 16" stroke="#fff" stroke-width="5"/><rect x="${x + 10}" y="114" width="64" height="12" rx="2" fill="${cl}"/><text x="${x + 42}" y="123.5" font-size="8.5" font-weight="800" text-anchor="middle" fill="#fff" ${FONT}>${t}</text>`).join('') +
      `<rect y="142" width="360" height="78" fill="${n ? '#5A5068' : '#E4D8C8'}"/>` + stageDeck(92, 268, 150, '#C98F5E', '#E0338A');
    return { b, band: { y: 152, s: 0.56, x0: 128, x1: 232 }, pal: n ? DARK_PAL : DAY_PAL };
  },
  foro: (c) => {
    let b = `<rect width="360" height="220" fill="#2A1E3D"/><g stroke="#33264A" stroke-width="1"><path d="M0 40H360M0 70H360M0 100H360M0 130H360"/></g>` +
      `<g fill="#B8264B" ${OL}><path d="M-2 0H46Q38 80 50 150H-2Z"/><path d="M362 0H314Q322 80 310 150H362Z"/></g><path d="M14 0Q10 70 18 150M30 0Q26 70 34 150M346 0Q350 70 342 150M330 0Q334 70 326 150" stroke="#8E1C3A" stroke-width="2" fill="none"/>` +
      `<rect x="60" y="8" width="240" height="8" fill="#4A4458"/>${[90, 150, 210, 270].map((x) => `<rect x="${x - 5}" y="14" width="10" height="10" rx="2" fill="#2F2A3E" ${OLT}/>`).join('')}` +
      beams([[90, '#FF4F9A'], [150, '#5EC8F2'], [210, '#FFD23D'], [270, '#B48CF2']], c.night ? 0.24 : 0.16) +
      `<text x="180" y="50" font-size="22" font-weight="900" text-anchor="middle" fill="none" stroke="#FF4F9A" stroke-width="5" opacity=".35" ${FONT}>FORO CACHITO</text><text x="180" y="50" font-size="22" font-weight="900" text-anchor="middle" fill="none" stroke="#FFB8DA" stroke-width="1.4" ${FONT}>FORO CACHITO</text>` +
      `<rect x="62" y="106" width="22" height="42" rx="2" fill="#15101F" ${OL}/><rect x="276" y="106" width="22" height="42" rx="2" fill="#15101F" ${OL}/><circle cx="73" cy="122" r="6" fill="#2F2A3E"/><circle cx="287" cy="122" r="6" fill="#2F2A3E"/>` +
      `<rect y="148" width="360" height="72" fill="#1B1428"/><rect x="50" y="148" width="260" height="14" fill="#15101F" ${OL}/>${Array.from({ length: 13 }, (_, i) => `<circle cx="${60 + i * 20}" cy="155" r="1.6" fill="${['#FF4F9A', '#FFD23D', '#5EC8F2'][i % 3]}"/>`).join('')}`;
    if (c.poster) b += miniPoster(c.poster, 306, 64, 28, 4);
    return { b, band: { y: 150, s: 0.58, x0: 118, x1: 242 }, pal: DARK_PAL };
  },
  plaza: (c) => {
    const n = c.night;
    const tree = (x, y, r) => `<path d="M${x} ${y + r}V${y + r + 26}" stroke="#7A4A2C" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${r}" fill="${n ? '#2F6A4A' : '#5CC27A'}" ${OL}/><circle cx="${x - r * 0.4}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="${n ? '#3A7A56' : '#7FD68E'}"/>`;
    const lamp = (x) => `<path d="M${x} 150V86" stroke="#3A3550" stroke-width="3"/><circle cx="${x}" cy="82" r="6" fill="${n ? '#FFF3A8' : '#FBF8FF'}" ${OLT}/>${n ? `<circle cx="${x}" cy="82" r="22" fill="#FFF3A8" opacity=".25"/>` : ''}`;
    let b = `<rect width="360" height="220" fill="${n ? '#1E2350' : '#9ED8FF'}"/>${n ? stars(30, 70) + '<circle cx="320" cy="30" r="12" fill="#FFF6C8"/><circle cx="315" cy="27" r="11" fill="#1E2350"/>' : '<g fill="#fff"><ellipse cx="60" cy="30" rx="22" ry="8"/><ellipse cx="290" cy="22" rx="18" ry="7"/></g>'}` +
      tree(30, 90, 26) + tree(330, 92, 24) + tree(72, 104, 18) + tree(290, 106, 18) +
      `<g transform="translate(180 0)"><path d="M-46 64Q0 18 46 64Z" fill="${n ? '#2E8A66' : '#3FA37A'}" ${OL}/><path d="M0 22V12" stroke="${INK}" stroke-width="1.6"/><circle cx="0" cy="11" r="3" fill="#FFD23D" ${OLT}/><rect x="-50" y="62" width="100" height="7" fill="#FBF8FF" ${OL}/>` +
      `<path d="M-42 69V118M-21 69V118M0 69V118M21 69V118M42 69V118" stroke="#FBF8FF" stroke-width="4"/><path d="M-42 69V118M42 69V118" stroke="${INK}" stroke-width=".8" opacity=".4"/><path d="M-46 100H46" stroke="#E8D9C2" stroke-width="3"/><rect x="-54" y="118" width="108" height="14" fill="#E8D9C2" ${OL}/></g>` +
      lamp(110) + lamp(250) + papelPicado(14, 18, 0, 360, 10) +
      `<rect y="140" width="360" height="80" fill="${n ? '#4A4468' : '#E8D9C2'}"/><path d="M0 170H360M0 196H360M60 140L40 220M140 140L130 220M220 140L230 220M300 140L320 220" stroke="${n ? '#3E3A5A' : '#D6C5AA'}" stroke-width="1.2"/>` +
      stageDeck(84, 276, 146, '#C98F5E', '#3C8CF2') + `<text x="180" y="170" font-size="8" font-weight="900" text-anchor="middle" fill="#fff" letter-spacing="1" ${FONT}>PLAZA DE LA COLONIA</text>`;
    return { b, band: { y: 148, s: 0.54, x0: 124, x1: 236 }, pal: n ? DARK_PAL : DAY_PAL };
  },
  indierocks: (c) => {
    const defs = `<pattern id="${c.id}w" width="40" height="40" patternUnits="userSpaceOnUse" x="46" y="26"><rect width="17" height="17" rx="2" fill="#FF4F9A"/><rect x="20" width="17" height="17" rx="2" fill="#3A2F66"/><rect y="20" width="17" height="17" rx="2" fill="#5EC8F2"/><rect x="20" y="20" width="17" height="17" rx="2" fill="#8B5CF6"/></pattern>`;
    let b = `<rect width="360" height="220" fill="#1E1A3A"/><rect x="40" y="20" width="280" height="110" fill="#14102A" ${OL}/><rect x="44" y="24" width="272" height="102" fill="url(#${c.id}w)" opacity=".85"/>` +
      `<text x="180" y="86" font-size="26" font-weight="900" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke" ${FONT}>INDIE ROCKS</text>` +
      beams([[60, '#FF4F9A'], [130, '#5EC8F2'], [230, '#FFD23D'], [300, '#8B5CF6']], 0.2) +
      `<rect y="140" width="360" height="80" fill="#151028"/><rect x="24" y="140" width="312" height="16" fill="#0E0A1C" ${OL}/>`;
    return { b, defs, band: { y: 142, s: 0.52, x0: 112, x1: 248 }, pal: DARK_PAL, back: { y0: 158, y1: 186, x0: 10, x1: 350 } };
  },
  foro_mediano: (c) => {
    let b = `<rect width="360" height="220" fill="#3A1838"/><path d="M0 0H360V30Q180 60 0 30Z" fill="#5A2050"/>` +
      `<rect x="0" y="62" width="360" height="30" fill="#4A1C44"/><path d="M0 62H360" stroke="#FFC83D" stroke-width="2"/><path d="M0 92H360" stroke="#FFC83D" stroke-width="3"/>` +
      `<g fill="#B8264B" ${OL}><path d="M-2 92H60Q50 120 60 150H-2Z"/><path d="M362 92H300Q310 120 300 150H362Z"/></g>` +
      `<path d="M60 96H300V150H60Z" fill="#251028"/>` + beams([[110, '#FF4F9A'], [180, '#FFD23D'], [250, '#5EC8F2']], 0.18) +
      `<rect x="130" y="4" width="100" height="18" rx="9" fill="#FFC83D" ${OL}/><text x="180" y="17" font-size="10" font-weight="900" text-anchor="middle" fill="${INK}" ${FONT}>FORO · 1,000</text>` +
      `<rect y="150" width="360" height="70" fill="#1E0E22"/><rect x="50" y="146" width="260" height="12" fill="#2A1430" ${OL}/>`;
    return { b, band: { y: 148, s: 0.5, x0: 116, x1: 244 }, pal: DARK_PAL, back: { y0: 160, y1: 188, x0: 6, x1: 354 }, balcony: { y0: 64, y1: 90, x0: 0, x1: 360 } };
  },
  gira: (c) => {
    const n = c.night, city = CITY[c.city] || CITY.gdl;
    const defs = `<linearGradient id="${c.id}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n ? '#1E1A4A' : '#FF9FB8'}"/><stop offset="1" stop-color="${n ? '#5A3A7A' : '#FFD7A0'}"/></linearGradient>`;
    let b = `<rect width="360" height="220" fill="url(#${c.id}sk)"/>${n ? stars(24, 60) : `<circle cx="300" cy="40" r="16" fill="#FFF3B0"/>`}` + city.art(n) +
      `<path d="M66 140V20H294V140" fill="none" stroke="#3A3550" stroke-width="5"/><path d="M66 20H294" stroke="#3A3550" stroke-width="8"/><path d="M66 30L76 20M86 20L76 30M274 20L284 30M294 30L284 20" stroke="#6A6488" stroke-width="1.4"/>` +
      `<rect x="96" y="24" width="168" height="18" rx="4" fill="#E0338A" ${OL}/><text x="180" y="37" font-size="10" font-weight="900" text-anchor="middle" fill="#fff" ${FONT}>GIRA · ${city.label}</text>` +
      beams([[100, '#FFD23D'], [180, '#FF4F9A'], [260, '#5EC8F2']], n ? 0.22 : 0.12) +
      `<rect y="146" width="360" height="74" fill="${n ? '#2A2340' : '#6A5A80'}"/>` + stageDeck(66, 294, 136, '#2F2A3E', '#4A4458');
    return { b, defs, band: { y: 138, s: 0.5, x0: 114, x1: 246 }, pal: n ? DARK_PAL : DAY_PAL, back: { y0: 168, y1: 190, x0: 0, x1: 360 } };
  },
  palacio: (c) => {
    const ribs = Array.from({ length: 9 }, (_, i) => `M${i * 45} 150Q${180 + (i * 45 - 180) * 0.3} -40 ${360 - i * 45} 150`).join('');
    let b = `<rect width="360" height="220" fill="#1A1238"/><path d="M-10 150Q180 -70 370 150Z" fill="#241A4A"/><path d="${ribs}" stroke="#FF4F9A" stroke-width="1.2" fill="none" opacity=".55"/>` +
      `<path d="M20 120Q180 10 340 120M50 90Q180 20 310 90" stroke="#5EC8F2" stroke-width="1.2" fill="none" opacity=".5"/>` +
      beams([[120, '#FF4F9A'], [180, '#5EC8F2'], [240, '#FF4F9A']], 0.2);
    return { b, band: { y: 136, s: 0.3, x0: 160, x1: 200 }, huge: 'palacio', pal: DARK_PAL };
  },
  estadio: (c) => {
    let b = `<rect width="360" height="220" fill="#120E30"/>${stars(30, 40)}` +
      [18, 342].map((x) => `<path d="M${x} 120V22" stroke="#5A566E" stroke-width="3"/><rect x="${x - 12}" y="10" width="24" height="14" rx="2" fill="#FFF6C8" ${OLT}/><circle cx="${x}" cy="17" r="30" fill="#FFF6C8" opacity=".12"/>`).join('') +
      `<path d="M0 60L120 96V132L0 170Z" fill="#2A2050"/><path d="M360 60L240 96V132L360 170Z" fill="#2A2050"/>`;
    return { b, band: { y: 132, s: 0.31, x0: 158, x1: 202 }, huge: 'estadio', pal: DARK_PAL };
  },
  estudio: (c) => {
    let b = `<rect width="360" height="220" fill="#3C2F5C"/>` +
      Array.from({ length: 24 }, (_, i) => `<rect x="${8 + (i % 8) * 26}" y="${14 + Math.floor(i / 8) * 34}" width="22" height="30" rx="5" fill="${i % 3 ? '#4A3B73' : '#5B4A8A'}"/>`).join('') +
      `<rect x="222" y="18" width="128" height="86" rx="6" fill="#1E1838" ${OL}/><rect x="228" y="24" width="116" height="74" rx="3" fill="#2A3A6A"/><rect x="232" y="74" width="108" height="20" rx="2" fill="#4A4458"/>` +
      Array.from({ length: 10 }, (_, i) => `<path d="M${238 + i * 10} 78v12" stroke="#2F2A3E" stroke-width="2"/><rect x="${235.5 + i * 10}" y="${80 + (i * 3) % 8}" width="5" height="3" fill="${['#5EE6C8', '#FFD23D', '#FF4F9A'][i % 3]}"/>`).join('') +
      `<circle cx="300" cy="56" r="11" fill="#E6B08A" ${OLT}/><path d="M289 54q0 -14 11 -14q11 0 11 14q-4 -6 -11 -7q-7 1 -11 7z" fill="#2A1F22"/><path d="M291 46q-2 6 -1 10" stroke="#3C8CF2" stroke-width="2.4" fill="none"/><path d="M286 74q14 -10 28 0" fill="#3A3550"/>` +
      `<rect x="46" y="6" width="74" height="18" rx="9" fill="${c.night ? '#E5243B' : '#8E2F45'}" ${OL}/><text x="83" y="19" font-size="9.5" font-weight="900" text-anchor="middle" fill="#fff" ${FONT}>● GRABANDO</text>` +
      (c.night ? '<circle cx="83" cy="15" r="40" fill="#E5243B" opacity=".12"/>' : '') +
      `<rect y="150" width="360" height="70" fill="#2A2140"/><ellipse cx="180" cy="196" rx="150" ry="20" fill="#7B5CC4" ${OL}/><path d="M40 210Q100 186 150 214M220 214Q280 190 330 206" stroke="#151028" stroke-width="2" fill="none"/>`;
    return { b, band: { y: 200, s: 0.72, x0: 100, x1: 260 }, crowd: 'none' };
  },
};
export const PLACE_IDS = Object.keys(PLACES);

function bigCrowd(id, kind, cr, juju) {
  const ratio = clamp((cr.count || 0) / Math.max(1, cr.cap || 1), 0, 1);
  let s = '';
  if (kind === 'palacio') {
    s += `<path d="M0 150L150 120H210L360 150V220H0Z" fill="#2E2456"/><path d="M0 112L130 96V122L0 150ZM360 112L230 96V122L360 150Z" fill="#33295E"/>` +
      seaMk(id, [{ d: 'M0 160L150 140H210L360 160V220H0Z', pat: 'n', x0: 0, x1: 360 }, { d: 'M0 112L130 96V122L0 150ZM360 112L230 96V122L360 150Z', pat: 'f', x0: 0, x1: 360 }], ratio) +
      `<rect x="140" y="124" width="80" height="14" fill="#15101F" ${OL}/>` +
      [[112, 64], [248, 64]].map(([x, y]) => `<rect x="${x - 24}" y="${y}" width="48" height="32" rx="3" fill="#0E0A1C" ${OL}/>`).join('');
    if (juju) s += signMk(juju, 112, 80, 40, 2) + signMk(juju, 248, 80, 40, 2);
  } else {
    s += `<path d="M0 150H360V220H0Z" fill="#1F7A4A"/><path d="M0 150H360" stroke="#fff" stroke-width="1" opacity=".3"/>` +
      seaMk(id, [{ d: 'M0 152H360V220H0Z', pat: 'n', x0: 0, x1: 360 }, { d: 'M0 128L120 100V128L0 150ZM360 128L240 100V128L360 150Z', pat: 'm', x0: 0, x1: 360 }, { d: 'M0 64L120 96V102L0 126ZM360 64L240 96V102L360 126Z', pat: 'f', x0: 0, x1: 360 }], ratio) +
      `<rect x="130" y="40" width="100" height="52" rx="4" fill="#0E0A1C" ${OL}/><rect x="134" y="44" width="92" height="44" rx="2" fill="#2A2050"/>` +
      `<path d="M138 114L150 100H210L222 114V134H138Z" fill="#3A3550"/><rect x="134" y="120" width="92" height="14" fill="#15101F" ${OL}/>`;
    s += juju ? signMk(juju, 180, 66, 70, 2) : `<g transform="translate(180 66) scale(1.6)">${PRINT.star('#FFD23D')}</g>`;
  }
  return s;
}

// Escena ancha (360×220): lugar + banda tocando + público proporcional.
export const sceneSvg = (opts = {}) => withLod(1, () => { const r = withLib(() => sceneInner(opts)); return r.out.replace('<defs>', `<defs>${r.defs}`); });
function sceneInner(opts) {
  const { place = 'cochera', members = ['me', 'nina'], crowd = {}, garageLevel = 0, poster = null, night = false, look, city, size, band } = opts;
  const id = nid();
  const P = (PLACES[place] || PLACES.cochera)({ id, night, garageLevel: clamp(garageLevel | 0, 0, 2), poster, city, band });
  const cr = { count: 0, cap: 10, ...crowd };
  const signName = cr.juju ? (typeof cr.sign === 'string' ? cr.sign : (cr.sign && cr.sign.text) || 'MARIEL') : '';
  const signLevel = (cr.sign && cr.sign.level) || cr.signLevel || 0;
  let defs = (P.defs || '') + crowdDefs(id);
  // banda: la batería va atrás al centro
  const list = members.slice(0, 5);
  const drummer = list.findIndex((m) => ['tambo', 'vale', 'emilio'].includes(typeof m === 'string' ? m : m.id));
  const front = list.filter((_, i) => i !== drummer);
  const { y, s, x0, x1 } = P.band;
  let bandMk = '';

  if (drummer >= 0 && place === 'estudio') front.push(list[drummer]);
  const slots = drummer >= 0 && place !== 'estudio' ? front.length + 1 : front.length;
  let xs = slots === 1 ? [(x0 + x1) / 2] : Array.from({ length: slots }, (_, i) => x0 + ((x1 - x0) * i) / (slots - 1));
  if (slots !== front.length) { const mid = Math.ceil(front.length / 2); xs.splice(mid, 1); }
  if (drummer >= 0 && place !== 'estudio') {
    const all = Array.from({ length: front.length + 1 }, (_, i) => x0 + ((x1 - x0) * i) / Math.max(1, front.length));
    bandMk += put(memberFigure(list[drummer], look), front.length ? all[Math.ceil(front.length / 2)] : (x0 + x1) / 2, y - 8 * s, s * 0.94);
  }
  front.forEach((m, i) => { bandMk += put(memberFigure(m, look), xs[i], y, s); });
  const ratio = clamp((cr.count || 0) / Math.max(1, cr.cap || 1), 0, 1);
  const signH = (sw) => (sw * 34) / (Math.max(5, signName.length) * 7.6 + 12);
  const jujuMk = (x, yy, sc, _sy, sw) => put(figure(castSpec('juju', { noSign: true }), 'cheer'), x, yy, sc) + signMk(signName, x, yy - (138 - 66) * sc - signH(sw) / 2 + 3, sw, signLevel);
  let back = '', fore = '';
  if (P.huge) {
    defs += seaDefs(id, P.pal, cr.lit);
    back = bigCrowd(id, P.huge, cr, signName);
    if (P.huge === 'estadio') {
      // 3 sillas reservadas en primera fila: el primer público de la cochera
      fore += crowdMk(id, { ...cr, count: Math.round(22 * ratio), cap: 22 }, { rows: [{ y: 214, x0: 20, x1: 340, n: 16, s: 0.8 }, { y: 228, x0: 10, x1: 110, n: 3, s: 1 }, { y: 228, x0: 250, x1: 350, n: 3, s: 1 }], pal: P.pal });
      fore += [150, 180, 210].map((x) => `<g transform="translate(${x} 216)"><path d="M-10 -16H10V-6H-10Z" fill="#E0338A" ${OL}/><path d="M-9 -6V8M9 -6V8" stroke="#E0338A" stroke-width="3"/></g>`).join('') + unicornMk(210, 200, 0.6);
    } else fore += crowdMk(id, { ...cr, count: Math.round(26 * ratio), cap: 26 }, { pal: P.pal });
    if (cr.juju) fore += jujuMk(150, 214, 0.34, 152, 44);
  } else if (P.crowd === 'chairs') {
    // Juju brings her own pink chair, so she is one of the `cap` seats: 3 sillas = Juju + 2 more.
    const nCh = clamp((cr.cap || 3) - (cr.juju ? 1 : 0), 2, 8);
    const xs2 = Array.from({ length: nCh }, (_, i) => 180 + (i - (nCh - 1) / 2) * Math.min(46, 250 / nCh));
    const order = xs2.map((x, i) => ({ x, i })).sort((a, b) => Math.abs(a.x - 180) - Math.abs(b.x - 180));
    // The first public is counted one by one (Juju, Señor Brillitos, Mamá…); bigger crowds fill by ratio.
    let filled = cr.count > 0 ? Math.max(Math.min(cr.count, 3), Math.round((nCh + (cr.juju ? 1 : 0)) * ratio)) : 0;
    const brillitos = cr.juju && filled > 1;
    if (cr.juju && filled > 0) filled -= 1;
    const cols = ['#E23B4B', '#5EC8F2', '#A06E40', '#FFC83D', '#8B5CF6'];
    order.forEach((c, k) => {
      const x = r1(c.x), cl = cols[c.i % cols.length];
      // The chair first and the person on top, so whoever sits there is seen whole (not hidden by the backrest).
      fore += `<g transform="translate(${x} 206)"><path d="M-11 -16H11V-6H-11Z" fill="${cl}" ${OL}/><path d="M-10 -6V14M10 -6V14M-10 4H10" stroke="${cl}" stroke-width="3"/></g>`;
      if (brillitos && k === 0) fore += unicornMk(x, 188, 0.85, !!opts.sleepy);
      else if (k < filled) fore += `<use href="#${id}${jit(c.i) < 0.4 ? 'q' : 'p'}" transform="translate(${x} 200)" fill="${DAY_PAL[c.i % 6]}"/>`;
    });
    if (cr.juju) fore += `<g transform="translate(44 208)"><path d="M-11 -16H11V-6H-11Z" fill="#FF8CC6" ${OL}/><path d="M-10 -6V14M10 -6V14" stroke="#FF8CC6" stroke-width="3"/></g>` + jujuMk(44, 200, 0.44, 128, 62);
  } else if (P.crowd !== 'none') {
    if (P.back || P.balcony) defs += seaDefs(id, P.pal, cr.lit);
    if (P.balcony) back += seaMk(id + 'y', [{ d: `M0 ${P.balcony.y0}H360V${P.balcony.y1}H0Z`, pat: 'f', x0: 0, x1: 360 }], clamp(ratio * 2 - 1, 0, 1), id);
    if (P.back) fore += seaMk(id + 'x', [{ d: `M${P.back.x0} ${P.back.y0}H${P.back.x1}V${P.back.y1}H${P.back.x0}Z`, pat: 'm', x0: P.back.x0, x1: P.back.x1 }], clamp(ratio * 1.6 - 0.6, 0, 1), id);
    fore += crowdMk(id, cr, { pal: P.pal, hats: P.hats, rows: P.rows });
    if (cr.juju) fore += jujuMk(40, 222, 0.42, 150, 60);
  }
  if (place === 'estudio' && cr.juju) fore += `<g transform="translate(18 120)"><rect x="-10" y="-70" width="34" height="74" fill="#2A2140" ${OL}/>${put(figure(castSpec('juju', { noSign: true }), 'wave'), 8, 2, 0.42)}<text x="30" y="-52" font-size="15" font-weight="900" fill="#FFD23D" stroke="${INK}" stroke-width="3" paint-order="stroke" ${FONT}>¡YA!</text></g>`;
  const body = P.b + back + bandMk + fore;
  const label = `Escena: ${place}${cr.cap ? `, ${cr.count || 0} de ${cr.cap}` : ''}`;
  return svg(360, 220, `<defs><clipPath id="${id}k"><rect width="360" height="220" rx="18"/></clipPath>${defs}</defs><g clip-path="url(#${id}k)">${body}</g>`, { size, label });
}

// ---------------------------------------------------------------- Logo de la banda
export const LOGO_SHAPES = [o('star', 'Estrella'), o('heart', 'Corazón'), o('bolt', 'Rayo'), o('circle', 'Círculo'), o('cassette', 'Casete')];
export const LOGO_COLORS = ['#E0338A', '#8B5CF6', '#3C8CF2', '#1FB58F', '#FFB020', '#FF6B4A'];
const starPts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; return `${r1(cx + rr * Math.cos(a))},${r1(cy + rr * Math.sin(a))}`; }).join(' ');
function logoMk(logo = {}, name = '') {
  const shape = logo.shape || 'star', c = logo.color || '#E0338A', icon = logo.icon || '🎸', light = mix(c, '#ffffff', 0.45);
  const cy = name ? 50 : 58;
  let s = '';
  if (shape === 'star') { const pts = starPts(60, cy + 2, 46, 22); s += `<polygon points="${pts}" fill="${INK}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><polygon points="${pts}" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`; }
  else if (shape === 'heart') s += `<path transform="translate(0 ${cy - 54})" d="M60 96C28 76 12 60 12 40C12 25 24 14 38 14C48 14 56 20 60 28C64 20 72 14 82 14C96 14 108 25 108 40C108 60 92 76 60 96Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  else if (shape === 'bolt') s += `<path transform="translate(0 ${cy - 54})" d="M72 6L24 62H54L44 104L96 42H64Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  else if (shape === 'circle') s += `<circle cx="60" cy="${cy}" r="44" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="60" cy="${cy}" r="36" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>`;
  else s += `<g transform="translate(0 ${cy - 54})"><rect x="10" y="20" width="100" height="68" rx="10" fill="${c}" stroke="${INK}" stroke-width="3"/><rect x="20" y="28" width="80" height="36" rx="5" fill="#FBF8FF" stroke="${INK}" stroke-width="2"/><rect x="34" y="44" width="52" height="14" rx="7" fill="${INK}"/><circle cx="44" cy="51" r="5" fill="#fff"/><circle cx="76" cy="51" r="5" fill="#fff"/><path d="M30 88L36 74H84L90 88" fill="${light}" stroke="${INK}" stroke-width="2"/><circle cx="16" cy="26" r="2" fill="${INK}"/><circle cx="104" cy="26" r="2" fill="${INK}"/></g>`;
  if (shape !== 'cassette') s += `<path d="M${shape === 'bolt' ? '56 22Q46 30 40 40' : `34 ${cy - 22}Q42 ${cy - 32} 54 ${cy - 34}`}" stroke="#fff" stroke-width="4" class="ral" opacity=".55"/>`;
  s += `<text x="60" y="${shape === 'cassette' ? cy - 14 : cy + 11}" font-size="${shape === 'cassette' ? 20 : 30}" text-anchor="middle">${esc(icon)}</text>`;
  s += '<g fill="#FFD23D"><path d="M8 18l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/><path d="M108 10l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z"/></g>';
  if (name) {
    const nm = String(name).toUpperCase(), long = nm.length > 11;
    s += `<path d="M2 96L12 92V112L2 108L7 102ZM118 96L108 92V112L118 108L113 102Z" fill="${mix(c, INK, 0.4)}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><rect x="10" y="90" width="100" height="20" rx="4" fill="${INK}"/>` +
      `<text x="60" y="104.5" font-size="${long ? 10 : 12}" font-weight="900" text-anchor="middle" fill="#fff" letter-spacing=".5" ${long ? 'textLength="90" lengthAdjust="spacingAndGlyphs"' : ''} ${FONT}>${esc(nm)}</text>`;
  }
  return s;
}
export function logoSvg(logo = {}, name = '', { size } = {}) {
  return svg(120, 120, logoMk(logo, name), { size, label: `Logo de ${name || 'la banda'}` });
}

// ---------------------------------------------------------------- Póster: fotocopia → color → AGOTADO
function titleLines(name) {
  const t = String(name || 'Mi banda');
  if (t.length <= 12) return [t];
  const w = t.split(/\s+/);
  let best = [t], score = 1e9;
  for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), sc = Math.max(a.length, b.length); if (sc < score) { score = sc; best = [a, b]; } }
  return best;
}
export const posterSvg = (opts = {}) => withLod(1, () => { const r = withLib(() => posterInner(opts)); return r.out.replace('<defs>', `<defs>${r.defs}`); });
function posterInner({ band = 'Mi banda', logo = {}, stage = 'copy', members = ['me', 'nina'], venue, look, size } = {}) {
  const id = nid(), copy = stage === 'copy';
  const lines = titleLines(band), longest = Math.max(...lines.map((l) => l.length));
  const fs = r1(Math.min(30, 300 / Math.max(6, longest)));
  const ven = venue || (copy ? 'En vivo en la cochera' : 'En vivo');
  let s = '<defs>';
  if (copy) s += `<filter id="${id}f"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.35" intercept="-.12"/><feFuncG type="linear" slope="1.35" intercept="-.12"/><feFuncB type="linear" slope="1.35" intercept="-.12"/></feComponentTransfer></filter>`;
  else s += `<linearGradient id="${id}b" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#FF6FAE"/><stop offset=".55" stop-color="#8B5CF6"/><stop offset="1" stop-color="#3C8CF2"/></linearGradient><pattern id="${id}d" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#fff" opacity=".22"/></pattern>`;
  s += '</defs>';
  if (copy) {
    s += `<rect width="200" height="280" fill="#F2F0EA"/><rect x="3" y="3" width="194" height="274" fill="none" stroke="#C9C6BE" stroke-width="3"/>` +
      dots(Array.from({ length: 50 }, (_, i) => [jit(i) * 200, jit(i + 50) * 280]), '#8A877F', 1.6);
  } else {
    s += `<rect width="200" height="280" fill="url(#${id}b)"/>` + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M100 170L${r1(100 + 260 * Math.cos(a))} ${r1(170 + 260 * Math.sin(a))}L${r1(100 + 260 * Math.cos(a + 0.22))} ${r1(170 + 260 * Math.sin(a + 0.22))}Z" fill="#fff" opacity=".1"/>`; }).join('') +
      `<rect width="200" height="110" fill="url(#${id}d)"/>`;
  }
  const g0 = copy ? `<g filter="url(#${id}f)">` : '<g>';
  s += `${g0}<g transform="translate(70 6) scale(.5)">${logoMk(logo, '')}</g>`;
  const ty = 84;
  s += lines.map((l, i) => `<text x="100" y="${r1(ty + i * fs * 1.02)}" font-size="${fs}" font-weight="900" text-anchor="middle" fill="${copy ? '#1E1C1A' : '#fff'}" ${copy ? '' : `stroke="${INK}" stroke-width="5" paint-order="stroke"`} ${copy ? HAND : FONT}>${esc(l)}</text>`).join('');
  const ms = members.slice(0, 5), n = ms.length, sc = n > 3 ? 0.5 : 0.6, feet = 246;
  const span = Math.min(132, 58 * (n - 1));
  ms.forEach((m, i) => { const x = n === 1 ? 100 : 100 - span / 2 + (span * i) / (n - 1); s += put(memberFigure(m, look, 'stand'), x, feet - (i % 2) * 4, sc); });
  s += '</g>';
  if (copy) {
    s += `<text x="100" y="262" font-size="13" text-anchor="middle" fill="#1E1C1A" ${HAND}>${esc(ven)}</text>`;
    if (/cochera/i.test(ven)) s += `<text x="100" y="275" font-size="9.5" text-anchor="middle" fill="#444" ${HAND}>Entrada libre (trae tu silla)</text>`;
    s += '<rect x="-6" y="6" width="44" height="14" fill="#EFE6B8" opacity=".8" transform="rotate(-30 16 13)"/><rect x="164" y="4" width="44" height="14" fill="#EFE6B8" opacity=".8" transform="rotate(30 186 11)"/>';
  } else {
    s += `<path d="M14 252H186L180 264L186 276H14L20 264Z" fill="#FFD23D" ${OL}/><text x="100" y="268.5" font-size="12" font-weight="900" text-anchor="middle" fill="${INK}" ${FONT}>${esc(ven.toUpperCase())}</text>`;
  }
  if (stage === 'soldout') s += `<g transform="rotate(-18 100 160)" opacity=".94"><rect x="18" y="138" width="164" height="44" rx="6" fill="#fff" fill-opacity=".85" stroke="#E5243B" stroke-width="5"/><rect x="24" y="144" width="152" height="32" rx="3" fill="none" stroke="#E5243B" stroke-width="1.5" stroke-dasharray="4 3"/><text x="100" y="172" font-size="27" font-weight="900" text-anchor="middle" fill="#E5243B" letter-spacing="1" ${FONT}>¡AGOTADO!</text></g>`;
  return svg(200, 280, s, { size, label: `Póster de ${band}` });
}

// ---------------------------------------------------------------- Premios
export function trophySvg({ size, label = 'Premio Gramófono de Oro' } = {}) {
  const id = nid();
  const s = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".45" stop-color="#F6C343"/><stop offset="1" stop-color="#C98A12"/></linearGradient><radialGradient id="${id}r"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="70" cy="70" r="66" fill="url(#${id}r)"/>` +
    `<path d="M24 136H116L110 150H30Z" fill="#3A2F55" ${OL}/><rect x="30" y="110" width="80" height="28" rx="4" fill="#4A3B73" ${OL}/><rect x="40" y="116" width="60" height="16" rx="2" fill="url(#${id}a)" ${OLT}/>` +
    `<text x="70" y="123" font-size="5.2" font-weight="900" text-anchor="middle" fill="${INK}" ${FONT}>PREMIO</text><text x="70" y="129.5" font-size="5.2" font-weight="900" text-anchor="middle" fill="${INK}" ${FONT}>GRAMÓFONO DE ORO</text>` +
    `<ellipse cx="62" cy="108" rx="28" ry="6" fill="#2E2240" ${OL}/><ellipse cx="62" cy="107" rx="9" ry="2" fill="#E0338A"/>` +
    `<path d="M80 106L84 92Q86 84 78 80" stroke="url(#${id}a)" stroke-width="5" class="ral"/><path d="M80 106L84 92Q86 84 78 80" stroke="${INK}" stroke-width="1" fill="none"/>` +
    `<path d="M76 82L66 70Q56 56 64 40Q72 24 96 14Q122 8 128 30Q132 52 110 60Q92 66 84 74Z" fill="url(#${id}a)" ${OL}/>` +
    `<path d="M96 14Q110 32 110 60M64 40Q90 40 128 30M80 22Q90 48 90 66" stroke="#C98A12" stroke-width="1.4" fill="none"/><ellipse cx="102" cy="36" rx="14" ry="10" fill="#7A4A12" opacity=".35" transform="rotate(-28 102 36)"/>` +
    `<path d="M68 52Q74 32 94 22" stroke="#fff" stroke-width="3" class="ral" opacity=".7"/>` +
    '<g fill="#FFD23D"><path d="M22 34l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/><path d="M120 86l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z"/><path d="M36 76l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z"/></g>';
  return svg(140, 156, s, { size, label });
}

// Placa de reproducciones: cuadro con disco dorado y el número.
export function plaqueSvg({ size, count = 100000, band = '', song = '' } = {}) {
  const id = nid(), num = new Intl.NumberFormat('es-MX').format(count);
  const s = `<defs><radialGradient id="${id}d" cx=".42" cy=".38"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".6" stop-color="#F6C343"/><stop offset="1" stop-color="#B57A10"/></radialGradient></defs>` +
    `<rect x="4" y="4" width="132" height="172" rx="6" fill="#2A2140" ${OL}/><rect x="12" y="12" width="116" height="156" rx="2" fill="#FBF8FF"/>` +
    `<circle cx="70" cy="70" r="46" fill="url(#${id}d)" ${OL}/>` + [40, 34, 28, 22].map((r) => `<circle cx="70" cy="70" r="${r}" fill="none" stroke="#C98A12" stroke-width=".8" opacity=".7"/>`).join('') +
    `<circle cx="70" cy="70" r="13" fill="#E0338A" ${OLT}/><circle cx="70" cy="70" r="2.4" fill="${INK}"/><path d="M44 46Q56 34 74 32" stroke="#fff" stroke-width="3" class="ral" opacity=".7"/>` +
    `<rect x="26" y="124" width="88" height="36" rx="3" fill="#F6C343" ${OLT}/><text x="70" y="141" font-size="14" font-weight="900" text-anchor="middle" fill="${INK}" ${FONT}>${esc(num)} ▶</text>` +
    `<text x="70" y="153" font-size="7" font-weight="700" text-anchor="middle" fill="${INK}" ${song.length > 22 ? 'textLength="82" lengthAdjust="spacingAndGlyphs"' : ''} ${FONT}>${esc(song ? `“${song}”` : 'reproducciones')}${band ? '' : ''}</text>` +
    (band ? `<text x="70" y="22" font-size="7" font-weight="800" text-anchor="middle" fill="#8B5CF6" ${FONT}>${esc(String(band).toUpperCase())}</text>` : '');
  return svg(140, 180, s, { size, label: `Placa de ${num} reproducciones` });
}

// ---------------------------------------------------------------- Editor de look
const EDIT_TABS = [
  ['cara', '😊', 'Cara', [['skin', 'Piel'], ['eyes', 'Ojos']]],
  ['pelo', '💇‍♀️', 'Pelo', [['hair', 'Color'], ['style', 'Peinado']]],
  ['ropa', '👕', 'Ropa', [['outfit', 'Prenda'], ['color', 'Color']]],
  ['extra', '✨', 'Accesorio', [['acc', 'Accesorio']]],
  ['guitarra', '🎸', 'Guitarra', [['guitar', 'Color'], ['sticker', 'Calcomanía']]],
];
export function lookEditor(look, onChange, unlocks = {}) {
  let cur = { ...DEFAULT_LOOK, ...look };
  let tab = 'cara';
  const preview = h('div', { class: 'art-ed__preview', 'aria-live': 'polite' });
  const tabs = h('div', { class: 'art-ed__tabs', role: 'tablist' });
  const panel = h('div', { class: 'art-ed__panel', role: 'tabpanel' });
  const root = h('div', { class: 'art-ed' }, preview, h('div', { class: 'art-ed__side' }, tabs, panel));
  const set = (kind, id) => { cur = { ...cur, [kind]: id }; render(); if (onChange) onChange({ ...cur }); };
  const thumb = (kind, opt) => {
    if (kind === 'style' || kind === 'acc') return h('span', { class: 'art-ed__face', html: faceSvg({ ...cur, [kind]: opt.id }, 46) });
    if (kind === 'outfit') return h('span', { class: 'art-ed__face', html: `<svg viewBox="22 52 56 64" width="46" height="52">${STYLE}${figure(lookSpec({ ...cur, outfit: opt.id }), 'stand')}</svg>` });
    if (kind === 'sticker') return h('span', { class: 'art-ed__face', html: `<svg viewBox="-7 -7 14 14" width="34" height="34">${STICK[opt.id]}</svg>` });
    const bg = kind === 'hair' ? `linear-gradient(160deg, ${opt.color} 55%, ${opt.tip || opt.color})` : opt.color;
    return h('span', { class: 'art-ed__sw', style: { background: bg } });
  };
  const group = ([kind, label]) => h('fieldset', { class: 'art-ed__group' }, h('legend', {}, label),
    h('div', { class: 'art-ed__opts' }, LOOKS[kind].map((opt) => {
      const free = isUnlocked(kind, opt.id, unlocks), on = cur[kind] === opt.id;
      return h('button', { type: 'button', class: 'art-ed__opt' + (on ? ' is-on' : ''), 'aria-pressed': on ? 'true' : 'false', disabled: !free,
        title: free ? opt.label : `${opt.label}: se desbloquea jugando`, 'aria-label': free ? opt.label : `${opt.label} (bloqueado)`, onClick: () => set(kind, opt.id) },
      thumb(kind, opt), h('span', { class: 'art-ed__lbl' }, opt.label), free ? null : h('span', { class: 'art-ed__lock', 'aria-hidden': 'true' }, '🔒'));
    })));
  const surprise = () => {
    const nxt = { ...cur };
    for (const kind of Object.keys(LOOKS)) { const ok = LOOKS[kind].filter((x) => isUnlocked(kind, x.id, unlocks)); nxt[kind] = ok[Math.floor(Math.random() * ok.length)].id; }
    cur = nxt; render(); if (onChange) onChange({ ...cur });
  };
  function render() {
    preview.innerHTML = avatarSvg(cur, { size: 168, guitar: true, glow: false, pose: tab === 'guitarra' ? 'play' : 'wave' });
    tabs.replaceChildren(...EDIT_TABS.map(([id, ic, label]) => h('button', { type: 'button', role: 'tab', class: 'art-ed__tab', 'aria-selected': tab === id ? 'true' : 'false', onClick: () => { tab = id; render(); } }, h('span', { 'aria-hidden': 'true' }, ic), ' ', label)),
      h('button', { type: 'button', class: 'art-ed__tab art-ed__dice', onClick: surprise, 'aria-label': 'Sorpréndeme' }, '🎲'));
    panel.replaceChildren(...EDIT_TABS.find((t) => t[0] === tab)[3].map(group));
  }
  render();
  return root;
}
