// The road to the stadium: Prólogo, chapters 1 to 6 and the Final (index 7). Each chapter lists its goals
// (all needed to pass), the milestone it celebrates and the numbers that grow with the band.
// Balance knobs live here (see qa/balance.js for the table they produce):
//   weekly      gastos semanales (cuerdas, transporte, viáticos, equipo)
//   promo       📣 cost per day and how many people hear about the show
//   job         💵 trabajito pay
//   wom         "los fans les cuentan a sus amigos": weekly new fans = fans × wom × calidad²
//   streamF     reproducciones por fan por canción grabada, por semana
//   setSize     songs in the setlist
//   cardStep    $ of one step of caja/ahorro/papa in the cards (how much a money decision weighs in the chapter)

const songsOwn = (s) => s.songs.length;
const playedAt = (s, venue) => s.history.some((h) => h.venue === venue);

export const CHAPTERS = [
  {
    id: 0, key: 'prologo', name: 'Prólogo · La cochera', short: 'La cochera', icon: '🏠',
    weekly: 0, promo: { cost: 0, people: 0 }, job: 0, wom: 0, streamF: 0, setSize: 2, cardStep: 100,
    milestone: { id: 'nacio', icon: '🎉', title: '¡Nació {banda}!', text: 'Primer show en la cochera para 3 sillas.' },
    goals: [
      { id: 'nombre', label: 'Nombre y logo de la banda', have: (s) => (s.band.name ? 1 : 0), need: 1 },
      { id: 'cancion', label: 'Primera canción propia', have: songsOwn, need: 1 },
      { id: 'ensayo', label: 'Primer ensayo', have: (s) => s.stats.rehearsals, need: 1 },
      { id: 'show3', label: 'Show en la cochera para 3 sillas', have: (s) => (playedAt(s, 'cochera') ? 1 : 0), need: 1 },
    ],
  },
  {
    id: 1, key: 'escenario', name: 'Capítulo 1 · Primer escenario', short: 'Primer escenario', icon: '☕',
    weekly: 150, promo: { cost: 150, people: 18 }, job: 400, wom: 0.04, streamF: 0, setSize: 3, cardStep: 100,
    // El hito celebra a quien llega al teclado: espera a la audición (el motor lo detiene hasta 3 semanas).
    milestone: { id: 'romi', icon: '🎹', title: '¡Ahora somos 3!', text: '{teclas} ya es parte de {banda}. Tres instrumentos, una sola canción.', ready: (s) => !!s.roles?.teclas },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 60, icon: '⭐' },
      { id: 'canciones', label: 'Canciones propias', have: songsOwn, need: 2, icon: '✍️' },
      { id: 'pago', label: 'Primer pago a Papá', have: (s) => s.money.pagado, need: 500, icon: '🤝', money: true },
    ],
  },
  {
    id: 2, key: 'agotado', name: 'Capítulo 2 · Boletos agotados', short: 'Boletos agotados', icon: '🎟️',
    weekly: 400, promo: { cost: 200, people: 30 }, job: 400, wom: 0.1, streamF: 0, setSize: 4, cardStep: 300,
    milestone: { id: 'agotado', icon: '🎟️', title: '¡Boletos agotados!', text: 'Doña Rocío escribe AGOTADO en la puerta.' },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 300, icon: '⭐' },
      { id: 'agotado', label: 'AGOTADO en el Foro Cachito', have: (s) => (s.flags.soldOut_foro ? 1 : 0), need: 1, icon: '🎟️' },
      { id: 'ahorro', label: 'Ahorro para el estudio', have: (s) => s.money.ahorro, need: 3000, icon: '🐷', money: true },
    ],
  },
  {
    id: 3, key: 'sencillo', name: 'Capítulo 3 · Primer sencillo', short: 'Primer sencillo', icon: '🎙️',
    weekly: 800, promo: { cost: 500, people: 80 }, job: 800, wom: 0.12, streamF: 2.5, setSize: 5, cardStep: 1000,
    milestone: { id: 'ya', icon: '🎙️', title: '600 personas gritan "¡YA!"', text: 'El sencillo suena en el Foro Indie Rocks, lleno hasta la última fila.' },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 1500, icon: '⭐' },
      { id: 'sencillo', label: 'Sencillo grabado', have: (s) => s.recorded.length, need: 1, icon: '🎙️' },
      { id: 'indie', label: 'Llenar el Foro Indie Rocks', have: (s) => (s.flags.soldOut_indie ? 1 : 0), need: 1, icon: '🎟️' },
    ],
  },
  {
    id: 4, key: 'sonando', name: 'Capítulo 4 · Sonando en todos lados', short: 'Sonando en todos lados', icon: '📻',
    weekly: 3000, promo: { cost: 2000, people: 250 }, job: 1500, wom: 0.05, streamF: 3, setSize: 5, cardStep: 3000,
    milestone: { id: 'placa', icon: '💿', title: '¡100 mil reproducciones!', text: 'La placa de 100 mil y el primer depósito, enmarcado en la cochera.' },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 5000, icon: '⭐' },
      { id: 'streams', label: 'Reproducciones', have: (s) => s.streams, need: 100000, icon: '▶️' },
      { id: 'label', label: 'Decidir: disquera o independientes', have: (s) => (s.label ? 1 : 0), need: 1, icon: '📝' },
    ],
  },
  {
    id: 5, key: 'gira', name: 'Capítulo 5 · De gira', short: 'De gira', icon: '🚐',
    weekly: 6000, promo: { cost: 4000, people: 600 }, job: 2500, wom: 0.07, streamF: 3, setSize: 5, tired: 1.5, cardStep: 5000,
    milestone: { id: 'gira', icon: '🗺️', title: '¡Gira completa!', text: '{bajo} se queda en la banda y el pagaré tiene su sticker de PAGADO.' },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 20000, icon: '⭐' },
      { id: 'ciudades', label: 'Tocar en Guadalajara, Monterrey y Puebla', have: (s) => s.citiesPlayed.length, need: 3, icon: '📍' },
      // Si ya le pagaron todo antes (cap. 2 o 3), la meta sale cumplida y dice que ya estaba, no como meta nueva.
      { id: 'papa', label: (s) => (s.money.deuda === 0 ? 'Pagaré de Papá (ya PAGADO)' : 'Pagarle todo a Papá'), have: (s) => s.money.pagado, need: 5000, icon: '🤝', money: true },
    ],
  },
  {
    id: 6, key: 'palacio', name: 'Capítulo 6 · Palacio de los Deportes', short: 'Palacio de los Deportes', icon: '🏟️',
    weekly: 110000, promo: { cost: 15000, people: 2500 }, job: 5000, wom: 0.05, streamF: 3, setSize: 5, cardStep: 15000,
    milestone: { id: 'palacio', icon: '📱', title: '24,500 luces de celular', text: 'El Palacio de los Deportes, lleno.' },
    goals: [
      { id: 'fans', label: 'Fans', have: (s) => s.m.fans, need: 50000, icon: '⭐' },
      { id: 'palacio', label: 'AGOTADO en el Palacio', have: (s) => (s.flags.soldOut_palacio ? 1 : 0), need: 1, icon: '🎟️' },
      { id: 'streams', label: 'Reproducciones', have: (s) => s.streams, need: 2000000, icon: '▶️' },
    ],
  },
  {
    id: 7, key: 'final', name: 'Final · Estadio lleno + Premio', short: 'Estadio lleno', icon: '🏆',
    // Gastos de 200 mil (antes 350 mil): con 350 mil ningún lugar fuera del estadio cubría la semana, y si llegaba con
    // poca caja la banda quedaba atrapada en pausas (regresar 2 semanas la dejaba igual). QA ronda 2.
    // streamF 2.8 (antes 3, QA ronda 3 final): con el Palacio y el Estadio ya rentables, las partidas más rápidas de
    // "niña real" llegaban a los 10 millones en 3 semanas; así el Final dura de 4 a 7, como los demás capítulos.
    weekly: 200000, promo: { cost: 30000, people: 8000 }, job: 8000, wom: 0.07, streamF: 2.8, setSize: 5, cardStep: 30000,
    milestone: { id: 'gramofono', icon: '🏆', title: 'Gramófono de Oro', text: 'Estadio lleno y 10 millones de reproducciones.' },
    goals: [
      { id: 'estadio', label: 'Llenar el estadio', have: (s) => (s.flags.soldOut_estadio ? 1 : 0), need: 1, icon: '🏟️' },
      { id: 'streams', label: 'Reproducciones', have: (s) => s.streams, need: 10000000, icon: '▶️' },
    ],
  },
];

export const LAST_CHAPTER = CHAPTERS.length - 1;
export const chapterOf = (s) => CHAPTERS[Math.min(s.chapter, LAST_CHAPTER)];

// Studio (cap. 3+): Inés's two options. Quality feeds streams; takes between 3 and 5 sound best.
// The goal of cap. 2 ($3,000 ahorrados) pays exactly the small studio; the big one needs more savings.
// Texts that quote these prices: story/ch3.js (ch3-demo), cards/ch3.js (C3-01), activities.js (grabar).
export const STUDIO = {
  barato: { label: 'Estudio chico, medio día', cost: 3000, quality: 0.7 },
  bueno: { label: 'Estudio grande de Inés, día completo', cost: 8000, quality: 1 },
};

// Cap. 4: royalties ≈ $65 per 1,000 plays. Record label: advance + more promotion, but only 18% of the
// royalties until the advance is paid back (the label keeps the master). Negotiated deal (C4-02 "Negociar"):
// half the advance, $40 of every $100 while it is paid back and $60 after; the band keeps its master.
// Independent: 100%, slower growth. Every key here is a valid s.label (week.chooseLabel).
export const ROYALTY_PER_PLAY = 0.065;
export const LABELS = {
  disquera: { label: 'Disquera (Discos Galaxia)', advance: 40000, share: 0.18, shareAfter: 0.5, streamMult: 1.25, promoMult: 1.5 },
  negociado: { label: 'Disquera con trato negociado (Discos Galaxia)', advance: 20000, share: 0.4, shareAfter: 0.6, streamMult: 1.25, promoMult: 1.5 },
  indie: { label: 'Independientes', advance: 0, share: 1, shareAfter: 1, streamMult: 1, promoMult: 1 },
};
