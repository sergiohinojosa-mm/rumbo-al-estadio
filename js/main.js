// Arranque de "Rumbo al Estadio": ?borrar=1, service worker, pantalla de título, elegir jugadora,
// continuar o empezar partida, y el ruteo por s.phase (DISENO §2 y §7).
//
// Contrato de pantallas: renderX(s, ctx), con ctx = { save(), refresh(), goHome(), openBook(), openMap(),
// openNotebook(), switchPlayer() }. Cada render monta su pantalla con mount(); cuando termina su fase,
// cambia el estado con el motor y llama ctx.save(); ctx.refresh().
//
// El motor y las pantallas se cargan con import() dinámico: si una parte todavía no existe (o tiene un
// error mientras otro agente la escribe), el juego muestra un aviso en vez de quedarse en blanco.

import { h } from './util.js';
import * as store from './store.js';
import { app, mount, ready, sfx } from './ui/core.js';
import { pickPlayer, editor } from './ui/players.js';

const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

// ---- ?borrar=1: borra perfiles, partidas y ajustes de este dispositivo, y limpia la URL ----
if (new URLSearchParams(location.search).has('borrar')) {
  store.wipeAll();
  app.s = null;
  app.settings = { sound: true, music: true };
  history.replaceState(null, '', location.pathname + location.hash);
}

// ---- Sin internet: service worker, solo fuera de localhost ----
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isLocal) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---- Carga tolerante de módulos ----
const mods = {};
async function need(key, path) {
  if (mods[key]) return mods[key];
  try { mods[key] = await import(path); } catch (e) { console.warn(`[main] no cargó ${path}:`, e); mods[key] = null; }
  return mods[key];
}

// ---- Audio: unlock() en el primer toque (iOS) y silencio según los ajustes ----
let synth = null;
need('synth', './music/synth.js').then((m) => { synth = m; applyMute(); });
export function applyMute() {
  try { synth?.setMuted?.(app.settings?.music === false); } catch { /* sin audio */ }
}
function firstTouch() {
  try { synth?.unlock?.(); } catch { /* sin audio */ }
  applyMute();
  document.removeEventListener('pointerdown', firstTouch, true);
  document.removeEventListener('keydown', firstTouch, true);
}
document.addEventListener('pointerdown', firstTouch, true);
document.addEventListener('keydown', firstTouch, true);

async function stopMusic() {
  const song = await need('song', './music/song.js');
  try { song?.stopMusic?.(0.3); } catch { /* sin audio */ }
}

// ---- Rutas: fase → [módulo, función] ----
const ROUTES = {
  scene: ['scenes', './ui/scenes.js', 'renderScene', 'la historia'],
  plan: ['plan', './ui/plan.js', 'renderPlan', 'el plan de la semana'],
  card: ['card', './ui/card.js', 'renderCard', 'la carta de la semana'],
  prep: ['prep', './ui/prep.js', 'renderPrep', 'preparar el show'],
  live: ['live', './ui/live.js', 'renderLive', 'el show en vivo'],
  close: ['close', './ui/close.js', 'renderClose', 'el cierre de la semana'],
  milestone: ['scenes', './ui/scenes.js', 'renderMilestone', 'el hito del capítulo'],
  pause: ['scenes', './ui/scenes.js', 'renderPause', 'el descanso de la banda'],
  end: ['scenes', './ui/scenes.js', 'renderEnd', 'el final'],
};

let back = () => goHome();      // a dónde regresa el Libro de lecciones
let routeSeq = 0;

// When she last played (per profile, outside the game state): home says hello if she comes back after days.
const seenKey = () => `rumbo.lastPlayed.${store.currentProfile?.()?.id || 'x'}`;
const markPlayed = () => { try { localStorage.setItem(seenKey(), String(Date.now())); } catch { /* storage blocked */ } };
const save = () => { if (app.s) { store.saveGame(app.s); markPlayed(); } };

const ctx = {
  save,
  refresh: () => refresh(),
  goHome: () => goHome(),
  openBook: () => openBook(),
  openMap: () => openMap(),
  openNotebook: () => openNotebook(),
  switchPlayer: () => choosePlayer(),
};

async function refresh() {
  const seq = ++routeSeq;
  back = () => refresh();
  const s = app.s;
  if (!s) return titleScreen();
  await stopMusic();
  const scenes = await need('scenes', './ui/scenes.js');
  if (seq !== routeSeq) return;
  // El motor pone la fase 'scene' para las escenas de 'start', 'week' y 'after_show'. En 'milestone',
  // 'pause' y 'end' la fase se queda y la UI muestra antes las escenas pendientes (pendingScenes) y llama
  // finishScene en cada una.
  let sceneNow = null;
  if (['milestone', 'pause', 'end'].includes(s.phase) && typeof scenes?.renderScene === 'function') {
    const week = await need('week', './engine/week.js');
    try { sceneNow = week?.pendingScenes?.(s)?.[0] || null; } catch (e) { console.warn('[main] pendingScenes:', e); }
    if (sceneNow && scenes.alreadyShown?.(s, sceneNow)) sceneNow = null;
  }
  // Primero vive, luego aprende: las cartas de lección y de logros llegan cuando la escena termina,
  // no antes de que el personaje diga la frase.
  // In 'close' the close screen drains them itself, after the photo and ✅ ⚠️ 🌤️ (DISENO §2.7).
  if (s.phase !== 'scene' && s.phase !== 'close' && !sceneNow) {
    const inbox = await need('inbox', './ui/inbox.js');
    try { await inbox?.drainInbox?.(s, save); } catch (e) { console.warn('[main] inbox:', e); }
    if (seq !== routeSeq) return;   // otra navegación empezó mientras se veían los mensajes
  }
  if (sceneNow) return run(() => scenes.renderScene(s, ctx, sceneNow), 'la historia');
  // Prólogo: si la historia todavía no trajo nombre, logo y préstamo, se hacen antes del plan.
  if (s.phase === 'plan' && s.chapter === 0 && scenes?.needsSetup?.(s)) {
    return run(() => scenes.renderSetup(s, ctx), 'la banda nueva');
  }
  const r = ROUTES[s.phase] || ROUTES.plan;
  const mod = await need(r[0], r[1]);
  const fn = mod?.[r[2]];
  if (typeof fn !== 'function') return missing(r[3]);
  return run(() => fn(s, ctx), r[3]);
}

async function run(fn, what) {
  try { await fn(); } catch (e) { console.error(e); oops(what, e); }
}

async function goHome() {
  ++routeSeq;
  back = () => goHome();
  if (!app.s) return titleScreen();
  await stopMusic();
  const home = await need('home', './ui/home.js');
  if (typeof home?.renderHome !== 'function') return refresh();
  return run(() => home.renderHome(app.s, ctx), 'la portada');
}

async function openBook() {
  const book = await need('book', './ui/book.js');
  if (!book?.renderBook || !app.s) return;
  await stopMusic();
  const ret = back;
  book.renderBook(app.s, () => ret(), save);
}

async function openMap() {
  const m = await need('map', './ui/map.js');
  if (m?.openMap && app.s) return m.openMap(app.s, ctx);
}

async function openNotebook() {
  const m = await need('map', './ui/map.js');
  if (m?.openNotebook && app.s) return m.openNotebook(app.s, ctx);
}

// ---- Avisos (nunca pantalla en blanco) ----
function notice(icon, title, text, actions) {
  mount(h('div', { class: 'page notice-page' },
    h('div', { class: 'card center' },
      h('div', { class: 'big-ic', 'aria-hidden': 'true' }, icon),
      h('h2', null, title),
      h('p', null, text),
      h('div', { class: 'stack', style: { width: '100%' } }, actions))));
}
function missing(what) {
  notice('🚧', 'Estamos armando el escenario', `Todavía falta ${what}. Vuelve en un ratito.`, [
    h('button', { class: 'btn block', type: 'button', onclick: () => { sfx('tap'); refresh(); } }, '🔄 Intentar otra vez'),
    h('button', { class: 'btn alt block', type: 'button', onclick: () => { sfx('tap'); goHome(); } }, '🏠 Portada'),
  ]);
}
function oops(what, e) {
  notice('🎸', 'Se reventó una cuerda', `Algo falló en ${what}. Tu partida está guardada.`, [
    h('button', { class: 'btn block', type: 'button', onclick: () => { sfx('tap'); refresh(); } }, '🔄 Intentar otra vez'),
    h('button', { class: 'btn alt block', type: 'button', onclick: () => { sfx('tap'); goHome(); } }, '🏠 Portada'),
    isLocal ? h('pre', { class: 'small muted', style: { whiteSpace: 'pre-wrap', textAlign: 'left' } }, String(e?.stack || e)) : null,
  ]);
}

// ---- Partidas ----
async function enterProfile(id) {
  store.selectProfile(id);
  const saved = store.loadGame();
  if (saved && typeof saved === 'object' && saved.phase && saved.m) {
    app.s = saved;
    try {
      const last = Number(localStorage.getItem(seenKey()));
      app.awayDays = last ? Math.floor((Date.now() - last) / 86400000) : 0;
    } catch { app.awayDays = 0; }
    markPlayed();
    return goHome();
  }
  return startNewGame();
}

async function startNewGame() {
  const [state, week] = await Promise.all([need('state', './engine/state.js'), need('week', './engine/week.js')]);
  if (!state?.newGame || !week?.startWeek) return missing('el motor del juego');
  const p = store.currentProfile() || { name: 'Mariel' };
  const s = state.newGame({ name: p.name });
  week.startWeek(s);
  app.s = s;
  save();
  return refresh();
}

function choosePlayer() {
  ++routeSeq;
  stopMusic();
  app.s = null;
  pickPlayer((id) => { sfx('tap'); enterProfile(id); });
}

async function afterTitle() {
  const list = store.profiles();
  if (!list.length) {
    const r = await editor(null);
    if (!r) return titleScreen();
    const id = store.createProfile(r.name, r.look);
    sfx('fanfare');
    return enterProfile(id);
  }
  if (list.length === 1) return enterProfile(list[0].id);
  return choosePlayer();
}

// ---- Pantalla de título ----
async function titleScreen() {
  ++routeSeq;
  const home = await need('home', './ui/home.js');
  const stage = home?.titleArt?.() || null;
  mount(h('div', { class: 'page title-page' },
    h('div', { class: 'stack center' },
      h('p', { class: 'eyebrow' }, 'De la cochera al estadio'),
      h('h1', { class: 'title-logo' }, 'Rumbo al ', h('span', null, 'Estadio'))),
    stage ? h('div', { class: 'title-stage' }, stage) : null,
    h('div', { class: 'stack center' },
      h('button', { class: 'btn big', type: 'button', onclick: () => { sfx('tap'); afterTitle(); } }, '🎸 ¡A tocar!'),
      h('p', { class: 'small muted' }, 'Una banda de pop, tu guitarra y muchas canciones.'))));
}

// ---- Arranque ----
async function boot() {
  mount(h('div', { class: 'page title-page' }, h('h1', { class: 'title-logo' }, 'Rumbo al ', h('span', null, 'Estadio'))));
  const lessons = await need('lessons', './engine/lessons.js');
  await Promise.all([ready, lessons?.ready].filter(Boolean)).catch(() => {});
  if (isLocal) {
    // Para probar desde la consola: rumbo.s, rumbo.ctx, rumbo.mods.
    window.rumbo = { get s() { return app.s; }, ctx, mods, app };
  }
  titleScreen();
}

boot();
