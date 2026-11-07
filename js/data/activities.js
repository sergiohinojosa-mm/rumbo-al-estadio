// The 3-day plan. Each activity has a 💡 tip (before choosing) and builds its ✅ / 💡 text after,
// with the numbers of her game. The rules (how much each one moves) are applied in engine/week.js.
//   work      counts as a work day (ánimo −4 a −8; 3 seguidos, −6 extra)
//   from      first chapter where it shows up
//   locked(s) → false | 'razón'
// r = { deltas, before, after, acc, streak, song, people, cost, job, studio, takes, tired }
import { money, plural, pct } from '../util.js';
import { chapterOf, STUDIO } from './chapters.js';

// How the rehearsal went, in notes and never in %. Even if few notes came out, it sounds like what it is: progress.
// With very few notes there is no "de Y" (it reads as a grade): the next run is slower (fewer notes or 🐢).
const notesLine = (r) => {
  if (r.acc < 0.4) return `${r.hits ? `Tocaste ${plural(r.hits, 'nota', 'notas')}.` : '¡Calentaste los dedos!'} La próxima va más despacito 🐢.`;
  const head = r.acc >= 0.85 ? '¡Te salió casi todo!' : r.acc >= 0.6 ? '¡Te salió muy bien!' : '¡La tocaste completa!';
  const notes = r.total ? ` Tocaste ${r.hits} de ${plural(r.total, 'nota', 'notas')}.` : '';
  return r.acc < 0.6 ? `${head}${notes} El talento sube igual.` : `${head}${notes}`;
};
// "Subió de X a Y" solo si cambió: con el talento en 100 decía "subió de 100 a 100" (QA ronda 3).
const talentLine = (r) => (r.after.talent > r.before.talent
  ? `Tu talento subió de ${r.before.talent} a ${r.after.talent}, porque cada ensayo entrena tus dedos.`
  : `Tu talento sigue en ${r.after.talent}, lo más alto: ensayar lo mantiene ahí.`);
const tiredNext = (r) => `💡 La próxima vez, después de dos tardes de trabajo mete una de descanso, porque el ánimo bajó ${-r.deltas.mood} hoy.`;
// En los capítulos grandes el trabajito casi no se nota contra los gastos: el texto es honesto con la escala.
const jobTiny = (s) => chapterOf(s).job * 10 < chapterOf(s).weekly;
const unrecorded = (s) => s.songs.filter((x) => !s.recorded.some((g) => g.songId === x.id));

export const ACTIVITIES = [
  {
    id: 'ensayar', icon: '🎸', label: 'Ensayar', from: 0, work: true, mood: -5,
    tip: () => '💡 Ensayar sube tu talento. Con más talento el show suena mejor y llegan más fans.',
    locked: () => false,
    verdict: (s, r) => (r.streak >= 3 ? 'bad' : r.acc >= 0.65 ? 'good' : 'ok'),
    why: (s, r) => (r.streak >= 3
      ? `⚠️ Tercera tarde de trabajo sin descansar: el talento ${r.after.talent > r.before.talent ? 'subió a' : 'sigue en'} ${r.after.talent}, pero el ánimo bajó a ${r.after.mood}.`
      : `✅ ${notesLine(r)} ${talentLine(r)}`),
    next: (s, r) => (r.streak >= 3 ? tiredNext(r)
      : r.acc < 0.4 ? '💡 La próxima vez, escucha la batería y toca con ella, porque así es más fácil llegar a tiempo a la línea.'
        : r.acc < 0.65 ? '💡 La próxima vez, toca el riff más despacito 🐢 y luego más rápido, porque así los dedos aprenden el camino.' : null),
  },
  {
    id: 'componer', icon: '✍️', label: 'Componer', from: 0, work: true, mood: -4,
    tip: () => '💡 Una canción propia vale más que un cover (una canción de otra banda): la gente recuerda quién la hizo.',
    locked: (s) => (s.week$.plan.some((p) => p.id === 'componer') ? 'Ya compusieron esta semana: la canción necesita reposar.' : false),
    verdict: (s, r) => (r.streak >= 3 ? 'bad' : 'good'),
    why: (s, r) => `✅ Compusieron "${r.song.title}": ya tienen ${plural(s.songs.length, 'canción propia', 'canciones propias')}. Cada canción propia en el setlist (la lista de canciones del show) hace que suenen más a ustedes.`,
    next: (s, r) => (r.streak >= 3 ? tiredNext(r) : null),
  },
  {
    id: 'promover', icon: '📣', label: 'Promover', from: 1, work: true, mood: -4,
    cost: (s) => chapterOf(s).promo.cost,
    tip: (s) => `💡 Promover cuesta ${money(chapterOf(s).promo.cost)} (pósters y volantes), pero más gente se entera del show del sábado.`,
    locked: (s) => (s.money.caja < chapterOf(s).promo.cost ? `No alcanza: los pósters cuestan ${money(chapterOf(s).promo.cost)} y en la caja hay ${money(s.money.caja)}.` : false),
    verdict: (s, r) => (r.streak >= 3 || r.after.caja < chapterOf(s).weekly ? 'bad' : 'good'),
    why: (s, r) => `✅ Pegaron pósters: unas ${plural(r.people, 'persona', 'personas')} más se enteraron del show y ${plural(r.deltas.fans, 'persona se hizo fan', 'personas se hicieron fans')}. Costó ${money(r.cost)}.`,
    next: (s, r) => (r.after.caja < chapterOf(s).weekly
      ? `💡 La próxima vez revisa la caja antes de promover, porque quedaron ${money(r.after.caja)} y el domingo hay ${money(chapterOf(s).weekly)} de gastos.`
      : r.streak >= 3 ? tiredNext(r) : null),
  },
  {
    id: 'trabajito', icon: '💵', label: 'Trabajito', from: 1, work: true, mood: -7,
    tip: (s) => (jobTiny(s)
      ? `💡 Un trabajito paga unos ${money(chapterOf(s).job)}, pero los gastos de la banda ya son de ${money(chapterOf(s).weekly)} por semana: casi no se nota. Hoy rinde más un show lleno.`
      : `💡 Un trabajito (tocar en una fiesta infantil o dar una clase) paga unos ${money(chapterOf(s).job)} seguros, pero cansa y no suma fans.`),
    locked: () => false,
    verdict: (s, r) => (r.streak >= 3 ? 'bad' : jobTiny(s) ? 'ok' : r.before.caja < chapterOf(s).weekly * 2 ? 'good' : 'ok'),
    why: (s, r) => (jobTiny(s)
      ? `👍 Trabajito: +${money(r.job)} para la caja. Ayuda poquito: en esta etapa lo que pesa son los shows grandes.`
      : `✅ Trabajito: +${money(r.job)} para la caja. Ahora hay ${money(r.after.caja)}.`),
    next: (s, r) => (r.streak >= 3 ? tiredNext(r)
      : r.before.caja >= chapterOf(s).weekly * 2 ? '💡 La próxima vez, si la caja ya alcanza, usa la tarde para ensayar o promover, porque el trabajito no trae fans.' : null),
  },
  {
    id: 'descansar', icon: '😴', label: 'Descansar', from: 0, work: false, mood: 20,
    tip: () => '💡 Descansar sube el ánimo +20. Con buen ánimo tocan con más energía.',
    locked: () => false,
    verdict: (s, r) => (r.before.mood >= 85 ? 'ok' : 'good'),
    why: (s, r) => (r.before.mood >= 85 || r.after.mood <= r.before.mood
      ? `👍 Descansaron, pero el ánimo ya estaba en ${r.before.mood}.`
      : `✅ Descansaron: el ánimo subió de ${r.before.mood} a ${r.after.mood}. Con energía, el show sale mejor.`),
    next: (s, r) => (r.before.mood >= 85 ? '💡 La próxima vez, si el ánimo está alto, usa la tarde para ensayar o promover.' : null),
  },
  {
    id: 'grabar', icon: '🎙️', label: 'Grabar en estudio', from: 3, work: true, mood: -6,
    cost: () => STUDIO.barato.cost,
    tip: () => `💡 Grabar cuesta ${money(STUDIO.barato.cost)} en el estudio chico o ${money(STUDIO.bueno.cost)} en el grande, y se paga del ahorro. Una canción grabada suena en todos lados, aunque ustedes estén dormidos.`,
    locked: (s) => {
      if (s.week$.plan.some((p) => p.id === 'grabar')) return 'Ya grabaron esta semana.';
      if (!unrecorded(s).length) return 'Primero compongan una canción nueva para grabarla.';
      if (s.money.ahorro + Math.max(0, s.money.caja) < STUDIO.barato.cost) return `El estudio más barato cuesta ${money(STUDIO.barato.cost)}. Junten en el ahorro.`;
      return false;
    },
    verdict: (s, r) => (r.takes > 5 || r.takes < 3 ? 'bad' : r.streak >= 3 ? 'bad' : 'good'),
    why: (s, r) => `${r.takes > 5 || r.takes < 3 ? '⚠️' : '✅'} Grabaron "${r.song.title}" en ${plural(r.takes, 'toma', 'tomas')} (${r.studioLabel}). Costó ${money(r.cost)} y ya se puede escuchar en todos lados.`,
    next: (s, r) => (r.takes > 5
      ? `💡 La próxima vez, graben de 3 a 5 tomas, porque con ${r.takes} tomas a Nina se le fue la voz y el ánimo bajó.`
      : r.takes < 3 ? `💡 La próxima vez, hagan al menos 3 tomas, porque con ${r.takes === 1 ? 'una sola' : r.takes} se oyó apurado.`
        : r.streak >= 3 ? tiredNext(r) : null),
  },
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
export { unrecorded };
