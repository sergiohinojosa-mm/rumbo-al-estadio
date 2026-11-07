// Escenas del Prólogo · La cochera (HISTORIA_TMP §4.1), más la escena de "La banda se toma un descanso" (§5E).
// Esquema: { id, chapter, when(s), trigger, place, beats: [ { who, text, lesson? } ], screen?, repeat? }
//   trigger   'start' (al abrir la semana) | 'week' (entre actividades del plan) | 'milestone' (hito del capítulo)
//             | 'pause' (la banda se toma un descanso) | 'after_show' (al terminar el show)
//   who       id de cast.js, 'me' (la jugadora), 'narrador', o rol 'teclas' | 'bateria' | 'bajo'
//   lesson    en un globo: la frase de esa lección (si es de Papá y tiene audio, se reproduce). El descubrimiento
//             lo hacen las cartas y js/data/triggers.js.
//   screen    mecánica que entra justo después de la escena: 'band_name' | 'logo' | 'compose' | 'rehearse_slow' | 'show' | 'goals'
//   repeat    puede volver a salir (solo la pausa)
// Las condiciones `when` usan s.chapter, s.flags, s.week, s.roles, s.songs, s.stats y s.seenScenes.

const seen = (s, id) => (s.seenScenes || []).includes(id);
const songs = (s) => (s.songs || []).length;
const rehearsals = (s) => s.stats?.rehearsals || 0;

export default [
  {
    id: 'p_sabado', chapter: 0, trigger: 'start', place: 'cuarto',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'narrador', text: 'Sábado, cuatro de la tarde. {nombre} lleva quince veces tocando el mismo riff. Ya se lo sabe ella, ya se lo sabe la guitarra y ya se lo sabe la lámpara.' },
      { who: 'nina', text: '¡{nombre}! Tengo una idea gigante. Gigantísima.' },
      { who: 'me', text: '¿Más gigante que la de vender slime en el recreo?' },
      { who: 'nina', text: 'Muchísimo más. ¿Y si hacemos una banda? Tú tocas, yo canto. Pop del bueno, del que se baila.' },
      { who: 'me', text: '...¿Y dónde ensayamos? ¿Y quién nos va a oír?' },
    ],
  },
  {
    id: 'p_cochera', chapter: 0, trigger: 'start', place: 'cochera_vieja',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'narrador', text: 'La cochera de la casa en Paseo de las Lomas tiene un coche, tres cajas de Navidad, una bici sin llanta y muchísimo eco.' },
      { who: 'nina', text: '¡Aquí! Escucha cómo suena. ¡Hola! ...hola ...hola.' },
      { who: 'mama', text: 'Si la banda necesita la cochera, el coche puede dormir afuera.' },
      { who: 'papa', text: '(dándole palmaditas al coche) Lo siento, amigo. Es por la música.' },
    ],
  },
  {
    id: 'p_juju', chapter: 0, trigger: 'start', place: 'cochera_vieja',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'juju', text: '¿Yo puedo estar en la banda?' },
      { who: 'me', text: 'Tú vas a tener el trabajo más importante de todos. Vas a ser la fan número uno.' },
      { who: 'juju', text: '...¿Con letrero?' },
      { who: 'me', text: 'Con letrero.' },
      { who: 'juju', text: '¡Trato! (se va corriendo por cartón)' },
    ],
  },
  {
    id: 'p_nombre', chapter: 0, trigger: 'start', place: 'cochera_vieja', screen: 'band_name',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'nina', text: 'Toda banda necesita un nombre. Algo que la gente pueda gritar.' },
      { who: 'juju', text: '(desde la puerta) ¡Las Princesas Dinosaurio!' },
      { who: 'me', text: 'Lo vamos a pensar, Juju. Muy en serio.' },
    ],
  },
  {
    id: 'p_logo', chapter: 0, trigger: 'start', place: 'cocina', screen: 'logo',
    when: (s) => s.chapter === 0 && !!s.band?.name,
    beats: [
      { who: 'nina', text: '{banda}. ¡{banda}! Sí. Suena a algo que se grita en un estadio.' },
      { who: 'mama', text: 'Les hago el logo. Pero primero díganme de qué colores son ustedes.' },
      { who: 'me', text: '¿Cómo que de qué colores somos?' },
      { who: 'mama', text: 'Si la banda fuera un helado, ¿de qué sabor sería?' },
    ],
  },
  {
    id: 'p_trato', chapter: 0, trigger: 'start', place: 'cochera_vieja',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'papa', text: 'A ver. Tienen cochera, guitarra y voz. Les falta un amplificador, un micrófono y cables. Eso cuesta.' },
      { who: 'me', text: '¿Cuánto es "cuesta"?' },
      { who: 'papa', text: 'Les presto $5,000 sin intereses. O sea: me regresan exactamente lo que les presté, ni un peso más. Me lo van pagando con lo que ganen tocando, poco a poco.' },
      { who: 'nina', text: '¿Y si no ganamos nada?' },
      { who: 'papa', text: 'Entonces me pagan cuando ganen. No hay fecha límite. Yo soy su mánager: les ayudo a hacer cuentas, pero las que deciden son ustedes.' },
    ],
  },
  {
    id: 'p_firma', chapter: 0, trigger: 'start', place: 'pagare',
    when: (s) => s.chapter === 0,
    beats: [
      { who: 'narrador', text: 'Firman un pagaré, que es una hoja donde prometes pagar lo que te prestaron. Lo escriben a mano en una hoja de cuaderno.' },
      { who: 'narrador', text: 'Testigo: Juju, con su huella de mermelada de fresa.' },
      { who: 'juju', text: '¿Ya soy abogada?' },
      { who: 'papa', text: 'Ya eres testigo. Es casi lo mismo, pero con mermelada.' },
    ],
  },
  {
    id: 'p_pua', chapter: 0, trigger: 'start', place: 'cochera_vieja',
    when: (s) => s.chapter === 0 && songs(s) === 0,
    beats: [
      { who: 'alma', text: 'Me dijeron que aquí hay una banda nueva. Traje galletas de nata y una cosa para la guitarrista.' },
      { who: 'narrador', text: 'Es una púa (la pieza chiquita con la que se tocan las cuerdas) con un agujerito para colgarla de su cadenita.' },
      { who: 'me', text: '¿Y si no sé de qué hacer la primera canción?' },
      { who: 'alma', text: 'Canta lo que te pasa de verdad: así suenas a ti.', lesson: 'suenas_a_ti' },
      { who: 'juju', text: '(con la boca llena) A mí me pasan galletas.' },
    ],
  },
  {
    id: 'p_cancion', chapter: 0, trigger: 'week', place: 'cochera_vieja', screen: 'compose',
    when: (s) => s.chapter === 0 && songs(s) === 0 && seen(s, 'p_pua'),
    beats: [
      { who: 'nina', text: 'Ahora sí: nuestra primera canción. Hay bandas que tocan canciones de otros. Nosotras vamos a tocar las nuestras.' },
      { who: 'me', text: '¿Y de qué hablamos?' },
      { who: 'nina', text: 'De lo que sea. Yo una vez le hice una canción a mi lonchera. Era muy buena. Un poquito dramática.' },
    ],
  },
  {
    id: 'p_nuestra', chapter: 0, trigger: 'week', place: 'cochera_vieja',
    when: (s) => s.chapter === 0 && songs(s) >= 1,
    beats: [
      { who: 'nina', text: '"{cancion1}". Escucha eso. Hace diez minutos esa canción no existía.' },
      { who: 'nina', text: 'Tu canción es tuya: nadie la puede copiar.' },
      { who: 'me', text: 'Nuestra. Es nuestra.' },
      { who: 'nina', text: 'Nuestra. Y un poquito de la lonchera, por inspirarme.' },
    ],
  },
  {
    id: 'p_ensayo', chapter: 0, trigger: 'week', place: 'cochera_vieja', screen: 'rehearse_slow',
    when: (s) => s.chapter === 0 && rehearsals(s) === 0,
    beats: [
      { who: 'narrador', text: 'Primer ensayo. Suena... como cuando a Juju se le cae la caja de los trastes.' },
      { who: 'juju', text: '¡Señor Brillitos se desmayó!' },
      { who: 'me', text: 'No sirvo para esto. Ya, guardo la guitarra.' },
      { who: 'papa', text: 'Antes de guardarla, toca el riff otra vez. Pero a la mitad de velocidad. Despacito.' },
    ],
  },
  {
    id: 'p_despacito', chapter: 0, trigger: 'week', place: 'cochera_vieja',
    when: (s) => s.chapter === 0 && rehearsals(s) >= 1,
    beats: [
      { who: 'narrador', text: 'Despacito sale. Luego un poquito más rápido. Luego otra vez. Señor Brillitos revive.' },
      { who: 'nina', text: '¡{nombre}! Eso sí sonó a canción.' },
      { who: 'papa', text: 'La práctica hace al maestro.', lesson: 'practica' },
      { who: 'me', text: '¡Una más y ya!' },
      { who: 'nina', text: 'Llevas diciendo "una más y ya" desde hace seis.' },
    ],
  },
  {
    id: 'p_sillas', chapter: 0, trigger: 'week', place: 'cochera_sillas', screen: 'show',
    when: (s) => s.chapter === 0 && songs(s) >= 1 && rehearsals(s) >= 1 && s.flags?.weekCochera == null,
    beats: [
      { who: 'narrador', text: 'Primer show de {banda}. Lugar: la cochera. Público: tres sillas.' },
      { who: 'narrador', text: 'Silla 1: Mamá. Silla 2: Juju. Silla 3: Señor Brillitos, todavía un poco mareado.' },
      { who: 'juju', text: '(levanta un cartón que dice VAMOS {NOMBRE}, con una letra al revés) ¡Yo soy la fan número uno!' },
      { who: 'hermana', text: 'Quietos... ¡otra! Juju salió con la lengua de fuera.' },
      { who: 'nina', text: 'Buenas noches, cochera. Somos {banda}. Esta canción se llama "{cancion1}".' },
    ],
  },
  {
    id: 'p_nacio', chapter: 0, trigger: 'milestone', place: 'cochera_luces',
    when: (s) => s.chapter >= 1 || (s.chapter === 0 && s.phase === 'milestone'),
    beats: [
      { who: 'narrador', text: 'Tres minutos y medio después, la cochera aplaude. Bueno: Mamá y Juju aplauden. Señor Brillitos apoya en silencio.' },
      { who: 'papa', text: 'Apunto. Público: 3. Errores: varios. Ganas de volver a tocar...' },
      { who: 'me', text: '¡Todas! (Nina lo grita al mismo tiempo.)' },
      { who: 'mama', text: 'Ya les estoy haciendo el póster: "{banda} · En vivo en la cochera · Entrada libre (trae tu silla)".' },
      { who: 'narrador', text: 'Esa noche, el foco pelón de la cochera se cambia por una serie de luces de Navidad.' },
    ],
  },
  {
    id: 'p_puntito', chapter: 0, trigger: 'milestone', place: 'cochera_luces',
    when: (s) => s.chapter >= 1 || (s.chapter === 0 && s.phase === 'milestone'),
    beats: [
      { who: 'papa', text: '(apuntando en su libreta) Por cierto. El sábado que viene cumple años Santi, el de la cuadra.' },
      { who: 'papa', text: 'Pidió "música con guitarra".' },
      { who: 'me', text: '¡¿Nuestro primer trabajo?! (Nina lo grita al mismo tiempo.)' },
      { who: 'juju', text: 'Señor Brillitos va a ir. Ya se compuso.' },
    ],
  },
  {
    id: 'p_pausa', chapter: 0, trigger: 'pause', place: 'cochera_apagada', repeat: true,
    when: (s) => s.phase === 'pause' && s.chapter === 0,
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Pasa en todas las bandas, hasta en las que llenan estadios.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué día empezó a bajar?' },
      { who: 'nina', text: 'Las bandas también se van de vacaciones. Y regresan con canciones nuevas.' },
      { who: 'juju', text: 'Yo los espero en primera fila. Ya estoy haciendo letrero nuevo.' },
    ],
  },
];
