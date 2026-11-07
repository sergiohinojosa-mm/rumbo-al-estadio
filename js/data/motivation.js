// Mensajes que reconocen su progreso (HISTORIA_TMP §5, secciones A a K), como plantillas con datos de SU partida.
// Quién las usa: engine/explain.js elige el 📒 del cierre (A, C, D, J), los comentarios de fans (H, I) y el adelanto
// de la próxima semana (K). B (después de ensayar), E (descanso), F (hito) y G (regreso) quedan para las pantallas.
// Los textos que dependen de quién está en la banda (por candidato) viven aquí, no en explain.js.
//
// Reglas (§5): solo contra ella misma; solo datos que ya existen (si el dato falta, `when` da false); reconoce lo que
// hizo, no lo que "es"; una idea por mensaje y máximo dos por cierre; si algo bajó, el mensaje busca una ventana más
// larga o un dato de esfuerzo; sin repetir el mismo molde 3 semanas seguidas (eso lo cuida el motor con s.motivLog).
// Papá solo lee datos de su libreta ("Apunto: …"), sin frases nuevas.
//
// Cada plantilla: { id, kind, who, when: (s, h) => bool, text: (s, h) => string, score?: (s, h) => number }
//   kind   'A' cierre después del show · 'B' después de ensayar · 'C' dinero y promesas · 'D' semana difícil
//          'E' la banda se toma un descanso · 'F' hito "Así empezó / Así va" · 'G' regresa después de unos días
//          'H' comentarios de fans que notan su progreso · 'I' comentarios con humor · 'J' algo visible cada semana
//          'K' adelanto de la próxima semana
//   who    'libreta' (📒 tarjeta "Así vas"), 'papa', 'nina', 'teclas', 'bateria', 'juju', 'alma', 'iker', 'fan'
//   h      = facts(s, extra): los números que usan las plantillas (abajo). extra = lo que el motor sabe en ese momento,
//          por ejemplo { accuracy } del ensayo de hoy o { week } del cierre (paid, saved…).
// El texto puede llevar {nombre}, {banda}, {hermana}, {cancion1}, {teclas}, {bateria}, {bajo}: el motor los llena.
import { money, plural, num } from '../util.js';
import { chapterOf } from './chapters.js';
import { VENUES, enOf, aLugar } from './venues.js';

const N = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
// Precisión sin porcentajes (ella tiene 9 años): 0.78 → "8 de cada 10 notas".
const de10 = (v) => Math.round(clamp01(v) * 10);
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
const notas10 = (v) => `${de10(v)} de cada 10 notas`;
const has = (...vals) => vals.every((v) => v !== null && v !== undefined);

// ——— Los datos que necesitan las plantillas (§5: "Variables que necesita el juego") ———
export function facts(s, extra = {}) {
  const hist = s.history || [];
  const lastShow = hist[hist.length - 1] || null;
  const prevShow = hist[hist.length - 2] || null;
  const showToday = s.last && s.last.week === s.week ? s.last : null;
  const fansGoal = chapterOf(s).goals.find((g) => g.id === 'fans');
  const plan = s.week$?.plan || [];
  const rehearsalToday = [...plan].reverse().find((p) => p.id === 'ensayar');
  const ahorroLog = s.flags?.ahorroLog || [];
  const lessons = Object.values(s.lessons || {}).filter((l) => (l?.level || 0) > 0).length;
  const firstPay = s.flags?.firstPayWeek;
  const weeksPaying = firstPay != null ? Math.max(1, s.week - firstPay + 1) : null;
  const perWeek = weeksPaying ? (s.money.pagado / weeksPaying) : null;
  const recordWeek = s.records?.bestNewFans ? hist.find((h) => h.newFans === s.records.bestNewFans) : null;
  const beforeRecord = recordWeek ? hist[hist.indexOf(recordWeek) - 1] : null;
  const beforeBefore = recordWeek ? hist[hist.indexOf(recordWeek) - 2] : null;
  const old4 = hist.length >= 5 ? hist[hist.length - 5] : null;
  const nextVenue = VENUES.find((v) => v.chapter >= s.chapter && !hist.some((h) => h.venue === v.id) && v.chapter <= s.chapter + 1);

  return {
    semana: s.week,
    capitulo: s.chapter,
    semanas_desde_cochera: N(s.flags?.weekCochera) != null ? s.week - s.flags.weekCochera : null,
    publico_hoy: showToday ? showToday.attendance : null,
    cupo_hoy: showToday ? showToday.cap : null,
    lugar_hoy: showToday ? enOf(showToday.venue, showToday.venueName) : null,
    fans: s.m.fans,
    fans_inicio_cap: N(s.chapterStart?.fans),
    faltan_meta: fansGoal ? Math.max(0, fansGoal.need - s.m.fans) : null,
    meta_fans: fansGoal ? fansGoal.need : null,
    fans_semana: showToday ? showToday.newFans : null,
    record: showToday?.recordFans || null,            // { newFans, week, venueName } del récord anterior
    precision_primera: N(s.flags?.firstRehearsalAcc) ?? N(s.firsts?.accuracy),
    precision_hoy: N(extra.accuracy) ?? N(rehearsalToday?.accuracy),
    record_precision: N(s.records?.bestAccuracy) || null,
    ensayos_total: s.stats?.rehearsals || 0,
    canciones: (s.songs || []).length,
    canciones_en_rechazo: N(s.flags?.rocioSongs),
    primer_sombrero: N(s.firsts?.hat),
    semana_primer_sombrero: N(s.firsts?.hatWeek),
    reparto_hoy: showToday && showToday.payType === 'hat' ? showToday.earned : null,
    pagado_papa: s.money.pagado,
    falta_papa: s.money.deuda,
    pagado_hoy: N(extra.week?.paid),
    semanas_para_pagar: perWeek && perWeek > 0 && s.money.deuda > 0 ? Math.ceil(s.money.deuda / perWeek) : null,
    ahorro: s.money.ahorro,
    ahorro_hace4: ahorroLog.length >= 5 ? ahorroLog[ahorroLog.length - 5] : null,
    lecciones: lessons,
    talento: s.m.talent,
    shows_total: s.stats?.shows || 0,
    publico_primer_cachito: N(s.firsts?.attendanceForo),
    integrantes: (s.members || []).filter((m) => typeof m === 'string').length,
    semana_cafe: N(s.flags?.cafeWeek),
    lugar_ultimo: lastShow ? enOf(lastShow.venue, lastShow.venueName) : null,
    publico_ultimo: lastShow ? lastShow.attendance : null,
    semana_regreso: N(extra.rewindWeek) ?? N(s.flags?.rewoundAt),
    lugar_siguiente: nextVenue ? (nextVenue.en || nextVenue.name) : null,
    semana_record: recordWeek?.week ?? null,
    lugar_record: recordWeek?.venueName ?? null,
    // Semana difícil: llegó menos gente que la vez pasada.
    bajo_publico: !!(showToday && prevShow && lastShow === hist[hist.length - 1] && showToday.attendance < prevShow.attendance),
    // ¿Antes de su récord también le había bajado? (solo se dice si es cierto)
    bajo_antes_record: !!(beforeRecord && beforeBefore && beforeRecord.attendance < beforeBefore.attendance),
    fans_hace4: old4 ? old4.fansAfter : null,
    ensayo_hoy: plan.some((p) => p.id === 'ensayar'),
    tocaron_kermes: hist.some((h) => h.venue === 'kermes'),
  };
}

// ——— Plantillas ———
export const MOTIVATION = [
  // A. Cierre de semana, después del show
  { id: 'a_sillas', kind: 'A', who: 'libreta',
    when: (s, h) => s.chapter >= 1 && has(h.semanas_desde_cochera, h.publico_hoy) && h.semanas_desde_cochera >= 2 && h.publico_hoy > 3,
    // Tres moldes que rotan con la semana, para que "3 sillas" no se gaste.
    text: (s, h) => [
      `Hace ${plural(h.semanas_desde_cochera, 'semana', 'semanas')} tocaban para 3 sillas, y una era Señor Brillitos. Hoy vinieron ${num(h.publico_hoy)} personas.`,
      `Hace ${plural(h.semanas_desde_cochera, 'semana', 'semanas')} tocaban para 3 sillas. Hoy vinieron ${num(h.publico_hoy)}. Señor Brillitos no lo puede creer.`,
      `Hoy vinieron ${num(h.publico_hoy)} personas. En la cochera caben 18, y eso apretaditos.`,
    ][s.week % 3] },
  { id: 'a_capitulo', kind: 'A', who: 'libreta',
    when: (s, h) => has(h.fans_inicio_cap, h.faltan_meta) && h.fans > h.fans_inicio_cap && h.faltan_meta > 0 && (s.weekInChapter || 1) >= 2,
    text: (s, h) => `Empezaste este capítulo con ${plural(h.fans_inicio_cap, 'fan', 'fans')}. Hoy tienes ${num(h.fans)}. ${h.faltan_meta === 1 ? 'Te falta 1' : `Te faltan ${num(h.faltan_meta)}`} para la meta.` },
  { id: 'a_record', kind: 'A', who: 'libreta',
    when: (s, h) => !!h.record && has(h.fans_semana),
    text: (s, h) => `¡Récord nuevo! Tu mejor show era +${num(h.record.newFans)} fans (semana ${h.record.week}, ${h.record.venueName}). Hoy: +${num(h.fans_semana)}.` },
  { id: 'a_sombrero', kind: 'A', who: 'libreta',
    when: (s, h) => has(h.primer_sombrero, h.reparto_hoy) && h.semana_primer_sombrero < s.week && h.reparto_hoy > h.primer_sombrero * 1.3,
    text: (s, h) => `La primera vez que pasaron el sombrero juntaron ${money(h.primer_sombrero)}. Hoy juntaron ${money(h.reparto_hoy)}.` },
  { id: 'a_canciones', kind: 'A', who: 'libreta',
    when: (s, h) => has(h.canciones_en_rechazo) && h.canciones > h.canciones_en_rechazo,
    text: (s, h) => `Cuando Doña Rocío dijo que no, tenían ${plural(h.canciones_en_rechazo, 'canción propia', 'canciones propias')}. Hoy tienen ${h.canciones}.` },
  { id: 'a_precio', kind: 'A', who: 'libreta',
    when: (s, h) => !!s.flags?.noche_canciones && !s.flags?.precio_bajo && s.last?.venue === 'foro' && has(h.publico_hoy),
    text: (s, h) => `Mantuviste el boleto aunque Pulpo Neón lo bajó, y vinieron ${num(h.publico_hoy)}. Vinieron por ustedes.` },
  { id: 'a_nina_letra', kind: 'A', who: 'nina',
    when: (s, h) => s.chapter >= 2 && h.tocaron_kermes && (s.last?.accuracy || 0) >= 0.8,
    text: (s, h) => `Semana ${h.semana}. ¿Te acuerdas de que en la kermés se me olvidó la letra? Hoy no la tenía escrita en la mano. Ni una palabra.` },
  { id: 'a_grafica', kind: 'A', who: 'teclas',
    when: (s, h) => s.chapter >= 2 && !!s.roles?.teclas && h.shows_total >= 6,
    text: (s, h) => `Llevamos ${h.shows_total} shows. La línea de la gráfica va para arriba. La dibujé con plumón verde, que es el de las buenas noticias.` },
  { id: 'a_streams', kind: 'A', who: 'libreta',
    when: (s, h) => (s.streamsWeek || 0) > 0 && has(s.flags?.firstStreamWeek) && s.week - s.flags.firstStreamWeek >= 2,
    text: (s) => `La semana pasada sus canciones sonaron ${num(s.streamsWeek)}${s.streamsWeek >= 1e6 ? ' de' : ''} veces. Hace ${plural(s.week - s.flags.firstStreamWeek, 'semana', 'semanas')} eran cero.` },

  // B. Después de ensayar
  { id: 'b_precision', kind: 'B', who: 'libreta',
    when: (s, h) => has(h.precision_primera, h.precision_hoy) && h.ensayos_total >= 2 && de10(h.precision_hoy) > de10(h.precision_primera),
    text: (s, h) => `En tu primer ensayo te salían ${notas10(h.precision_primera)}. Hoy: ${de10(h.precision_hoy)} de cada 10. Esos dedos ya se saben el camino.` },
  { id: 'b_ensayos', kind: 'B', who: 'libreta',
    when: (s, h) => h.ensayos_total >= 5,
    text: (s, h) => `Llevas ${h.ensayos_total} ensayos. El riff que tocabas a la mitad de velocidad ahora lo tocas completo.` },
  { id: 'b_dia_bajo', kind: 'B', who: 'libreta',
    when: (s, h) => has(h.precision_hoy, h.record_precision) && de10(h.precision_hoy) < de10(h.record_precision),
    text: (s, h) => `Hoy te salieron ${notas10(h.precision_hoy)}. Tu récord es ${de10(h.record_precision)} de cada 10, y antes de ese récord también hubo días así. Tu talento subió igual: ya va en ${h.talento}.` },
  { id: 'b_ritmo', kind: 'B', who: 'bateria',
    when: (s, h) => !!s.roles?.bateria && has(h.precision_hoy) && h.precision_hoy >= 0.8,
    text: () => 'Hoy no te aceleraste ni una vez. Bueno, una. Pero chiquita.' },

  // C. Dinero y promesas
  { id: 'c_pagado', kind: 'C', who: 'papa',
    when: (s, h) => h.pagado_papa > 0 && h.falta_papa > 0 && has(s.flags?.firstPayWeek) && s.flags.firstPayWeek < s.week,
    text: (s, h) => `Apunto. Me han pagado ${money(h.pagado_papa)} de $5,000. Hace ${plural(s.week - s.flags.firstPayWeek, 'semana', 'semanas')} era cero.` },
  { id: 'c_falta', kind: 'C', who: 'papa',
    when: (s, h) => has(h.semanas_para_pagar) && h.semanas_para_pagar <= 20,
    // Sin cuenta regresiva (el préstamo no tiene fecha límite): solo el dato de la libreta.
    text: (s, h) => `Apunto: faltan ${money(h.falta_papa)}. Cada pago lleva su flechita verde.` },
  { id: 'c_ahorro', kind: 'C', who: 'libreta',
    when: (s, h) => has(h.ahorro_hace4) && h.ahorro > h.ahorro_hace4 + 200,
    text: (s, h) => `El ahorro va en ${money(h.ahorro)}. Hace cuatro semanas iba en ${money(h.ahorro_hace4)}.` },
  { id: 'c_completo', kind: 'C', who: 'libreta',
    when: (s, h) => h.falta_papa === 0 && h.pagado_papa >= 5000 && !s.flags?.motivPagado,
    text: () => 'Pagaste los $5,000 completos. El pagaré con mermelada ya tiene su sticker de PAGADO.' },

  // D. Semana difícil (bajó el público, el ánimo o la caja)
  { id: 'd_antes_record', kind: 'D', who: 'libreta',
    when: (s, h) => h.bajo_publico && h.bajo_antes_record && has(h.semana_record),
    text: (s, h) => `Hoy llegaron menos que la semana pasada. Antes de su mejor show, en la semana ${h.semana_record}, también les había pasado.` },
  { id: 'd_cuatro', kind: 'D', who: 'libreta',
    when: (s, h) => h.bajo_publico && has(h.fans_hace4) && h.fans > h.fans_hace4,
    text: (s, h) => `Esta semana no fue la mejor, pero en las últimas cuatro semanas pasaste de ${num(h.fans_hace4)} a ${num(h.fans)} fans.` },
  { id: 'd_talento', kind: 'D', who: 'libreta',
    when: (s, h) => h.bajo_publico && h.ensayo_hoy,
    text: (s, h) => `Llegaron menos que la semana pasada, pero ensayaste: tu talento ya va en ${h.talento}. Eso no se va a ningún lado.` },
  { id: 'd_juju', kind: 'D', who: 'juju',
    when: (s, h) => h.bajo_publico,
    text: () => '¡Yo sí vine! Y Señor Brillitos también. Somos dos. Bueno, uno y medio.' },
  { id: 'd_abuela', kind: 'D', who: 'alma',
    when: () => true,
    text: () => 'A ver, cuéntame qué salió bien. Algo salió bien. Siempre sale algo bien.' },

  // E. La banda se toma un descanso (los globos están en la escena de pausa; aquí, los 📒 con datos)
  { id: 'e_no_se_borra', kind: 'E', who: 'libreta',
    when: () => true,
    text: (s, h) => `Esto no se borra: ${plural(h.canciones, 'canción', 'canciones')}, ${plural(h.lecciones, 'lección', 'lecciones')}, tus logros, tu diario${h.record_precision ? `, tu récord de ${notas10(h.record_precision)}` : ''} y ${plural(h.fans, 'fan que sigue', 'fans que siguen')} ahí.` },
  { id: 'e_regreso', kind: 'E', who: 'libreta',
    when: (s, h) => has(h.semana_regreso),
    text: (s, h) => `La banda regresa a la semana ${h.semana_regreso} para intentarlo de otra forma.` },
  { id: 'e_reintento', kind: 'E', who: 'libreta',
    when: (s, h) => (s.stats?.pauses || 0) >= 1 && h.lecciones > 0,
    text: (s, h) => `Esta vez empiezas con ${plural(h.lecciones, 'lección', 'lecciones')} que la primera vez no tenías.` },

  // F. Hito de capítulo: "Así empezó / Así va"
  { id: 'f_prologo', kind: 'F', who: 'libreta', chapter: 0,
    when: (s, h) => has(h.precision_primera),
    text: (s, h) => `Primer ensayo: ${notas10(h.precision_primera)}. ${h.record_precision ? `Hoy: ${de10(h.record_precision)} de cada 10. ` : ''}Público: 3 sillas. ${h.canciones === 1 ? 'Canción' : 'Canciones'}: ${h.canciones}. ¡Nació {banda}!` },
  { id: 'f_cap1', kind: 'F', who: 'libreta', chapter: 1,
    when: (s, h) => has(h.fans_inicio_cap),
    text: (s, h) => `Primera semana: ${plural(h.fans_inicio_cap, 'fan', 'fans')}. Hoy: ${num(h.fans)}. Canciones: ${h.canciones}. Integrantes: de 2 a ${h.integrantes}.` },
  { id: 'f_cap2', kind: 'F', who: 'libreta', chapter: 2,
    when: (s, h) => has(h.publico_primer_cachito),
    // "Hoy: AGOTADO" solo cuando ya se llenó; antes, su mejor noche ahí (QA ronda 3: textos fuera de tiempo).
    text: (s, h) => `Primer show en el Foro Cachito: ${h.publico_primer_cachito} de 150. ${s.flags?.soldOut_foro ? 'Hoy: AGOTADO.' : `Su mejor noche ahí: ${Math.max(0, ...(s.history || []).filter((x) => x.venue === 'foro').map((x) => x.attendance))} de 150.`} A Papá ya le pagaron ${money(h.pagado_papa)}.` },
  { id: 'f_molde', kind: 'F', who: 'libreta', chapter: 'any',
    when: (s, h) => s.chapter >= 3 && has(h.fans_inicio_cap),
    text: (s, h) => `Así empezó este capítulo: ${plural(h.fans_inicio_cap, 'fan', 'fans')}. Así va: ${num(h.fans)}${s.streams ? ` y ${num(s.streams)} reproducciones` : ''}.` },
  { id: 'f_final', kind: 'F', who: 'libreta', chapter: 7,
    when: (s) => !!s.flags?.soldOut_estadio,
    text: () => 'Semana 1: 3 sillas. Hoy: estadio lleno.' },

  // G. Cuando regresa después de unos días sin jugar (sin culpa ni "te extrañamos")
  { id: 'g_juju', kind: 'G', who: 'juju',
    when: () => true,
    text: () => '¡Ya llegaste! Te guardé tu lugar en la cochera.' },
  { id: 'g_ultima', kind: 'G', who: 'libreta',
    when: (s, h) => has(h.lugar_ultimo, h.publico_ultimo),
    text: (s, h) => `La última vez tocaron en ${h.lugar_ultimo} y llegaron ${plural(h.publico_ultimo, 'persona', 'personas')}. Sigue la semana ${h.semana}.` },

  // H. Comentarios de fans que notan su progreso (llegan a la cuenta de la banda; Papá se los lee)
  { id: 'h_cafe', kind: 'H', who: 'fan',
    when: (s, h) => has(h.semana_cafe) && s.chapter >= 2 && !!h.lugar_hoy && s.last?.venue !== 'cafe',
    text: (s, h) => `Fui al café en la semana ${h.semana_cafe} y hoy ${aLugar(h.lugar_hoy)}. ¡Cómo han cambiado!` },
  // Iker cambia de frase con la banda (y explain.fanComments no repite un comentario más de 2 veces por partida).
  { id: 'h_iker', kind: 'H', who: 'iker',
    when: (s, h) => s.chapter >= 2 && s.chapter <= 3 && h.shows_total >= 3,
    text: (s, h) => (s.chapter === 2 ? `Llevo ${h.shows_total} shows. Hoy fue el mejor. Bueno, eso dije la vez pasada. Pero hoy sí.` : `Llevo ${h.shows_total} shows. Ya me sé hasta los errores.`) },
  { id: 'h_iker_gira', kind: 'H', who: 'iker',
    when: (s, h) => s.chapter >= 5 && s.chapter <= 6 && (s.citiesPlayed || []).length >= 1,
    text: (s, h) => `Llevo ${plural(h.shows_total, 'show', 'shows')} y ${plural(s.citiesPlayed.length, 'ciudad', 'ciudades')}. Mi mamá dice que ya soy de la banda.` },
  { id: 'h_iker_final', kind: 'H', who: 'iker',
    when: (s, h) => s.chapter >= 7 && h.shows_total >= 3,
    text: (s, h) => `Llevo ${h.shows_total} shows. Hoy fue el mejor. Esta vez sí, de verdad, lo juro.` },
  { id: 'h_dia1', kind: 'H', who: 'fan',
    when: (s) => !!s.flags?.video_dia1 && s.chapter >= 1,
    text: () => 'Vi el video del Día 1 y luego el de hoy. ¿Son la misma banda? 😱' },
  { id: 'h_error', kind: 'H', who: 'fan',
    when: (s) => !!s.last && s.last.accuracy < 0.75,
    text: () => 'La guitarrista se equivocó y siguió como si nada. Ídola.' },
  { id: 'h_licuadora', kind: 'H', who: 'fan',
    when: (s) => !!s.flags?.licuadora,
    text: () => 'Ya no se oye la licuadora en mi cabeza. Mentira, sí. Tóquenla.' },
  { id: 'h_integrantes', kind: 'H', who: 'fan',
    when: (s, h) => h.integrantes >= 3,
    text: (s, h) => `La primera vez que los vi eran dos. Ahora son ${h.integrantes}. ¿Cuántos van a ser? ¿Veinte?` },

  // I. Comentarios con humor (cualquier semana; por capítulo)
  ...[
    '¿Dónde compro el pastel de Don Beto y la banda en combo?',
    'Mi abuelita bailó. Mi abuelita NO baila.',
    '10 de 10, pero Juju se llevó el show.',
    'Fui por un café y salí fan.',
    '¿El unicornio es de la banda?',
  ].map((t, i) => ({ id: `i_c1_${i + 1}`, kind: 'I', who: 'fan', when: (s) => s.chapter === 1, text: () => t })),
  { id: 'i_c2_tambo', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.bateria === 'tambo',
    text: () => 'El baterista se comió una torta entre canción y canción y no perdió el ritmo.' },
  { id: 'i_c2_vale', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.bateria === 'vale',
    text: () => 'La baterista hizo girar la baqueta y la atrapó. Yo la vi. Nadie me cree.' },
  { id: 'i_c2_emilio', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.bateria === 'emilio',
    text: () => 'El baterista trae un pingüino que hace clic. Necesito ese pingüino en mi vida.' },
  { id: 'i_c2_romi', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.teclas === 'romi',
    text: () => 'La del teclado hizo sonido de pato. Necesito ese pato en mi vida.' },
  { id: 'i_c2_luz', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.teclas === 'luz',
    text: () => 'La del teclado hace unos coros que me dieron escalofríos. De los buenos.' },
  { id: 'i_c2_santi', kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && s.roles?.teclas === 'santi',
    text: () => 'El tecladista más chiquito del mundo tocó parado de puntitas. 10 de 10.' },
  ...[
    ['Juju es la mejor de todos (perdón, banda).'],
    ['¿Ya sacaron la de la licuadora? ¿No? ¿Por qué?', (s) => !!s.flags?.licuadora],
    ['Iker, ¿cómo te sabes la nueva si no ha salido?'],
  ].map(([t, cond], i) => ({ id: `i_c2_${i + 1}`, kind: 'I', who: 'fan', when: (s) => s.chapter === 2 && (!cond || cond(s)), text: () => t })),
  // Cuántos "Jujus" había: el público de esta noche, no un número fijo (salía "600" en un lugar de 1,000).
  { id: 'i_c3_1', kind: 'I', who: 'fan', when: (s) => s.chapter >= 4 && (s.last?.attendance || 0) >= 100,
    text: (s) => `Juju gritó ¡YA! y yo también. Somos ${num(s.last.attendance)} Jujus.` },
  ...[
    'Vi a alguien tocando pepinos en el súper. ¿Era {bateria}? Era {bateria}.',
    'La Burra es mi camioneta favorita y nunca me he subido.',
    'El unicornio tiene gafete de ACCESO TOTAL y yo no. Exijo justicia.',
    'Vi el video del Día 1 y hoy vine a verlos. Las sillas de la cochera se veían más cómodas.',
  ].map((t, i) => ({ id: `i_c3_${i + 2}`, kind: 'I', who: 'fan',
    when: (s) => s.chapter >= [4, 5, 6, 7][i], text: () => t })),

  // J. Algo visible cada semana (lo que cambia en la cochera y en el mapa)
  { id: 'j_pared', kind: 'J', who: 'libreta',
    when: (s, h) => h.shows_total >= 1,
    text: (s, h) => `La foto de la noche, de {hermana}, ya cuelga en la pared de la cochera. ${h.shows_total === 1 ? 'Es la primera' : `Van ${num(h.shows_total)} fotos`}.` },
  { id: 'j_letrero', kind: 'J', who: 'juju',
    when: (s, h) => h.shows_total >= 1,
    text: (s, h) => `Mi letrero ya tiene ${plural(h.shows_total, 'estampa', 'estampas')}. Una por cada show.` },
  { id: 'j_grafica_sube', kind: 'J', who: 'teclas',
    when: (s, h) => !!s.roles?.teclas && has(h.fans_semana) && h.fans_semana > 0,
    text: () => 'Un punto más en la gráfica. De plumón verde: subimos.' },
  { id: 'j_grafica_baja', kind: 'J', who: 'teclas',
    when: (s, h) => !!s.roles?.teclas && h.bajo_publico,
    text: () => 'Hoy el punto de la gráfica va abajito. Le dibujé una carita que dice "ya subirá".' },
  { id: 'j_mapa', kind: 'J', who: 'libreta',
    when: (s, h) => has(h.lugar_siguiente),
    text: (s, h) => `En el mapa, {banda} avanza un pasito: ${plural(h.fans, 'fan', 'fans')} y el siguiente puntito es ${h.lugar_siguiente}.` },

  // K. Adelanto de la próxima semana (curiosidad, sin fechas ni presión)
  { id: 'k_beto', kind: 'K', who: 'libreta',
    when: (s) => s.chapter === 1 && !(s.seenCards || []).includes('c1_pastel') && !(s.history || []).some((x) => x.venue === 'cafe'),
    text: () => 'La próxima semana: Don Beto quiere hablar con ustedes. Dice que trae pastel.' },
  { id: 'k_romi', kind: 'K', who: 'teclas', when: (s) => s.roles?.teclas === 'romi',
    text: () => 'Tengo un sonido nuevo. No les voy a decir cuál. (Es un pato.)' },
  { id: 'k_luz', kind: 'K', who: 'teclas', when: (s) => s.roles?.teclas === 'luz',
    text: () => 'Tengo una melodía nueva en mi grabadora. Todavía no la escucha nadie. Ni yo dos veces.' },
  { id: 'k_santi', kind: 'K', who: 'teclas', when: (s) => s.roles?.teclas === 'santi',
    text: () => 'Mi mamá dice que el sábado me deja quedarme hasta las ocho y media. ¡Media hora más de show!' },
  // El letrero secreto de Juju crece con la banda y se revela en el Final (cierra con la escena c7_letrero).
  { id: 'k_juju', kind: 'K', who: 'juju', when: (s) => s.chapter <= 2,
    text: () => 'Estoy haciendo un letrero nuevo. Es secreto. Es enorme.' },
  { id: 'k_juju_3', kind: 'K', who: 'juju', when: (s) => s.chapter >= 3 && s.chapter <= 4,
    text: () => 'El letrero secreto ya tiene diamantina. Señor Brillitos lo está cuidando.' },
  { id: 'k_juju_5', kind: 'K', who: 'juju', when: (s) => s.chapter >= 5 && s.chapter <= 6,
    text: () => 'El letrero secreto no cabe en La Burra. Lo voy a doblar en cuatro.' },
  // Solo antes de que el letrero salga en la pantalla gigante (c7_letrero): después ya no es secreto ni adelanto.
  { id: 'k_juju_7', kind: 'K', who: 'juju', when: (s) => s.chapter >= 7 && !s.flags?.ended && !(s.seenScenes || []).includes('c7_letrero'),
    text: () => 'El letrero secreto ya está listo. No se lo enseño a nadie hasta que se llene el estadio.' },
  { id: 'k_mapa', kind: 'K', who: 'libreta', when: (s, h) => has(h.lugar_siguiente),
    text: (s, h) => `En el mapa, el siguiente puntito: ${h.lugar_siguiente}.` },
  { id: 'k_tambo', kind: 'K', who: 'bateria', when: (s) => s.roles?.bateria === 'tambo',
    text: () => 'La próxima semana traigo tortas. Y la cubeta. Por si acaso.' },
  { id: 'k_vale', kind: 'K', who: 'bateria', when: (s) => s.roles?.bateria === 'vale',
    text: () => 'La próxima semana llego a tiempo. Ya le dije a mi entrenadora. Bueno, casi a tiempo.' },
  { id: 'k_emilio', kind: 'K', who: 'bateria', when: (s) => s.roles?.bateria === 'emilio',
    text: () => 'Le cambié las pilas al pingüino. La próxima semana va a sonar más fuerte. Yo también.' },
  { id: 'k_nina', kind: 'K', who: 'nina', when: (s) => s.chapter <= 3,
    text: () => 'Ya tengo el coro de la siguiente canción. Bueno, la primera palabra.' },
  { id: 'k_nina_4', kind: 'K', who: 'nina', when: (s) => s.chapter >= 4 && s.chapter <= 5,
    text: () => 'Ya tengo dos palabras del coro nuevo. Vamos rapidísimo.' },
  { id: 'k_nina_6', kind: 'K', who: 'nina', when: (s) => s.chapter >= 6,
    text: () => 'Escribí un coro entero en la mano. Me lavé la mano. Lo vuelvo a escribir.' },
];

export const MOTIVATION_BY_ID = Object.fromEntries(MOTIVATION.map((m) => [m.id, m]));

const SPEAKER = { libreta: '📒', papa: 'PAPÁ', nina: 'NINA', teclas: '{TECLAS}', bateria: '{BATERIA}', bajo: '{BAJO}', juju: 'JUJU', alma: 'ABUELA ALMA', iker: 'IKER', fan: '💬' };

// Las plantillas de un tipo que sí tienen datos ahora. Ej.: messages(s, 'A') → [{ id, who, text }, …]
export function messages(s, kind, extra = {}) {
  const h = facts(s, extra);
  const out = [];
  for (const m of MOTIVATION) {
    if (m.kind !== kind) continue;
    if (kind === 'F' && m.chapter !== 'any' && m.chapter !== s.chapter) continue;
    let ok = false;
    try { ok = !!m.when(s, h); } catch { ok = false; }
    if (!ok) continue;
    let text = '';
    try { text = m.text(s, h); } catch { text = ''; }
    if (text && !/undefined|NaN|null/.test(text)) out.push({ id: m.id, kind: m.kind, who: m.who, text });
  }
  return out;
}

// Una línea lista para mostrar, con quién la dice: 📒 "…" · NINA: "…" · 💬 "…"
export function say(msg) {
  const who = SPEAKER[msg.who] || msg.who.toUpperCase();
  return who.length <= 2 ? `${who} ${msg.text}` : `${who}: "${msg.text}"`;
}
