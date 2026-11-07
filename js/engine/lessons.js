// Lesson progression (copied from La Directora): descubierta (lived it) → aplicada (1 application)
// → dominada (3). Each step carries `ctx`: what just happened in her game, so the saying is tied to a
// concrete memory. Messages queue in s.inbox and the UI shows them.
//
// Triggers: the content agent writes js/data/triggers.js with the rules that discover/apply lessons.
// It can call registerTriggers({ afterActivity, afterCard, afterShow, afterWeek }) itself, or export
// TRIGGERS / default with those functions. Each one gets (s, ctx) and calls discover/applyLesson.
// The catalog (js/data/lessons.js) and the triggers load without blocking: await `ready` before playing.

import { castReady } from './state.js';
import { money } from '../util.js';

const CATALOG = { list: [], byId: {}, recall: {}, loaded: false };
const HOOKS = { afterActivity: [], afterCard: [], afterShow: [], afterWeek: [] };

export const level = (s, id) => s.lessons[id]?.level ?? 0;
export const lessonById = (id) => CATALOG.byId[id] || null;
export const catalog = () => CATALOG;

// While no catalog exists (fixtures, early builds), any id is accepted.
const known = (id) => !CATALOG.list.length || !!CATALOG.byId[id];

// The Libro keeps how she learned it, with the numbers of HER game (semana, fans, dinero, público).
// A ctx that brings no number gets them appended here, so no entry of the Libro is only words.
export function gameNumbers(s) {
  const n = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const fans = s.m?.fans ?? 0;
  let out = `Semana ${s.week}: ${n(fans)} ${fans === 1 ? 'fan' : 'fans'} y ${money(s.money?.caja ?? 0)} en la caja`;
  if (s.last && s.last.attendance != null) out += `; en el último show (${s.last.venueName || 'el show'}) llegaron ${n(s.last.attendance)} de ${n(s.last.cap)}`;
  return `${out}.`;
}
export function withNumbers(s, ctx = '') {
  const c = String(ctx || '').trim();
  if (/\d/.test(c)) return c;
  return c ? `${c.replace(/\s*$/, '')}${/[.!?…"”)]$/.test(c) ? '' : '.'} ${gameNumbers(s)}` : gameNumbers(s);
}

// How many lessons of a chapter (catalog chapter) she already discovered.
export function chapterLessonCount(s, ch = s.chapter) {
  return Object.entries(s.lessons || {}).filter(([id, l]) => (l?.level || 0) > 0 && CATALOG.byId[id]?.chapter === ch).length;
}

// Spaced practice: an application needs 5 days since the last one, and 5 days since she discovered it
// (so discovering and applying never happen in the same moment: never two stars at once).
export const SPACING_DAYS = 5;

export function discover(s, id, ctx = '') {
  if (!id || !known(id) || level(s, id) > 0) return false;
  // In the week of a milestone closeWeek already moved to the next chapter: the lesson belongs to the one that ended.
  const chapter = s.week$?.lessonChapter ?? s.chapter;
  ctx = withNumbers(s, ctx);
  s.lessons[id] = { level: 1, applied: 0, day: s.day, week: s.week, chapter, ctx, seen: false };
  s.inbox.push({ id, kind: 'new', ctx, week: s.week });
  return true;
}

export function applyLesson(s, id, ctx = '') {
  const l = s.lessons[id];
  // Spaced practice: an application counts at most once every 5 days, so mastery takes weeks; the first one, at
  // least 5 days after discovering it.
  if (!l || l.level === 0) return false;
  if (l.day != null && s.day - l.day < SPACING_DAYS) return false;
  if (l.lastApplied != null && s.day - l.lastApplied < SPACING_DAYS) return false;
  ctx = withNumbers(s, ctx);
  l.applied += 1;
  l.lastApplied = s.day;
  if (ctx) l.lastCtx = ctx;
  const next = l.applied >= 3 ? 3 : 2;
  if (next > l.level) {
    l.level = next;
    s.inbox.push({ id, kind: next === 3 ? 'mastered' : 'applied', ctx, week: s.week });
  }
  return true;
}

// Discover it, or (if she already knows it) count it as applied.
export function liveLesson(s, id, ctx = '') {
  return discover(s, id, ctx) || applyLesson(s, id, ctx);
}

// Frase del día: one of the lessons she already discovered, in turn (the order she discovered them), a new one each
// week. `week % n` repeated the same phrase two weeks in a row whenever n grew; the turn is remembered in
// s.flags.daily = { week, id } (same week → same phrase, however many times the home screen asks).
export function dailyPhrase(s) {
  const ids = Object.keys(s.lessons || {}).filter((id) => level(s, id) > 0);
  if (!ids.length) return null;
  const memo = s.flags?.daily;
  let id;
  if (memo && memo.week === s.week && ids.includes(memo.id)) id = memo.id;
  else {
    const prev = memo ? ids.indexOf(memo.id) : -1;
    id = ids[(prev + 1) % ids.length];
    if (s.flags) s.flags.daily = { week: s.week, id };
  }
  return { id, ...(lessonById(id) || {}), level: level(s, id) };
}

const registered = new Set();
export function registerTriggers(t = {}) {
  for (const k of Object.keys(HOOKS)) {
    const fn = t[k];
    if (typeof fn === 'function' && !registered.has(fn)) { registered.add(fn); HOOKS[k].push(fn); }
  }
}

// Runs every trigger of one kind and returns the inbox items they added (new lessons, applied, mastered).
export function runTriggers(kind, s, ctx = {}) {
  const before = s.inbox.length;
  for (const fn of HOOKS[kind] || []) {
    try { fn(s, ctx); } catch (e) { console.warn(`[lessons] ${kind}:`, e); }
  }
  return s.inbox.slice(before);
}

function setCatalog(m) {
  const list = m.LESSONS || m.default || [];
  CATALOG.list = Array.isArray(list) ? list : [];
  CATALOG.byId = m.LESSON_BY_ID || Object.fromEntries(CATALOG.list.map((l) => [l.id, l]));
  CATALOG.recall = m.RECALL || {};
  CATALOG.loaded = true;
}

const registerFrom = (mod) => {
  const t = mod?.TRIGGERS || mod?.default || mod;
  if (t && typeof t === 'object') registerTriggers(t);
};

export const ready = (async () => {
  await castReady;
  try { setCatalog(await import('../data/lessons.js')); } catch { /* catalog not written yet */ }
  try { registerFrom(await import('../data/triggers.js')); } catch {
    try { registerFrom(await import('./triggers-default.js')); } catch { /* nothing to register */ }
  }
  return CATALOG;
})();
