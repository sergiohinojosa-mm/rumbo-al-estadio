// Disparadores del Final · Estadio lleno + Premio (lecciones que no vienen de cartas). Firma: ver js/data/triggers.js.
//   aprende_ano      (descubrir) respaldo de la escena c7_libreta; (aplicar) una semana con ensayo y descanso, como
//                    las mejores semanas de la libreta.
//   aplausos_quedan  (descubrir) respaldo de la escena c7_libreta.
//   duena            (aplicar) la cuerda rota frente al estadio, con la bolsita de repuestos.
//   calma_ensaya     (descubrir) respaldo de la escena c7_cuerda; (aplicar) otro show de estadio después.
//   siempre_famosos  (descubrir) respaldo de la escena c7_cochera.
// Banderas: c7Inicio, cuerdaRota (semana), estadioLleno (semana), gramofono (semana en que llegaron a 10 millones).
import * as Lessons from '../../engine/lessons.js';

const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
const seenScene = (s, id) => (s.seenScenes || []).includes(id);
const L = (api) => (api && typeof api.discover === 'function' ? api : Lessons);

function markStart(s) {
  if (s.chapter !== 7 || !s.flags || s.flags.c7Inicio) return;
  const st = s.chapterStart || {};
  s.flags.c7Inicio = { fans: st.fans ?? s.m.fans, week: st.week ?? s.week, streams: st.streams ?? s.streams ?? 0 };
}

export default {
  afterActivity(s, act, res, api) {
    markStart(s);
    if (s.chapter !== 7) return;
    const plan = s.week$?.plan || [];
    // Repetir lo que funcionó: ensayar y descansar en la misma semana.
    if (plan.length >= 3 && plan.some((p) => p.id === 'ensayar') && plan.some((p) => p.id === 'descansar')) {
      L(api).applyLesson(s, 'aprende_ano', 'Revisaste tus mejores semanas y repetiste lo que funcionó: ensayar y descansar.');
    }
  },

  afterCard() {},

  afterShow(s, r, api) {
    if (!r || r.venue !== 'estadio') return;
    markStart(s);
    const lx = L(api);
    // La cuerda rota (escena c7_cuerda) pasa con el estadio LLENO: un estadio a medias no es el clímax (c7_casi).
    if (r.soldOut && !s.flags.cuerdaRota) {
      s.flags.cuerdaRota = s.week;
      lx.applyLesson(s, 'duena', `Se rompió una cuerda frente a ${fmt(r.attendance)} personas y la cambiaste tú, con la bolsita de repuesto.`);
    } else if (s.flags.cuerdaRota) {
      lx.applyLesson(s, 'calma_ensaya', `Otra vez en el estadio, ${fmt(r.attendance)} personas, y tocaste tranquila: ya sabías qué hacer si algo fallaba.`);
    }
    if (r.soldOut && !s.flags.estadioLleno) s.flags.estadioLleno = s.week;
  },

  afterWeek(s, api) {
    markStart(s);
    if (s.chapter < 7) return;
    const lx = L(api);
    // Respaldo: si la UI no mostró el globo de la lección, la escena ya vista la deja descubierta.
    if (seenScene(s, 'c7_libreta')) {
      lx.discover(s, 'aprende_ano', 'Papá abrió la libreta de toda la historia en el estadio vacío.');
      lx.discover(s, 'aplausos_quedan', 'La Abuela puso su silla junto a las tres sillas del estadio vacío.');
    }
    if (seenScene(s, 'c7_cuerda')) lx.discover(s, 'calma_ensaya', `Cambiaste una cuerda rota frente a ${fmt(s.records?.bestAttendance)} personas sin pánico.`);
    if (seenScene(s, 'c7_cochera')) lx.discover(s, 'siempre_famosos', 'De regreso en la cochera, tocaron para tres sillas con el gramófono en la repisa.');
    if ((s.streams || 0) >= 10000000 && !s.flags.gramofono) s.flags.gramofono = s.week;
  },
};
