// Cartas del Final · Estadio lleno + Premio (HISTORIA_TMP §3, Final y tabla 3.0, lecciones 34 a 38).
// Esquema (DISENO §7.3): { id, chapter, weight, when(s), who, title, text, tip, remind?,
//   options: [ { label, effects: { fans, caja, talent, mood, ahorro, flag, promise }, verdict, why, lesson? } ], after? }
// effects en pasos enteros de -3 a +3 (el motor los escala). `after` = lo que dice alguien después de decidir.
//
// El estadio de la CDMX: unas 87,000 personas. Meta: llenarlo y llegar a 10 millones de reproducciones
// para el Premio Gramófono de Oro del juego.
// Lecciones: aprende_ano (escena c7_libreta; la carta c7_repetir la descubre si faltaba o la aplica),
// no_salen_foto (c7_bono). aplausos_quedan, calma_ensaya y siempre_famosos van en escenas (story/ch7.js).
// Recordatorio: duena (c7_estuche), antes de la cuerda rota.

const ch7 = (s) => s.chapter === 7;
const stadiumPlayed = (s) => (s.history || []).some((h) => h.venue === 'estadio');
// Las cartas salen antes del show de la semana: los `why` hablan del estadio que viene, no de uno que ya pasó
// (QA ronda 3: "tocaron frente a 87,000" salía antes de llenarlo).

export const CARDS = [
  // ——— Momento 1: la libreta de Papá · aprende_ano ———
  {
    id: 'c7_repetir', chapter: 7, weight: 8, who: 'papa',
    when: (s) => ch7(s) && !stadiumPlayed(s),
    title: '¿Qué repetimos para el estadio?',
    text: 'Papá deja la libreta abierta en la página de sus mejores shows. "Mira estas semanas. ¿Qué hicieron antes de que salieran bien?". Hay flechas, notas, una gráfica de plumón verde y una mancha de mermelada.',
    tip: '💡 Busca lo que se repite en tus mejores semanas: eso es lo que conviene volver a hacer.',
    options: [
      { label: '🔀 Cambiar todo: un show nuevo para el estadio',
        effects: { fans: 1, mood: -2, talent: -1 }, verdict: 'bad', lesson: { discover: 'aprende_ano' },
        why: '💡 La próxima vez cambia solo lo que no funcionó, porque cambiar todo junto los dejó sin saber qué sí servía.' },
      { label: '📣 Promover muchísimo, como nunca',
        effects: { fans: 2, caja: -2, mood: -1 }, verdict: 'ok', lesson: { discover: 'aprende_ano' },
        why: '💡 La próxima vez revisa la libreta antes de gastar, porque llegó más gente, pero tus mejores semanas no fueron las de más promoción. Otra pista: si te faltan fans para llenar, promover sí conviene.' },
      { label: '🎸 Ensayar y descansar, como en las mejores semanas',
        effects: { talent: 2, mood: 2 }, verdict: 'good', lesson: { discover: 'aprende_ano' },
        why: '✅ ¡Gran decisión! Llegaron afinados y con energía, porque repetiste lo que ya te había funcionado.' },
    ],
    after: { who: 'papa', text: 'Apunto en la libreta qué repetimos y qué cambiamos. La mermelada se queda.' },
  },

  // ——— El estuche · recordatorio duena (prepara la cuerda rota) ———
  {
    id: 'c7_estuche', chapter: 7, weight: 5, who: 'me', remind: 'duena',
    when: (s) => ch7(s) && !stadiumPlayed(s),
    title: 'El estuche del estadio',
    text: 'Noche antes del ensayo general, el último ensayo con todo puesto. {nombre} abre su estuche y revisa las cuerdas de repuesto: le quedan dos, y una está medio oxidada.',
    tip: '💡 Si algo se rompe frente a 87,000 personas, ¿qué quieres tener a la mano?',
    options: [
      { label: '😌 Así está bien: una cuerda nunca se rompe dos veces',
        effects: { mood: 1 }, verdict: 'bad',
        why: '💡 La próxima vez revisa tu equipo antes de un show grande, porque las cuerdas viejas se rompen justo cuando más se necesitan.' },
      { label: '🧰 Rellenar la bolsita y practicar cambiar una cuerda rápido',
        effects: { talent: 1, caja: -1, flag: 'bolsitaLista' }, verdict: 'good', lesson: { apply: 'duena' },
        why: '✅ ¡Gran decisión! Si una cuerda se rompe, ya sabes qué hacer y tienes con qué, porque te hiciste cargo antes de que pasara.' },
      { label: '🎸 Pedir una guitarra de repuesto afinada a un lado del escenario',
        effects: { caja: -2, mood: 1, flag: 'guitarraRepuesto' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Hay una guitarra lista por si acaso, porque pediste ayuda con tiempo. 💡 Sirve si el técnico está atento; la bolsita sirve siempre.' },
    ],
    after: { who: 'me', text: 'Desde la primera cuerda que se me rompió, esta bolsita viaja conmigo. Ya me sé el camino.' },
  },

  // ——— Momento 2: ¿con qué canción abrimos? ———
  {
    id: 'c7_abrir', chapter: 7, weight: 4, who: 'nina',
    when: (s) => ch7(s) && !stadiumPlayed(s),
    title: '¿Con qué canción abrimos?',
    text: 'Primera canción del estadio. Nina quiere abrir con el éxito nuevo, el que suena en todos lados. {nombre} piensa en "{cancion1}", la primera que compusieron en la cochera.',
    tip: '💡 Las dos funcionan. Piensa cómo quieres que se sienta el primer minuto.',
    options: [
      { label: '🎸 Con un solo de guitarra larguísimo',
        effects: { talent: 1, fans: -1 }, verdict: 'ok',
        why: '💡 La próxima vez abre con una canción que se cante, porque en un estadio la gente quiere cantar desde el primer minuto. El solo luce más a la mitad del show.' },
      { label: '🔥 Con el éxito nuevo: que todos brinquen desde el principio',
        effects: { fans: 2, mood: 1, flag: 'abreExito' }, verdict: 'good',
        why: '✅ ¡Gran decisión! El público va a brincar desde el primer acorde, porque vas a abrir con la que todos se saben.' },
      { label: '🏠 Con "{cancion1}", la de la cochera',
        effects: { mood: 2, fans: 1, flag: 'abreCochera' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Los fans de siempre van a gritar al reconocer el riff, porque vas a empezar por donde empezó todo.' },
    ],
    after: { who: 'nina', text: (s) => (s.flags?.licuadora ? 'Ok. Pero "la de la licuadora" va al final, cuando griten "¡otra!". No es negociable.' : 'Ok. Pero la más bailable va al final, cuando griten "¡otra!". No es negociable.') },
  },

  // ——— Las tres sillas ———
  {
    id: 'c7_sillas', chapter: 7, weight: 4, who: 'mama', remind: 'defiende',
    when: (s) => ch7(s) && !stadiumPlayed(s),
    title: 'Las tres sillas',
    text: 'La gente del estadio quiere vender las tres sillas de primera fila que {nombre} apartó. Dicen que son los mejores lugares de todo el estadio y que valen muchísimo dinero.',
    tip: '💡 Hay cosas que valen dinero y cosas que valen otra cosa. ¿Qué valen estas sillas para la banda?',
    options: [
      { label: '🪑 No se venden: son de Mamá, Juju y Señor Brillitos',
        effects: { mood: 3, flag: 'tresSillas' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Juju y Señor Brillitos ya tienen su lugar de siempre para el estadio, porque cuidaste a quienes estuvieron desde el primer día.', after: { who: 'juju', text: 'Señor Brillitos quiere la del pasillo. Se marea en medio.' } },
      { label: '🎟️ Que se queden, y regalar tres más: para Santi, Iker y Don Beto',
        effects: { mood: 2, fans: 1, caja: -1, flag: ['tresSillas', 'sillasPrimeros'] }, verdict: 'good',
        why: '✅ ¡Gran decisión! La primera fila del estadio va a parecer la cochera y el café juntos, porque invitaste a los que estuvieron desde el principio.', after: { who: 'juju', text: 'Señor Brillitos quiere la del pasillo. Se marea en medio.' } },
      { label: '💰 Venderlas: es mucho dinero',
        effects: { caja: 2, mood: -2 }, verdict: 'ok',
        why: '💡 La próxima vez piensa qué vale más para tu equipo, porque ganaron dinero, pero Juju va a ver el estadio con binoculares de juguete y Señor Brillitos no va a alcanzar a ver nada.' },
    ],
  },

  // ——— ¿Quién abre el show? ———
  {
    id: 'c7_telonero', chapter: 7, weight: 3, who: 'papa', remind: 'mentora',
    when: (s) => ch7(s) && !stadiumPlayed(s),
    title: '¿Quién abre el show?',
    text: 'El telonero es la banda que toca antes, para calentar al público. Pulpo Neón, la banda de Dafne, quiere abrir. También les escribió una banda nueva: tres niños de cochera que se llaman Los Tlacuaches Eléctricos.',
    tip: '💡 Acuérdate de quién te dio una oportunidad cuando empezabas. ¿A quién quieres dársela tú?',
    options: [
      { label: '🚫 Nadie: que el show dure más y ganemos más',
        effects: { caja: 2, mood: -1, fans: -1 }, verdict: 'ok',
        why: '💡 La próxima vez comparte el escenario, porque el público llegó frío y la primera canción costó más trabajo.' },
      { label: '🐙 Pulpo Neón: son amigas y tienen muchos fans',
        effects: { fans: 2, caja: -1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! El público llegó temprano y ya calientito, porque Pulpo Neón trae a sus propios fans. 💡 Si quieres que el estadio empiece a cantar desde temprano, elige a quien ya tiene público.', after: { who: 'dafne', text: 'Ok, ok... si nos toca ser teloneras, vamos a ser las mejores teloneras del planeta.' } },
      { label: '⚡ Los Tlacuaches Eléctricos, la banda nueva',
        effects: { mood: 2, fans: 1 }, verdict: 'good', lesson: { apply: 'mentora' },
        why: '✅ ¡Gran decisión! Tres niños de cochera van a abrir el estadio, porque les diste la oportunidad que alguien les dio a ustedes. En la prueba de sonido les explicaste cómo calmar los nervios: estaban nerviosísimos, y les salió.' },
    ],
  },

  // ——— La noche antes del estadio: "¡Una más y ya!" ———
  {
    id: 'c7_noche_antes', chapter: 7, weight: 4, who: 'mama', remind: 'nervios',
    // Es la noche antes del show de ESTA semana (el lugar lo elige ella después): no supone que ya toca el estadio.
    when: (s) => ch7(s) && !stadiumPlayed(s) && (s.m?.fans || 0) >= 60000,
    title: 'La noche antes del show',
    text: 'Es la noche antes del show del sábado y ya ensayaron todo el día para el estadio. {nombre} quiere repetir el show: "¡Una más y ya!". {bateria} se acostó en el piso con los brazos abiertos. Nina habla en susurros para cuidar la voz.',
    tip: '💡 Revisa el 💛 ánimo. ¿Qué le falta a la banda: más ensayo o más energía?',
    options: [
      { label: '🔁 Una más, completa',
        effects: { talent: 1, mood: -3 }, verdict: 'bad',
        why: '💡 La próxima vez confía en lo que ya ensayaste, porque el show ya estaba listo y llegaron al escenario con sueño.' },
      { label: '🎯 Solo la canción que salió floja, y a dormir',
        effects: { talent: 1, mood: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Arreglaron lo que faltaba y durmieron, porque ensayaste justo lo necesario.' },
      { label: '🍕 Nada de ensayo: pizza en la cochera y a dormir temprano',
        effects: { mood: 3 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Llegaron al escenario con energía de sobra, porque descansar también es ensayar. 💡 Si alguna canción todavía no sale, sí conviene repasarla.', after: { who: 'bateria', text: '(desde el piso) Voto por la pizza. Y por no levantarme.' } },
    ],
  },

  // ——— Momento 3: el bono del equipo · lección no_salen_foto ({hermana}) ———
  {
    id: 'c7_bono', chapter: 7, weight: 8, who: 'hermana',
    // Antes o después del estadio (si el estadio cumple las metas, el juego termina y la carta ya no saldría).
    when: (s) => ch7(s) && (stadiumPlayed(s) || (s.weekInChapter || 1) >= 2),
    title: 'El bono del equipo',
    text: 'Llevan semanas armando el estadio, y Papá pregunta si quieren dar un bono, un dinero extra de premio, a los técnicos, a Don Memo y a quienes cargan el equipo. {hermana} enseña fotos de ellos que nadie había visto.',
    tip: '💡 Piensa en todos los que hicieron el show, no solo en los que salieron en el escenario.',
    options: [
      { label: '🎁 Repartir un bono para todo el equipo',
        effects: { caja: -2, mood: 3, flag: 'bonoEquipo' }, verdict: 'good', lesson: { discover: 'no_salen_foto' },
        why: '✅ ¡Gran decisión! El equipo trabajó feliz hasta el último cable, porque reconociste a quien carga, conecta y maneja desde las seis de la mañana.' },
      { label: '🐷 Guardarlo todo en la caja',
        effects: { caja: 1, mood: -2 }, verdict: 'bad', lesson: { discover: 'no_salen_foto' },
        why: '💡 La próxima vez comparte cuando les va bien, porque los técnicos también hicieron el show y se notó que nadie les dio las gracias.' },
      { label: '💌 Un bono chico y una carta de gracias firmada por la banda',
        effects: { caja: -1, mood: 2, flag: 'bonoEquipo' }, verdict: 'good', lesson: { discover: 'no_salen_foto' },
        why: '✅ ¡Gran decisión! Los técnicos pegaron la carta en sus cajas de herramientas, porque un gracias de verdad también cuenta. 💡 Si el show dejó mucho dinero, un bono más grande es más justo.' },
    ],
    after: { who: 'hermana', text: 'Los que no salen en la foto también hacen el show.' },
  },

  // ——— Momento 4: el discurso del Premio Gramófono de Oro ———
  {
    id: 'c7_discurso', chapter: 7, weight: 4, who: 'nina', kind: 'speech', remind: 'mentora',
    when: (s) => ch7(s) && (s.streams || 0) >= 3000000,
    title: 'El discurso del Premio',
    text: 'Están nominados al Premio Gramófono de Oro: están en la lista de los que pueden ganar. Si ganan, {nombre} habla. Nina dice que un discurso es como una canción: lo primero es lo que más se oye. ¿Con quién empiezas?',
    tip: '💡 No hay discurso equivocado si nombras a tu equipo. Elige el que se sienta más tuyo.',
    options: [
      { label: '🏠 Primero la familia: Mamá, Papá, la Abuela, {hermana}, Juju... y Señor Brillitos',
        effects: { mood: 2, flag: 'discursoFamilia' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Juju se paró en su silla a aplaudir, porque empezaste por quienes estuvieron desde las tres sillas. Después nombraste a la banda y a los fans.' },
      { label: '🎸 Primero la banda: Nina, {teclas}, {bateria} y {bajo}',
        effects: { mood: 2, talent: 1, flag: 'discursoBanda' }, verdict: 'good',
        why: '✅ ¡Gran decisión! A {bateria} se le cayó una baqueta de la emoción, porque dijiste que sin ellos solo eras una niña con una guitarra. Después nombraste a la familia y a los fans.' },
      { label: '💛 Primero los fans: Iker, la fila de Monterrey y todos los que gritan "¡YA!"',
        effects: { fans: 2, mood: 1, flag: 'discursoFans' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Medio país gritó "¡YA!" frente a la tele, porque le diste las gracias a quienes llenaron cada lugar. Después nombraste a la banda y a la familia.' },
    ],
    after: { who: 'nina', text: 'Y al final, todos juntos: "¡Una más y ya!". Ese es el cierre. No es negociable.' },
  },
];

export default CARDS;
