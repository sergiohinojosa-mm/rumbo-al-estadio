// Escenas del Capítulo 1 · Primer escenario (HISTORIA_TMP §4.2). Esquema y campos: ver story/ch0.js.
// La tecladista o el tecladista se elige por audición (carta c1_audicion_teclas): Romi, Luz o Santi.
// Las escenas después de la audición tienen una versión por candidato; a los que no eligió les va bien.
// Banderas que usan estas escenas (las pone js/data/triggers/ch1.js):
//   rocioNo     semana del "no" de Doña Rocío      rocioSongs  canciones propias que tenían ese día
//   licuadora   semana en que nació "La canción de la licuadora" (show en la kermés)

const seen = (s, id) => (s.seenScenes || []).includes(id);
const songs = (s) => (s.songs || []).length;
const lastAt = (s, venue) => s.last?.venue === venue && s.last?.week === s.week;
const played = (s, venue) => (s.history || []).some((h) => h.venue === venue);
// Solo cuando se cumplió el hito del capítulo 1 (no el del Prólogo, que también deja chapter = 1 en 'milestone').
const after1 = (s) => s.chapter >= 2 || (s.phase === 'milestone' && s.lastClose?.milestone?.chapter === 1);

const beto = { who: 'beto', text: '(colgando una foto en la pared) Para que cuando sean famosos, se acuerden de dónde empezaron. Y de mi tres leches.' };

export default [
  {
    id: 'c1_mapa', chapter: 1, trigger: 'start', place: 'cocina_mapa', screen: 'goals',
    when: (s) => s.chapter === 1,
    beats: [
      { who: 'papa', text: '(desenrollando el mapa) Este es el camino a la fama. Cada puntito es un escenario.' },
      { who: 'me', text: '(pone el dedo en el estadio) ¿Cuándo vamos aquí?' },
      { who: 'papa', text: '(pone el dedo en el primer puntito) Primero, aquí. El cumpleaños de Santi. Cumple 7 y pidió "música con guitarra".' },
      { who: 'nina', text: 'Un cumpleaños es un escenario. Con pastel.' },
      { who: 'papa', text: 'La meta de este capítulo: 60 fans, 2 canciones propias y su primer pago a mí, de $500 o más. Del pago, sin prisa.' },
    ],
  },
  {
    id: 'c1_santi', chapter: 1, trigger: 'start', place: 'jardin_fiesta',
    when: (s) => s.chapter === 1,
    beats: [
      { who: 'narrador', text: 'Primer trabajo pagado de {banda}. Público: 14 niños, 9 papás y una piñata de perro bombero.' },
      { who: 'santi', text: '¿Se saben la del perro bombero?' },
      { who: 'nina', text: '(a {nombre}, en secreto) ¿Nos sabemos la del perro bombero?' },
      { who: 'me', text: 'Nos la vamos a saber.' },
    ],
  },
  {
    id: 'c1_beto', chapter: 1, trigger: 'start', place: 'cafe',
    when: (s) => s.chapter === 1 && (s.weekInChapter || 1) >= 2 && !played(s, 'cafe'),
    beats: [
      { who: 'beto', text: '¡Las muchachas de la cochera! Me contaron que tocan bonito.' },
      { who: 'beto', text: 'Los sábados esto se llena. Vengan a tocar y les pago con pastel. ¡Aquí el tres leches es ley! Y con mucha exposición, mija, mucha exposición.' },
      { who: 'me', text: '(a Nina) ¿La exposición se come?' },
      { who: 'nina', text: 'Creo que es que mucha gente te vea tocar. Pero no se come. Ni con cuchara.' },
    ],
  },
  {
    id: 'c1_kermes', chapter: 1, trigger: 'week', place: 'kermes',
    when: (s) => s.chapter === 1 && (s.weekInChapter || 1) >= 2 && s.week % 2 === 0 && !played(s, 'kermes'),
    beats: [
      { who: 'narrador', text: 'Kermés de la escuela. Les toca entre el concurso de baile de los papás y la rifa de una licuadora.' },
      { who: 'nina', text: '(detrás de la cortina) Hay como sesenta personas. Está la directora. Está mi maestra de inglés. Se me olvidó la letra. Toda. Hasta mi nombre.' },
      { who: 'me', text: 'Te llamas Nina y la primera palabra es la del título. Ya con eso arrancas.' },
    ],
  },
  {
    id: 'c1_licuadora', chapter: 1, trigger: 'after_show', place: 'kermes_escenario',
    when: (s) => s.chapter === 1 && (lastAt(s, 'kermes') || !!s.flags?.licuadora),
    beats: [
      { who: 'narrador', text: 'A media canción, el animador agarra el micrófono.' },
      { who: 'animador', text: '¡Atención! ¡El boleto 47 se lleva la licuadora!' },
      { who: 'senora47', text: '¡AAAAAH! ¡ES MÍA!' },
      { who: 'nina', text: '(sin parar, inventando) ♪ Licuadora, licuadoraaa, ya te vas a una casa nueva ahoraaa ♪' },
      { who: 'narrador', text: 'Es lo que más aplauden en toda la tarde. Así nace "La canción de la licuadora", y desde ese día la gente la pide.' },
    ],
  },
  {
    id: 'c1_rocio', chapter: 1, trigger: 'start', place: 'coche_noche',
    when: (s) => s.chapter === 1 && !!s.flags?.rocioNo,
    beats: [
      { who: 'narrador', text: 'Papá le mandó un video de la banda a Doña Rocío, la dueña de El Foro Cachito. Contestó en 30 segundos.' },
      { who: 'rocio', text: '(mensaje) Muchos covers y poquitas canciones de ustedes. Tráiganme canciones, no pretextos.' },
      { who: 'narrador', text: '{nombre} se queda callada todo el camino. Para ella, eso es rarísimo.' },
      { who: 'papa', text: '¿Pasamos con tu abuela? Dice que hizo chocolate.' },
    ],
  },
  {
    id: 'c1_abuela', chapter: 1, trigger: 'start', place: 'cocina_abuela',
    when: (s) => s.chapter === 1 && seen(s, 'c1_rocio'),
    beats: [
      { who: 'alma', text: '(sirviendo chocolate caliente y galletas de nata) A ver, mi amor, léeme el mensaje.' },
      { who: 'me', text: '"Muchos covers y poquitas canciones de ustedes. Tráiganme canciones, no pretextos."' },
      { who: 'alma', text: 'Los covers son canciones de otras bandas. Fíjate bien: ahí no dice "nunca". Dice "tráiganme canciones".' },
      { who: 'papa', text: '(con su taza, desde la puerta) Un no hoy no es un no para siempre.', lesson: 'un_no' },
      { who: 'me', text: 'Entonces... ¿es un "todavía no"? ...¿Me pasas otra galleta?' },
    ],
  },
  {
    id: 'c1_libreta', chapter: 1, trigger: 'start', place: 'cochera_luces', screen: 'compose',
    when: (s) => s.chapter === 1 && seen(s, 'c1_abuela'),
    beats: [
      { who: 'nina', text: '(con la libreta y un plumón destapado) A ver. ¿Cuántas canciones nos faltan? ¿Una?' },
      { who: 'me', text: 'Para la meta, una. Para Doña Rocío, quién sabe.' },
      { who: 'nina', text: 'Pues hoy hacemos una. Mañana vemos lo de quién sabe.' },
    ],
  },
  {
    id: 'c1_eso_es', chapter: 1, trigger: 'week', place: 'cochera_luces',
    when: (s) => s.chapter === 1 && seen(s, 'c1_libreta') && s.flags?.rocioSongs != null && songs(s) > s.flags.rocioSongs,
    beats: [
      { who: 'nina', text: '¡Eso es canción!' },
      { who: 'me', text: 'Doña Rocío, ahí te vamos.' },
    ],
  },
  {
    id: 'c1_piano', chapter: 1, trigger: 'after_show', place: 'cafe_piano',
    when: (s) => s.chapter === 1 && played(s, 'cafe') && (s.m.fans >= 30 || (s.weekInChapter || 1) >= 4),
    beats: [
      { who: 'narrador', text: 'Sábado en el café. Mientras tocan "{cancion1}", una niña de lentes rojos se sienta en el piano viejo que nadie usa y toca encima. Le queda perfecto.' },
      { who: 'beto', text: '(con la charola en el aire) No sé si enojarme o aplaudir.' },
      { who: 'abuela_romi', text: 'Aplauda, Beto. Es mi nieta, Romi.' },
      { who: 'nina', text: '¡Nos falta teclado! ¿Y si hacemos audiciones?' },
      { who: 'juju', text: '(ya con cartón y plumón) Yo hago el letrero.' },
    ],
  },
  {
    // Si todavía no tocan en el café (donde está el piano), Romi aparece desde la casa de al lado.
    id: 'c1_piano_vecina', chapter: 1, trigger: 'start', place: 'cochera_luces',
    when: (s) => s.chapter === 1 && (s.weekInChapter || 1) >= 4 && !seen(s, 'c1_piano') && !s.roles?.teclas,
    beats: [
      { who: 'narrador', text: 'Domingo en la cochera. Mientras ensayan "{cancion1}", por la ventana de al lado se oye un piano que toca encima. Le queda perfecto.' },
      { who: 'abuela_romi', text: '(asomándose por la barda) Perdonen. Es mi nieta, Romi. De tanto oírlas ya se sabe sus canciones.' },
      { who: 'nina', text: '¡Nos falta teclado! ¿Y si hacemos audiciones?' },
      { who: 'juju', text: '(ya con cartón y plumón) Yo hago el letrero.' },
    ],
  },
  {
    id: 'c1_audiciones', chapter: 1, trigger: 'start', place: 'cochera_audiciones',
    when: (s) => s.chapter === 1 && (seen(s, 'c1_piano') || seen(s, 'c1_piano_vecina')) && !s.roles?.teclas,
    beats: [
      { who: 'narrador', text: 'En la puerta de la cochera hay un letrero de Juju: "AUDISIONES DE TECLADO" (con S). Llegan tres.' },
      { who: 'narrador', text: 'Romi, la nieta que toca el piano encima de sus canciones, trae un keytar morado (un teclado que se cuelga como guitarra) y una lista de sonidos raros: nave espacial, pato, lluvia.' },
      { who: 'narrador', text: 'Luz es nueva en la colonia. Toca bonito y canta una segunda voz con Nina, pero casi no levanta la vista de las teclas.' },
      { who: 'narrador', text: 'Santi, el del perro bombero, trae su teclado de colores en una mochila de dinosaurio. Se sabe "{cancion1}" de oído. Su mamá espera en la puerta.' },
      { who: 'papa', text: '¿Y tú qué harías? Fíjate en lo que le falta a la banda.' },
    ],
  },
  {
    id: 'c1_hito_romi', chapter: 1, trigger: 'milestone', place: 'cafe_foto',
    when: (s) => after1(s) && s.roles?.teclas === 'romi',
    beats: [
      { who: 'romi', text: 'La segunda parte de su canción va mejor en re menor, un tono que suena tantito triste. Tengo un sonido para eso.' },
      { who: 'romi', text: '(saca una libreta con pestañas de colores) Ya les hice una lista de lo que nos falta. Es larga.' },
      { who: 'juju', text: '(con su letrero nuevo) ¡Yo soy la fan número uno! Tú puedes ser la tecladista número uno.' },
      { ...beto },
      { who: 'narrador', text: 'Luz entra al coro de la escuela y Santi es el invitado de honor en cada cumpleaños de la cuadra. Los dos prometen ir al siguiente show.' },
    ],
  },
  {
    id: 'c1_hito_luz', chapter: 1, trigger: 'milestone', place: 'cafe_foto',
    when: (s) => after1(s) && s.roles?.teclas === 'luz',
    beats: [
      { who: 'luz', text: '(bajito) ¿De verdad soy de la banda? ...Ok. Tengo una voz para el coro.' },
      { who: 'nina', text: 'Por fin alguien que canta conmigo. ¡Eso es canción!' },
      { who: 'juju', text: '(con su letrero nuevo) ¡Yo soy la fan número uno! Tú puedes ser la tecladista número uno.' },
      { ...beto },
      { who: 'narrador', text: 'Romi sigue tocando el piano con su abuela los sábados, y Santi es el invitado de honor en cada cumpleaños de la cuadra. Los dos prometen ir al siguiente show.' },
    ],
  },
  {
    id: 'c1_hito_santi', chapter: 1, trigger: 'milestone', place: 'cafe_foto',
    when: (s) => after1(s) && s.roles?.teclas === 'santi',
    beats: [
      { who: 'santi', text: '¡Otra vez la de ustedes! ...Digo: ¡ya soy de la banda!' },
      { who: 'mama_santi', text: 'Lo traigo a los ensayos y me lo llevo a las ocho. Ni un minuto más.' },
      { who: 'juju', text: '(con su letrero nuevo) ¡Yo soy la fan número uno! Tú puedes ser el tecladista número uno. Pero chiquito.' },
      { ...beto },
      { who: 'narrador', text: 'Romi sigue tocando el piano con su abuela los sábados, y Luz entra al coro de la escuela. Las dos prometen ir al siguiente show.' },
    ],
  },
  {
    id: 'c1_hito', chapter: 1, trigger: 'milestone', place: 'cafe_foto',
    when: (s) => after1(s) && !s.roles?.teclas,
    beats: [
      { who: 'narrador', text: 'Café lleno. Juju con su letrero nuevo. En la pared, una foto de {banda} que tomó {hermana}.' },
      { who: 'juju', text: '¡Yo soy la fan número uno!' },
      { ...beto },
      { who: 'nina', text: 'Y la próxima vez, con teclado. Ya verás.' },
    ],
  },
  {
    id: 'c1_mensaje', chapter: 1, trigger: 'milestone', place: 'cochera_celular',
    when: (s) => after1(s),
    beats: [
      { who: 'rocio', text: (s) => (s.flags?.licuadora ? '(mensaje al celular de Papá) Me contaron de una canción de una licuadora. ¿Ya tienen más canciones de ustedes?' : '(mensaje al celular de Papá) Me contaron que ya tienen canciones propias. ¿Cuántas?') },
      { who: 'me', text: '¡Nina! ¡NINA!' },
    ],
  },
  {
    id: 'c1_pausa', chapter: 1, trigger: 'pause', place: 'cochera_apagada', repeat: true,
    when: (s) => s.phase === 'pause' && s.chapter === 1,
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Pasa en todas las bandas, hasta en las que llenan estadios.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué semana empezó a bajar?' },
      { who: 'nina', text: 'Las bandas también se van de vacaciones. Y regresan con canciones nuevas.' },
      { who: 'beto', text: 'El piano y el tres leches los esperan. Aquí nadie se va a ningún lado.' },
      { who: 'juju', text: 'Yo los espero en primera fila. Ya estoy haciendo letrero nuevo.' },
    ],
  },
];
