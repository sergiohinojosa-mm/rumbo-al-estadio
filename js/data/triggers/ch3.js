// Disparadores del Capítulo 3 · Primer sencillo (tabla 3.0, lecciones 14 a 18).
// Firma: export default { afterActivity(s, act, res, api), afterCard(s, card, opt, api), afterShow(s, result, api), afterWeek(s, api) }
//   api = { discover(s, id, ctx), applyLesson(s, id, ctx), level(s, id) }
// Por si alguien los registra directo en engine/lessons.js (que llama fn(s, ctx)), también aceptan esa forma.
//
// De dónde sale cada lección del capítulo (primero se vive y luego se oye; el ctx cita números de su partida):
//   prueba_chico   carta C3-01 · respaldo: al grabar (🎙️) · se aplica al grabar en el estudio chico y al llenar
//                  un lugar chico antes de Indie Rocks
//   diferencia     escena ch3-tropiezo(-tomas): se descubre al cerrar esa semana · se aplica al regrabar en 3 a 5 tomas
//                  y en shows con puras canciones propias
//   mitad_camino   escena ch3-mitad (libreta de Papá): se descubre al cerrar esa semana · se aplica al pasar los 800 fans
//                  y al elegir dónde presentar el sencillo (C3-11)
//   foto_honesta   carta C3-08 · se aplica en Indie Rocks si la portada fue la de verdad
//   error_bonito   escena ch3-ya: se descubre al cerrar esa semana · se aplica en shows con errores en los que siguieron
// Además aplica practica (del Prólogo) al grabar en 3 a 5 tomas después de ensayar esa semana.
import * as Lessons from '../../engine/lessons.js';
import { STUDIO } from '../chapters.js';

const CH = 3;

// api perezosa: no toca engine/lessons.js hasta que se usa (evita problemas si los módulos se cargan en ciclo).
const FALLBACK = {
  discover: (...a) => Lessons.discover(...a),
  applyLesson: (...a) => Lessons.applyLesson(...a),
  level: (...a) => Lessons.level(...a),
};
const isApi = (x) => !!x && typeof x.discover === 'function';

const num = (v) => Math.round(v || 0).toLocaleString('es-MX');
const money = (v) => `$${num(v)}`;
// Notas que le salieron de cada 10 (nada de porcentajes en el Libro).
const de10 = (v) => Math.round((v || 0) * 10);
const seen = (s, id) => (s.seenScenes || []).includes(id);
const sister = (s) => s.player?.sister || 'tu hermana';
const lastRec = (s) => { const r = s.recorded || []; return r[r.length - 1] || null; };
// En la semana del hito, closeWeek ya pasó al capítulo siguiente (weekInChapter = 0) antes de correr afterWeek.
const inChapterAtClose = (s) => s.chapter === CH || (s.chapter === CH + 1 && s.weekInChapter === 0);
// Solo cuenta como aplicación si la descubrió antes de hoy (que no se descubra y se aplique en el mismo momento).
const knownBefore = (s, L, id) => L.level(s, id) > 0 && (s.lessons?.[id]?.day ?? s.day) < s.day;

export default {
  afterActivity(s, act, res, api) {
    let id = typeof act === 'string' ? act : act?.id;
    let L = api;
    if (!isApi(api) && act && typeof act === 'object' && 'result' in act) { id = act.id; L = null; }
    L = isApi(L) ? L : FALLBACK;
    if (s.chapter !== CH || id !== 'grabar') return;

    const g = lastRec(s);
    if (!g || g.week !== s.week) return;
    const takes = g.takes || 1;
    const cost = (STUDIO[g.studio] || STUDIO.barato).cost;
    const total = (s.recorded || []).length;

    // Marcas para las escenas del tropiezo y del "¡YA!".
    if (!s.flags.ch3_grabo) s.flags.ch3_grabo = s.week;
    if (takes > 6 && total === 1) s.flags.ch3_muchas_tomas = takes;
    if (!s.flags.ya_grabado) {
      s.flags.ya_grabado = s.week;
      s.flags.ya_toma = Math.min(3, takes);
      s.flags.ya_cancion = g.title;
    }

    // prueba_chico: respaldo por si grabaron antes de que saliera la carta C3-01.
    if (L.level(s, 'prueba_chico') === 0) {
      L.discover(s, 'prueba_chico', g.studio === 'bueno'
        ? `Pagaron ${money(cost)} por el día completo para grabar "${g.title}". Un demo en el estudio chico costaba ${money(STUDIO.barato.cost)} y les habría dicho antes qué le faltaba a la canción.`
        : `Grabaron "${g.title}" en el estudio chico por ${money(cost)}, en lugar de gastar ${money(STUDIO.bueno.cost)} en el día completo. Ya oyeron qué le falta antes de apostar todo el ahorro.`);
    } else if (g.studio !== 'bueno' && knownBefore(s, L, 'prueba_chico')) {
      L.applyLesson(s, 'prueba_chico', `Grabaron "${g.title}" en el estudio chico por ${money(cost)} antes de gastar ${money(STUDIO.bueno.cost)}. Les quedaron ${money(s.money.ahorro)} en el ahorro.`);
    }

    // practica (recordatorio que se aplica): graban en 3 a 5 tomas después de ensayar esta semana.
    const ensayos = (s.week$?.plan || []).filter((p) => p.id === 'ensayar').length;
    if (ensayos > 0 && takes >= 3 && takes <= 5 && knownBefore(s, L, 'practica')) {
      L.applyLesson(s, 'practica', `Ensayaron ${ensayos === 1 ? 'un día' : `${ensayos} días`} antes de entrar al estudio y "${g.title}" salió en ${takes} tomas.`);
    }

    // diferencia: después del tropiezo, la regrabaron con su riff de siempre en pocas tomas.
    if (total >= 2 && takes >= 3 && takes <= 5 && knownBefore(s, L, 'diferencia')) {
      L.applyLesson(s, 'diferencia', `Regrabaron "${g.title}" en ${takes} tomas, con su riff de la cochera. Ya no suena a "Corazón de Chicle": suena a ustedes.`);
    }
  },

  afterCard(s, card, opt, api) {
    let L = api;
    if (!isApi(api) && card && typeof card === 'object' && card.card) { opt = card.option; card = card.card; L = null; }
    L = isApi(L) ? L : FALLBACK;
    if (!card || card.chapter !== CH) return;

    // mitad_camino: eligen dónde presentar el sencillo después de revisar la libreta.
    if (card.id === 'C3-11' && knownBefore(s, L, 'mitad_camino')) {
      L.applyLesson(s, 'mitad_camino', `Antes de elegir dónde presentar el sencillo revisaron la libreta: tenían ${num(s.m.fans)} fans y les faltaban ${num(Math.max(0, 1500 - s.m.fans))} para la meta.`);
    }
    // La preventa de Indie Rocks marca la semana (para el hito y los mensajes del cierre).
    if (card.id === 'C3-12') s.flags.ch3_preventa = s.week;
  },

  afterShow(s, result, api) {
    let r = result;
    let L = api;
    if (!isApi(api) && result && typeof result === 'object' && result.result) { r = result.result; L = null; }
    L = isApi(L) ? L : FALLBACK;
    r = r || s.last;
    if (s.chapter !== CH || !r) return;
    const place = r.venueName || 'el show';

    // diferencia: puras canciones propias y salió bien.
    if (r.covers === 0 && (r.quality || 0) >= 0.6 && knownBefore(s, L, 'diferencia')) {
      L.applyLesson(s, 'diferencia', `En ${place} tocaron ${num(r.setSize || r.setlist?.length || 0)} canciones, todas de ustedes, y llegaron ${num(r.newFans)} fans nuevos.`);
    }
    // error_bonito: hubo errores y siguieron tocando.
    if ((r.accuracy || 0) < 0.75 && (r.newFans || 0) > 0 && knownBefore(s, L, 'error_bonito')) {
      L.applyLesson(s, 'error_bonito', `En ${place} se te escaparon algunas notas (te salieron ${de10(r.accuracy)} de cada 10), siguieron tocando como si nada y llegaron ${num(r.newFans)} fans nuevos.`);
    }
    // prueba_chico: llenaron un lugar chico antes de ir por los 600 de Indie Rocks.
    if (r.venue !== 'indie' && r.soldOut && (s.m.fans || 0) < 1500 && knownBefore(s, L, 'prueba_chico')) {
      L.applyLesson(s, 'prueba_chico', `Llenaron ${place} (${num(r.attendance)} de ${num(r.cap)}) antes de ir por los 600 lugares de Indie Rocks.`);
    }
    // foto_honesta: en Indie Rocks los reconocen por la portada de verdad.
    if (r.venue === 'indie' && s.flags.portada_real && knownBefore(s, L, 'foto_honesta')) {
      L.applyLesson(s, 'foto_honesta', `En Indie Rocks llegaron ${num(r.attendance)} de ${num(r.cap)} personas y los reconocieron en cuanto salieron: son los mismos de la portada de ${sister(s)}.`);
    }
    if (r.venue === 'indie' && r.soldOut && !s.flags.ch3_indie_lleno) s.flags.ch3_indie_lleno = s.week;
  },

  afterWeek(s, api) {
    const L = isApi(api) ? api : FALLBACK;
    if (!inChapterAtClose(s)) return;
    const first = (s.recorded || [])[0];

    // diferencia: se oye en el tropiezo (Inés y Papá en la escena).
    if ((seen(s, 'ch3-tropiezo') || seen(s, 'ch3-tropiezo-tomas')) && L.level(s, 'diferencia') === 0) {
      const t = s.flags.ch3_muchas_tomas || (first?.takes > 6 ? first.takes : 0);
      const title = first?.title || 'su canción';
      L.discover(s, 'diferencia', t
        ? `Grabaron "${title}" en ${t} tomas: a Nina se le fue la voz y la mezcla sonaba igualita a "Corazón de Chicle". Pulpo Neón sacó una parecida con boletos a mitad de precio y pensaron en bajar el suyo. Inés: "Bonito no basta: tiene que sonar a ustedes".`
        : `La mezcla de "${title}" sonaba igualita a "Corazón de Chicle", la canción de moda, y Pulpo Neón sacó una parecida con boletos a mitad de precio. Llevaban ${num(s.m.fans)} fans y pensaron en bajar el boleto. Inés: "Bonito no basta: tiene que sonar a ustedes".`);
    }

    // mitad_camino: revisan la libreta de Papá a mitad del capítulo.
    if (seen(s, 'ch3-mitad') && L.level(s, 'mitad_camino') === 0) {
      const shows = (s.history || []).filter((h) => h.chapter === CH);
      const best = shows.reduce((a, h) => (!a || h.newFans > a.newFans ? h : a), null);
      const worst = shows.reduce((a, h) => (!a || h.newFans < a.newFans ? h : a), null);
      let ctx = `Revisaron la libreta: llevan ${num(s.m.fans)} fans de 1,500, e Indie Rocks pide 800.`;
      if (best) ctx += ` El show que más fans trajo fue ${best.venueName} (+${num(best.newFans)}).`;
      if (worst && worst !== best) ctx += ` El que menos: ${worst.venueName} (+${num(worst.newFans)}).`;
      L.discover(s, 'mitad_camino', ctx);
    } else if (!s.flags.ch3_800 && s.m.fans >= 800 && knownBefore(s, L, 'mitad_camino')) {
      s.flags.ch3_800 = s.week;
      L.applyLesson(s, 'mitad_camino', `Después de revisar la libreta cambiaron lo que no funcionaba y pasaron los 800 fans: ya van ${num(s.m.fans)}. Indie Rocks les dio fecha.`);
    }

    // error_bonito: el "¡YA!" de Juju se queda en la canción.
    if (seen(s, 'ch3-ya') && L.level(s, 'error_bonito') === 0) {
      const toma = s.flags.ya_toma || Math.min(3, first?.takes || 3);
      const title = s.flags.ya_cancion || first?.title || 'su canción';
      L.discover(s, 'error_bonito', `En la toma ${toma} de "${title}", Juju gritó "¡YA!" justo antes del coro. Inés lo escuchó dos veces y dijo: "Se queda".`);
    }
  },
};
