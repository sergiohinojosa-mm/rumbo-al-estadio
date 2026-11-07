// Disparadores de lecciones que NO vienen de cartas (las cartas usan lesson: { discover | apply } en sus opciones).
// Este archivo junta los de cada capítulo: js/data/triggers/ch0.js … ch7.js (imports estáticos; un capítulo sin
// disparadores exporta `export default {}`).
//
// Firma de cada capítulo (todas opcionales):
//   export default {
//     afterActivity(s, act, res, api),   act = id de la actividad ('ensayar' | 'componer' | 'promover' | 'trabajito'
//                                        | 'descansar' | 'grabar'); res = resultado del día (deltas, before, after, acc,
//                                        streak, song, people, cost, job, studio, takes) + verdict
//     afterCard(s, card, opt, api),      card = la carta (datos de cards/chN.js); opt = la opción elegida (+ i = su índice)
//     afterShow(s, result, api),         result = resultado de show.playShow (venue, attendance, cap, soldOut, newFans,
//                                        earned, quality, accuracy, price, anchorHit, …)
//     afterWeek(s, api),                 api.close = { week, chains, milestone } del cierre de semana (week.paid, week.saved…)
//   }
//   api = { discover(s, id, ctx), applyLesson(s, id, ctx), level(s, id) }. El ctx es una frase con los números de SU
//   partida ("Vinieron 12 a un lugar de 40"), porque el Libro guarda cómo aprendió cada lección.
//   discover solo funciona la primera vez; applyLesson cuenta como mucho una vez cada 5 días (práctica espaciada).
//   Los disparadores pueden poner banderas de historia en s.flags (las escenas las leen en su `when`).
//
// Lo que agregan los otros capítulos, en triggers/ch3.js … ch7.js (misma firma):
//   ch3  error_bonito (Juju): después de la grabación en que el "¡YA!" de Juju se queda (afterActivity 'grabar' o la escena).
//        diferencia: si la carta del tropiezo no salió, al ver la escena de Inés ("Bonito no basta").
//        mitad_camino: a la mitad de la meta de fans del cap. 3, al revisar la libreta (afterWeek).
//        practica (aplicar): grabar con 3 a 5 tomas después de una semana de ensayo.
//   ch4  cuida_fans: cuando la versión acústica cruza las 100,000 reproducciones (afterWeek, s.streams).
//        cuentas_claras (aplicar): cada reparto de regalías sin pleito.
//   ch5  equipo_casa (Abuela): la primera noche de gira, en la videollamada (afterShow en la primera ciudad).
//        escenario_fans (Juju): el show del estacionamiento de Monterrey (afterShow 'mty').
//        agua_aplausos / descansar (aplicar): descansar antes de una ciudad con el ánimo bajo.
//        cumple: el último pago a Papá (sticker de PAGADO) lo aplica triggers/ch2.js en afterWeek.
//   ch6  fan_visto ({hermana}) y nervios (Mamá): escenas del cap. 6 (la noche antes del Palacio).
//        guerra_precios (aplicar): precio del Palacio por zonas sin rematar boletos.
//        practica (aplicar): cuando {nombre} enseña el riff lento a la niña.
//   ch7  aplausos_quedan (Abuela) y siempre_famosos (Juju): escenas del Final.
//        calma_ensaya (Mamá): la cuerda rota frente a 87,000 personas (afterShow 'estadio').
//        duena (aplicar): la misma cuerda rota, con la bolsita de repuesto desde el cap. 1.
//   aplicar.js  aplicaciones de las lecciones de los caps. 0 a 6 en los capítulos que siguen (repetir la buena
//        conducta), para que en una partida larga se puedan dominar.
//
// Compatibilidad: si el motor llama con la firma vieja (s, ctx) de engine/lessons.js runTriggers, aquí se traduce.
import * as Lessons from '../engine/lessons.js';
import * as T0 from './triggers/ch0.js';
import * as T1 from './triggers/ch1.js';
import * as T2 from './triggers/ch2.js';
import * as T3 from './triggers/ch3.js';
import * as T4 from './triggers/ch4.js';
import * as T5 from './triggers/ch5.js';
import * as T6 from './triggers/ch6.js';
import * as T7 from './triggers/ch7.js';
import * as TA from './triggers/aplicar.js';

const pick = (m) => m?.default || m?.TRIGGERS || {};
export const PARTS = [T0, T1, T2, T3, T4, T5, T6, T7, TA].map(pick);

const baseApi = () => ({ discover: Lessons.discover, applyLesson: Lessons.applyLesson, level: Lessons.level });
const isApi = (a) => !!a && typeof a.discover === 'function';

function run(kind, args) {
  for (const part of PARTS) {
    const fn = part[kind];
    if (typeof fn !== 'function') continue;
    try { fn(...args); } catch (e) { console.warn(`[triggers] ${kind}:`, e); }
  }
}

export const TRIGGERS = {
  afterActivity(s, act, res, api) {
    if (!isApi(api) && act && typeof act === 'object' && 'result' in act) {
      const ctx = act;
      act = ctx.id;
      res = { ...(ctx.result || {}), verdict: ctx.verdict, perf: ctx.perf };
    }
    run('afterActivity', [s, typeof act === 'object' ? act?.id : act, res || {}, isApi(api) ? api : baseApi()]);
  },
  afterCard(s, card, opt, api) {
    if (!isApi(api) && card && card.card) {
      const ctx = card;
      card = ctx.card;
      opt = { ...(ctx.option || card?.options?.[ctx.optIdx] || {}), i: ctx.optIdx };
    }
    run('afterCard', [s, card, opt || {}, isApi(api) ? api : baseApi()]);
  },
  afterShow(s, result, api) {
    if (!isApi(api) && result && result.result) result = result.result;
    run('afterShow', [s, result, isApi(api) ? api : baseApi()]);
  },
  afterWeek(s, api) {
    const a = isApi(api) ? api : { ...baseApi(), close: api || {} };
    run('afterWeek', [s, a]);
  },
};

export default TRIGGERS;
