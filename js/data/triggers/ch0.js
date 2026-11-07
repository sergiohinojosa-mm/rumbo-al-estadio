// Disparadores del Prólogo (lecciones que no vienen de cartas). Firma: ver js/data/triggers.js.
//   practica      primer ensayo (P10-P11): a la mitad de velocidad, el riff sale. Se aplica cuando un ensayo
//                 supera por 10 puntos la precisión del primero.
//   suenas_a_ti   primera canción (P7b-P9). Se aplica cada vez que componen otra canción propia.
//   ultima_silla  por si la carta del look (p_look) no salió antes del show de la cochera.
import { plural } from '../../util.js';
import { sono } from '../../engine/explain.js';

export default {
  afterActivity(s, act, res, api) {
    if (act === 'ensayar') {
      const acc = Number.isFinite(res?.acc) ? res.acc : 0.6;
      if (s.flags.firstRehearsalAcc == null) s.flags.firstRehearsalAcc = acc;
      const first = s.flags.firstRehearsalAcc;
      if (api.level(s, 'practica') === 0) {
        const notes = res?.total ? `tocaste ${res.hits} de ${res.total} notas` : 'el riff salió completo';
        api.discover(s, 'practica', `Primer ensayo, semana ${s.week}: a la mitad de velocidad ${notes}. Tu talento quedó en ${s.m.talent}.`);
      } else if (acc >= first + 0.1) {
        const notes = res?.total ? ` Hoy tocaste ${res.hits} de ${res.total} notas.` : ' Hoy te salió mucho mejor que la primera vez.';
        api.applyLesson(s, 'practica', `Semana ${s.week}: repetiste despacito y luego más rápido.${notes} Tu talento va en ${s.m.talent}.`);
      }
    }
    if (act === 'componer' && res?.song) {
      const n = (s.songs || []).length;
      if (api.level(s, 'suenas_a_ti') === 0) {
        api.discover(s, 'suenas_a_ti', `Compusieron "${res.song.title}", su primera canción. Hace diez minutos no existía.`);
      } else {
        api.applyLesson(s, 'suenas_a_ti', `Compusieron "${res.song.title}": ya tienen ${plural(n, 'canción propia', 'canciones propias')}.`);
      }
    }
  },
  afterCard() {},
  afterShow(s, r, api) {
    if (r?.venue === 'cochera' && api.level(s, 'ultima_silla') === 0) {
      // Only what really happened: the look comes from card p_look if she played it; if not, her everyday clothes.
      const look = s.flags.look_tenis ? 'con tenis y playeras pintadas a mano'
        : s.flags.look_lentejuelas ? 'con lentejuelas que picaban' : 'con su ropa de todos los días';
      api.discover(s, 'ultima_silla', `Primer show en la cochera, ${look}: ${plural(r.attendance, 'persona', 'personas')} en las sillas, con el ánimo en ${r.moodBefore ?? s.m.mood}. El show sonó ${sono(r.quality ?? 0.5)}.`);
    }
  },
  afterWeek() {},
};
