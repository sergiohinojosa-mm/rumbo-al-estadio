// Disparadores del Capítulo 4 · Sonando en todos lados (tabla 3.0, lecciones 19 a 23).
// Firma: export default { afterActivity(s, act, res, api), afterCard(s, card, opt, api), afterShow(s, result, api), afterWeek(s, api) }
//   api = { discover(s, id, ctx), applyLesson(s, id, ctx), level(s, id) }
// Por si alguien los registra directo en engine/lessons.js (que llama fn(s, ctx)), también aceptan esa forma.
//
// De dónde sale cada lección del capítulo (primero se vive y luego se oye; el ctx cita números de su partida):
//   cuentas_claras   carta C4-01 · se aplica en cada semana con regalías si repartieron parejo o por escrito, y en C4-12
//   riesgo_premio    carta C4-02 · respaldo: si s.label se decidió por otro lado · se aplica cuando la decisión
//                    se nota en el dinero (la disquera recupera el adelanto, o las regalías propias pasan de $10,000)
//                    y al no apostar la caja en el video con caballo (C4-11)
//   integridad       carta C4-03 · se aplica en C4-05 (tocar en vivo, sin playback)
//   innovar          carta C4-04 · se aplica al componer o grabar algo nuevo y al estrenar una canción en un show
//   cuida_fans       aquí: al cruzar las 100,000 reproducciones (tropiezo del cap. 4) · se aplica en C4-08
//                    y cuando dan "¡Otra!" en un show
import * as Lessons from '../../engine/lessons.js';
import { LABELS } from '../chapters.js';

const CH = 4;
const GOAL_STREAMS = 100000;

// api perezosa: no toca engine/lessons.js hasta que se usa (evita problemas si los módulos se cargan en ciclo).
const FALLBACK = {
  discover: (...a) => Lessons.discover(...a),
  applyLesson: (...a) => Lessons.applyLesson(...a),
  level: (...a) => Lessons.level(...a),
};
const isApi = (x) => !!x && typeof x.discover === 'function';

const num = (v) => Math.round(v || 0).toLocaleString('es-MX');
const money = (v) => `$${num(v)}`;
const seen = (s, id) => (s.seenScenes || []).includes(id);
const firstSong = (s) => s.songs?.[0]?.title || 'su primera canción';
const weekRoyalties = (s) => s.week$?.income?.royalties || 0;
// En la semana del hito, closeWeek ya pasó al capítulo siguiente (weekInChapter = 0) antes de correr afterWeek.
const inChapterAtClose = (s) => s.chapter === CH || (s.chapter === CH + 1 && s.weekInChapter === 0);
// Solo cuenta como aplicación si la descubrió antes de hoy (que no se descubra y se aplique en el mismo momento).
const knownBefore = (s, L, id) => L.level(s, id) > 0 && (s.lessons?.[id]?.day ?? s.day) < s.day;
// Las opciones de cada carta se distinguen por sus banderas (no por su posición: el orden de las opciones cambia).
const optFlags = (opt) => [].concat(opt?.effects?.flag || []);

export default {
  afterActivity(s, act, res, api) {
    let id = typeof act === 'string' ? act : act?.id;
    let L = api;
    if (!isApi(api) && act && typeof act === 'object' && 'result' in act) { res = act.result; id = act.id; L = null; }
    L = isApi(L) ? L : FALLBACK;
    if (s.chapter !== CH) return;

    if (id === 'grabar') {
      const recs = s.recorded || [];
      const g = recs[recs.length - 1];
      if (!g || g.week !== s.week) return;
      if (!s.flags.ch4_grabo) s.flags.ch4_grabo = s.week;
      if (knownBefore(s, L, 'innovar')) {
        L.applyLesson(s, 'innovar', `Grabaron "${g.title}", su canción grabada número ${recs.length}, en lugar de esperar a que el primer sencillo hiciera todo el trabajo.`);
      }
    } else if (id === 'componer') {
      const song = res?.song || s.songs?.[s.songs.length - 1];
      if (song && knownBefore(s, L, 'innovar')) {
        L.applyLesson(s, 'innovar', `Compusieron "${song.title}": ya tienen ${num(s.songs.length)} canciones propias y una idea nueva para el siguiente sencillo.`);
      }
    }
  },

  afterCard(s, card, opt, api) {
    let L = api;
    if (!isApi(api) && card && typeof card === 'object' && card.card) { opt = card.option; card = card.card; L = null; }
    L = isApi(L) ? L : FALLBACK;
    if (!card || card.chapter !== CH) return;
    const flags = optFlags(opt);

    // riesgo_premio: no apostaron la caja en el video con caballo.
    if (card.id === 'C4-11' && !flags.includes('video_caro') && knownBefore(s, L, 'riesgo_premio')) {
      L.applyLesson(s, 'riesgo_premio', `Antes de gastar casi toda la caja en un video con caballo, se preguntaron qué pasaba si salía mal. En la caja siguen ${money(s.money.caja)}.`);
    }
    // La acústica que pidieron los fans: se guarda la semana para el ctx de cuida_fans.
    if (card.id === 'C4-06' && flags.includes('acustica') && !s.flags.ch4_acustica_semana) {
      s.flags.ch4_acustica_semana = s.week;
      s.flags.ch4_acustica_streams = s.streams || 0;
    }
  },

  afterShow(s, result, api) {
    let r = result;
    let L = api;
    if (!isApi(api) && result && typeof result === 'object' && result.result) { r = result.result; L = null; }
    L = isApi(L) ? L : FALLBACK;
    r = r || s.last;
    if (s.chapter !== CH || !r) return;
    const place = r.venueName || 'el show';

    // cuida_fans: los fans pidieron "¡Otra!" y se la dieron.
    if (r.encore && knownBefore(s, L, 'cuida_fans')) {
      L.applyLesson(s, 'cuida_fans', `En ${place} los fans pidieron "¡Otra!" y se la dieron. Llegaron ${num(r.attendance)} personas y ${num(r.newFans)} se hicieron fans.`);
    }
    // innovar: estrenaron una canción compuesta en este capítulo.
    const since = s.chapterStart?.week ?? 0;
    const fresh = (r.setlist || s.setlist || [])
      .map((id) => (s.songs || []).find((x) => x.id === id))
      .find((x) => x && x.week >= since);
    if (fresh && knownBefore(s, L, 'innovar')) {
      L.applyLesson(s, 'innovar', `En ${place} estrenaron "${fresh.title}" en lugar de tocar lo mismo de siempre, y llegaron ${num(r.newFans)} fans nuevos.`);
    }
  },

  afterWeek(s, api) {
    const L = isApi(api) ? api : FALLBACK;
    if (!inChapterAtClose(s)) return;
    const streams = s.streams || 0;

    // cuida_fans: se oye cuando cruzan las 100 mil, después de escuchar a los fans (tropiezo y acústica).
    if (streams >= GOAL_STREAMS && L.level(s, 'cuida_fans') === 0
      && (seen(s, 'ch4-tropiezo') || s.flags.acustica || s.chapter !== CH)) {
      const desde = s.flags.ch4_acustica_streams;
      L.discover(s, 'cuida_fans', s.flags.acustica
        ? `Grabaron la acústica de "${firstSong(s)}" que pidieron los fans en la fila de firmas${desde != null ? `, cuando iban en ${num(desde)} reproducciones` : ''}. Iker y su club se la pusieron a sus primos, a sus maestras y al chofer del camión de la escuela: ya van ${num(streams)}.`
        : seen(s, 'ch4-tropiezo')
          ? `Aunque ${(s.recorded || []).length >= 2 ? 'el segundo sencillo' : 'el video de la canción nueva'} no pegó, siguieron quedándose a firmar después de cada show, y los fans les pasaron su música a todos sus conocidos: ya van ${num(streams)} reproducciones.`
          : `Desde que llegó Iker se quedan a firmar y platicar después de cada show, y los fans les pasaron su música a todos sus conocidos: ya van ${num(streams)} reproducciones.`);
    }

    // riesgo_premio: respaldo si la decisión se tomó fuera de la carta C4-02.
    if (s.label && L.level(s, 'riesgo_premio') === 0) {
      const Ld = LABELS[s.label] || LABELS.disquera;
      const adv = s.labelDeal?.advance || Ld.advance;
      L.discover(s, 'riesgo_premio', s.label !== 'indie'
        ? `Firmaron con Discos Galaxia: un adelanto de ${money(adv)} hoy, pero de cada $100 de regalías a ustedes les tocan $${Math.round(Ld.share * 100)} hasta que la disquera lo recupere.`
        : `Decidieron seguir independientes: se quedan con todas sus regalías (${money(s.royalties)} hasta hoy), pero sin la promoción de la disquera.`);
    } else if (s.label && knownBefore(s, L, 'riesgo_premio')) {
      const deal = s.labelDeal;
      if (s.label !== 'indie' && deal && deal.recouped >= deal.advance && !s.flags.ch4_adelanto_recuperado) {
        s.flags.ch4_adelanto_recuperado = s.week;
        L.applyLesson(s, 'riesgo_premio', `La disquera ya recuperó los ${money(deal.advance)} del adelanto con ${num(streams)} reproducciones. Desde ahora les toca un pedazo más grande de cada una.`);
      } else if (s.label === 'indie' && (s.royalties || 0) >= 10000 && !s.flags.ch4_regalias_10mil) {
        s.flags.ch4_regalias_10mil = s.week;
        L.applyLesson(s, 'riesgo_premio', `Siendo independientes ya juntaron ${money(s.royalties)} de regalías, completitas para la banda. Crecieron más despacio, pero cada reproducción es suya.`);
      }
    }

    // cuentas_claras: no se aplica sola con las regalías. Cuenta cuando ELLA reparte: una semana con regalías en la que
    // decidió en las alcancías cuánto va al ahorro y cuánto a Papá, con la regla que eligieron en C4-01 (o en C4-12).
    // El motor cuenta como mucho una aplicación cada 5 días, así que dominarla toma varias semanas.
    const roy = weekRoyalties(s);
    const w = api?.close?.week || {};
    const split = (w.saved || 0) > 0 || (w.paid || 0) > 0;
    if (roy > 0 && split && (s.flags.acuerdo_firmado || s.flags.reparto_parejo) && knownBefore(s, L, 'cuentas_claras')) {
      const how = `${w.saved ? `${money(w.saved)} al ahorro` : ''}${w.saved && w.paid ? ' y ' : ''}${w.paid ? `${money(w.paid)} para Papá` : ''}`;
      L.applyLesson(s, 'cuentas_claras', s.flags.acuerdo_firmado
        ? `Esta semana entraron ${money(roy)} de regalías y tú repartiste: ${how}, con el acuerdo que firmaron. Nadie tuvo que discutir.`
        : `Esta semana entraron ${money(roy)} de regalías y tú repartiste: ${how}, parejo, como quedaron. Nadie tuvo que discutir.`);
    }
  },
};
