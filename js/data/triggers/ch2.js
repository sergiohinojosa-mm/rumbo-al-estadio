// Disparadores del Capítulo 2 (lecciones y banderas que no vienen de cartas). Firma: ver js/data/triggers.js.
//   decide_info      se aplica después de la escena c2_ajuste (dos semanas después de la audición de batería).
//   noche_canciones  bandera después de la escena c2_porque ("Noche de canciones nuevas").
//   un_no            respaldo: si el "no" de Doña Rocío pasó en el cap. 1 pero la lección no salió ahí, se descubre al
//                    ver c2_foro. Se aplica con el AGOTADO del foro.
//   cumple           respaldo: si la carta c2_invitaciones no salió, se descubre al pagarle a Papá (el pagaré es una
//                    promesa) desde la 3.ª semana del capítulo.
//   guerra_precios   se aplica cuando cobran el precio justo en un lugar con boletos y llega su gente.
//   cumple           se aplica cada semana que le pagan a Papá (todos los capítulos).
import { money, plural } from '../../util.js';
import { CANDIDATES } from '../cast.js';
import { VENUE_BY_ID } from '../venues.js';

const seen = (s, id) => (s.seenScenes || []).includes(id);
const nameOf = (role, id) => (CANDIDATES[role] || []).find((c) => c.id === id)?.name || '';

export default {
  afterActivity(s, act, res, api) {
    if (seen(s, 'c2_ajuste') && !s.flags.ajusteBateria) {
      s.flags.ajusteBateria = s.week;
      const weeks = s.week - (s.flags.bateriaWeek ?? s.week);
      const who = nameOf('bateria', s.roles?.bateria) || 'su baterista';
      api.applyLesson(s, 'decide_info', `Eligieron a ${who} hace ${plural(weeks, 'semana', 'semanas')}, con lo que sabían. Hoy ajustaron lo que les costaba.`);
    }
    if (seen(s, 'c2_porque') && !s.flags.noche_canciones) s.flags.noche_canciones = true;
    if (seen(s, 'c2_foro') && s.flags.rocioNo && api.level(s, 'un_no') === 0) {
      api.discover(s, 'un_no', `Doña Rocío les dijo "todavía no". Ahora tienen ${plural((s.songs || []).length, 'canción propia', 'canciones propias')} y un sábado de prueba en su foro.`);
    }
  },
  afterCard() {},
  afterShow(s, r, api) {
    if (!r) return;
    if (r.venue === 'foro' && r.soldOut && api.level(s, 'un_no') > 0) {
      const n = s.flags.rocioSongs;
      api.applyLesson(s, 'un_no', n != null
        ? `Cuando Doña Rocío dijo que no, tenían ${plural(n, 'canción propia', 'canciones propias')}. Hoy: AGOTADO, ${r.attendance} de ${r.cap}.`
        : `El foro que les dijo "todavía no" hoy está AGOTADO: ${r.attendance} de ${r.cap}.`);
    }
    const v = VENUE_BY_ID[r.venue];
    if (v?.pay?.type === 'door' && v.fairPrice && r.price >= v.fairPrice * 0.9 && !r.anchorHit
      && r.attendance >= r.cap * 0.6 && api.level(s, 'guerra_precios') > 0) {
      api.applyLesson(s, 'guerra_precios', `Boleto de ${money(r.price)}, el precio justo, y vinieron ${r.attendance} de ${r.cap}. No hizo falta bajarlo.`);
    }
  },
  afterWeek(s, api) {
    // Lo pagado esta semana (sirve aunque el motor no mande api.close).
    const prev = s.flags.pagadoVisto ?? 0;
    const paid = api.close?.week?.paid ?? (s.money.pagado - prev);
    s.flags.pagadoVisto = s.money.pagado;
    if (paid > 0 && api.level(s, 'cumple') === 0 && s.chapter === 2 && (s.weekInChapter || 1) >= 3) {
      api.discover(s, 'cumple', `Cuando les prestó los $5,000, le prometieron a Papá pagarle con las ganancias. Esta semana le pagaron ${money(paid)}: ya van ${money(s.money.pagado)}.`);
    } else if (paid > 0 && api.level(s, 'cumple') > 0) {
      api.applyLesson(s, 'cumple', `Le pagaron ${money(paid)} a Papá: ya van ${money(s.money.pagado)} de $5,000.`);
    }
  },
};
