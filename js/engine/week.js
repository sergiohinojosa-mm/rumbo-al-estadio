// One session = one week: scene → 3-day plan → card → prep → live show → close (DISENO §2).
// Pure rules, no DOM. The UI calls these in order and routes by s.phase.
//   startWeek(s)                      phase 'scene' | 'plan', picks the card
//   activityOptions(s) / doActivity(s, id, perf?)
//   currentCard(s) / resolveCard(s, optIdx)
//   (show.js) venueOptions / forecast / setPrep / playShow   (playShow can leave phase 'scene': after_show scenes)
//   closePreview(s) (with .motivation) / closeWeek(s, split)   money, streams, goals, pause, snapshot, next week
// Scenes: pendingScenes / pendingScene / sceneView / finishScene / finishScenes (see below).
// Extra helpers: chooseLabel, motivationFor, guardInbox, setContent (QA fixtures).
import { rng, pickWeighted, clamp, num } from '../util.js';
import * as CardsMod from '../data/cards.js';
import * as StoryMod from '../data/story.js';
import { ACTIVITIES, ACTIVITY_BY_ID, unrecorded } from '../data/activities.js';
import { LAST_CHAPTER, chapterOf, STUDIO, LABELS, ROYALTY_PER_PLAY } from '../data/chapters.js';
import { freshWeek, takeSnapshot, clampMetrics, candidates } from './state.js';
import { discover, applyLesson, level, lessonById, runTriggers, chapterLessonCount, gameNumbers } from './lessons.js';
import { fill, weekChains, mergeChains, nextTip, motivation, motivationFor, teaser } from './explain.js';
export { motivationFor };
import { goalsDone, checkPause, checkAchievements } from './progress.js';

// Fans that a week of plays brings: people who heard the song and looked for the band.
const STREAM_FANS = 0.012;
const SHOW_STREAM_BOOST = 3;          // after a show, each person in the public plays the songs ~3 times
const EXTRA_STREAK_MOOD = -6;

let content = null;   // QA can inject { cards, scenes } while the real data doesn't exist yet
export function setContent(c) { content = c; }
const allCards = () => content?.cards || CardsMod.CARDS || CardsMod.default || [];
const allScenes = () => content?.scenes || StoryMod.SCENES || StoryMod.STORY || StoryMod.default || [];

const safe = (fn, s, fallback = false) => {
  if (typeof fn !== 'function') return fn ?? true;
  try { return !!fn(s); } catch { return fallback; }
};

// ——— Scenes ———
// Each scene has a trigger (story/ch0.js): 'start' (al abrir la semana) · 'week' (entre actividades del plan)
// · 'after_show' (al terminar el show, antes del cierre) · 'milestone' (hito) · 'pause' (la banda se toma un descanso).
// The engine checks them at each moment and, when one is pending, puts the game in phase 'scene'
// (start, week, after_show) and remembers where to go after (s.week$.sceneNext). In 'milestone', 'pause' and 'end'
// the phase stays and the UI shows pendingScenes(s) before moving on.
// The UI shows them in order: pendingScene(s) → sceneView(s, id) → finishScene(s, id) → … until null.
const MOMENT_TRIGGERS = {
  // At the start of the week also whatever was left from before (a 'week' scene that can go first, an
  // 'after_show' or 'milestone' scene the UI didn't show).
  start: ['start', 'week', 'after_show', 'milestone'],
  week: ['week'],
  after_show: ['after_show'],
  milestone: ['milestone'],
  pause: ['pause'],
};
const triggerOf = (sc) => sc.trigger || 'start';
const repeats = (sc) => !!sc.repeat || triggerOf(sc) === 'pause';

export function sceneMoment(s) {
  if (s.phase === 'pause') return 'pause';
  if (s.phase === 'milestone' || s.phase === 'end') return 'milestone';
  return s.week$?.sceneMoment || 'start';
}

export function pendingScenes(s, moment = sceneMoment(s)) {
  const allowed = MOMENT_TRIGGERS[moment] || MOMENT_TRIGGERS.start;
  const shown = s.week$?.shownScenes || [];
  return allScenes().filter((sc) => allowed.includes(triggerOf(sc))
    && (repeats(sc) ? !shown.includes(sc.id) : !s.seenScenes.includes(sc.id))
    && safe(sc.when, s));
}

export function pendingScene(s, moment) {
  return pendingScenes(s, moment)[0] || null;
}

// The scene with her names in every text ({nombre}, {banda}, {bateria}, {bateria.quirk}…).
// A beat's text can also be a function of the state (a line that depends on what she lived, e.g. the licuadora
// song only if they played the kermés): textOf resolves it. Cards use the same for option.after / card.after.
export function textOf(s, x) {
  return typeof x === 'function' ? safeText(x, s) : x;
}
export function sceneView(s, id) {
  const sc = typeof id === 'object' && id ? id : allScenes().find((x) => x.id === (id || s.week$.scene)) || pendingScene(s);
  if (!sc) return null;
  return {
    ...sc,
    // place can be a function of the state (c5_hito: the city of the last show of the tour).
    place: typeof sc.place === 'function' ? (safeText(sc.place, s) || 'cochera') : sc.place,
    next: sc.next ? fill(s, sc.next) : null,
    beats: (sc.beats || []).map((b) => ({ ...b, who: b.who, text: fill(s, textOf(s, b.text)) })),
  };
}

const beatLessonId = (b) => (typeof b?.lesson === 'string' ? b.lesson : b?.lesson?.discover || null);

// Lessons a scene teaches. `lesson: { discover: id }` → discovered now (if the UI didn't already).
// `lesson: 'id'` is the phrase said in the balloon: the triggers usually discover it with her numbers; if by the
// end of the week nobody did, closeWeek discovers it with this moment as context.
const plainBeat = (s, text) => fill(s, textOf(s, text) || '').replace(/^\([^)]*\)\s*/, '').trim();
// The ctx of a lesson said in a scene: what happened just before (the nearest balloon of someone else), the phrase,
// and the numbers of her game. `lesson: { discover, ctx: (s) => '…' }` can write its own.
function sceneCtx(s, sc, b, i) {
  const own = typeof b.lesson === 'object' ? b.lesson.ctx : null;
  if (own) {
    const c = typeof own === 'function' ? safeText(own, s) : own;
    if (c) return `${fill(s, c)} ${/\d/.test(c) ? '' : gameNumbers(s)}`.trim();
  }
  const phrase = plainBeat(s, b.text);
  let moment = '';
  for (let k = i - 1; k >= 0; k--) {
    const p = sc.beats[k];
    if (p && p.who !== b.who && plainBeat(s, p.text) !== phrase) { moment = plainBeat(s, p.text); break; }
  }
  return `${moment ? `${moment} ` : ''}${phrase} ${gameNumbers(s)}`.trim();
}
function safeText(fn, s) {
  try { return String(fn(s) || ''); } catch { return ''; }
}

function sceneLessons(s, sc) {
  const out = [];
  (sc.beats || []).forEach((b, i) => {
    const id = beatLessonId(b);
    if (!id) return;
    const ctx = sceneCtx(s, sc, b, i);
    if (typeof b.lesson === 'object') {
      const n0 = s.inbox.length;
      if (discover(s, id, ctx)) for (const it of s.inbox.slice(n0)) if (sc.next && !it.next) it.next = fill(s, sc.next);
      out.push(id);
    } else if (level(s, id) === 0) {
      s.week$.sceneLessons = [...(s.week$.sceneLessons || []).filter((x) => x.id !== id), { id, ctx, next: sc.next ? fill(s, sc.next) : null }];
    }
  });
  return out;
}

// Marks the scene as seen, discovers its lessons and returns the next pending scene of the same moment (or null).
// When nothing is left: phase goes to where the week was going (plan, card, prep or close).
const SCENE_PHASES = ['scene', 'milestone', 'pause', 'end'];

export function finishScene(s, id) {
  if (!SCENE_PHASES.includes(s.phase)) return null;    // no scene is showing: nothing to finish
  const scId = id || s.week$.scene || pendingScene(s)?.id;
  const sc = allScenes().find((x) => x.id === scId);
  if (sc) {
    if (repeats(sc)) s.week$.shownScenes = [...(s.week$.shownScenes || []), sc.id];
    else if (!s.seenScenes.includes(sc.id)) s.seenScenes.push(sc.id);
    sceneLessons(s, sc);
  } else if (scId && !s.seenScenes.includes(scId)) s.seenScenes.push(scId);
  const fixed = ['milestone', 'pause', 'end'].includes(s.phase);
  const next = pendingScene(s);
  s.week$.scene = next?.id || null;
  if (!fixed) {
    if (next) s.phase = 'scene';
    else { s.phase = s.week$.sceneNext || 'plan'; s.week$.sceneNext = null; s.week$.sceneMoment = null; }
  }
  return next;
}

// Every pending scene of this moment, in order (for QA or a UI that shows them all at once).
export function finishScenes(s) {
  const done = [];
  if (!SCENE_PHASES.includes(s.phase)) return done;
  for (let guard = 0; guard < 40; guard++) {
    const sc = s.week$.scene ? allScenes().find((x) => x.id === s.week$.scene) : pendingScene(s);
    if (!sc) break;
    done.push(sc.id);
    if (!finishScene(s, sc.id)) break;
  }
  if (!['milestone', 'pause', 'end'].includes(s.phase) && s.phase === 'scene' && !pendingScene(s)) {
    s.phase = s.week$.sceneNext || 'plan';
    s.week$.sceneNext = null;
  }
  return done;
}

// If a scene is pending at this moment: phase 'scene', and after it the game goes to `then`.
function enterScenes(s, moment, then) {
  s.week$.sceneMoment = moment;
  const sc = pendingScene(s, moment);
  if (!sc) { s.week$.sceneMoment = null; s.phase = then; return false; }
  s.week$.scene = sc.id;
  s.week$.sceneNext = then;
  s.phase = 'scene';
  return true;
}
export { enterScenes };

// ——— Week start ———
// A card that reminds a lesson (remind) and teaches nothing new only comes out once she discovered that lesson:
// a reminder of a phrase she never heard would be empty.
function cardPool(s) {
  return allCards().filter((c) => (c.chapter ?? 0) === s.chapter
    && (c.repeat || !s.seenCards.includes(c.id))
    && !(c.repeat && s.seenCards.slice(-4).includes(c.id))
    && !(c.remind && level(s, c.remind) === 0 && !cardLessons(c).length)
    && safe(c.when, s));
}

function pickCard(s, pool) {
  if (!pool.length) return null;
  return pickWeighted(s, pool, (c) => Math.max(0.01, c.weight ?? 1) * (teachesNew(s, c) ? LESSON_BOOST : 1)).id;
}

// Lessons come first: a card that teaches a lesson of THIS chapter she hasn't discovered yet weighs LESSON_BOOST
// times more, and from the 2nd week of the chapter (or when the milestone is waiting for them) those cards come out
// before any other. So every lesson is lived in its chapter, not by luck.
export const MIN_CHAPTER_LESSONS = 3;
const LESSON_BOOST = 5;
const MAX_LESSON_HOLD = 3;    // weeks the milestone can wait for the lessons of the chapter
const cardLessons = (c) => (c.options || []).map((o) => o?.lesson?.discover).filter(Boolean);
export function teachesNew(s, c) {
  return cardLessons(c).some((id) => level(s, id) === 0 && (lessonById(id)?.chapter ?? s.chapter) === s.chapter);
}
const lessonsShort = (s) => s.chapter >= 1 && chapterLessonCount(s, s.chapter) < MIN_CHAPTER_LESSONS;
const mustTeach = (s) => s.chapter >= 1 && ((s.weekInChapter || 1) >= 2 || !!s.flags.lessonHold?.[s.chapter]);

function chooseCard(s, pool) {
  // Auditions are story: when one is open it comes first (the new member arrives before anything else).
  const story = pool.filter((c) => c.kind === 'audition');
  if (story.length) return pickCard(s, story);
  const fresh = pool.filter((c) => teachesNew(s, c));
  if (fresh.length && mustTeach(s)) return pickCard(s, fresh);
  return pickCard(s, pool);
}

export function startWeek(s) {
  guardInbox(s);
  s.week$ = freshWeek();
  s.planDay = 0;
  const pool = cardPool(s);
  s.week$.eligible = pool.map((c) => c.id);
  s.week$.card = chooseCard(s, pool);
  s.phase = 'plan';
  enterScenes(s, 'start', 'plan');
  return s;
}

// After the plan, cards that react to it (3 work days, 2 rehearsals, promoting…) become eligible: they win.
// A card that teaches a new lesson of the chapter is never replaced by one that doesn't while lessons are missing.
function finalizeCard(s) {
  const pool = cardPool(s);
  const before = new Set(s.week$.eligible || []);
  const fresh = pool.filter((c) => !before.has(c.id));
  const cur = pool.find((c) => c.id === s.week$.card) || null;
  const freshNew = fresh.filter((c) => teachesNew(s, c));
  if (freshNew.length) s.week$.card = pickCard(s, freshNew);
  else if (fresh.length && !(cur && teachesNew(s, cur) && mustTeach(s))) s.week$.card = pickCard(s, fresh);
  else if (!cur) s.week$.card = chooseCard(s, pool);
}

// ——— Plan ———
export function activityOptions(s) {
  return ACTIVITIES.filter((a) => a.from <= s.chapter).map((a) => {
    const locked = a.locked(s);
    return {
      id: a.id, label: a.label, icon: a.icon, tip: fill(s, a.tip(s)),
      cost: typeof a.cost === 'function' ? a.cost(s) : a.cost || 0,
      locked: locked ? fill(s, locked) : false,
    };
  });
}

const SONG_TITLES = ['Bicis en la banqueta', 'Cochera de luces', 'Tres sillas', 'Una más y ya', 'Licuadora', 'Señor Brillitos', 'Púa de la abuela',
  'Plumón verde', 'Cubeta de emergencia', 'Re menor', 'Mapa en la cocina', 'Tres leches', 'La Burra no corre', 'Armadillo gigante', 'Luces de celular', 'Mismo ritmo'];
const CHORUS = ['hoy', 'luz', 'bailar', 'cantar', 'juntas', 'brillar', 'cielo', 'ritmo', 'corazón', 'calle', 'sábado', 'volar'];

export function makeSong(s, given = {}) {
  const n = s.songs.length + 1;
  const used = new Set(s.songs.map((x) => x.title));
  const title = String(given.title || SONG_TITLES.find((t) => !used.has(t)) || `Canción ${n}`).slice(0, 40);
  const pick = (arr) => arr[Math.floor(rng(s) * arr.length)];
  return {
    id: given.id && !s.songs.some((x) => x.id === given.id) ? given.id : `c${n}w${s.week}`,
    title,
    tempo: ['lento', 'bailable', 'rapido'].includes(given.tempo) ? given.tempo : pick(['lento', 'bailable', 'rapido']),
    mood: ['alegre', 'sonador', 'valiente'].includes(given.mood) ? given.mood : pick(['alegre', 'sonador', 'valiente']),
    style: typeof given.style === 'string' && given.style ? given.style : 'pop', // song.js normalizeSong turns unknown styles into pop
    riff: Array.isArray(given.riff) && given.riff.length === 16 ? given.riff.map((x) => clamp(Math.round(x), -1, 4)) : Array.from({ length: 16 }, () => Math.floor(rng(s) * 6) - 1),
    chorus: Array.isArray(given.chorus) && given.chorus.length ? given.chorus.map(String).slice(0, 8) : [pick(CHORUS), pick(CHORUS), pick(CHORUS)],
    week: s.week,
  };
}

function streak(plan) {
  let n = 0;
  for (let i = plan.length - 1; i >= 0 && ACTIVITY_BY_ID[plan[i].id]?.work; i--) n++;
  return n;
}

export function doActivity(s, id, perf = {}) {
  const a = ACTIVITY_BY_ID[id];
  const ch = chapterOf(s);
  if (!a || a.from > s.chapter) return { deltas: { fans: 0, caja: 0, talent: 0, mood: 0 }, verdict: 'bad', why: 'Esa actividad todavía no está.', next: null, lessons: [], locked: true };
  const lock = a.locked(s);
  if (lock) return { deltas: { fans: 0, caja: 0, talent: 0, mood: 0 }, verdict: 'bad', why: fill(s, lock), next: null, lessons: [], locked: true };
  if (s.planDay >= 3) return { deltas: { fans: 0, caja: 0, talent: 0, mood: 0 }, verdict: 'ok', why: 'El plan de la semana ya está completo.', next: null, lessons: [], locked: true };

  const before = { ...s.m, caja: s.money.caja };
  const tired = ch.tired || 1;
  const run = a.work ? streak(s.week$.plan) + 1 : 0;
  const r = { acc: 0.6, streak: run, tired, people: 0, cost: 0, job: 0, takes: 0 };
  s.m.mood += a.work ? Math.round(a.mood * tired) : a.mood;
  if (run >= 3) s.m.mood += Math.round(EXTRA_STREAK_MOOD * tired);

  switch (id) {
    case 'ensayar': {
      r.acc = clamp(Number.isFinite(perf?.accuracy) ? perf.accuracy : 0.6, 0, 1);
      // Notes she played (the rehearsal minigame sends hits/total): the texts say "tocaste X de Y notas", never a %.
      if (Number.isFinite(perf?.total) && perf.total > 0) { r.total = Math.round(perf.total); r.hits = clamp(Math.round(perf.hits ?? r.acc * r.total), 0, r.total); }
      s.m.talent += 5 + Math.round(3 * r.acc);
      s.stats.rehearsals += 1;
      break;
    }
    case 'componer': {
      r.song = makeSong(s, perf?.song || {});
      s.songs.push(r.song);
      s.m.talent += 1;
      s.stats.composes += 1;
      break;
    }
    case 'promover': {
      r.cost = ch.promo.cost;
      r.people = ch.promo.people;
      s.money.caja -= r.cost;
      s.week$.promo += r.people;
      s.m.fans += Math.round(r.people * 0.12);
      s.stats.promos += 1;
      break;
    }
    case 'trabajito': {
      r.job = ch.job;
      s.money.caja += r.job;
      s.week$.income.job += r.job;
      s.stats.jobs += 1;
      break;
    }
    case 'descansar': {
      s.stats.rests += 1;
      break;
    }
    case 'grabar': {
      const free = unrecorded(s);
      const song = free.find((x) => x.id === perf?.songId) || free[free.length - 1];
      const budget = s.money.ahorro + Math.max(0, s.money.caja);
      // Without a choice from the screen, the studio she picked in card C3-01 (estudio_grande / demo_primero).
      let studio = (perf?.studio || (s.flags.estudio_grande ? 'bueno' : 'barato')) === 'bueno' ? 'bueno' : 'barato';
      if (STUDIO[studio].cost > budget) studio = 'barato';
      const st = STUDIO[studio];
      const takes = clamp(Math.round(perf?.takes ?? 3), 1, 14);
      const fromSaving = Math.min(s.money.ahorro, st.cost);
      s.money.ahorro -= fromSaving;
      s.money.caja -= st.cost - fromSaving;
      // De 3 a 5 tomas (lo que dice el tip): menos se oye apurado, más cansa a la banda.
      let q = st.quality - (takes < 3 ? 0.15 : 0) - (takes > 5 ? 0.1 : 0);
      if (takes > 5) s.m.mood -= 10;
      q = Math.round(clamp(q, 0.3, 1) * 100) / 100;
      s.recorded.push({ songId: song.id, title: song.title, quality: q, studio, takes, week: s.week });
      if (!s.flags.firstStreamWeek) s.flags.firstStreamWeek = s.week + 1;
      s.stats.recordings += 1;
      Object.assign(r, { song, studio, studioLabel: st.label, takes, cost: st.cost });
      break;
    }
    default: break;
  }
  clampMetrics(s);
  r.before = before;
  r.after = { ...s.m, caja: s.money.caja };
  r.deltas = { fans: r.after.fans - before.fans, caja: r.after.caja - before.caja, talent: r.after.talent - before.talent, mood: r.after.mood - before.mood };
  const verdict = a.verdict(s, r);
  const why = fill(s, a.why(s, r));
  const next = a.next(s, r);
  s.week$.plan.push({ id, accuracy: r.acc, verdict, deltas: r.deltas });
  s.planDay += 1;
  const lessons = runTriggers('afterActivity', s, { id, result: r, perf, verdict });
  let then = 'plan';
  if (s.planDay >= 3) {
    finalizeCard(s);
    then = s.week$.card ? 'card' : 'prep';
  }
  enterScenes(s, 'week', then);
  return { deltas: r.deltas, verdict, why, next: next ? fill(s, next) : null, lessons, song: r.song || null };
}

// ——— Card of the week ———
const cardById = (id) => allCards().find((c) => c.id === id) || null;

// currentCard(s): the card of the week, with her names filled in. Each option comes with:
//   i          its index (what resolveCard(s, i) takes)
//   cost       money the option takes out (caja + ahorro, already scaled to the chapter; 0 if it costs nothing)
//   disabled   true when that money isn't there: caja (if positive) + ahorro < cost. Choosing it would leave the
//              band in negative and send it to a pause, so the UI shows the button off (disabled) with the reason.
//   reason     '' when it can be chosen; when disabled, the text for the button: "No alcanza: faltan $300".
// If every option costs more than she has, none is disabled (a card always has a way out): the cheapest ones stay
// on and resolveCard adjusts, paying only what is in the box (never below zero because of the card).
export function currentCard(s) {
  const c = cardById(s.week$.card);
  if (!c) return null;
  let reminder = null;
  if (c.remind && level(s, c.remind) > 0) {
    const l = lessonById(c.remind);
    reminder = { id: c.remind, phrase: l?.phrase || '', by: l?.by || '', icon: l?.icon || '💡' };
  }
  const avail = moneyAvailable(s);
  const costs = (c.options || []).map((o) => optionCost(s, o));
  const allOff = costs.length > 0 && costs.every((k) => k > avail);
  const cheapest = Math.min(...costs);
  return {
    ...c,
    title: fill(s, c.title), text: fill(s, c.text), tip: fill(s, c.tip),
    options: (c.options || []).map((o, i) => {
      const off = costs[i] > avail && !(allOff && costs[i] === cheapest);
      return { ...o, i, label: fill(s, o.label), why: fill(s, o.why), cost: costs[i], disabled: off, reason: off ? `No alcanza: faltan ${money$(costs[i] - avail)}` : '' };
    }),
    after: c.after && c.after.text ? { ...c.after, text: fill(s, textOf(s, c.after.text)) } : null,
    reminder,
  };
}

// Money an option takes out of caja + ahorro, net (what it puts in one of them pays part of what the other spends;
// at the close the ahorro covers the box, so only the total can send the band to a pause).
export function optionCost(s, o) {
  const e = o?.effects || {};
  return Math.max(0, -(scaleEffect(s, 'caja', e.caja) + scaleEffect(s, 'ahorro', e.ahorro)));
}
const moneyAvailable = (s) => Math.max(0, s.money.caja) + Math.max(0, s.money.ahorro);

// Card effects come in steps from −3 to +3; the engine turns them into the size of each chapter.
//   fans: pasos × 4% de la meta de fans del capítulo · caja/ahorro/papa: pasos × chapters.cardStep (lo que pesa
//   una decisión de dinero en ese capítulo) · talent y mood: pasos × 5. song is a count (0 to 2 new songs), not a step.
const FAN_GOAL_FOR_STEP = [25, 60, 300, 1500, 5000, 20000, 50000, 87000];
export const FAN_STEP = 0.04;     // one fan step = 4% of the chapter's fan goal
export const BODY_STEP = 5;       // one talent or mood step = 5 points
export function scaleEffect(s, key, steps) {
  const n = Number.isFinite(steps) ? clamp(Math.round(steps), -3, 3) : 0;
  if (!n) return 0;
  const ch = clamp(s.chapter, 0, FAN_GOAL_FOR_STEP.length - 1);
  if (key === 'fans') return n * Math.max(1, Math.round(FAN_GOAL_FOR_STEP[ch] * FAN_STEP));
  if (key === 'caja' || key === 'ahorro' || key === 'papa') return n * (chapterOf(s).cardStep || 100);
  if (key === 'talent' || key === 'mood') return n * BODY_STEP;
  return n;
}

// Promises (effects.promise: 'id'): open until the content keeps or breaks them. Breaking one: ánimo −15.
export function keepPromise(s, id) {
  const p = s.promises[id];
  if (!p || p.state !== 'open') return false;
  p.state = 'kept';
  s.flags.promisesKept = (s.flags.promisesKept || 0) + 1;
  return true;
}
export function breakPromise(s, id) {
  const p = s.promises[id] || (s.promises[id] = { week: s.week, state: 'open' });
  if (p.state !== 'open') return false;
  p.state = 'broken';
  s.m.mood = Math.max(0, s.m.mood - 15);
  s.flags.promisesBroken = (s.flags.promisesBroken || 0) + 1;
  return true;
}

function setMember(s, role, id) {
  if (!id) return;
  if (role && s.roles && role in s.roles) {
    const old = s.roles[role];
    if (old && old !== id) s.members = s.members.filter((m) => m !== old);
    s.roles[role] = id;
  }
  if (!s.members.includes(id)) s.members.push(id);
}

// The week the last peso went to Papá (the libreta's "Pagaré PAGADO" row). It is marked where the money moves (the
// close and the cards), so it is the real week: before, triggers/ch5.js marked it at the first card of cap. 5 (week 23
// for a debt paid in week 11).
function markPaidOff(s) {
  if (s.money.deuda === 0 && s.money.pagado > 0 && !s.flags.pagadoSemana) s.flags.pagadoSemana = s.week;
}

// Money that leaves: first from the box; what the box doesn't have comes out of the savings (never below zero there).
function spend(s, amount, from = 'caja') {
  let left = Math.max(0, amount);
  if (from === 'ahorro') {
    const a = Math.min(s.money.ahorro, left);
    s.money.ahorro -= a;
    left -= a;
  }
  s.money.caja -= left;
}

// `member: { role, id }` (or just the id) can come inside effects or at the option level.
const memberOf = (opt) => opt?.effects?.member || opt?.member || null;

function applyEffects(s, e = {}, opt = {}) {
  e = e || {};
  const sc = (k) => scaleEffect(s, k, e[k]);
  s.m.fans += sc('fans');
  s.m.talent += sc('talent');
  s.m.mood += sc('mood');
  const cash = sc('caja');
  if (cash >= 0) { s.money.caja += cash; s.week$.income.card += cash; } else spend(s, -cash);
  const save = sc('ahorro');
  if (save > 0) s.money.ahorro += save;
  else if (save < 0) spend(s, -save, 'ahorro');    // a cost paid from the savings (studio, mezcla…); if it runs out, from the box
  const pay = sc('papa');
  if (pay > 0) {
    const p = Math.min(pay, s.money.deuda, Math.max(0, s.money.caja));
    if (p > 0) {
      s.money.deuda -= p; s.money.pagado += p; s.money.caja -= p;
      s.week$.cardPaid = (s.week$.cardPaid || 0) + p;
      if (!s.flags.firstPayWeek) s.flags.firstPayWeek = s.week;
      markPaidOff(s);
    }
  }
  const flags = e.flag == null ? [] : typeof e.flag === 'string' ? [e.flag] : Array.isArray(e.flag) ? e.flag : null;
  if (flags) for (const f of flags) s.flags[f] = true;
  else if (typeof e.flag === 'object') Object.assign(s.flags, e.flag);
  if (e.promise === 'break') breakPromise(s, `p${s.week}`);
  else if (e.promise === 'keep') s.flags.promisesKept = (s.flags.promisesKept || 0) + 1;
  else if (typeof e.promise === 'string') { if (!s.promises[e.promise]) s.promises[e.promise] = { week: s.week, state: 'open' }; }
  if (e.keep) keepPromise(s, e.keep);
  if (e.breaks) breakPromise(s, e.breaks);
  for (let i = 0; i < clamp(Math.round(Number(e.song) || 0), 0, 2); i++) s.songs.push(makeSong(s));
  if (Number.isFinite(e.quality)) s.week$.mods.quality += clamp(e.quality, -0.3, 0.3);
  if (Number.isFinite(e.promo)) s.week$.mods.promo += clamp(Math.round(e.promo), -3, 3) * Math.round(chapterOf(s).promo.people || 3);
  if (e.label) chooseLabel(s, e.label);
  const member = memberOf({ effects: e, member: opt.member });
  if (member) {
    if (typeof member === 'string') setMember(s, null, member);
    else setMember(s, member.role, member.id);
  }
  if (e.event) s.week$.events.push(e.event);
  if (e.unlock && typeof e.unlock === 'object') Object.assign(s.unlocks, e.unlock);
  clampMetrics(s);
}

// Audition cards (kind: 'audition', role): each option is a candidate (option.cand / .id / .member.id,
// or CANDIDATES[role][i] by position). Choosing assigns s.roles[role].
function auditionPick(s, c, opt, i) {
  const m = memberOf(opt);
  const id = opt.cand || opt.candidate || m?.id || (typeof m === 'string' ? m : null) || opt.id || candidates(c.role)[i]?.id;
  if (id) setMember(s, c.role, id);
  return id;
}

// A 'bad' choice costs for real, and bad choices in a row weigh more (k = 1, 2, 3): the band loses heart
// (ánimo −6k), some fans lose interest (k fan steps), the show of the week sounds worse (calidad −0.04k) and, from
// the 2nd one in a row, it also costs money (k−1 money steps): promises to the band that break. A good or ok choice
// resets the count. Returns the line that explains it (it goes after the why).
export const BAD_MOOD = 6;
export const BAD_MAX_RUN = 5;   // 5 or more bad choices in a row weigh 5 (only "always the worst" gets there)
// In the Prólogo she is learning: no cost there. The text never counts her mistakes: it says what the band felt and
// that the next good decision makes up for it.
function badCost(s, opt) {
  if (opt.verdict !== 'bad' || (s.chapter ?? 0) === 0) { s.flags.badRun = 0; return ''; }
  const run = (s.flags.badRun || 0) + 1;
  s.flags.badRun = run;
  const k = Math.min(BAD_MAX_RUN, run);
  const fans = Math.min(s.m.fans, scaleEffect(s, 'fans', 1) * k);
  const cash = run >= 2 ? scaleEffect(s, 'caja', 1) * (k - 1) : 0;
  s.m.mood -= BAD_MOOD * k;
  s.m.fans -= fans;
  if (cash) spend(s, cash);
  s.week$.mods.quality = (s.week$.mods.quality || 0) - 0.04 * k;
  clampMetrics(s);
  // ⚠️ (it was her decision, so never 🌤️) and 25 words or less, so the why + this line stay short.
  const parts = [`el ánimo bajó ${BAD_MOOD * k}`];
  if (fans > 0) parts.push(fans === 1 ? 'se fue 1 fan' : `se fueron ${num(fans)} fans`);
  if (cash) parts.push(`gastaron ${money$(cash)} en animar a la banda`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `⚠️ ${list[0].toUpperCase()}${list.slice(1)}; el show sonará menos. Con otra buena decisión se recuperan.`;
}
const money$ = (v) => `$${Math.round(v).toLocaleString('es-MX')}`;

export function resolveCard(s, optIdx = 0) {
  const c = cardById(s.week$.card);
  if (!c) { s.phase = 'prep'; return { deltas: { fans: 0, caja: 0, talent: 0, mood: 0 }, verdict: 'ok', why: '', next: null, lessons: [] }; }
  const opt = c.options[clamp(optIdx, 0, c.options.length - 1)];
  const before = { ...s.m, caja: s.money.caja };
  const inbox0 = s.inbox.length;
  const floor = Math.min(0, s.money.caja + s.money.ahorro);
  applyEffects(s, opt.effects, opt);
  // A card never leaves the band in negative (caja + ahorro: at the close the savings cover the box). If the money
  // wasn't there (the UI shows that option disabled; this is the safety net), the band pays only what it had.
  const short = floor - (s.money.caja + s.money.ahorro);
  if (short > 0) s.money.caja += short;
  if (c.kind === 'audition' && c.role) auditionPick(s, c, opt, clamp(optIdx, 0, c.options.length - 1));
  // The Libro keeps the decision and the numbers of that moment. A card or option can write its own (lessonCtx(s)).
  const own = opt.lessonCtx || c.lessonCtx;
  const ownText = own ? (typeof own === 'function' ? safeText(own, s) : String(own)) : '';
  const ctx = ownText ? `${fill(s, ownText)}${/\d/.test(ownText) ? '' : ` ${gameNumbers(s)}`}` : `${fill(s, `${c.title}: ${opt.label}`)}. ${gameNumbers(s)}`;
  if (opt.lesson?.discover) { if (!discover(s, opt.lesson.discover, ctx)) applyLesson(s, opt.lesson.discover, ctx); }
  if (opt.lesson?.apply) applyLesson(s, opt.lesson.apply, ctx);
  // She was reminded of a phrase and chose well: that is applying it. (Only when the card doesn't already say which
  // options apply it, and the option teaches nothing else.)
  else if (c.remind && opt.verdict === 'good' && !opt.lesson && !(c.options || []).some((o) => o?.lesson?.apply === c.remind)) {
    applyLesson(s, c.remind, ctx);
  }
  if (!s.seenCards.includes(c.id) || c.repeat) s.seenCards.push(c.id);
  const cost = badCost(s, opt);
  const deltas = { fans: s.m.fans - before.fans, caja: s.money.caja - before.caja, talent: s.m.talent - before.talent, mood: s.m.mood - before.mood };
  const paidShort = short > 0 ? ` 💰 No alcanzaba el dinero: pagaron solo lo que había en la caja.` : '';
  const why = `${fill(s, opt.why || '')}${paidShort}${cost ? ` ${cost}` : ''}`;
  const after = opt.after || c.after;
  // next = the 💡 for next time ONLY when it adds something the why doesn't say (option.next); the why already
  // carries its own 💡, so copying it here showed the same advice twice.
  const ownNext = opt.next ? fill(s, opt.next) : '';
  const norm = (x) => String(x).replace(/\s+/g, ' ').trim();
  const res = {
    deltas, verdict: opt.verdict || 'ok', why, next: ownNext && !norm(why).includes(norm(ownNext)) ? ownNext : null, lessons: [],
    after: after && after.text ? { ...after, text: fill(s, textOf(s, after.text)) } : null,
  };
  if (short > 0) res.adjusted = short;
  s.week$.cardResult = { id: c.id, opt: optIdx, verdict: res.verdict };
  runTriggers('afterCard', s, { card: c, optIdx, option: opt, result: res });
  res.lessons = s.inbox.slice(inbox0);
  // A choice can open a scene right away (the new drummer arrives…): it goes before preparing the show.
  res.scene = enterScenes(s, 'week', 'prep');
  return res;
}

// Cap. 4: Max Ferrer's offer. Returns false if she already decided.
export function chooseLabel(s, label) {
  if (s.label || !LABELS[label]) return false;
  s.label = label;
  const L = LABELS[label];
  if (L.advance) { s.money.caja += L.advance; s.labelDeal = { advance: L.advance, recouped: 0 }; }
  return true;
}

// ——— Close ———
// Badges in the inbox are unique: one per achievement id (the night's record, one per week). The guard is a
// non-enumerable push on the array (JSON ignores it), so a second push of the same badge (from the UI) is skipped.
const badgeKey = (it) => (it && (it.kind === 'badge' || it.kind === 'achievement') ? `${it.id}|${it.id === 'record' ? it.week : ''}` : null);
export function guardInbox(s) {
  const arr = s.inbox;
  if (!Array.isArray(arr) || Object.prototype.hasOwnProperty.call(arr, 'push')) return;
  Object.defineProperty(arr, 'push', {
    enumerable: false, configurable: true, writable: true,
    value(...items) {
      for (const it of items) {
        const k = badgeKey(it);
        if (k && this.some((x) => badgeKey(x) === k)) continue;
        Array.prototype.push.call(this, it);
      }
      return this.length;
    },
  });
}
const income = (s) => Object.values(s.week$.income).reduce((a, b) => a + b, 0);

// What the 3 piggy banks screen needs: the week's coins and what stays after the weekly costs.
export function closePreview(s) {
  const ch = chapterOf(s);
  const free = Math.max(0, s.money.caja - ch.weekly);
  return {
    income: income(s), show: s.week$.income.show, weekly: ch.weekly, caja: s.money.caja, free,
    deuda: s.money.deuda, maxPapa: Math.min(free, s.money.deuda), motivation: motivationFor(s), suggestion: { ahorro: Math.round(free * 0.3 / 10) * 10, papa: Math.min(s.money.deuda, Math.round(free * 0.3 / 10) * 10) },
  };
}

function streamsOfWeek(s, ch) {
  // The best songs carry the plays: each extra recording adds a bit less (1, 0.7, 0.49…).
  const recQ = s.recorded.map((g) => g.quality).sort((a, b) => b - a).reduce((a, q, i) => a + q * Math.pow(0.7, i), 0);
  if (!recQ) return 0;
  const L = s.label ? LABELS[s.label] : null;
  const boost = (s.last?.attendance || 0) * SHOW_STREAM_BOOST;
  return Math.round(s.m.fans * (ch.streamF || 2) * recQ * (L ? L.streamMult : 1) + boost);
}

export function closeWeek(s, split = {}) {
  const ch = chapterOf(s);
  const w = { weekly: ch.weekly, covered: 0, paid: 0, saved: 0, talentLoss: 0, streamsWeek: 0, royalties: 0, streamFans: 0, wom: 0 };
  const plan = s.week$.plan;
  let run = 0;
  w.maxStreak = 0;
  for (const p of plan) { run = ACTIVITY_BY_ID[p.id]?.work ? run + 1 : 0; w.maxStreak = Math.max(w.maxStreak, run); }

  if (!plan.some((p) => p.id === 'ensayar')) { const t0 = s.m.talent; s.m.talent = Math.max(0, t0 - 2); w.talentLoss = t0 - s.m.talent; }
  s.money.caja -= ch.weekly;

  // Streams and royalties (once a song is recorded).
  w.streamsWeek = streamsOfWeek(s, ch);
  if (w.streamsWeek) {
    s.streams += w.streamsWeek;
    const gross = w.streamsWeek * ROYALTY_PER_PLAY;
    let share = 1;
    if (s.label) {
      const L = LABELS[s.label];
      const deal = s.labelDeal;
      share = deal && deal.recouped < deal.advance ? L.share : L.shareAfter;
      if (deal && deal.recouped < deal.advance) deal.recouped = Math.min(deal.advance, deal.recouped + Math.round(gross * (1 - L.share)));
    }
    w.royalties = Math.round(gross * share);
    s.royalties += w.royalties;
    s.money.caja += w.royalties;
    s.week$.income.royalties = w.royalties;
    w.streamFans = Math.round(w.streamsWeek * STREAM_FANS);
    s.m.fans += w.streamFans;
    if (!s.flags.firstStreamWeek) s.flags.firstStreamWeek = s.week;
  }
  s.streamsWeek = w.streamsWeek;

  // Word of mouth: good shows make fans tell their friends.
  const q = s.last && s.last.week === s.week ? s.last.quality : 0.3;
  w.wom = Math.round(s.m.fans * (ch.wom || 0) * q * q);
  s.m.fans += w.wom;

  // Piggy banks: ahorro and Papá come out of the box, never below zero.
  const want = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
  w.saved = Math.min(want(split.ahorro), Math.max(0, s.money.caja));
  s.money.caja -= w.saved;
  s.money.ahorro += w.saved;
  w.paid = Math.min(want(split.papa), Math.max(0, s.money.caja), s.money.deuda);
  s.money.caja -= w.paid;
  s.money.deuda -= w.paid;
  s.money.pagado += w.paid;
  if (w.paid && !s.flags.firstPayWeek) s.flags.firstPayWeek = s.week;
  markPaidOff(s);
  w.paid += s.week$.cardPaid || 0;     // lo que se le pagó a Papá en la carta también cuenta en el cierre
  if (s.money.caja < 0 && s.money.ahorro > 0) {
    w.covered = Math.min(s.money.ahorro, -s.money.caja);
    s.money.ahorro -= w.covered;
    s.money.caja += w.covered;
  }
  s.flags.ahorroLog = [...(s.flags.ahorroLog || []), s.money.ahorro].slice(-8);
  clampMetrics(s);
  w.income = income(s);
  w.net = w.income - ch.weekly - plan.filter((p) => p.id === 'promover').length * ch.promo.cost;

  const chains = mergeChains(s.last && s.last.week === s.week ? s.last.chains : [], weekChains(s, w));
  const next = nextTip(s, chains);
  for (const it of s.inbox) if (it.week === s.week && !it.next) it.next = next;
  w.recordFans = s.last && s.last.week === s.week ? s.last.recordFans : null;

  // Prólogo: no hay pausa (progress.checkPause) ni deudas con la caja: la cochera no cobra y la banda no empieza el
  // capítulo 1 en negativo (eso la mandaría a una pausa en su primera semana).
  if (s.chapter === 0 && s.money.caja < 0) s.money.caja = 0;
  const pause = checkPause(s);
  s.week$.lessonChapter = s.chapter;
  let milestone = null;
  let end = false;
  // The milestone waits (up to MAX_LESSON_HOLD weeks) while the chapter has fewer than 3 lessons discovered:
  // next week the cards that teach them come first. Lessons said in this week's scenes count already.
  let held = false;
  if (!pause && !s.flags.ended && goalsDone(s) && s.chapter >= 1) {
    const pending = (s.week$.sceneLessons || []).filter((l) => lessonById(l.id)?.chapter === s.chapter && level(s, l.id) === 0).length;
    const holds = s.flags.lessonHold || {};
    // A chapter can also say its milestone needs a story beat first (milestone.ready, chapters.js).
    const storyReady = safe(ch.milestone?.ready ?? true, s, true);
    // Also while a card of the chapter can still teach one of its lessons (ronda 3: in a fast chapter, 1 or 2
    // lessons were left for the next one): next week that card comes first (mustTeach).
    const teachable = cardPool(s).some((c) => teachesNew(s, c));
    if ((chapterLessonCount(s, s.chapter) + pending < MIN_CHAPTER_LESSONS || teachable || !storyReady) && (holds[s.chapter] || 0) < MAX_LESSON_HOLD) {
      s.flags.lessonHold = { ...holds, [s.chapter]: (holds[s.chapter] || 0) + 1 };
      held = true;
    }
  }
  // After the Final the game goes on in free mode (shows and songs, no new goals): the end fires only once.
  if (!pause && !held && !s.flags.ended && goalsDone(s)) {
    // milestone.chapter = the chapter she just completed (story files read s.lastClose.milestone.chapter).
    milestone = { chapter: s.chapter, ...ch.milestone, title: fill(s, ch.milestone.title), text: fill(s, ch.milestone.text) };
    s.unlocks.poster = ['mano', 'foto', 'agotado', 'sencillo', 'disco', 'gira', 'lona', 'estadio'][s.chapter] || s.unlocks.poster;
    s.diary.push({ week: s.week, text: `🏆 ${milestone.title}` });
    if (s.chapter >= LAST_CHAPTER) { end = true; s.flags.ended = true; s.flags.endedWeek = s.week; }
    else {
      s.chapter += 1;
      s.weekInChapter = 0;
      s.chapterStart = { fans: s.m.fans, week: s.week + 1, streams: s.streams, caja: s.money.caja };
      s.unlocks.garage = s.chapter;
    }
  }
  w.milestone = milestone;
  const newAchievements = checkAchievements(s);
  // Logros nuevos (y el récord de la noche) al buzón como { kind: 'badge', id }: inbox.js los junta en una sola
  // tarjeta de "¡Nuevos logros!". guardInbox evita que se repitan si la pantalla también los agrega.
  guardInbox(s);
  for (const a of newAchievements) s.inbox.push({ kind: 'badge', id: a.id, icon: a.icon, title: a.title, week: s.week });
  if (s.last && s.last.week === s.week && s.last.recordFans) {
    s.inbox.push({ kind: 'badge', id: 'record', icon: '⭐', title: `Tu mejor noche: +${num(s.last.newFans)} fans`, week: s.week });
  }
  const inbox0 = s.inbox.length;
  runTriggers('afterWeek', s, { week: w, chains, milestone });
  // Lessons said in a scene balloon (lesson: 'id') that no trigger discovered this week: discovered now.
  for (const l of s.week$.sceneLessons || []) {
    const n0 = s.inbox.length;
    if (discover(s, l.id, l.ctx)) for (const it of s.inbox.slice(n0)) it.next = it.next || l.next || next;
  }
  const lessons = s.inbox.slice(inbox0);
  const motiv = motivation(s, w);
  const tease = teaser(s, w);
  if (s.last && s.last.week === s.week) {
    s.diary.push({ week: s.week, text: `Semana ${s.week}: ${s.last.venueName}, ${s.last.attendance} ${s.last.attendance === 1 ? 'persona' : 'personas'}, +${s.last.newFans} fans.` });
  }

  const result = {
    week: s.week, milestone, newAchievements, teaser: tease, motivation: motiv, chains, next, lessons,
    pause, weekly: ch.weekly, income: w.income, saved: w.saved, paid: w.paid, covered: w.covered,
    streamsWeek: w.streamsWeek, royalties: w.royalties, streamFans: w.streamFans, wom: w.wom,
    money: { ...s.money }, m: { ...s.m }, end, lessonHold: held,
  };

  s.day += 7;
  s.week += 1;
  s.weekInChapter += 1;
  s.stats.weeksPlayed += 1;
  s.lastClose = result;
  s.week$ = freshWeek();
  s.planDay = 0;
  takeSnapshot(s);
  if (pause) s.phase = 'pause';
  else if (end) s.phase = 'end';
  else if (milestone) s.phase = 'milestone';
  else startWeek(s);
  return result;
}

