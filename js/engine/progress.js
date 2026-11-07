// Chapter goals, achievements, the pause ("La banda se toma un descanso") and the 2-week rewind.
import { chapterOf } from '../data/chapters.js';
import { fill } from './explain.js';
import { freshWeek } from './state.js';
import { money } from '../util.js';

export function goals(s) {
  return chapterOf(s).goals.map((g) => {
    const have = Math.max(0, Math.round(g.have(s)));
    const label = typeof g.label === 'function' ? g.label(s) : g.label;
    return { id: g.id, label: fill(s, label), icon: g.icon || '🎯', have, need: g.need, done: have >= g.need, money: !!g.money };
  });
}

export const goalsDone = (s) => goals(s).every((g) => g.done);

// Ánimo en 0 o caja negativa → la banda se toma un descanso (never a punishment: rewind 2 weeks).
// En el Prólogo no hay pausa: es la cochera de la casa, sin gastos, y la primera semana es guiada.
export function checkPause(s) {
  if ((s.chapter ?? 0) === 0) return null;
  if (s.m.mood <= 0 || s.week$?.burnout) return { reason: 'mood', text: 'El ánimo llegó a 0: la banda está agotada.' };
  if (s.money.caja < 0) return { reason: 'caja', text: `La caja quedó en ${money(s.money.caja)}: no alcanzó para los gastos.` };
  return null;
}

// Logros personales (nunca contra nadie). Se juntan en una sola tarjeta de "¡Nuevos logros!".
export const ACHIEVEMENTS = [
  { id: 'primer_show', icon: '🎤', title: 'Primer show', test: (s) => s.stats.shows >= 1 },
  { id: 'primer_sombrero', icon: '🎩', title: 'Primer sombrero', test: (s) => !!s.firsts.hat },
  { id: 'diez_ensayos', icon: '🎸', title: '10 ensayos', test: (s) => s.stats.rehearsals >= 10 },
  { id: 'tres_canciones', icon: '✍️', title: '3 canciones propias', test: (s) => s.songs.length >= 3 },
  { id: 'cinco_canciones', icon: '📒', title: '5 canciones propias', test: (s) => s.songs.length >= 5 },
  { id: 'cien_fans', icon: '⭐', title: '100 fans', test: (s) => s.m.fans >= 100 },
  { id: 'mil_fans', icon: '🌟', title: '1,000 fans', test: (s) => s.m.fans >= 1000 },
  { id: 'diez_mil_fans', icon: '💫', title: '10,000 fans', test: (s) => s.m.fans >= 10000 },
  { id: 'primer_pago', icon: '🤝', title: 'Primer pago a Papá', test: (s) => s.money.pagado > 0 },
  { id: 'pagado', icon: '✅', title: 'Pagaré PAGADO', test: (s) => s.money.deuda === 0 },
  { id: 'primer_agotado', icon: '🎟️', title: 'Primer AGOTADO', test: (s) => s.records.soldOut >= 1 },
  { id: 'precision_90', icon: '🎯', title: '9 de cada 10 notas en vivo', test: (s) => s.records.bestAccuracy >= 0.9 },
  { id: 'ahorro_1000', icon: '🐷', title: '$1,000 ahorrados', test: (s) => s.money.ahorro >= 1000 },
  { id: 'primer_sencillo', icon: '🎙️', title: 'Primer sencillo grabado', test: (s) => s.recorded.length >= 1 },
  { id: 'cien_mil', icon: '💿', title: '100 mil reproducciones', test: (s) => s.streams >= 100000 },
  { id: 'primera_ciudad', icon: '🚐', title: 'Primera ciudad de gira', test: (s) => s.citiesPlayed.length >= 1 },
  { id: 'millon', icon: '📀', title: '1 millón de reproducciones', test: (s) => s.streams >= 1000000 },
];

export function checkAchievements(s) {
  const have = new Set(s.achievements.map((a) => a.id));
  const fresh = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(s));
  for (const a of fresh) s.achievements.push({ id: a.id, week: s.week });
  return fresh.map(({ test, ...a }) => a);
}

// Back 2 weeks. Only time goes back: the week, the money (caja, ahorro and Papá's notebook) and the ánimo.
// Everything she achieved stays (Papá's rule: "conserva lo logrado"): fans, talent, records, reproducciones, lessons, songs and recordings, achievements, diary, band members, the label deal, cities played,
// story flags and counters. So the 📒 "N fans que siguen ahí" of the pause is true.
// s.day does NOT go back: it is the clock of spaced practice (lessons[id].day / lastApplied), and turning it back
// would leave those dates in the future and block every application for weeks.
// It never goes back to the chapter before: if the pause came right after a milestone, the band goes back to the
// start of THIS chapter (1 week instead of 2), so the milestone and its scenes never happen twice.
export const REWIND_MOOD = 20;
export function rewind(s) {
  const snaps = s.snapshots || [];
  if (!snaps.length) return s;
  let idx = Math.max(0, snaps.length - 3);
  while (idx < snaps.length - 2 && (snaps[idx].chapter ?? 0) !== s.chapter) idx++;
  const t = JSON.parse(JSON.stringify(snaps[idx]));
  const keep = {
    lessons: s.lessons, songs: s.songs, records: s.records, achievements: s.achievements, diary: s.diary,
    inbox: s.inbox, seenScenes: s.seenScenes, seenCards: s.seenCards, unlocks: s.unlocks, band: s.band,
    player: s.player, members: s.members, stats: s.stats, motivLog: s.motivLog, firsts: s.firsts,
    day: s.day, roles: s.roles, promises: s.promises, recorded: s.recorded, label: s.label, labelDeal: s.labelDeal,
    citiesPlayed: s.citiesPlayed, streams: s.streams, streamsWeek: s.streamsWeek, royalties: s.royalties,
  };
  // Fans and talent are hers: they stay. Ánimo comes from the snapshot (and then at least 60).
  const m = { ...t.m, fans: s.m.fans, talent: s.m.talent };
  const flags = { ...s.flags, lastCumple: t.flags.lastCumple, priceAnchor: t.flags.priceAnchor, ahorroLog: t.flags.ahorroLog };
  // The money goes back: if the debt comes back, so does the week it was paid off (and the first payment).
  if ((t.money?.deuda ?? 0) > 0) delete flags.pagadoSemana;
  if (!(t.money?.pagado > 0)) delete flags.firstPayWeek;
  const pauses = (s.stats.pauses || 0) + 1;
  const keepSnaps = snaps.slice(0, idx + 1);
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, t, keep, { m, flags, snapshots: keepSnaps });
  s.stats = { ...s.stats, pauses };
  // Lessons stay with coherent dates: nothing discovered or applied "after" today.
  for (const l of Object.values(s.lessons || {})) {
    if (l.day != null && l.day > s.day) l.day = s.day;
    if (l.lastApplied != null && l.lastApplied > s.day) l.lastApplied = s.day;
  }
  s.setlist = (s.setlist || []).filter((id) => id === 'cover' || s.songs.some((x) => x.id === id));
  // The ánimo goes back to what it was 2 weeks ago (at least 20, so one rest tarde puts the band at 40). It used to
  // come back at 60 or more; with fans kept that made a pause a free refill, and plans that never rest (ensaya +
  // promueve, solo promueve) finished the game by pausing over and over (QA ronda 3).
  s.m.mood = Math.max(s.m.mood, REWIND_MOOD);
  s.week$ = freshWeek();
  s.planDay = 0;
  s.phase = 'plan';
  s.lastClose = null;
  s.flags.rewoundAt = s.week;
  const fans = s.m.fans === 1 ? '1 fan' : `${s.m.fans.toLocaleString('es-MX')} fans`;
  s.diary.push({ week: s.week, text: `La banda se tomó un descanso y regresó a la semana ${s.week}, con ${s.m.fans ? `${fans}, ` : ''}${s.songs.length} ${s.songs.length === 1 ? 'canción' : 'canciones'} y todo lo aprendido.` });
  return s;
}
