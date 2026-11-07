// Escenas del Capítulo 6 · Palacio de los Deportes (HISTORIA_TMP §3, cap. 6).
// Esquema: { id, chapter, when(s), trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place, beats: [ { who, text } ] }
// Extras opcionales (mismos que story/ch5.js): beat.lesson { discover }, beat.voice, beat.remind, beat.card,
// scene.next (💡 de la lección de la escena), scene.repeat.
// El tropiezo (Nina sin voz) tiene tres versiones según lo que eligió en la carta c6_nina_voz.

import { venueOptions } from '../../engine/show.js';

const ch6 = (s) => s.chapter === 6;
// "Ya les abrieron el Palacio": 25,000 fans y que al precio justo se pueda llenar (show.venueOptions, fillGate).
const palacioOpen = (s) => (s.m?.fans || 0) >= 25000 && venueOptions(s).some((o) => o.venue.id === 'palacio' && o.open);
const seenCard = (s, id) => (s.seenCards || []).includes(id);
const flag = (s, k) => !!s.flags?.[k];
const milestone6 = (s) => s.lastClose?.milestone?.chapter === 6 || (s.chapter === 7 && (s.weekInChapter || 0) <= 1);

const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));

// Tarjeta "Así empezó / Así va" del hito del Palacio: primer show del capítulo contra el Palacio lleno.
export function tarjetaPalacio(s) {
  const shows = (s.history || []).filter((h) => h.chapter === 6);
  const first = shows[0];
  const pal = shows.find((h) => h.venue === 'palacio' && h.soldOut) || shows.find((h) => h.venue === 'palacio');
  const start = s.flags?.c6Inicio;
  const rows = [];
  if (first) rows.push({ icon: '🎪', label: 'Primer foro grande', then: `${first.venueName}: ${fmt(first.attendance)} de ${fmt(first.cap)}`, now: pal ? `Palacio: ${fmt(pal.attendance)} de ${fmt(pal.cap)}` : `${fmt(s.records?.bestAttendance)} en su show más grande` });
  if (start) rows.push({ icon: '▶️', label: 'Reproducciones', then: fmt(start.streams), now: fmt(s.streams) });
  if (start) rows.push({ icon: '⭐', label: 'Fans', then: fmt(start.fans), now: fmt(s.m?.fans) });
  rows.push({ icon: '📱', label: 'Luces', then: 'Un foco pelón en la cochera', now: '24,500 lucecitas de celular' });
  return { title: 'Así empezó el Palacio / Así va', rows };
}

export const TARJETAS = { palacio: tarjetaPalacio };

export const SCENES = [
  // ——— Apertura ———
  {
    id: 'c6_apertura', chapter: 6, trigger: 'start', place: 'viaducto',
    when: (s) => ch6(s),
    beats: [
      { who: 'narrador', text: 'Desde el Viaducto se ve el Palacio de los Deportes: un domo de cobre lleno de escamitas.' },
      { who: 'nina', text: 'Parece un armadillo gigante.' },
      { who: 'papa', text: '24,500 lugares.' },
      { who: 'me', text: '(contando con los dedos) Es como... ¡más de mil cocheras!' },
      { who: 'papa', text: 'Meta: 50,000 fans, AGOTADO aquí y 2 millones de reproducciones. Para algo así se necesita equipo de producción: la gente que pone luces, sonido y pantallas gigantes.' },
    ],
  },

  // ——— Momentos ———
  {
    id: 'c6_camara_letrero', chapter: 6, trigger: 'week', place: 'arena',
    when: (s) => s.chapter >= 6 && seenCard(s, 'c6_hormiguitas'),
    next: '💡 La próxima vez que toques en un lugar grande, busca cómo ver a los de hasta atrás, porque cada fan quiere sentir que tocas para él.',
    beats: [
      { who: 'narrador', text: 'Al día siguiente del foro de prueba, {hermana} se sube hasta la última fila con su cámara.' },
      { who: 'hermana', text: 'Desde aquí ustedes se ven como hormiguitas. Hormiguitas con guitarra.' },
      { who: 'hermana', text: 'En el Palacio nadie te va a ver la cara. Pues que tú les veas la suya: una cámara que busque letreros de fans y los ponga en la pantalla grande.' },
      { who: 'me', text: '¿La cámara del letrero? ¡Juju se va a volver loca!' },
      { who: 'hermana', text: 'Haz que cada fan se sienta visto.', lesson: { discover: 'fan_visto' } },
    ],
  },
  {
    id: 'c6_gafete', chapter: 6, trigger: 'week', place: 'palacio',
    when: (s) => ch6(s) && (s.weekInChapter || 0) >= 2,
    beats: [
      { who: 'juju', text: 'Señor Brillitos necesita su gafete de ACCESO TOTAL.' },
      { who: 'narrador', text: 'Un gafete es la tarjeta que te cuelgas en el cuello para entrar a donde el público no puede.' },
      { who: 'seguridad', text: '(muy serio, con su libreta) Nombre completo del señor.' },
      { who: 'juju', text: 'Señor Brillitos. De apellido, Unicornio.' },
      { who: 'narrador', text: 'El de seguridad le toma foto, imprime el gafete y lo plastifica. Señor Brillitos ahora tiene más acceso que Papá.' },
    ],
  },
  {
    id: 'c6_nervios', chapter: 6, trigger: 'week', place: 'cuarto',
    when: (s) => ch6(s) && palacioOpen(s),
    next: '💡 La próxima vez que sientas nervios, respira despacito y piensa en lo que te emociona, porque los nervios son tus ganas de que salga bien.',
    beats: [
      { who: 'narrador', text: 'Ya les abrieron el Palacio. Esa noche, {nombre} no puede dormir. Cuenta borregos. Luego cuenta lugares: va como en mil.' },
      { who: 'me', text: 'Mamá... ¿y si me equivoco frente a 24,500 personas?' },
      { who: 'mama', text: '(sentada en la orilla de la cama) ¿Sientes cosquillas en la panza? ¿Y el corazón rapidito?' },
      { who: 'mama', text: 'Los nervios son ganas con prisa.', lesson: { discover: 'nervios' } },
      { who: 'me', text: '...Entonces tengo muchísimas ganas.' },
    ],
  },

  // ——— Tropiezo: Nina sin voz (tres versiones, según la carta c6_nina_voz) ———
  {
    id: 'c6_pospuesto', chapter: 6, trigger: 'week', place: 'cochera',
    when: (s) => s.chapter >= 6 && flag(s, 'palacioPospuesto'),
    beats: [
      { who: 'narrador', text: 'Posponen el show: lo cambian a otra fecha. {nombre} está segura de que los fans se van a enojar.' },
      { who: 'narrador', text: 'Graban un video honesto en la cochera. Nina, con bufanda, escribe en un pizarrón porque no puede hablar: "MI VOZ SE FUE DE VACACIONES. REGRESA PRONTO".' },
      { who: 'papa', text: '(leyendo en su celular) "Te esperamos, Nina". "La voz va primero". Y uno de Iker: "Yo ya tengo boleto y no lo suelto".' },
      { who: 'papa', text: 'De 24,500, casi nadie pidió reembolso, o sea, que le devolvieran su dinero. Y la nueva fecha... se vuelve a agotar.' },
      { who: 'juju', text: '(con su letrero) Yo sabía que iban a esperar. Yo también esperé.' },
    ],
  },
  {
    id: 'c6_publico_canta', chapter: 6, trigger: 'week', place: 'palacio',
    when: (s) => s.chapter >= 6 && flag(s, 'palacioCoro'),
    beats: [
      { who: 'narrador', text: 'El día del show, Nina sale al escenario con bufanda y un pizarrón que dice: "HOY CANTAN USTEDES".' },
      { who: 'narrador', text: 'El público canta todas sus partes. Algunos desafinan. No se nota, porque son miles.' },
      { who: 'nina', text: '(escribe en el pizarrón) "GRACIAS. LLORÉ. NO SE NOTA PORQUE TRAIGO BUFANDA".' },
      { who: 'mama', text: 'Y ahora sí, una semana de reposo. Primero agua, luego aplausos.', remind: 'agua_aplausos' },
    ],
  },
  {
    id: 'c6_voz_rota', chapter: 6, trigger: 'week', place: 'cochera',
    when: (s) => s.chapter >= 6 && flag(s, 'palacioForzo'),
    beats: [
      { who: 'narrador', text: 'Nina cantó. A la tercera canción, la voz se le rompió como un globo.' },
      { who: 'nina', text: '(bajito, bajito) Perdón...' },
      { who: 'me', text: 'No hay nada que perdonar. Ahora sí paramos. Primero tú.' },
      { who: 'papa', text: 'El doctor dice dos semanas de reposo. Cambiamos la fecha y le devolvemos su dinero a quien no pueda venir: eso se llama reembolso.' },
      { who: 'narrador', text: 'Graban un video honesto y los fans contestan: "Te esperamos, Nina". La nueva fecha se vuelve a agotar.' },
    ],
  },

  // ——— Hito: 24,500 luces de celular ———
  {
    id: 'c6_hito', chapter: 6, trigger: 'milestone', place: 'palacio',
    when: milestone6,
    beats: [
      { who: 'narrador', text: 'El Palacio, lleno. Las luces se apagan. Con un solo foco, {nombre} toca sola el riff de "{cancion1}", el de la cochera.' },
      { who: 'narrador', text: 'Uno por uno se prenden 24,500 celulares. El domo parece un cielo lleno de lucecitas.' },
      { who: 'nina', text: '¡Buenas noches, armadillo!' },
      { who: 'narrador', text: 'En la pantalla gigante aparece Juju con su letrero: "VAMOS {NOMBRE}", con una letra al revés.' },
      { who: 'tarjeta', text: 'Así empezó el Palacio / Así va', card: 'palacio' },
    ],
  },
  {
    id: 'c6_sobre_dorado', chapter: 6, trigger: 'milestone', place: 'cochera',
    when: milestone6,
    beats: [
      { who: 'mama', text: 'Lona nueva en la fachada del Palacio: los cinco, y en una esquina, el letrero original de Juju.' },
      { who: 'narrador', text: 'Esa semana llega un sobre dorado. Papá lo abre despacito, como si fuera de cristal.' },
      { who: 'papa', text: 'Estadio de la CDMX. Y una nominación al Premio Gramófono de Oro.' },
      { who: 'juju', text: '¿Qué es nominación?' },
      { who: 'papa', text: 'Que a lo mejor.' },
    ],
  },

  // ——— Descanso ———
  {
    id: 'c6_descanso', chapter: 6, trigger: 'pause', place: 'cochera', repeat: true,
    when: (s) => ch6(s) && s.phase === 'pause',
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Hasta las bandas que llenan palacios se cansan, y también regresan.' },
      { who: 'mama', text: 'Descansar también es ensayar. Y hoy toca descansar en grande.', remind: 'descansar' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué semana empezó a bajar? ¿Fue la producción, el precio o el cansancio?' },
      { who: 'juju', text: 'Señor Brillitos y yo los esperamos con el gafete puesto.' },
    ],
  },
];

export default SCENES;
