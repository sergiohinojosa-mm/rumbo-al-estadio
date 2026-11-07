// Disparadores del Capítulo 1 (lecciones y banderas que no vienen de cartas). Firma: ver js/data/triggers.js.
//   rocioNo / rocioSongs   el "no" de Doña Rocío: siempre pasa en el cap. 1, al cerrar la primera semana con show
//                          (todavía tienen menos de 3 canciones propias, lo que ella pide).
//   un_no                  se descubre en la primera actividad después de la escena de la cocina de la Abuela (1.6b),
//                          solo si el "no" de verdad pasó (bandera rocioNo).
//   descansar              se descubre en la carta c1_tres_dias o al elegir 😴 después de 2 tardes de trabajo sin descanso
//                          (contando la semana anterior) o con el ánimo abajo de 50. Se aplica al descansar con el
//                          ánimo bajo o después de 2 tardes de trabajo.
//   workRun                bandera: tardes de trabajo sin descanso, aunque crucen de una semana a otra.
//   si_vinieron            primer show con menos de la mitad del lugar lleno: Juju se para en su silla. Después se aplica
//                          cada vez que llegan pocos y aun así tocan bien.
//   descansar              se aplica al descansar con el ánimo bajo.
//   licuadora              show en la kermés: nace "La canción de la licuadora" (escena c1_licuadora).
//   audiciones             cualquier carta kind: 'audition' guarda la semana (flags.<rol>Week) y, si el motor no lo hizo, s.roles[rol].
import { plural } from '../../util.js';
import { ACTIVITY_BY_ID } from '../activities.js';

// Cómo sonó el show, en palabras (mismo molde que engine/explain.js): nada de porcentajes en el Libro.
const sono = (q) => (q >= 0.8 ? 'increíble' : q >= 0.6 ? 'muy bien' : q >= 0.45 ? 'bien' : 'apagadito');

const seen = (s, id) => (s.seenScenes || []).includes(id);

export default {
  afterActivity(s, act, res, api) {
    const run = s.flags.workRun || 0;
    if (ACTIVITY_BY_ID[act]?.work) s.flags.workRun = run + 1;
    else if (act === 'descansar') {
      s.flags.workRun = 0;
      const mood0 = res?.before?.mood ?? s.m.mood;
      const mood1 = res?.after?.mood ?? s.m.mood;
      if (s.chapter >= 1 && (run >= 2 || mood0 < 50)) {
        const why = run >= 2 ? `Después de ${run} tardes de trabajo sin descanso` : `Con el ánimo en ${mood0}`;
        if (api.level(s, 'descansar') === 0) {
          api.discover(s, 'descansar', `${why}, Mamá entró con agua de jamaica y descansaron: el ánimo subió de ${mood0} a ${mood1}. Al otro día el riff salió más fácil.`);
        } else if (mood0 < 85) {
          api.applyLesson(s, 'descansar', `${why} elegiste descansar: el ánimo subió de ${mood0} a ${mood1}.`);
        }
      }
    }
    if (seen(s, 'c1_abuela') && s.flags.rocioNo && api.level(s, 'un_no') === 0) {
      const n = s.flags.rocioSongs ?? (s.songs || []).length;
      api.discover(s, 'un_no', `Doña Rocío dijo que todavía no cuando tenían ${plural(n, 'canción propia', 'canciones propias')}. No dijo "nunca".`);
    }
    if (act === 'descansar' && api.level(s, 'descansar') > 0 && res?.before && res.before.mood < 60) {
      api.applyLesson(s, 'descansar', `Descansaste con el ánimo en ${res.before.mood} y subió a ${res.after.mood}.`);
    }
  },
  afterCard(s, card, opt) {
    if (card?.kind !== 'audition') return;
    const role = card.role;
    const id = opt?.effects?.member?.id;
    if (!role) return;
    if (s.flags[`${role}Week`] == null) s.flags[`${role}Week`] = s.week;
    if (id && s.roles && !s.roles[role]) s.roles[role] = id;
  },
  afterShow(s, r, api) {
    if (!r) return;
    if (r.venue === 'kermes' && s.flags.licuadora == null) s.flags.licuadora = s.week;
    // From the 2nd week of chapter 1 (or while the milestone waits), any show that didn't fill the place counts:
    // there were empty seats and Juju was there anyway.
    const waiting = s.chapter === 1 && !r.soldOut && ((s.weekInChapter || 1) >= 2 || !!s.flags.lessonHold?.[1]);
    if (s.chapter >= 1 && r.cap >= 20 && (r.attendance < r.cap / 2 || waiting)) {
      if (api.level(s, 'si_vinieron') === 0) {
        api.discover(s, 'si_vinieron', `Vinieron ${r.attendance} a un lugar de ${r.cap}. Juju se paró en su silla: "¡Yo sí vine! Toca para mí".`);
      } else if (r.quality >= 0.55) {
        api.applyLesson(s, 'si_vinieron', `Vinieron ${r.attendance} de ${r.cap} y tocaste con todo: el show sonó ${sono(r.quality)} y llegaron ${plural(r.newFans, 'fan nuevo', 'fans nuevos')}.`);
      }
    }
  },
  afterWeek(s) {
    if (s.chapter !== 1 || s.flags.rocioNo) return;
    // The "no" always happens in chapter 1: Papá sends the video after their first show of the chapter.
    const shows = (s.history || []).filter((h) => h.chapter === 1).length;
    if (shows >= 1) {
      s.flags.rocioNo = s.week;
      s.flags.rocioSongs = (s.songs || []).length;
    }
  },
};
