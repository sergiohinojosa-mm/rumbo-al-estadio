// Aplicar y dominar: las lecciones de los capítulos 0 a 6 se aplican cuando {nombre} repite la buena conducta,
// también en los capítulos que siguen (así, en una partida larga, cada una puede llegar a ⭐⭐⭐).
// Firma: ver js/data/triggers.js. El motor cuenta como mucho una aplicación cada 5 días y la primera, 5 días
// después de descubrirla. Cada ctx cita los números de su partida (fans, dinero, público, semana).
//
//   ultima_silla     primer show en un lugar de 150 lugares o más, con el ánimo alto y un show que salió bien
//   decide_info      la decisión de disquera o independientes (C4-02), con lo que sabían ese día
//   aplausos_mentira primer AGOTADO en un lugar de 150 o más, con fans de verdad (sin seguidores comprados)
//   mitad_camino     a la mitad de la meta de fans de los caps. 4 a 6 revisan la libreta
//   riesgo_premio    primer show con ganancia en un lugar de renta o viáticos de $30,000 o más
//   integridad       shows de los caps. 5 a 7 con puras canciones suyas, en vivo, que salieron bien
//   innovar          componer o grabar algo nuevo en los caps. 5 a 7
//   cuida_fans       "¡Otra!" en los caps. 5 a 7
//   largo_plazo      guardar en el ahorro en los caps. 6 y 7
//   cuentas_claras   caps. 5 a 7: semana con regalías en la que ella reparte en las alcancías, con la regla de C4-01
//   equipo_casa      show de gira (lejos de casa) que salió bien con el ánimo arriba de 60
//   escenario_fans   tocar con todo aunque el lugar no se llenó, o en otra ciudad (caps. 5 a 7)
//   delegar          con el trabajo repartido (giraRepartida), cualquier show que salió bien (caps. 6 y 7)
//   exito, fan_visto el show cambiado para un lugar grande también en el Final
//   nervios          el primer show en la Arena, el Palacio o el estadio, con el ánimo arriba de 60
//   verdad_tiempo    después de avisar a tiempo (palacioPospuesto / palacioCoro), cada show grande que sale bien
//   mentora          componer en los caps. 6 y 7 (le explican la canción nueva a la banda)
import * as Lessons from '../../engine/lessons.js';
import { VENUE_BY_ID } from '../venues.js';
import { CHAPTERS } from '../chapters.js';

const n = (v) => Math.round(v || 0).toLocaleString('es-MX');
const money = (v) => `$${n(v)}`;
// Cómo sonó el show, en palabras (mismo molde que engine/explain.js): nada de porcentajes en el Libro.
const sono = (q) => (q >= 0.8 ? 'increíble' : q >= 0.6 ? 'muy bien' : q >= 0.45 ? 'bien' : 'apagadito');
const L = (api) => (api && typeof api.discover === 'function' ? api : Lessons);
const CITIES = ['gdl', 'mty', 'pue'];
const BIG_FIRST = ['arena', 'palacio', 'estadio'];
// Shows before this one at the same venue.
const playedBefore = (s, venue) => (s.history || []).filter((h) => h.venue === venue).length > 1;

export default {
  afterActivity(s, act, res, api) {
    const lx = L(api);
    if (act === 'componer' && s.chapter >= 5) {
      const song = res?.song || s.songs?.[s.songs.length - 1];
      if (song) lx.applyLesson(s, 'innovar', `Semana ${s.week}: en vez de tocar siempre lo mismo compusieron "${song.title}", su canción número ${n(s.songs.length)}.`);
      if (song && s.chapter >= 6) lx.applyLesson(s, 'mentora', `Semana ${s.week}: le explicaste "${song.title}" a la banda acorde por acorde, y a la segunda ya la tocaban los ${n((s.members || []).length)}.`);
    }
    if (act === 'grabar' && s.chapter >= 5) {
      const g = (s.recorded || [])[s.recorded.length - 1];
      if (g) lx.applyLesson(s, 'innovar', `Semana ${s.week}: grabaron "${g.title}", su canción grabada número ${n(s.recorded.length)}, con ${n(s.m.fans)} fans esperándola.`);
    }
  },

  afterCard(s, card, opt, api) {
    if (!card) return;
    const lx = L(api);
    if (card.id === 'C4-02' && opt?.effects?.label) {
      lx.applyLesson(s, 'decide_info', `Semana ${s.week}: decidieron lo de la disquera con lo que sabían (${n(s.m.fans)} fans y ${n(s.streams)} reproducciones), sin esperar a saberlo todo.`);
    }
  },

  afterShow(s, r, api) {
    if (!r) return;
    const lx = L(api);
    const v = VENUE_BY_ID[r.venue] || {};
    const first = !playedBefore(s, r.venue);
    const good = (r.quality || 0) >= 0.6;
    const place = r.venueName || v.name || 'el show';

    if (first && r.cap >= 150 && (r.moodBefore ?? 0) >= 70 && good) {
      lx.applyLesson(s, 'ultima_silla', `Primera vez en ${place}: subiste cómoda y siendo tú, con el ánimo en ${r.moodBefore}, y hasta la última de las ${n(r.cap)} sillas lo notó: el show sonó ${sono(r.quality)}.`);
    }
    if (r.soldOut && r.cap >= 150 && !s.flags.seguidores_falsos && (s.flags[`soldOut_${r.venue}`] || 0) <= 1) {
      lx.applyLesson(s, 'aplausos_mentira', `AGOTADO en ${place}: ${n(r.attendance)} personas de verdad, ningún robot. Así se oyen los aplausos de verdad.`);
    }
    if (first && (v.cost || 0) >= 30000 && r.earned > 0) {
      lx.applyLesson(s, 'riesgo_premio', `Antes de pagar ${money(v.cost)} en ${place} revisaron cuánta gente podía llegar: vinieron ${n(r.attendance)} y les quedaron ${money(r.earned)}.`);
    }
    if (s.chapter >= 5 && r.covers === 0 && good) {
      lx.applyLesson(s, 'integridad', `En ${place} tocaron en vivo sus ${n(r.setSize)} canciones, sin playback ni covers, para ${n(r.attendance)} personas.`);
    }
    if (s.chapter >= 5 && r.encore) {
      lx.applyLesson(s, 'cuida_fans', `En ${place} los fans pidieron "¡Otra!" y se la dieron: ${n(r.attendance)} personas y ${n(r.newFans)} fans nuevos.`);
    }
    if (CITIES.includes(r.venue) && good && (r.moodBefore ?? 0) >= 60) {
      lx.applyLesson(s, 'equipo_casa', `Lejos de casa, en ${place}, la banda llegó unida (ánimo ${r.moodBefore}) y el show sonó ${sono(r.quality)}.`);
    }
    if (s.chapter >= 5 && good && (CITIES.includes(r.venue) || !r.soldOut)) {
      lx.applyLesson(s, 'escenario_fans', `En ${place} llegaron ${n(r.attendance)} de ${n(r.cap)} y tocaste con todo para los que estaban.`);
    }
    if (s.chapter >= 6 && s.flags.giraRepartida && good) {
      lx.applyLesson(s, 'delegar', `Cada quien con su parte del trabajo y en ${place} el show sonó ${sono(r.quality)} para ${n(r.attendance)} personas.`);
    }
    if (s.chapter >= 7 && (r.cap || 0) >= 5000 && (s.flags.escenarioChico || s.flags.camaraLetrero) && (r.quality || 0) >= 0.55) {
      const how = s.flags.camaraLetrero ? 'la cámara del letrero' : 'el escenario chiquito al fondo';
      lx.applyLesson(s, 'exito', `En ${place} volvieron a cambiar el show para el lugar, con ${how}: ${n(r.attendance)} personas.`);
      lx.applyLesson(s, 'fan_visto', `En ${place}, con ${how}, hasta los de hasta atrás se sintieron vistos: ${n(r.attendance)} personas.`);
    }
    if (first && BIG_FIRST.includes(r.venue) && (r.moodBefore ?? 0) >= 60) {
      lx.applyLesson(s, 'nervios', `Antes de salir a ${place} te temblaban las manos. Las usaste para tocar: ${n(r.attendance)} personas y un show que sonó ${sono(r.quality)}.`);
    }
    if (s.chapter >= 6 && (r.cap || 0) >= 5000 && good && (s.flags.palacioPospuesto || s.flags.palacioCoro)) {
      lx.applyLesson(s, 'verdad_tiempo', `Desde que avisaron a tiempo lo de la voz de Nina, los fans confían: en ${place} llegaron ${n(r.attendance)}.`);
    }
  },

  afterWeek(s, api) {
    const lx = L(api);
    const close = api?.close?.week || {};
    if (s.chapter >= 6 && close.saved > 0) {
      lx.applyLesson(s, 'largo_plazo', `Semana ${s.week}: guardaste ${money(close.saved)} en el ahorro aunque ya les va bien. Ahí van ${money(s.money.ahorro)}.`);
    }
    // cuentas_claras (caps. 5 a 7): una semana con regalías en la que ELLA repartió en las alcancías, con la regla de C4-01.
    const roy = s.week$?.income?.royalties || 0;
    if (s.chapter >= 5 && roy > 0 && (close.saved > 0 || close.paid > 0) && (s.flags.acuerdo_firmado || s.flags.reparto_parejo)) {
      lx.applyLesson(s, 'cuentas_claras', `Semana ${s.week}: entraron ${money(roy)} de regalías y repartiste ${close.saved ? `${money(close.saved)} al ahorro` : ''}${close.saved && close.paid ? ' y ' : ''}${close.paid ? `${money(close.paid)} a Papá` : ''}, con la regla que pusieron. Nadie discutió.`);
    }
    // Half of the fan goal of chapters 4 to 6: they open the libreta again (once per chapter).
    const ch = s.chapter;
    const goal = CHAPTERS[ch]?.goals?.find((g) => g.id === 'fans')?.need;
    if (ch >= 4 && ch <= 6 && goal && s.m.fans >= goal / 2 && !s.flags[`mitad_${ch}`]) {
      if (lx.applyLesson(s, 'mitad_camino', `A la mitad del capítulo revisaron la libreta: ${n(s.m.fans)} fans de ${n(goal)} y ${money(s.money.caja)} en la caja. Repitieron lo que más fans trajo.`)) {
        s.flags[`mitad_${ch}`] = s.week;
      }
    }
  },
};
