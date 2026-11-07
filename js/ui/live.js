// ¡En vivo! (DISENO §2.6): the venue with the band and the crowd on top, the rhythm game below
// (side by side on the Mac). The crowd sings her chorus halfway through; if she played well and the
// public got excited, they ask "¡Otra!" (encore bonus); either way she can play a 10-second free solo where every tap sounds good.
// Then show.playShow(...) with the choice saved by prep.js, and the phase goes to 'close'.
// The music never stops for a miss (rhythmGame handles that).

import { h, num } from '../util.js';
import { app, mount, artReady, sfx } from './core.js';
import { rhythmGame } from './rehearse.js';
import { playSong, riffNote, hitSound, normalizeSong } from '../music/song.js';
import { unlock } from '../music/synth.js';
import * as show from '../engine/show.js';
import { sceneNode, venueById } from './prep.js';

// When she has no songs yet: a friendly cover everybody knows.
export const DEFAULT_SONG = normalizeSong({
  id: 'cover', title: 'La de la radio', tempo: 'bailable', mood: 'alegre',
  riff: [0, -1, 2, -1, 3, 2, -1, 1, 0, -1, 2, -1, 4, 3, -1, 0], chorus: ['la', 'la', 'cantar', 'contigo'],
});

const SOLO_SECONDS = 10;
export const showSeconds = (s) => Math.min(90, 60 + 5 * Math.max(0, s.chapter || 0));

export function prepOf(s) {
  const p = s.week$?.prep || {};
  const opts = show.venueOptions(s);
  const o = opts.find((x) => x.open && x.venue.id === p.venueId) || opts.find((x) => x.open);
  const v = o?.venue || null;
  const setlist = Array.isArray(p.setlist) && p.setlist.length ? p.setlist : show.defaultSetlist(s);
  const price = v?.pay.type === 'door' ? (p.price ?? v.fairPrice) : 0;
  return { venueId: v?.id || 'cochera', price, setlist, songId: p.songId };
}

export function songFor(s, prep) {
  const own = (id) => (id && id !== 'cover' ? show.songById(s, id) : null);
  const song = own(prep.songId) || prep.setlist.map(own).find(Boolean) || null;
  return song ? normalizeSong(song) : DEFAULT_SONG;
}

export async function renderLive(s, ctx = {}) {
  await artReady;
  const prep = prepOf(s);
  const v = venueById(prep.venueId);
  const song = songFor(s, prep);
  const f0 = show.forecast(s, { venueId: prep.venueId, price: prep.price, setlist: prep.setlist });
  const crowd = { count: f0.expected, cap: f0.cap, lit: false };
  let finished = false;

  const sceneBox = h('div', { class: 'sh-stage' });
  const lyric = h('div', { class: 'sh-lyric', 'aria-live': 'polite', hidden: true });
  const head = h('div', { class: 'sh-stage-head' },
    h('span', null, `${v?.icon || '🎤'} ${v?.name || 'Escenario'}`),
    h('span', { class: 'num' }, `🧍 ${num(crowd.count)} de ${num(crowd.cap)}`));
  const paintScene = () => sceneBox.replaceChildren(head, sceneNode(s, { venueId: prep.venueId, count: crowd.count, cap: crowd.cap, lit: crowd.lit }), lyric);
  paintScene();

  const right = h('div', { class: 'sh-right stack' });
  const page = h('div', { class: 'page sh-page sh-live-page' },
    h('div', { class: 'sh-cols' }, h('div', { class: 'sh-left' }, sceneBox), right));

  // Same adapted difficulty and latency as her rehearsals (settings.latencyMs is per device, in app.settings).
  const game = rhythmGame({
    song, mode: 'show', seconds: ctx.liveSeconds ?? showSeconds(s), settings: ctx.settings || app.settings, crowdCount: crowd.count,
    difficulty: Number.isFinite(s.flags?.difficulty) ? s.flags.difficulty : 1,
    // Per-song best hits (rehearse.js songRecords; inlined so qa/stub_rehearse.js can stand in for rehearse.js).
    records: s.records ? (s.records.songHits ||= {}) : null,
    onChorus: (words) => {
      crowd.lit = true;
      paintScene();
      lyric.hidden = false;
      const line = (words || song.chorus || []).join(' ');
      lyric.textContent = `♪ “${line.charAt(0).toUpperCase()}${line.slice(1)}” ♪`;
    },
    onDone: (r) => afterSong(r),
  });
  right.append(game);
  mount(page);

  function excited(acc) {
    const f = show.forecast(s, { venueId: prep.venueId, price: prep.price, setlist: prep.setlist, accuracy: acc });
    return acc >= 0.6 && (f.quality >= 0.5 || f.expected >= f.cap * 0.6);
  }

  // The solo is always offered when someone is there: it's fun, not a prize. The encore bonus (playShow's
  // encore) still needs an excited crowd, so the balance doesn't change.
  function afterSong(r) {
    const acc = Number.isFinite(r?.accuracy) ? r.accuracy : 0.7;
    const hype = excited(acc);
    const rec = r?.record ? h('p', { class: 'sh-record' }, '🏅 ¡Récord nuevo!') : null;
    if (crowd.count > 0) {
      if (hype) sfx('cheer');
      const box = h('div', { class: 'card sh-encore center' },
        h('h3', null, hype ? '🎉 ¡Otra! ¡Otra!' : '👏 ¡Aplausos!'),
        rec,
        h('p', null, hype ? 'El público pide más. Toca lo que quieras: todo suena bien.' : '¿Cierras con un solo? Toca lo que quieras: todo suena bien.'),
        h('button', { class: 'btn big block', type: 'button', onclick: () => solo(acc, hype) }, '🎸 Tocar el solo'),
        h('button', { class: 'btn ghost block', type: 'button', onclick: () => finish(acc, false) }, hype ? 'Terminar aquí' : '📸 Ver la foto de la noche'));
      right.replaceChildren(box);
      box.querySelector('button')?.focus({ preventScroll: true });
    } else {
      const box = h('div', { class: 'card sh-encore center' },
        h('h3', null, acc >= 0.6 ? '👏 ¡Aplausos!' : '👏 ¡La tocaron completa!'),
        rec,
        h('p', null, 'Cada show cuenta. Vamos a ver cómo les fue.'),
        h('button', { class: 'btn big block', type: 'button', onclick: () => finish(acc, false) }, '📸 Ver la foto de la noche'));
      right.replaceChildren(box);
    }
  }

  // Free solo: 5 big pads (pentatonic) plus the band underneath. Any tap sounds good.
  function solo(acc, encore) {
    let handle = null;
    let taps = 0;
    unlock?.();
    try { handle = playSong(song, { parts: ['drums', 'bass', 'keys', 'crowd'], endAt: SOLO_SECONDS, chorusFrom: 0, crowdFrom: 0, delay: 0.1 }); } catch { handle = null; }
    const bar = h('i');
    const pads = h('div', { class: 'sh-pads', role: 'group', 'aria-label': 'Solo libre' }, [0, 1, 2, 3, 4].map((deg) => h('button', {
      class: `sh-pad p${deg}`, type: 'button', 'aria-label': `Nota ${deg + 1}`,
      onpointerdown: (e) => { e.preventDefault(); play(deg, e.currentTarget); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(deg, e.currentTarget); } },
    }, ['●', '▲', '■', '◆', '★'][deg])));
    const play = (deg, el) => {
      taps += 1;
      try { riffNote(deg, song.mood); if (taps % 3 === 0) hitSound(deg, song.mood, true); } catch { /* no audio */ }
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    };
    right.replaceChildren(h('div', { class: 'card sh-solo' },
      h('h3', null, '🎸 ¡Tu solo!'),
      h('p', { class: 'muted' }, 'Toca las figuras como quieras.'),
      h('div', { class: 'sh-solo-bar', role: 'progressbar', 'aria-label': 'Tiempo del solo' }, bar),
      pads));
    pads.querySelector('button')?.focus({ preventScroll: true });
    const t0 = performance.now();
    const ms = (ctx.soloSeconds ?? SOLO_SECONDS) * 1000;
    const timer = setInterval(() => {
      if (!pads.isConnected) { clearInterval(timer); handle?.stop?.(0.2); return; }
      const k = Math.min(1, (performance.now() - t0) / ms);
      bar.style.width = `${(k * 100).toFixed(1)}%`;
      if (k >= 1) { clearInterval(timer); handle?.stop?.(0.6); sfx('cheer'); finish(acc, encore); }
    }, 100);
  }

  function finish(acc, encore) {
    if (finished) return;
    finished = true;
    const r = show.playShow(s, { venueId: prep.venueId, price: prep.price, setlist: prep.setlist, accuracy: acc, encore });
    if (s.week$.prep) s.week$.prep.done = true;
    ctx.save?.();
    ctx.refresh?.(r);
  }
}

// For QA: the same flow without playing (accuracy given).
export function playWithoutGame(s, accuracy = 0.75, encore = false) {
  const prep = prepOf(s);
  return show.playShow(s, { venueId: prep.venueId, price: prep.price, setlist: prep.setlist, accuracy, encore });
}

