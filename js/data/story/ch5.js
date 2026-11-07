// Escenas del Capítulo 5 · De gira (HISTORIA_TMP §3, cap. 5).
// Esquema: { id, chapter, when(s), trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place, beats: [ { who, text } ] }
// Extras que puede usar la UI (opcionales):
//   beat.lesson  { discover: id }  la lección nueva se oye en ese globo (triggers/ch5.js la descubre también por si acaso)
//   beat.voice   id del audio de Papá (solo frases aprobadas)   ·   beat.remind  id de una lección que se recuerda
//   beat.card    id de una tarjeta de datos de TARJETAS (abajo): la UI la dibuja con los números de su partida
//   scene.next   el 💡 La próxima vez de la lección de la escena   ·   scene.repeat  la escena puede volver a salir
// `who`: id del elenco, 'me' (la jugadora), 'narrador', 'tarjeta' o un rol ('teclas' | 'bateria' | 'bajo').

const CITIES = ['gdl', 'mty', 'pue'];
const cities = (s) => (s.citiesPlayed || []).filter((c) => CITIES.includes(c));
const hasBass = (s) => !!(s.roles?.bajo || s.flags?.bajo || (s.seenCards || []).includes('c5_audicion_bajo'));
const seenCard = (s, id) => (s.seenCards || []).includes(id);
const seen = (s, id) => (s.seenScenes || []).includes(id);
const ch5 = (s) => s.chapter === 5;
// El hito se celebra cuando closeWeek ya pasó al capítulo 6: se reconoce por lastClose.milestone.
const milestone5 = (s) => s.lastClose?.milestone?.chapter === 5 || (s.chapter === 6 && (s.weekInChapter || 0) <= 1);
const lastShowAt = (s, venue) => s.last?.venue === venue && s.last?.week === s.week;

const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
const people = (n) => `${fmt(n)} ${Math.round(n) === 1 ? 'persona' : 'personas'}`;
const CITY_NAME = { gdl: 'Guadalajara', mty: 'Monterrey', pue: 'Puebla' };

// Tarjeta "Así empezó / Así va" del hito de la gira: primera ciudad contra la tercera, con sus números.
export function tarjetaGira(s) {
  const shows = (s.history || []).filter((h) => CITIES.includes(h.venue));
  const first = shows[0];
  const last = shows[shows.length - 1];
  const start = s.flags?.c5Inicio;
  const rows = [];
  if (first) rows.push({ icon: '📍', label: 'Primera ciudad', then: `${CITY_NAME[first.venue] || first.venueName}: ${people(first.attendance)}`, now: last && last !== first ? `${CITY_NAME[last.venue] || last.venueName}: ${people(last.attendance)}` : '¡Gira completa!' });
  if (start) rows.push({ icon: '⭐', label: 'Fans', then: `${fmt(start.fans)} al salir de la cochera`, now: `${fmt(s.m?.fans)} hoy` });
  rows.push({ icon: '🤝', label: 'Préstamo de Papá', then: '$5,000 en una hoja de cuaderno', now: s.money?.deuda === 0 ? 'PAGADO, con sticker' : `Faltan $${fmt(s.money?.deuda)}` });
  rows.push({ icon: '🎸', label: 'Integrantes', then: '2 en la cochera', now: `${(s.members || []).length} en La Burra` });
  return { title: 'Así empezó la gira / Así va', rows };
}

export const TARJETAS = { gira: tarjetaGira };

export const SCENES = [
  // ——— Apertura ———
  {
    id: 'c5_apertura', chapter: 5, trigger: 'start', place: 'cochera',
    when: (s) => ch5(s),
    beats: [
      { who: 'narrador', text: 'Lunes, seis de la mañana. Afuera de la cochera está La Burra, la camioneta de Don Memo, recién pintada por Mamá con el logo de {banda}.' },
      { who: 'memo', text: 'La Burra no corre, pero llega. Súbanse, que el sol no espera.' },
      { who: 'juju', text: '(con almohada, letrero y Señor Brillitos) Yo junto a la ventana. Señor Brillitos se marea en medio.' },
      { who: 'papa', text: (s) => `Meta de la gira: 20,000 fans, tocar en Guadalajara, Monterrey y Puebla${s.money?.deuda === 0 ? '. El pagaré ya está pagado: esa meta ya la cumplieron' : ', y terminar de pagarme'}. Esta es la hoja de viáticos: lo que cuesta viajar. Gasolina, casetas (lo que se paga por usar la carretera), hotel y comida.` },
      { who: 'teclas', text: 'Ya hice una lista. Y una lista de la lista. Por si se pierde la lista.' },
    ],
  },
  {
    id: 'c5_falta_bajo', chapter: 5, trigger: 'start', place: 'cochera',
    when: (s) => ch5(s) && !hasBass(s),
    beats: [
      { who: 'nina', text: 'Oigan. En los foros grandes nuestras canciones se oyen flaquitas. Como si les faltara algo abajo.' },
      { who: 'bateria', text: 'Les falta bajo. El bajo es lo que hace que el piso tiemble.' },
      { who: 'papa', text: 'Para eso hice audiciones. Llegan hoy a las cinco. Bueno, a las cinco y diez: alguien viene en camión.' },
      { who: 'me', text: '¿Y si ninguno nos queda perfecto?' },
      { who: 'nina', text: 'Nadie nos quedó perfecto nunca. Y mira: aquí estamos.' },
    ],
  },

  // ——— Momentos ———
  {
    id: 'c5_bajo_ensayo', chapter: 5, trigger: 'week', place: 'cochera',
    when: (s) => ch5(s) && hasBass(s),
    beats: [
      { who: 'narrador', text: 'Primer ensayo con {bajo}. A la segunda canción, Juju ya está bailando sin darse cuenta.' },
      { who: 'bajo', text: 'El bajo va pegadito a la batería. Somos como el piso de la casa.' },
      { who: 'bateria', text: 'Y yo soy... ¿las paredes?' },
      { who: 'nina', text: '¡Eso es canción! "Somos el piso de la casa". Ya tengo el coro. Bueno, la primera palabra.' },
    ],
  },
  // ——— El bajista misterioso del cap. 3 (Casa Eco y la última fila de Indie Rocks): era Bruno ———
  // Sale después del primer ensayo con bajo. Una versión si eligió a Bruno y otra si eligió a Paz u Ollin.
  {
    id: 'c5_misterio_bruno', chapter: 5, trigger: 'week', place: 'cochera',
    when: (s) => ch5(s) && seen(s, 'c5_bajo_ensayo') && s.roles?.bajo === 'bruno',
    beats: [
      { who: 'narrador', text: 'Después del ensayo, Bruno guarda su bajo verde limón, el de los stickers de dinosaurios. Pegado por dentro del estuche hay un boleto: "Foro Indie Rocks".' },
      { who: 'nina', text: '¡Eras tú! El de la recepción de Casa Eco. ¡Y el de la última fila en Indie Rocks, moviendo la cabeza!' },
      { who: 'bruno', text: 'Mm. Va.' },
      { who: 'narrador', text: 'Bruno se sabía sus canciones desde antes de que salieran: las oía por la pared del estudio mientras hacía la tarea. Fue él quien le dijo a Inés que a {banda} le faltaba bajo.' },
      { who: 'juju', text: 'Señor Brillitos ya sabía. Pero nadie le preguntó.' },
    ],
  },
  {
    id: 'c5_misterio', chapter: 5, trigger: 'week', place: 'cochera',
    when: (s) => ch5(s) && seen(s, 'c5_bajo_ensayo') && !!s.roles?.bajo && s.roles.bajo !== 'bruno',
    beats: [
      { who: 'narrador', text: 'Un domingo, Inés se asoma a la cochera a saludar. Atrás de ella viene su sobrino Bruno, con un bajo verde limón en la espalda.' },
      { who: 'nina', text: '¡Es él! ¡El de la última fila en Indie Rocks, el que movía la cabeza!' },
      { who: 'ines', text: 'Bruno oía sus canciones por la pared del estudio. Fue él quien me dijo que les faltaba bajo, y yo le pasé el recado a tu papá. Por eso hubo audición.' },
      { who: 'bruno', text: '(a {bajo}, levantando el pulgar) Mm. Tocas bonito. Va.' },
      { who: 'bajo', text: '¿Me enseñas a mover la cabeza así sin perder el ritmo?' },
    ],
  },
  {
    id: 'c5_comida', chapter: 5, trigger: 'week', place: 'restaurante',
    when: (s) => ch5(s) && cities(s).length >= 1,
    beats: [
      { who: 'narrador', text: '{bateria} tiene una misión de gira: calificar la comida de cada ciudad, de 1 a 5 baquetas.' },
      { who: 'bateria', text: 'Torta ahogada: cinco baquetas. Me picó hasta la oreja. Cinco.' },
      { who: 'teclas', text: 'Lo apunto. ¿Y el desayuno del hotel?' },
      { who: 'bateria', text: 'Dos baquetas. El huevo rebotaba.' },
      { who: 'narrador', text: 'Mientras tanto, Juju se queda dormida en cada lobby, tapada con su letrero como si fuera cobija.' },
    ],
  },
  {
    id: 'c5_videollamada', chapter: 5, trigger: 'week', place: 'hotel',
    when: (s) => s.chapter >= 5 && seenCard(s, 'c5_fiebre'),
    next: '💡 La próxima vez que estés lejos y algo salga mal, busca a tu equipo, porque ellos son los que están ahí contigo.',
    beats: [
      { who: 'narrador', text: 'Esa noche nadie tiene sueño. {bateria} sigue con fiebre y todos están preocupados. Mamá trae caldito de pollo.' },
      { who: 'bateria', text: '(con la cuchara en alto) El caldito de su mamá: cinco baquetas. Y una de bonus.' },
      { who: 'alma', text: '(en videollamada, con su chal de colores) A ver, mis amores, acérquense a la pantalla. ¿Quién trajo el caldito? ¿Quién cambió el trapito de la frente? ¿Quién contó chistes?' },
      { who: 'nina', text: 'Todos. Bueno, los chistes fueron de {teclas}. Malísimos. Nos reímos muchísimo.' },
      { who: 'alma', text: 'Lejos de casa, el equipo es tu casa.', lesson: { discover: 'equipo_casa' } },
    ],
  },

  // ——— Tropiezo: se poncha La Burra en Monterrey ———
  {
    id: 'c5_monterrey', chapter: 5, trigger: 'after_show', place: 'estacionamiento',
    when: (s) => lastShowAt(s, 'mty'),
    next: '💡 La próxima vez que algo falle antes de un show, busca dónde están tus fans y toca ahí, porque el escenario es donde estén ellos.',
    beats: [
      { who: 'narrador', text: 'Camino a Monterrey, ¡pum!: se poncha La Burra. Don Memo cambia la llanta en diez minutos, pero llegan una hora tarde.' },
      { who: 'papa', text: 'Ya no hay tiempo para la prueba de sonido. Y la fila de fans lleva una hora afuera, con un calor de horno.' },
      { who: 'narrador', text: '{nombre} se acuerda de la primera cuerda que se le rompió, el día antes de un show. Esa vez casi llora. Hoy no. Saca la guitarra acústica.' },
      { who: 'juju', text: '(sentada en la llanta ponchada) ¡Aquí también hay gente!', lesson: { discover: 'escenario_fans' } },
      { who: 'narrador', text: 'Tocan para la fila en el estacionamiento mientras montan el equipo. Los fans le dicen "el show del estacionamiento", y se vuelve leyenda.' },
    ],
  },

  // ——— El pagaré, PAGADO ———
  {
    id: 'c5_pagado', chapter: 5, trigger: 'week', place: 'cocina',
    when: (s) => s.chapter >= 5 && s.money?.deuda === 0,
    beats: [
      { who: 'narrador', text: (s) => (s.flags?.pagadoSemana && s.flags.pagadoSemana < (s.chapterStart?.week ?? s.week)
        ? `Papá saca el pagaré: la hoja de cuaderno con las huellas de mermelada de Juju. Lo terminaron de pagar en la semana ${s.flags.pagadoSemana}, pero Papá lo guardó para este día.`
        : 'Papá saca el pagaré: la hoja de cuaderno con las huellas de mermelada de Juju. Ya tiene más huellas que letras.') },
      { who: 'papa', text: '(con trompetas de boca, horribles) ¡Tu-ru-ru-ruuu! Ceremonia oficial del último pago. Préstamo de $5,000... PAGADO.' },
      // Si todavía no estaba en el Libro (no salió la carta de la escuela de Juju), aquí la vive: acaba de pagar todo.
      { who: 'papa', text: 'Cumple lo que prometes.', voice: 'cumple', lesson: 'cumple', remind: 'cumple' },
      { who: 'juju', text: '¿Puedo poner el sticker? ¿Y otra huella? ¿Y otro sticker?' },
      { who: 'narrador', text: 'Juju pega el sticker de PAGADO, chueco. Nadie lo endereza. Papá lo enmarca para la pared de la cochera.' },
    ],
  },

  // ——— Hito: ¡Gira completa! ———
  {
    // El fondo es la ciudad del último show de la gira (QA ronda 3: salía Puebla aunque terminaran en Guadalajara).
    // place puede ser función del estado: week.sceneView la resuelve.
    id: 'c5_hito', chapter: 5, trigger: 'milestone', place: (s) => [...(s.history || [])].reverse().find((h) => ['gdl', 'mty', 'pue'].includes(h.venue))?.venue || 'gira',
    when: milestone5,
    beats: [
      { who: 'narrador', text: '¡Gira completa! En el último show, Dafne y Pulpo Neón se suben a tocar con {banda} la canción final.' },
      { who: 'dafne', text: 'Ok, ok... esto también estuvo buenísimo. Y esto sí se lo pueden decir a todos.' },
      { who: 'bajo', text: 'El bajo no se oye: se siente. ...¿Me quedo?' },
      { who: 'narrador', text: 'Todos gritan que sí al mismo tiempo. Juju grita dos veces. {bajo} ya es parte de {banda}.' },
      { who: 'tarjeta', text: 'Así empezó la gira / Así va', card: 'gira' },
    ],
  },
  {
    id: 'c5_mapa', chapter: 5, trigger: 'milestone', place: 'cochera',
    when: milestone5,
    beats: [
      { who: 'narrador', text: 'De regreso, en la pared de la cochera hay un mapa de México con tres tachuelas. Junto al mapa, el pagaré enmarcado con su sticker de PAGADO.' },
      { who: 'mama', text: 'Póster nuevo: los cinco, tres sellos de Guadalajara, Monterrey y Puebla, y "GIRA COMPLETA" en diagonal.' },
      { who: 'bateria', text: 'Calificación final de la gira: cinco baquetas. Y una de bonus para La Burra.' },
      { who: 'papa', text: '(con un sobre que acaba de sacar del buzón) Llegó esto. Nos invitan al Palacio de los Deportes.' },
      { who: 'juju', text: '¿Un palacio de verdad? ¿Con princesas dinosaurio?' },
    ],
  },

  // ——— Descanso (ánimo en 0 o caja vacía) ———
  {
    id: 'c5_descanso', chapter: 5, trigger: 'pause', place: 'cochera', repeat: true,
    when: (s) => ch5(s) && s.phase === 'pause',
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Pasa en todas las giras, hasta en las de las bandas que llenan estadios. La Burra se queda estacionada afuera de la cochera.' },
      { who: 'memo', text: 'La Burra tampoco corre siempre. A veces se para a tomar agua.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué ciudad empezó a bajar? ¿Cuánto costaron los viáticos?' },
      { who: 'juju', text: 'Yo los espero en primera fila. Ya estoy haciendo letrero de gira. Tiene una camioneta.' },
    ],
  },
];

export default SCENES;
