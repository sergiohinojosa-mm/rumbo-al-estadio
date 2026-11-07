// Portada del perfil (DISENO §2.1 y §6): póster de la banda, frase del día, meta del capítulo con medidor,
// el siguiente escenario y "Jugar la semana N". Atajos: Mapa, Lecciones, Canciones, Perfil y Sonido.
// De fondo suena su primera canción, bajito y solo después de un toque.
// También exporta piezas que usan las demás pantallas: el póster, la cochera y el arte en un contenedor.

import { h } from '../util.js';
import * as store from '../store.js';
import {
  app, mount, modal, sfx, fill, metricBar, goalMeter, voicePlayer, hasAudio, castName, lookFace,
  art, lessonInfo, progressMod, chaptersMod, saveSettingsNow, motivCard, stopVoice,
} from './core.js';
import { VENUES } from '../data/venues.js';
import { dailyPhrase } from '../engine/lessons.js';
import { playSong, stopMusic, STYLES } from '../music/song.js';
import { exportSongModal } from './export.js';
import { albumModal } from './album.js';
import { isRunning, setMuted, unlock } from '../music/synth.js';

// ---------- Piezas compartidas ----------
export const myLook = () => {
  const look = store.currentProfile()?.look;
  return look && Object.keys(look).length > 1 ? look : art()?.MARIEL_LOOK;
};

// SVG (string de art.js) dentro de un div. Si falta art.js, un respaldo con emoji.
export function artBox(markup, cls = '', fallback = '🎸') {
  if (markup) return h('div', { class: `art-box ${cls}`, html: markup });
  return h('div', { class: `art-box art-fallback ${cls}`, 'aria-hidden': 'true' }, fallback);
}

const safeArt = (fn) => { try { return fn(); } catch (e) { console.warn('[arte]', e); return null; } };

// unlocks.poster: copy/mano → fotocopia · agotado → AGOTADO · lo demás → a color
export function posterStage(s, poster = s.unlocks?.poster) {
  if (!poster || poster === 'copy' || poster === 'mano') return 'copy';
  if (poster === 'agotado') return 'soldout';
  return 'color';
}

const bandName = (s) => s.band?.name || fill(s, '{nombre} y Nina');

export function bandPoster(s, { stage, venue, cls = 'poster-art' } = {}) {
  const A = art();
  const m = A?.posterSvg && safeArt(() => A.posterSvg({
    band: bandName(s), logo: s.band?.logo, stage: stage || posterStage(s), members: s.members, look: myLook(), venue,
  }));
  return artBox(m, cls, '🎤');
}

export function bandLogo(s, { size = 140 } = {}) {
  const A = art();
  const m = A?.logoSvg && safeArt(() => A.logoSvg(s.band?.logo || {}, s.band?.name || '', { size }));
  return artBox(m, 'logo-art', s.band?.logo?.icon || '⭐');
}

// La cochera de la banda: crece con unlocks.garage (foco pelón → luces → foro).
export function garageScene(s, { night = false, crowd, place = 'cochera', cls = 'stage-art' } = {}) {
  const A = art();
  const fans = s.m?.fans || 0;
  const cap = s.chapter === 0 ? 3 : 8;
  const m = A?.sceneSvg && safeArt(() => A.sceneSvg({
    place, night, members: s.members, look: myLook(), band: s.band?.name,
    garageLevel: Math.max(0, Math.min(2, s.unlocks?.garage || 0)),
    poster: { stage: posterStage(s), band: bandName(s), logo: s.band?.logo },
    crowd: crowd || { count: Math.min(cap, fans || (s.history?.length ? 3 : 0)), cap, juju: true, sign: fill(s, '{NOMBRE}') },
  }));
  return artBox(m, cls, '🏠');
}

// Arte de la pantalla de título: la cochera con sus 3 sillas.
export function titleArt() {
  const A = art();
  const m = A?.sceneSvg && safeArt(() => A.sceneSvg({ place: 'cochera', members: ['me', 'nina'], crowd: { count: 3, cap: 3, juju: true, sign: String(store.currentProfile()?.name || 'Mariel').toUpperCase() } }));
  return m ? artBox(m, 'stage-art') : null;
}

// Siguiente escenario: el primer lugar del capítulo donde todavía no tocan (o el que viene).
export function nextVenue(s) {
  const played = new Set((s.history || []).map((x) => x.venue));
  const now = VENUES.filter((v) => v.chapter <= s.chapter && (v.until ?? 99) >= s.chapter);
  return now.find((v) => !played.has(v.id)) || VENUES.find((v) => v.chapter === s.chapter + 1) || now[now.length - 1] || null;
}

export const chapterName = (s, ch = s.chapter) => fill(s, chaptersMod()?.CHAPTERS?.[ch]?.name || `Capítulo ${ch}`);

export function goalsOf(s) {
  try { return progressMod()?.goals?.(s) || []; } catch { return []; }
}

// ---------- Sonido ----------
export function soundSettings({ onMusicOn } = {}) {
  const st = app.settings || (app.settings = { sound: true, music: true });
  const toggle = (key, label) => h('label', { class: 'toggle' },
    h('input', {
      type: 'checkbox', checked: st[key] !== false,
      onchange: (e) => {
        st[key] = e.target.checked;
        saveSettingsNow();
        try { setMuted(st.music === false); } catch { /* sin audio */ }
        if (key === 'music' && !e.target.checked) stopMusic(0.2);
        if (key === 'music' && e.target.checked) onMusicOn?.();
        if (key === 'sound' && e.target.checked) sfx('tap');
        if (key === 'sound' && !e.target.checked) stopVoice();
      },
    }), label);
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'big-ic', 'aria-hidden': 'true' }, '⚙️'),
    h('h3', null, 'Sonido'),
    h('div', { class: 'stack', style: { textAlign: 'left' } },
      toggle('music', '🎵 Música y canciones'),
      toggle('sound', '🔊 Efectos y voz de Papá')),
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Listo')),
  { dismissable: true, label: 'Sonido' });
}

// ---------- Mis canciones ----------
const TEMPO = { lento: '🐢 lenta', bailable: '💃 bailable', rapido: '⚡ rápida' };
const MOOD = { alegre: '😄 alegre', sonador: '🌙 soñadora', valiente: '🦁 valiente' };

const styleLabel = (song) => { const st = STYLES.find((x) => x.id === (song.style || 'pop')); return st ? `${st.icon} ${st.label}` : ''; };

export function songsModal(s) {
  stopMusic(0.1);
  let playing = null;
  let handle = null;
  let closeList = null;
  const rows = [];
  const paint = () => rows.forEach((r) => {
    const on = playing === r.id;
    r.btn.textContent = on ? '❚❚' : '▶';
    r.btn.setAttribute('aria-label', on ? `Pausa “${r.title}”` : `Escuchar “${r.title}”`);
  });
  const toggle = (song) => {
    unlock();
    if (playing === song.id) { handle?.stop?.(0.2); handle = null; playing = null; paint(); return; }
    handle = playSong(song, { loops: 2, onEnd: () => { if (playing === song.id) { playing = null; paint(); } } });
    playing = song.id;
    paint();
  };
  const list = (s.songs || []).map((song) => {
    const btn = h('button', { class: 'play', type: 'button', onclick: () => { sfx('tap'); toggle(song); } }, '▶');
    rows.push({ id: song.id, title: song.title, btn });
    // 📤 La tarjeta y el audio para la familia: cierra la lista, y al terminar vuelve a ella.
    const send = h('button', {
      class: 'play song-send', type: 'button', 'aria-label': `Mandar “${song.title}” a la familia`,
      onclick: () => { sfx('tap'); closeList?.(); exportSongModal(s, song).then(() => songsModal(s)); },
    }, '📤');
    return h('div', { class: 'song-row' }, btn,
      h('div', { class: 'stack', style: { gap: '0', flex: '1', minWidth: '0' } },
        h('b', null, `“${song.title}”`),
        h('small', { class: 'muted' }, [styleLabel(song), TEMPO[song.tempo], MOOD[song.mood], `semana ${song.week || 1}`].filter(Boolean).join(' · '))),
      send);
  });
  paint();
  return modal((close) => { closeList = close; return h('div', { class: 'msg' },
    h('h3', null, '🎵 Mis canciones'),
    list.length ? h('div', { class: 'stack', style: { textAlign: 'left' } }, list)
      : h('p', { class: 'meaning' }, 'Todavía no hay canciones. ¡Compón la primera en el plan!'),
    list.length ? h('p', { class: 'small muted' }, '📤 Manda tu canción a la familia, con ayuda de Papá o Mamá.') : null,
    h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Cerrar')); },
  { dismissable: true, label: 'Mis canciones' }).then(() => { stopMusic(0.2); });
}

// ---------- Portada ----------
function playLabel(s) {
  const started = s.planDay > 0 || (s.week$?.plan || []).length > 0 || !['scene', 'plan'].includes(s.phase);
  if (s.phase === 'milestone') return '🎉 Ver el hito';
  if (s.phase === 'pause') return '🌙 Ver a la banda';
  if (s.phase === 'end') return '🏆 El gran final';
  return started ? `▶ Seguir la semana ${s.week}` : `🎸 Jugar la semana ${s.week}`;
}

function phraseOfDay(s) {
  let p = null;
  try { p = dailyPhrase(s); } catch { p = null; }
  if (!p?.phrase) return null;
  const by = p.by || lessonInfo(p.id)?.by || 'papa';
  const player = hasAudio(p.id) ? voicePlayer(p.id, { label: `Escuchar a ${castName(s, by)}` }) : null;
  return h('div', { class: 'papa' },
    player || h('span', { class: 'phrase-ic', 'aria-hidden': 'true' }, p.icon || '📖'),
    h('div', { style: { minWidth: '0' } },
      h('span', { class: 'who' }, `Frase del día · ${castName(s, by)}`), h('br'),
      `“${fill(s, p.phrase)}”`));
}

// Música de fondo: su primera canción, bajito, solo después de un toque (iOS) y mientras siga en la portada.
function backgroundMusic(s, root) {
  const song = s.songs?.[0];
  if (!song || app.settings?.music === false) return;
  const start = () => {
    if (!root.isConnected) return;
    try { playSong(song, { volume: 0.3 }); } catch { /* sin audio */ }
  };
  if (isRunning()) { setTimeout(start, 200); return; }
  const once = () => { document.removeEventListener('pointerup', once, true); setTimeout(start, 350); };
  document.addEventListener('pointerup', once, true);
}

export function renderHome(s, ctx) {
  const name = fill(s, '{nombre}');
  const goals = goalsOf(s);
  const v = nextVenue(s);
  const shortcut = (icon, label, fn) => h('button', {
    class: 'ch short', type: 'button', onclick: () => { sfx('tap'); fn(); },
  }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icon), h('span', null, label));

  const root = h('div', { class: 'page home' },
    h('div', { class: 'home-top' },
      lookFace(myLook() || {}, { name }),
      h('div', { class: 'stack', style: { gap: '0' } },
        h('p', { class: 'eyebrow' }, s.band?.name || 'Rumbo al Estadio'),
        h('h2', null, `¡Hola, ${name}!`),
        s.week > 1 ? h('span', { class: 'small muted' }, `Van en la semana ${s.week}`) : null)),
    metricBar(s, {}, { onNotebook: ctx.openNotebook }),
    h('div', { class: 'cols' },
      h('div', { class: 'home-art' }, bandPoster(s)),
      h('div', { class: 'stack' },
        // Back after a few days: a warm hello, no guilt (data/motivation.js, kind G). Once per visit.
        app.awayDays >= 2 ? (() => { app.awayDays = 0; return motivCard(s, 'G', {}, { max: 2 }); })() : null,
        phraseOfDay(s),
        h('button', { class: 'btn big block', type: 'button', onclick: () => { sfx('tap'); ctx.refresh(); } }, playLabel(s)),
        goals.length ? h('div', { class: 'box' },
          h('b', null, `🎯 ${chapterName(s)}`),
          goals.map((g) => goalMeter(g)),
          v ? h('span', { class: 'small muted' }, `Próximo en el mapa: ${v.icon} ${v.name}`) : null) : null,
        h('div', { class: 'shortcuts' },
          shortcut('🗺️', 'Mapa', () => ctx.openMap()),
          shortcut('📖', 'Lecciones', () => ctx.openBook()),
          shortcut('🎵', 'Canciones', () => songsModal(s)),
          shortcut('📸', 'Álbum', () => albumModal(s)),
          shortcut('👤', 'Perfil', () => ctx.switchPlayer?.()),
          shortcut('⚙️', 'Sonido', () => soundSettings({ onMusicOn: () => backgroundMusic(s, root) }))))));
  mount(root);
  backgroundMusic(s, root);
}

