// Disparadores del Capítulo 5 · De gira (lecciones que no vienen de cartas). Firma: ver js/data/triggers.js.
//   agua_aplausos   (aplicar) descansar a media gira, o llegar a una ciudad con el ánimo alto.
//   escenario_fans  (aplicar) tocar con todo en una ciudad que no se llenó. Se descubre en la escena c5_monterrey;
//                   si la UI no mostró el globo, afterWeek la descubre al ver la escena.
//   equipo_casa     (descubrir) respaldo de la escena c5_videollamada.
//   delegar         (aplicar) repartieron el trabajo (carta c5_delegar) y el show de gira salió bien.
//   largo_plazo     (aplicar) guardar en la alcancía de ahorro en plena gira.
// Banderas de historia: c5Inicio (cómo empezó el capítulo), bajo y bajoSemana (audición), showEstacionamiento,
// giraShows, giraCompleta y giraCansada. pagadoSemana (la semana en que el pagaré quedó PAGADO) la marca el motor
// donde se mueve el dinero (week.js markPaidOff), no aquí.
import * as Lessons from '../../engine/lessons.js';

const CITIES = ['gdl', 'mty', 'pue'];
const CITY_NAME = { gdl: 'Guadalajara', mty: 'Monterrey', pue: 'Puebla' };
const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
const seenScene = (s, id) => (s.seenScenes || []).includes(id);
const L = (api) => (api && typeof api.discover === 'function' ? api : Lessons);

// Cómo empezó el capítulo (para la tarjeta "Así empezó / Así va" del hito): se guarda una sola vez.
function markStart(s) {
  if (s.chapter !== 5 || !s.flags || s.flags.c5Inicio) return;
  const st = s.chapterStart || {};
  s.flags.c5Inicio = { fans: st.fans ?? s.m.fans, week: st.week ?? s.week, streams: st.streams ?? s.streams ?? 0 };
}

export default {
  afterActivity(s, act, res, api) {
    markStart(s);
    if (s.chapter !== 5) return;
    const plan = s.week$?.plan || [];
    // Descansar a media gira, después de trabajar: "Primero agua, luego aplausos".
    if (act === 'descansar' && plan.some((p) => p.id !== 'descansar')) {
      L(api).applyLesson(s, 'agua_aplausos', `Descansaste a media gira: el ánimo quedó en ${s.m.mood}.`);
    }
    // Tres tardes de trabajo sin descanso en la gira.
    if (plan.length >= 3 && plan.slice(-3).every((p) => p.id !== 'descansar')) s.flags.giraCansada = s.week;
  },

  afterCard(s, card, opt) {
    if (!card || card.chapter !== 5 || !opt) return;
    // Audición de bajo: el motor guarda al elegido en s.roles.bajo; aquí queda la semana para la historia.
    if (card.kind === 'audition' && opt.member?.id) {
      s.flags.bajo = opt.member.id;
      s.flags.bajoSemana = s.week;
    }
  },

  afterShow(s, r, api) {
    if (!r || !CITIES.includes(r.venue)) return;
    const city = CITY_NAME[r.venue] || r.venueName;
    s.flags.giraShows = (s.flags.giraShows || 0) + 1;
    if (r.venue === 'mty' && !s.flags.showEstacionamiento) s.flags.showEstacionamiento = s.week;
    // Llegaron descansados al show de gira.
    if ((r.moodBefore ?? 0) >= 70) {
      L(api).applyLesson(s, 'agua_aplausos', `Llegaron a ${city} con el ánimo en ${r.moodBefore}: el show salió con energía.`);
    }
    // Tocaron con todo aunque no se llenó: el escenario es donde estén sus fans.
    if (r.cap && r.attendance < r.cap * 0.6 && (r.quality || 0) >= 0.6) {
      L(api).applyLesson(s, 'escenario_fans', `En ${city} vinieron ${fmt(r.attendance)} de ${fmt(r.cap)} y tocaron con todo para ellos.`);
    }
    // Repartieron el trabajo de la gira y el show salió bien.
    if (s.flags.giraRepartida && (r.quality || 0) >= 0.6) {
      L(api).applyLesson(s, 'delegar', `Repartieron el trabajo de la gira y en ${city} el show sonó ${r.quality >= 0.8 ? 'increíble' : 'muy bien'}.`);
    }
    if (CITIES.every((c) => (s.citiesPlayed || []).includes(c)) && !s.flags.giraCompleta) s.flags.giraCompleta = s.week;
  },

  afterWeek(s, api) {
    markStart(s);
    if (s.chapter < 5) return;
    const lx = L(api);
    // Respaldo: si la UI no mostró el globo de la lección, la escena ya vista la deja descubierta.
    if (seenScene(s, 'c5_videollamada')) lx.discover(s, 'equipo_casa', 'La primera noche lejos, con alguien del equipo enfermo: la videollamada con la Abuela.');
    if (seenScene(s, 'c5_monterrey')) lx.discover(s, 'escenario_fans', 'Se ponchó La Burra y tocaron para la fila en el estacionamiento de Monterrey.');
    // pagadoSemana lo marca el motor en la semana real del último pago (week.js markPaidOff).
    // Guardar en la alcancía de ahorro durante la gira: pensar a largo plazo.
    const saved = api?.close?.week?.saved || 0;
    if (s.chapter === 5 && saved > 0) lx.applyLesson(s, 'largo_plazo', `En plena gira guardaste $${fmt(saved)} en el ahorro.`);
  },
};
