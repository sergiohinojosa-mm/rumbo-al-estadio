// "Tu canción para la familia": a square song card (SVG → 1080×1080 PNG) plus the song itself (WAV),
// handed over with the share sheet on iPhone or as downloads on the Mac. Nothing is uploaded.
// Rule 11: the girls don't post anywhere, so the modal asks Papá or Mamá to send it.
//
// iOS only opens the share sheet inside the tap, so both files are made as soon as the modal opens
// and the button calls shareFiles with no await in between.

import { h } from '../util.js';
import { modal, sfx } from './core.js';
import { logoSvg } from './art.js';
import { fillText } from '../engine/state.js';
import * as SONG from '../music/song.js';
import { unlock } from '../music/synth.js';
import { svgToPng, wavBlob, shareFiles, safeName } from './share.js';

const SIZE = 1080;
const INK = '#2E2240';
const LANE = ['#FF5FA8', '#86A9FF', '#FFCF5C']; // pop, sky, sun (the riff grid's colors, bright for a dark panel)
const FONT_CSS = `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Avenir Next", system-ui, sans-serif`;
const FONT = `font-family="${FONT_CSS.replace(/"/g, "'")}"`;
const TEMPO = { lento: '🐢 Lenta', bailable: '💃 Bailable', rapido: '⚡ Rápida' };
const MOOD = { alegre: '😄 Alegre', sonador: '🌙 Soñadora', valiente: '🦁 Valiente' };

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

// ---------- Text that fits (measured with the same system font the PNG will use) ----------
let meter = null;
function textW(text, size, weight = 900) {
  if (meter == null) { try { meter = document.createElement('canvas').getContext('2d') || false; } catch { meter = false; } }
  if (!meter) return String(text).length * size * 0.6;
  meter.font = `${weight} ${size}px ${FONT_CSS}`;
  return meter.measureText(String(text)).width;
}
const fitSize = (text, maxW, maxSize, weight) => Math.min(maxSize, Math.floor((maxSize * maxW) / Math.max(1, textW(text, maxSize, weight))));

// One line if it fits big enough, else the most even split into two lines.
function lines2(text, maxW, maxSize, weight = 900) {
  const one = fitSize(text, maxW, maxSize, weight);
  const words = String(text).split(/\s+/).filter(Boolean);
  if (one >= maxSize * 0.8 || words.length < 2) return { lines: [text], size: one };
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const ls = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const size = Math.min(...ls.map((l) => fitSize(l, maxW, maxSize, weight)));
    if (!best || size > best.size) best = { lines: ls, size };
  }
  return best.size > one ? best : { lines: [text], size: one };
}

// song.style (pop, balada, disco…) only if song.js knows STYLES; any shape: { id: {label, icon} }, [{id,label}] or strings.
function styleLabel(song) {
  const all = SONG.STYLES;
  if (!song?.style || !all) return '';
  const st = Array.isArray(all) ? all.find((x) => x === song.style || x?.id === song.style) : all[song.style];
  if (!st) return '';
  if (typeof st === 'string') return st === song.style ? cap(st) : st;
  const label = st.label || st.name || cap(song.style);
  const icon = st.icon || st.emoji || '';
  return icon && !label.includes(icon) ? `${icon} ${label}` : label;
}

// ---------- The card ----------
function riffPanel(riff, y0, y1) {
  const x0 = 70, x1 = SIZE - 70, padX = 40;
  const colW = (x1 - x0 - padX * 2) / 16;
  const cx = (i) => x0 + padX + colW * (i + 0.5);
  const top = y0 + 78, bottom = y1 - 34;
  const cy = (d) => bottom - ((bottom - top) * d) / 4;
  let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="34" fill="#2b2040" stroke="${INK}" stroke-width="6"/>`;
  s += `<text x="${x0 + 34}" y="${y0 + 48}" font-size="30" font-weight="900" fill="#fff" ${FONT}>🎸 Mi riff</text>`;
  // Beats: a soft column every quarter note; a dashed line between the two bars.
  for (let i = 0; i < 16; i += 2) s += `<rect x="${(cx(i) - colW / 2).toFixed(1)}" y="${top - 22}" width="${(colW * 2 - 6).toFixed(1)}" height="${bottom - top + 44}" rx="14" fill="#fff" opacity="${i % 4 ? 0.04 : 0.08}"/>`;
  s += `<line x1="${cx(7.5) - 3}" y1="${top - 26}" x2="${cx(7.5) - 3}" y2="${bottom + 22}" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" opacity=".35"/>`;
  const notes = riff.map((d, i) => (d >= 0 ? { i, d } : null)).filter(Boolean);
  if (notes.length > 1) {
    const pts = notes.map((n) => `${cx(n.i).toFixed(1)} ${cy(n.d).toFixed(1)}`).join(' L');
    s += `<path d="M${pts}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".3"/>`;
  }
  riff.forEach((d, i) => {
    if (d < 0) { s += `<circle cx="${cx(i).toFixed(1)}" cy="${bottom}" r="6" fill="#fff" opacity=".22"/>`; return; }
    const c = LANE[SONG.laneOf(d)];
    s += `<circle cx="${cx(i).toFixed(1)}" cy="${cy(d).toFixed(1)}" r="30" fill="${c}" opacity=".28"/>` +
      `<circle cx="${cx(i).toFixed(1)}" cy="${cy(d).toFixed(1)}" r="19" fill="${c}" stroke="#fff" stroke-width="5"/>`;
  });
  return s;
}

function chip(text, cx, y, size = 32) {
  const w = textW(text, size, 800) + 44;
  return { w, svg: (x) => `<rect x="${x.toFixed(1)}" y="${y - size - 6}" width="${w.toFixed(1)}" height="${size + 26}" rx="${(size + 26) / 2}" fill="#fff" stroke="${INK}" stroke-width="4"/>` +
    `<text x="${(x + w / 2).toFixed(1)}" y="${y + 4}" font-size="${size}" font-weight="800" text-anchor="middle" fill="${INK}" ${FONT}>${esc(text)}</text>` };
}

// The card as SVG markup. exportSize → fixed width/height (for the PNG); otherwise it fills its box.
export function songCardSvg(s, song, { exportSize = 0 } = {}) {
  const sg = SONG.normalizeSong(song);
  const id = 'xc' + Math.random().toString(36).slice(2, 7);
  const band = s?.band?.name || 'Mi banda';
  const by = fillText(s, 'Compuesta por {nombre}') || 'Compuesta por mí';
  const lyric = sg.chorus.length ? `“${cap(sg.chorus.join(' '))}”` : '“La la la”';
  const dim = exportSize ? `width="${exportSize}" height="${exportSize}"` : 'style="width:100%;height:auto;display:block"';
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" ${dim} role="img" aria-label="${esc(`Tarjeta de “${sg.title}”, de ${band}`)}">`;
  o += `<defs><linearGradient id="${id}b" x1="0" y1="0" x2=".45" y2="1"><stop offset="0" stop-color="#FF6FAE"/><stop offset=".55" stop-color="#8B5CF6"/><stop offset="1" stop-color="#3C8CF2"/></linearGradient>` +
    `<radialGradient id="${id}l" cx=".5" cy=".22" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<pattern id="${id}d" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="4" fill="#fff" opacity=".2"/></pattern></defs>`;
  o += `<rect width="${SIZE}" height="${SIZE}" fill="url(#${id}b)"/>`;
  // Stage rays from behind the logo, a spotlight and a dotted top.
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, b = a + 0.17, R = 1500, X = 540, Y = 140;
    o += `<path d="M${X} ${Y}L${(X + R * Math.cos(a)).toFixed(0)} ${(Y + R * Math.sin(a)).toFixed(0)}L${(X + R * Math.cos(b)).toFixed(0)} ${(Y + R * Math.sin(b)).toFixed(0)}Z" fill="#fff" opacity=".08"/>`;
  }
  o += `<rect width="${SIZE}" height="${SIZE}" fill="url(#${id}l)"/><rect width="${SIZE}" height="330" fill="url(#${id}d)"/>`;
  o += [[90, 120, 70], [985, 150, 60], [70, 470, 46], [1010, 520, 50]].map(([x, y, fs], i) =>
    `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" fill="#fff" opacity=".55" ${FONT}>${i % 2 ? '♫\uFE0E' : '♪\uFE0E'}</text>`).join('');

  // Logo and band name.
  o += logoSvg(s?.band?.logo || {}, '', { size: 170 }).replace('<svg ', `<svg x="${(SIZE - 170) / 2}" y="34" `);
  const bandSize = fitSize(band, 900, 58, 900);
  o += `<text x="540" y="262" font-size="${bandSize}" font-weight="900" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="9" stroke-linejoin="round" paint-order="stroke" ${FONT}>${esc(band)}</text>`;

  // Song title: big, yellow, one or two lines centered between the band name and the bubble (≈290–500).
  const tt = lines2(sg.title, 940, 124);
  if (tt.lines.length > 1) tt.size = Math.min(tt.size, 90);
  const lh = tt.size * 1.04, ty = 398 - ((tt.lines.length - 1) * lh) / 2 + tt.size * 0.36;
  o += tt.lines.map((l, i) => `<text x="540" y="${(ty + i * lh).toFixed(0)}" font-size="${tt.size}" font-weight="900" text-anchor="middle" fill="#FFE15C" stroke="${INK}" stroke-width="14" stroke-linejoin="round" paint-order="stroke" ${FONT}>${esc(l)}</text>`).join('');

  // The chorus, in a speech bubble with notes on each side.
  const by0 = 515, by1 = 665;
  o += `<path d="M540 ${by1 + 30}L506 ${by1 - 2}H574Z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  o += `<rect x="90" y="${by0}" width="900" height="${by1 - by0}" rx="44" fill="#fff" stroke="${INK}" stroke-width="6"/>`;
  o += `<path d="M506 ${by1 - 3}H574" stroke="#fff" stroke-width="8"/>`;
  o += `<text x="150" y="${(by0 + by1) / 2 + 22}" font-size="64" text-anchor="middle" fill="#C2185B" ${FONT}>♪\uFE0E</text><text x="930" y="${(by0 + by1) / 2 + 22}" font-size="64" text-anchor="middle" fill="#2F5FC4" ${FONT}>♫\uFE0E</text>`;
  const ly = lines2(lyric, 700, 58, 800);
  const llh = ly.size * 1.15, lyY = (by0 + by1) / 2 - ((ly.lines.length - 1) * llh) / 2 + ly.size * 0.35;
  o += ly.lines.map((l, i) => `<text x="540" y="${(lyY + i * llh).toFixed(0)}" font-size="${ly.size}" font-weight="800" text-anchor="middle" fill="${INK}" ${FONT}>${esc(l)}</text>`).join('');

  // Her 16-step riff, then who wrote it and how it feels.
  o += riffPanel(sg.riff, 712, 912);
  o += `<text x="540" y="978" font-size="${fitSize(by, 900, 44, 900)}" font-weight="900" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="8" stroke-linejoin="round" paint-order="stroke" ${FONT}>✍️ ${esc(by)}</text>`;
  const chips = [TEMPO[sg.tempo], MOOD[sg.mood], styleLabel(sg)].filter(Boolean).map((t) => chip(t, 0, 1040, 30));
  const gap = 16, total = chips.reduce((a, c) => a + c.w, 0) + gap * (chips.length - 1);
  let x = (SIZE - total) / 2;
  for (const c of chips) { o += c.svg(x); x += c.w + gap; }
  return o + '</svg>';
}

// ---------- The modal ----------
const RESULT = {
  shared: '🎉 ¡Listo! Ya quedó guardada o enviada.',
  downloaded: '💾 Quedó en la carpeta de Descargas. Papá o Mamá pueden mandarla desde ahí.',
  cancelled: '👍 Está bien. La puedes mandar cuando quieras.',
  failed: '🤔 Esta vez no se pudo. Pídele ayuda a Papá o a Mamá y prueben otra vez.',
};

// Resolves null if the promise fails or takes longer than ms (the button must not wait forever).
const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);

export function exportSongModal(s, song) {
  SONG.stopMusic(0.1);
  const sg = SONG.normalizeSong(song);
  const base = `${safeName(s?.band?.name, 'mi-banda')}-${safeName(sg.title, 'mi-cancion')}`;
  let closed = false;
  let files = [];
  let handle = null;
  let busy = false;

  const status = h('p', { class: 'xp-status', role: 'status' }, '🎙️ Grabando tu canción…');
  const bar = h('div', { class: 'xp-bar', 'aria-hidden': 'true' }, h('i'));
  const result = h('p', { class: 'xp-result', role: 'status', hidden: true });
  const shareBtn = h('button', { class: 'btn big block', type: 'button', disabled: true, onclick: () => share() }, '📤 Guardar o mandar');
  const playBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => toggle() }, '▶ Escuchar');

  const paintPlay = () => { playBtn.textContent = handle ? '❚❚ Pausa' : '▶ Escuchar'; };
  function toggle() {
    sfx('tap');
    unlock();
    if (handle) { handle.stop?.(0.2); handle = null; paintPlay(); return; }
    const me = SONG.playSong(sg, { loops: 2, onEnd: () => { if (handle === me) { handle = null; paintPlay(); } } });
    handle = me;
    paintPlay();
  }

  // No await before navigator.share: iOS only opens the sheet inside the tap.
  function share() {
    if (busy || !files.length) return;
    busy = true;
    shareBtn.disabled = true;
    shareFiles(files, { title: sg.title }).then((r) => {
      busy = false;
      if (closed) return;
      shareBtn.disabled = false;
      result.hidden = false;
      result.className = `xp-result ${r}`;
      result.textContent = RESULT[r] || RESULT.failed;
    });
  }

  // Start making both files right away.
  const png = svgToPng(songCardSvg(s, sg, { exportSize: SIZE }), SIZE, SIZE).catch(() => null);
  const wav = within(SONG.renderSong(sg, { loops: 2 }), 60000).then((buf) => (buf ? wavBlob(buf) : null)).catch(() => null);
  Promise.all([png, wav]).then(([img, audio]) => {
    if (closed) return;
    files = [img && { blob: img, name: `${base}.png` }, audio && { blob: audio, name: `${base}.wav` }].filter(Boolean);
    bar.hidden = true;
    shareBtn.disabled = !files.length;
    status.textContent = img && audio ? '✅ ¡Todo listo! Ya están la tarjeta y la canción.'
      : img ? '🖼️ La tarjeta está lista. La canción no se pudo grabar en este aparato.'
        : audio ? '🎵 La canción está lista. La tarjeta no se pudo dibujar en este aparato.'
          : '😅 Esta vez no se pudo preparar. Prueba otra vez más tarde.';
    status.classList.add('done');
  });

  return modal((close) => h('div', { class: 'msg xp' },
    h('h3', null, '🎁 Tu canción para la familia'),
    h('div', { class: 'xp-card', html: songCardSvg(s, sg) }),
    status, bar,
    shareBtn,
    h('p', { class: 'xp-note' }, '👨‍👩‍👧 Pídele a Papá o a Mamá que la mande a la familia.'),
    result,
    h('div', { class: 'xp-actions' }, playBtn,
      h('button', { class: 'btn alt', type: 'button', onclick: () => close() }, 'Cerrar'))),
  { dismissable: true, label: `Mandar “${sg.title}”` }).then((v) => {
    closed = true;
    handle = null;
    SONG.stopMusic(0.2);
    return v;
  });
}
