// Disparadores del Capítulo 6 · Palacio de los Deportes (lecciones que no vienen de cartas). Firma: ver js/data/triggers.js.
//   fan_visto       (descubrir) respaldo de la escena c6_camara_letrero; (aplicar) foro grande con escenario chiquito
//                   o cámara del letrero y buena calidad.
//   exito           (aplicar) el show cambiado para un lugar grande salió bien.
//   nervios         (descubrir) respaldo de la escena c6_nervios.
//   verdad_tiempo   (aplicar) avisaron a tiempo (pospusieron o el público cantó) y luego el Palacio se llenó.
//   guerra_precios  (aplicar) boleto del Palacio sin rematar (cerca del precio justo) y lugar lleno.
//   practica        (aplicar) {nombre} le enseñó el riff lento a la niña (carta c6_nina_guitarra).
// Banderas: c6Inicio (cómo empezó el capítulo), palacioSemana, palacioLleno.
import * as Lessons from '../../engine/lessons.js';
import { fillText } from '../../engine/state.js';
import { VENUE_BY_ID } from '../venues.js';

const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
const seenScene = (s, id) => (s.seenScenes || []).includes(id);
const L = (api) => (api && typeof api.discover === 'function' ? api : Lessons);
const flagsOf = (e) => (e?.flag == null ? [] : Array.isArray(e.flag) ? e.flag : typeof e.flag === 'string' ? [e.flag] : Object.keys(e.flag));

function markStart(s) {
  if (s.chapter !== 6 || !s.flags || s.flags.c6Inicio) return;
  const st = s.chapterStart || {};
  s.flags.c6Inicio = { fans: st.fans ?? s.m.fans, week: st.week ?? s.week, streams: st.streams ?? s.streams ?? 0 };
}

export default {
  afterActivity(s) {
    markStart(s);
  },

  afterCard(s, card, opt, api) {
    if (!card || card.chapter !== 6 || !opt) return;
    if (card.id === 'c6_nina_guitarra' && flagsOf(opt.effects).includes('ensenoRiff')) {
      L(api).applyLesson(s, 'practica', 'Le enseñaste a una niña de 9 años el riff a la mitad de velocidad, como lo aprendiste tú.');
    }
  },

  afterShow(s, r, api) {
    if (!r || s.chapter !== 6) return;
    markStart(s);
    const lx = L(api);
    const big = (r.cap || 0) >= 5000;
    const changed = s.flags.escenarioChico || s.flags.camaraLetrero;
    if (big && changed && (r.quality || 0) >= 0.55) {
      const how = s.flags.camaraLetrero ? 'la cámara del letrero' : 'el escenario chiquito al fondo';
      lx.applyLesson(s, 'exito', `En ${r.venueName} cambiaron el show con ${how} y sonó ${r.quality >= 0.8 ? 'increíble' : r.quality >= 0.6 ? 'muy bien' : 'bien'}: ${fmt(r.attendance)} personas.`);
      lx.applyLesson(s, 'fan_visto', `En ${r.venueName}, con ${how}, hasta los de hasta atrás se sintieron vistos: ${fmt(r.attendance)} personas.`);
    }
    if (r.venue === 'palacio') {
      if (!s.flags.palacioSemana) s.flags.palacioSemana = s.week;
      if (r.soldOut) {
        if (!s.flags.palacioLleno) s.flags.palacioLleno = s.week;
        if (s.flags.palacioPospuesto || s.flags.palacioCoro) {
          lx.applyLesson(s, 'verdad_tiempo', `Avisaron a tiempo lo de la voz de Nina y el Palacio se llenó: ${fmt(r.attendance)} personas.`);
        }
        const fair = VENUE_BY_ID.palacio?.fairPrice || 500;
        if (r.price >= fair * 0.9) lx.applyLesson(s, 'guerra_precios', `Boleto de $${fmt(r.price)} sin rematar, y el Palacio se agotó.`);
      }
    }
  },

  afterWeek(s, api) {
    markStart(s);
    if (s.chapter < 6) return;
    const lx = L(api);
    // Respaldo: si la UI no mostró el globo de la lección, la escena ya vista la deja descubierta.
    if (seenScene(s, 'c6_camara_letrero')) lx.discover(s, 'fan_visto', fillText(s, '{hermana} se subió a la última fila y propuso la cámara del letrero.'));
    if (seenScene(s, 'c6_nervios')) lx.discover(s, 'nervios', 'La noche antes del Palacio no podías dormir y Mamá se sentó en la orilla de la cama.');
  },
};
