// Escenas del Final · Estadio lleno + Premio (HISTORIA_TMP §3, Final). El Final es el capítulo 7.
// Esquema: { id, chapter, when(s), trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place, beats: [ { who, text } ] }
// Extras opcionales (mismos que story/ch5.js): beat.lesson { discover }, beat.voice, beat.remind, beat.card,
// scene.next (💡 de la lección de la escena), scene.repeat.
//
// Tarjetas con los datos reales de su partida (HISTORIA §5F: si un dato no existe, esa fila no sale):
//   TARJETAS.libreta(s)  → { title, rows: [ { icon, label, text } ] }          la libreta de Papá en el estadio vacío
//   TARJETAS.final(s)    → { title, rows: [ { icon, label, then, now } ], foot } "Así empezó / Así va" del epílogo
// La UI las dibuja cuando un beat trae `card: 'libreta'` o `card: 'final'`; `text` es el respaldo si no hay tarjeta.

const ch7 = (s) => s.chapter === 7;
const milestone7 = (s) => s.lastClose?.milestone?.chapter === 7 || !!s.lastClose?.end || s.phase === 'end';
const lastShowAt = (s, venue) => s.last?.venue === venue && s.last?.week === s.week;
// El clímax (cuerda rota frente a 87,000, el letrero en la pantalla gigante, "¡UNA MÁS Y YA!") es solo para el
// estadio LLENO (QA ronda 3: salía con 55,327 de 87,000 y, al llenarse después, ya no había clímax). Si no se llenó,
// sale c7_casi: una escena amable que anima a intentarlo otra vez.
const stadiumFull = (s) => lastShowAt(s, 'estadio') && !!s.last?.soldOut;
const stadiumAlmost = (s) => lastShowAt(s, 'estadio') && !s.last?.soldOut;

const CITIES = ['gdl', 'mty', 'pue'];
const fmt = (v) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
const plural = (n, one, many) => `${fmt(n)} ${Math.round(n) === 1 ? one : many}`;
// Notas que le salieron de cada 10 (nada de porcentajes en pantalla).
const de10 = (v) => Math.round((v || 0) * 10);
const lessonsLearned = (s) => Object.values(s.lessons || {}).filter((l) => (l?.level || 0) > 0).length;
const nameOf = (s) => s.player?.name || 'Mariel';

// La libreta de Papá: los primeros de toda la partida (primer show, primer pago, primer AGOTADO, primera ciudad…).
export function libretaDePapa(s) {
  const H = s.history || [];
  const rows = [];
  const first = H[0];
  if (first) {
    rows.push({ icon: '🎤', label: 'Primer show',
      text: first.venue === 'cochera'
        ? `Semana ${first.week}: la cochera, ${plural(first.attendance, 'persona', 'personas')} y Señor Brillitos`
        : `Semana ${first.week}: ${first.venueName}, ${plural(first.attendance, 'persona', 'personas')}` });
  }
  if (s.flags?.firstPayWeek) rows.push({ icon: '🤝', label: 'Primer pago a Papá', text: `Semana ${s.flags.firstPayWeek}, con huella de mermelada` });
  const sold = H.find((h) => h.soldOut && h.cap >= 20);
  if (sold) rows.push({ icon: '🎟️', label: 'Primer AGOTADO', text: `Semana ${sold.week}: ${sold.venueName}` });
  const city = H.find((h) => CITIES.includes(h.venue));
  if (city) rows.push({ icon: '🚐', label: 'Primera ciudad', text: `Semana ${city.week}: ${city.venueName}, ${plural(city.attendance, 'persona', 'personas')}` });
  if (s.flags?.showEstacionamiento) rows.push({ icon: '🅿️', label: 'Show del estacionamiento', text: `Semana ${s.flags.showEstacionamiento}, en Monterrey` });
  if (s.flags?.pagadoSemana) rows.push({ icon: '✅', label: 'Pagaré PAGADO', text: `Semana ${s.flags.pagadoSemana}` });
  const best = H.reduce((a, h) => (!a || (h.newFans || 0) > (a.newFans || 0) ? h : a), null);
  if (best && best.newFans > 0) rows.push({ icon: '🌟', label: 'Su show con más fans nuevos', text: `Semana ${best.week}: ${best.venueName}, +${fmt(best.newFans)}` });
  const n = lessonsLearned(s);
  if (n) rows.push({ icon: '📖', label: 'Lecciones en el Libro', text: plural(n, 'lección', 'lecciones') });
  return { title: 'La libreta de Papá', rows };
}

// "Así empezó / Así va" del epílogo: semana 1, 3 sillas, $5,000 de deuda… y hoy.
export function asiEmpezoAsiVa(s) {
  const stadium = (s.history || []).filter((h) => h.venue === 'estadio').sort((a, b) => b.attendance - a.attendance)[0];
  const rows = [
    { icon: '📅', label: 'Semana', then: 'Semana 1', now: `Semana ${s.week}` },
    { icon: '🪑', label: 'Público', then: '3 sillas (una era Señor Brillitos)',
      now: stadium ? `${plural(stadium.attendance, 'persona', 'personas')}${stadium.soldOut ? ': estadio lleno' : ' en el estadio'}` : plural(s.records?.bestAttendance || 0, 'persona en su show más grande', 'personas en su show más grande') },
    { icon: '📖', label: 'Lecciones', then: '0', now: plural(lessonsLearned(s), 'lección', 'lecciones') },
    { icon: '🏆', label: 'Premio Gramófono de Oro', then: 'Un sueño dibujado en el mapa', now: 'En la repisa de la cochera' },
    { icon: '🤝', label: 'Préstamo de Papá', then: '$5,000 de deuda', now: s.money?.deuda === 0 ? 'PAGADO, con sticker y enmarcado' : `Faltan $${fmt(s.money?.deuda)}` },
    { icon: '⭐', label: 'Fans', then: '0 (bueno: Juju)', now: plural(s.m?.fans || 0, 'fan', 'fans') },
    { icon: '✍️', label: 'Canciones propias', then: '1, recién compuesta', now: plural((s.songs || []).length, 'canción', 'canciones') },
    { icon: '🎸', label: 'Integrantes', then: `2: ${nameOf(s)} y Nina`, now: plural((s.members || []).length, 'integrante', 'integrantes') },
    { icon: '▶️', label: 'Reproducciones', then: '0', now: fmt(s.streams) },
  ];
  if (s.firsts?.accuracy != null) rows.push({ icon: '🎯', label: 'Notas en vivo', then: `${de10(s.firsts.accuracy)} de cada 10 en su primer show`, now: `${de10(s.records?.bestAccuracy)} de cada 10 en su mejor show` });
  if (s.stats?.rehearsals) rows.push({ icon: '🐢', label: 'Ensayos', then: '1, a la mitad de velocidad', now: plural(s.stats.rehearsals, 'ensayo', 'ensayos') });
  return { title: 'Así empezó / Así va', rows, foot: 'Y todo empezó con 3 sillas.' };
}

export const TARJETAS = { libreta: libretaDePapa, final: asiEmpezoAsiVa };

export const SCENES = [
  // ——— Apertura: ensayo en el estadio vacío ———
  {
    id: 'c7_apertura', chapter: 7, trigger: 'start', place: 'estadio_vacio',
    when: (s) => ch7(s),
    beats: [
      { who: 'narrador', text: 'Ensayo en el estadio vacío. 87,000 asientos y un eco que repite todo tres veces.' },
      { who: 'nina', text: '¡Hola! ...hola ...hola. Como la cochera, pero con más hola.' },
      { who: 'narrador', text: '{nombre} baja a la cancha cargando tres sillas plegables. Las acomoda en primera fila: una para Mamá, una para Juju y una para Señor Brillitos.' },
      { who: 'me', text: 'Para que se sienta como en casa.' },
      { who: 'papa', text: 'Meta final: llenar el estadio, unas 87,000 personas, y llegar a 10 millones de reproducciones. Con eso se gana el Premio Gramófono de Oro.' },
    ],
  },

  // ——— Momento 1: la libreta de Papá · aprende_ano (Papá) y aplausos_quedan (Abuela) ———
  {
    id: 'c7_libreta', chapter: 7, trigger: 'start', place: 'estadio_vacio',
    when: (s) => ch7(s),
    next: '💡 La próxima vez que empieces algo grande, revisa lo que ya hiciste, porque ahí está lo que conviene repetir y lo que conviene cambiar.',
    beats: [
      { who: 'narrador', text: 'Papá se sienta en una de las tres sillas y abre su libreta de MÁNAGER. Está gordísima de tanto apuntar.' },
      { who: 'tarjeta', text: 'La libreta de Papá: primer show, primer pago, primer AGOTADO, primera ciudad.', card: 'libreta' },
      { who: 'papa', text: 'Mira hacia atrás para saber a dónde ir.', voice: 'aprende_ano', lesson: { discover: 'aprende_ano' } },
      { who: 'narrador', text: 'La Abuela Alma llega con una silla que trajo de su casa y la pone junto a las otras tres.' },
      { who: 'alma', text: 'Los aplausos se van; lo que aprendiste se queda.', lesson: { discover: 'aplausos_quedan' } },
    ],
  },

  // ——— Humor y fama honesta: semana de ensayos larguísimos ———
  {
    id: 'c7_gallo', chapter: 7, trigger: 'week', place: 'estadio_vacio',
    when: (s) => ch7(s) && (s.weekInChapter || 0) >= 2,
    beats: [
      { who: 'narrador', text: 'Semana de estadio: ensayos de diez horas, entrevistas, pruebas de luces. La fama de verdad también es esto: muchísimo trabajo y muchísimo sueño.' },
      { who: 'narrador', text: '{bateria} se durmió abrazando un tambor. Nina ronca bajito sobre un rollo de cables.' },
      { who: 'teclas', text: 'Tengo un sonido para despertar a la gente. Es un gallo.' },
      { who: 'narrador', text: 'Funciona. Despiertan todos, hasta Don Memo, que dormía afuera en La Burra.' },
      { who: 'memo', text: 'La Burra también se despertó. Y está de malas.' },
    ],
  },

  // ——— Tropiezo: ¡zing! frente a 87,000 · calma_ensaya (Mamá) · recordatorio duena ———
  {
    id: 'c7_cuerda', chapter: 7, trigger: 'after_show', place: 'estadio_lleno',
    when: stadiumFull,
    next: '💡 La próxima vez que algo se rompa en pleno show, haz lo que ya ensayaste, porque la calma sale sola cuando ya sabes qué hacer.',
    beats: [
      { who: 'narrador', text: 'Estadio lleno. Segunda canción. ¡Zing! Se rompe una cuerda frente a 87,000 personas.' },
      { who: 'narrador', text: '{nombre} no se congela. Abre el estuche y saca una cuerda de repuesto.', remind: 'duena' },
      { who: 'nina', text: '¡Estadio! ¡Cuando yo diga, gritan "¡YA!"! Uno, dos... ¡YA! ¡YA! ¡YA!' },
      { who: 'narrador', text: (s) => (s.flags?.licuadora ? 'Cuerda nueva, afinada y lista. Tardó menos que el anuncio de la licuadora en la kermés.' : 'Cuerda nueva, afinada y lista. Tardó menos que un coro.') },
      { who: 'mama', text: '(desde un lado del escenario, al terminar la canción) La calma también se ensaya.', lesson: { discover: 'calma_ensaya' } },
    ],
  },

  // ——— Momento gracioso: el letrero original en la pantalla gigante ———
  {
    id: 'c7_letrero', chapter: 7, trigger: 'after_show', place: 'estadio_lleno',
    when: stadiumFull,
    beats: [
      { who: 'narrador', text: 'Mamá hizo una versión gigante del letrero de Juju, del tamaño de un camión. Juju no la quiso.' },
      { who: 'juju', text: '(con un cartón doblado en cuatro, lleno de diamantina) Yo traigo el secreto. ¡Ya lo puedo enseñar!' },
      { who: 'narrador', text: 'Lo desdobla. Es enorme. En medio está el letrero de siempre, el de cartón de la cochera, y alrededor, una estampa por cada show y la diamantina que cuidó Señor Brillitos.' },
      { who: 'juju', text: 'Era secreto porque es el mismo. Nomás le fui poniendo cosas.' },
      { who: 'narrador', text: 'La pantalla gigante lo enfoca: 87,000 personas leen "VAMOS {NOMBRE}", con una letra al revés.' },
      { who: 'narrador', text: 'Al terminar la última canción, el estadio entero grita una sola cosa:' },
      { who: 'publico', text: '¡UNA MÁS Y YA!' },
    ],
  },

  // ——— Casi: el estadio no se llenó (se repite cada vez que pase; el clímax espera al estadio lleno) ———
  {
    id: 'c7_casi', chapter: 7, trigger: 'after_show', place: 'estadio_medio', repeat: true,
    when: stadiumAlmost,
    next: '💡 La próxima vez revisa cuántos llegarían antes de elegir el estadio, porque se llena cuando la fila llega a 87,000.',
    beats: [
      { who: 'narrador', text: (s) => `Llegaron ${plural(s.last?.attendance, 'persona', 'personas')} de 87,000. Muchísima gente... y en las gradas de arriba todavía se ven huecos.` },
      { who: 'nina', text: '¡Nunca habíamos tocado para tanta gente! ¿Viste cómo cantaron el coro?' },
      { who: 'papa', text: (s) => `(apuntando en la libreta) Casi. Faltaron unas ${fmt(Math.max(0, 87000 - (s.last?.attendance || 0)))} personas. Más fans y más reproducciones, y lo volvemos a intentar.` },
      { who: 'juju', text: 'Señor Brillitos dice que el estadio no se va a ir a ningún lado. Y que las tres sillas siguen apartadas.' },
      { who: 'me', text: 'Entonces... ¿una más y ya?' },
    ],
  },

  // ——— Hito: el Premio Gramófono de Oro ———
  {
    id: 'c7_premio', chapter: 7, trigger: 'milestone', place: 'premio',
    when: milestone7,
    beats: [
      { who: 'narrador', text: 'La noche del Premio Gramófono de Oro. 10 millones de reproducciones. En el escenario, un gramófono dorado y pesadísimo, con una trompeta como flor.' },
      { who: 'presentadora', text: 'Y el Gramófono de Oro es para... ¡{banda}!' },
      { who: 'narrador', text: (s) => (s.flags?.discursoFamilia ? '{nombre} sube con todo el equipo y empieza: "Mamá, Papá, Abuela, {hermana}, Juju... y Señor Brillitos". Le tiemblan las rodillas, pero no la voz.'
        : s.flags?.discursoBanda ? '{nombre} sube con todo el equipo y empieza: "Sin Nina, {teclas}, {bateria} y {bajo}, yo sería una niña con una guitarra". Le tiemblan las rodillas, pero no la voz.'
          : s.flags?.discursoFans ? '{nombre} sube con todo el equipo y empieza: "Iker, la fila de Monterrey, todos los que gritan ¡YA!: esto es suyo". Le tiemblan las rodillas, pero no la voz.'
            : '{nombre} sube con todo el equipo y dice el discurso que preparó. Le tiemblan las rodillas, pero no la voz.') },
      { who: 'juju', text: '(parada en su asiento) ¡Yo soy la fan número uno! ¡Ganamos!' },
      { who: 'bateria', text: '(cargando el gramófono) ¿Se come? ...No se come. Ok. Cinco baquetas de todos modos.' },
    ],
  },

  // ——— Epílogo: de regreso en la cochera · siempre_famosos (Juju) ———
  {
    id: 'c7_cochera', chapter: 7, trigger: 'milestone', place: 'cochera',
    when: milestone7,
    next: '💡 La próxima vez que toques, acuérdate de tus primeras tres sillas, porque ahí empezó todo.',
    beats: [
      { who: 'narrador', text: 'Esa noche, en la cochera. El gramófono va en la repisa, junto al pagaré con su sticker de PAGADO y el primer letrero de Juju.' },
      { who: 'juju', text: '(en piyama, con Señor Brillitos bajo el brazo) Una más.' },
      { who: 'narrador', text: 'Ponen tres sillas: Mamá, Juju y Señor Brillitos. La Abuela trae la suya. Tocan "{cancion1}", igualito que la primera vez. Bueno: muchísimo mejor.' },
      { who: 'juju', text: 'Para mí siempre fueron famosos.', lesson: { discover: 'siempre_famosos' } },
      { who: 'nina', text: '(con los ojos rojos) No estoy llorando. Es la bufanda. No traigo bufanda.' },
    ],
  },
  {
    id: 'c7_asi_va', chapter: 7, trigger: 'milestone', place: 'cochera',
    when: milestone7,
    beats: [
      { who: 'tarjeta', text: 'Así empezó: semana 1, 3 sillas y $5,000 de deuda. Así va: el estadio lleno y el pagaré PAGADO.', card: 'final' },
      { who: 'papa', text: '(apuntando en su libreta) Apunto. Semana 1: tres sillas. Hoy: estadio lleno. Ganas de volver a tocar...' },
      { who: 'me', text: '¡Todas!' },
    ],
  },
  {
    id: 'c7_fin', chapter: 7, trigger: 'milestone', place: 'cochera',
    when: milestone7,
    beats: [
      { who: 'nina', text: '¿Y ahora qué?' },
      { who: 'me', text: 'Ahora... ¿una más y ya?' },
      { who: 'narrador', text: 'La cochera sigue abierta: para componer, para ensayar y para tocar las canciones que quieran. Sin metas nuevas y sin prisa.' },
      { who: 'me', text: 'Resulta que un estadio se llena igual que una cochera: una persona a la vez.' },
    ],
  },

  // ——— Descanso ———
  {
    id: 'c7_descanso', chapter: 7, trigger: 'pause', place: 'cochera', repeat: true,
    when: (s) => ch7(s) && s.phase === 'pause',
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. El estadio puede esperar: lleva ahí muchísimos años.' },
      { who: 'alma', text: 'A ver, cuéntame qué salió bien. Algo salió bien. Siempre sale algo bien.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué semana empezó a bajar?' },
      { who: 'juju', text: 'Las tres sillas siguen apartadas. Señor Brillitos no deja que nadie se siente.' },
    ],
  },
];

export default SCENES;
