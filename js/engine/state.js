// Game state `s` (DISENO §7.1). Pure data, JSON-safe, saved as-is by store.js.
//
// Fields beyond §7.1 (added when version 1 grew to every chapter):
//   player         { name, sister }  for {nombre} and {hermana} in texts
//   stats          counters: rehearsals, composes, promos, jobs, rests, recordings, shows, pauses, weeksPlayed
//   streams        reproducciones acumuladas (cap. 3+, once a song is recorded)
//   streamsWeek    reproducciones de la última semana
//   royalties      regalías cobradas en total ($)
//   recorded       [ { songId, title, quality 0..1, studio, takes, week } ]  canciones grabadas en estudio
//   label          null | 'disquera' | 'indie'   (cap. 4, carta de Max Ferrer o week.chooseLabel)
//   labelDeal      { advance, recouped }  lo que la disquera ya recuperó del adelanto
//   citiesPlayed   ['gdl', 'mty', 'pue']  ciudades de la gira donde ya tocaron
//   achievements   [ { id, week } ]  logros (progress.ACHIEVEMENTS)
//   chapterStart   { fans, week, streams, caja }  cómo empezó el capítulo (para motivación y el hito)
//   firsts         primeros datos de la partida: { accuracy, hat, attendanceForo, … } (motivación §5)
//   lastClose      resultado del último closeWeek (para volver a mostrar el cierre al recargar)
//   motivLog       ids de los últimos mensajes de motivación (no repetir el molde 3 semanas)
//   week$.promo    personas que se enteraron del show por 📣 esta semana
//   week$.mods     { quality, promo, fans }  ajustes de la carta para el show de esta semana
//   week$.income   { show, job, royalties, card }  lo que entró esta semana
//   roles          { teclas, bateria, bajo }: null | id del candidato que eligió en la audición (cast.CANDIDATES)
//   promises       { [id]: { week, state: 'open'|'kept'|'broken' } }  promesas de las cartas (effects.promise)
import { clamp } from '../util.js';

// The cast (js/data/cast.js, written by the content agent) loads without blocking; lessons.ready awaits it.
let CAST = { CAST: [], CANDIDATES: {} };
export const castReady = import('../data/cast.js').then((m) => { CAST = m; return m; }).catch(() => CAST);
export const candidates = (role) => CAST.CANDIDATES?.[role] || [];
function candidate(id) {
  if (!id) return null;
  for (const list of Object.values(CAST.CANDIDATES || {})) {
    const c = (list || []).find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}
export function castName(id) {
  if (!id) return '';
  const c = candidate(id) || (CAST.CAST || []).find?.((x) => x.id === id);
  return c ? c.name : '';
}
// Safe text while a role isn't chosen yet ("quien toca la batería"), so no {placeholder} ever reaches the screen.
export const ROLE_DEFAULT = { teclas: 'quien toca los teclados', bateria: 'quien toca la batería', bajo: 'quien toca el bajo' };
const FIELD_DEFAULT = { quirk: 'toca con muchísimas ganas', line: '¡Vamos con todo!' };

// Sentence start (beginning of the text or after . ! ? : or an opening ¡ ¿ " ( ) → capital letter.
const atStart = (str, offset) => offset === 0 || /([.!?:]\s+|[¡¿"“(—]\s*)$/.test(str.slice(Math.max(0, offset - 4), offset));
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// {nombre}, {banda}, {hermana}, {cancion1}, {teclas}, {bateria}, {bajo} and {rol.quirk} / {rol.line}
// (cast.CANDIDATES) → the names of her game. Uppercase versions ({NOMBRE}, {BANDA}, {HERMANA}) too.
export function fillText(s, text) {
  if (typeof text !== 'string' || !s) return text;
  const name = s.player?.name || 'Mariel';
  const sister = s.player?.sister || 'Luciana';
  const band = s.band?.name || 'la banda';
  return text
    .replace(/\{nombre\}/g, name).replace(/\{NOMBRE\}/g, name.toUpperCase())
    .replace(/\{banda\}/g, (m, off, str) => (s.band?.name || !atStart(str, off) ? band : cap(band))).replace(/\{BANDA\}/g, band.toUpperCase())
    .replace(/\{hermana\}/g, sister).replace(/\{HERMANA\}/g, sister.toUpperCase())
    .replace(/\{cancion1\}/g, s.songs?.[0]?.title || 'nuestra canción')
    .replace(/\{(teclas|bateria|bajo)\.(quirk|line)\}/g, (m, r, f) => candidate(s.roles?.[r])?.[f] || FIELD_DEFAULT[f])
    .replace(/\{(teclas|bateria|bajo)\}/g, (m, r, off, str) => {
      const n = castName(s.roles?.[r]);
      if (n) return n;
      return atStart(str, off) ? cap(ROLE_DEFAULT[r]) : ROLE_DEFAULT[r];
    })
    .replace(/\{(TECLAS|BATERIA|BAJO)\}/g, (m, r) => (castName(s.roles?.[r.toLowerCase()]) || ROLE_DEFAULT[r.toLowerCase()]).toUpperCase());
}

export const PHASES = ['scene', 'plan', 'card', 'prep', 'live', 'close', 'milestone', 'pause', 'end'];

export const freshWeek = () => ({
  plan: [], card: null, cardResult: null, show: null, events: [], promo: 0,
  mods: { quality: 0, promo: 0, fans: 0 },
  income: { show: 0, job: 0, royalties: 0, card: 0 },
});

// After newGame the UI calls week.startWeek(s) (it decides 'scene' or 'plan' and picks the card).
export function newGame(profile = {}, seed) {
  const name = String(profile.name || 'Mariel').trim() || 'Mariel';
  const s = {
    v: 1,
    seed: (seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0,
    day: 0,
    chapter: 0, week: 1, weekInChapter: 1,
    phase: 'plan',
    planDay: 0,
    player: { name, sister: profile.sister || (name === 'Luciana' ? 'Mariel' : 'Luciana') },
    band: { name: '', logo: { shape: 'star', color: '#e0338a', icon: '🎸' } },
    members: ['me', 'nina'],
    roles: { teclas: null, bateria: null, bajo: null },
    promises: {},
    m: { fans: 0, talent: 20, mood: 80 },
    // Papá lent $5,000: the equipment cost $4,500 and $500 stayed in the box (card P-01 can change it).
    money: { caja: 500, ahorro: 0, deuda: 5000, pagado: 0 },
    songs: [],
    setlist: [],
    week$: freshWeek(),
    last: null,
    history: [],
    records: { bestNewFans: 0, bestAccuracy: 0, bestAttendance: 0, soldOut: 0 },
    lessons: {},
    inbox: [],
    flags: {},
    seenCards: [], seenScenes: [],
    unlocks: { guitar: ['cielo'], look: [], poster: 'copy', garage: 0 },
    snapshots: [],
    diary: [],
    stats: { rehearsals: 0, composes: 0, promos: 0, jobs: 0, rests: 0, recordings: 0, shows: 0, pauses: 0, weeksPlayed: 0 },
    streams: 0, streamsWeek: 0, royalties: 0,
    recorded: [],
    label: null, labelDeal: null,
    citiesPlayed: [],
    achievements: [],
    chapterStart: { fans: 0, week: 1, streams: 0, caja: 500 },
    firsts: {},
    lastClose: null,
    motivLog: [],
  };
  takeSnapshot(s);
  return s;
}

// A copy of the state at the start of a week, without the snapshots themselves (rewind uses it).
export function takeSnapshot(s) {
  const { snapshots, lastClose, ...rest } = s;
  s.snapshots = [...(snapshots || []), JSON.parse(JSON.stringify(rest))].slice(-3);
}

export function clampMetrics(s) {
  s.m.talent = Math.round(clamp(s.m.talent, 0, 100));
  s.m.mood = Math.round(clamp(s.m.mood, 0, 100));
  if (s.m.mood <= 0 && s.week$) s.week$.burnout = true;   // llegó a 0 en algún momento de la semana
  s.m.fans = Math.max(0, Math.round(s.m.fans));
  s.money.caja = Math.round(s.money.caja);
  s.money.ahorro = Math.max(0, Math.round(s.money.ahorro));
  s.money.deuda = Math.max(0, Math.round(s.money.deuda));
}

// Problems found in a state (for QA): numbers that aren't numbers, metrics out of range, broken references.
export function checkState(s) {
  const out = [];
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  for (const [k, v] of Object.entries(s.m || {})) if (!num(v)) out.push(`m.${k} no es número (${v})`);
  for (const [k, v] of Object.entries(s.money || {})) if (!num(v)) out.push(`money.${k} no es número (${v})`);
  if (s.m.talent < 0 || s.m.talent > 100) out.push(`talento fuera de rango (${s.m.talent})`);
  if (s.m.mood < 0 || s.m.mood > 100) out.push(`ánimo fuera de rango (${s.m.mood})`);
  if (s.m.fans < 0) out.push(`fans negativos (${s.m.fans})`);
  if (s.money.ahorro < 0) out.push(`ahorro negativo (${s.money.ahorro})`);
  if (s.money.deuda < 0 || s.money.deuda + s.money.pagado !== 5000) out.push(`deuda rara (${s.money.deuda} + ${s.money.pagado})`);
  if (!PHASES.includes(s.phase)) out.push(`fase desconocida (${s.phase})`);
  if (s.planDay < 0 || s.planDay > 3) out.push(`planDay fuera de rango (${s.planDay})`);
  for (const k of ['streams', 'streamsWeek', 'royalties', 'day', 'week', 'chapter']) if (!num(s[k])) out.push(`${k} no es número (${s[k]})`);
  for (const id of s.setlist || []) if (id !== 'cover' && !s.songs.some((x) => x.id === id)) out.push(`setlist con canción que no existe (${id})`);
  for (const g of s.recorded) if (!s.songs.some((x) => x.id === g.songId)) out.push(`grabación sin canción (${g.songId})`);
  for (const h of s.history) for (const k of ['attendance', 'newFans', 'earned', 'quality']) if (!num(h[k])) out.push(`historial semana ${h.week}: ${k}=${h[k]}`);
  if ((s.snapshots || []).length > 3) out.push('más de 3 snapshots');
  return out;
}
