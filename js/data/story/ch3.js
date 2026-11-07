// Escenas del Capítulo 3 · Primer sencillo (HISTORIA_TMP §3, cap. 3).
// Esquema: { id, chapter, when(s), trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place, beats: [ { who, text, voice? } ] }
// De 2 a 5 globos por escena. `who`: id de cast.js, 'me' (la jugadora), 'narrador' o un rol ('teclas' | 'bateria').
// `voice` (opcional) marca el globo donde Papá dice su frase aprobada, palabra por palabra: la UI puede tocar su audio.
// Orden del capítulo:
//   ch3-apertura (start) · momentos: ch3-demo, ch3-bajista, ch3-mitad y ch3-portada (dos semanas después de grabar)
//   tropiezo: ch3-tropiezo-tomas (si la primera grabación tuvo más de 6 tomas) o ch3-tropiezo, la semana después de grabar
//   gracioso: ch3-ya, justo después del tropiezo
//   hito: ch3-hito (milestone) · descanso: ch3-descanso (pause)
// Las lecciones de las escenas (diferencia, mitad_camino, error_bonito) las descubre triggers/ch3.js con los números
// de la partida en la misma semana en que se vio la escena.

const seen = (s, id) => (s.seenScenes || []).includes(id);
const inCh = (s) => s.chapter === 3;
const recs = (s) => (s.recorded || []).length;
const wk = (s) => s.weekInChapter || 1;
// Lo que pasó en el estudio se lee del estado (s.recorded), así las escenas no dependen de los triggers.
const firstRec = (s) => (s.recorded || [])[0] || null;
const firstRecWeek = (s) => firstRec(s)?.week ?? Infinity;
const muchasTomas = (s) => (firstRec(s)?.takes || 0) > 6 || !!s.flags?.ch3_muchas_tomas;
const tropezo = (s) => seen(s, 'ch3-tropiezo') || seen(s, 'ch3-tropiezo-tomas');
// El tropiezo sale la semana siguiente a la primera grabación (no la misma: esa semana ya trae el estudio).
const afterRecWeek = (s) => s.week > firstRecWeek(s);
// Las dos semanas después de grabar ya traen escenas del estudio (tropiezo y portada): la libreta espera.
const studioWeek = (s) => s.week === firstRecWeek(s) + 1 || s.week === firstRecWeek(s) + 2;

export const SCENES = [
  {
    id: 'ch3-apertura', chapter: 3, trigger: 'start', place: 'estudio',
    when: (s) => inCh(s) && wk(s) <= 1,
    beats: [
      { who: 'narrador', text: 'Estudio Casa Eco. Un cuarto lleno de cables, con alfombras pegadas en las paredes y una consola con más botones que un avión.' },
      { who: 'ines', text: 'Soy Inés. Una productora es quien dirige la grabación y decide con la banda cómo debe sonar. Regla número uno: cuando se prende el foco rojo, estamos grabando.' },
      { who: 'narrador', text: 'Inés prende el foco rojo de GRABANDO. Nadie se mueve. Juju se tapa la boca con las dos manos. Hasta {bateria} se queda con las baquetas quietas en el aire.' },
      { who: 'bateria', text: '(en susurro) ¿Ya puedo respirar?' },
      { who: 'papa', text: 'Meta del capítulo: 1,500 fans, grabar su primer sencillo, la canción que sale primero para que la gente los conozca, y llenar el Foro Indie Rocks, 600 lugares. Se llama Rocks, pero ahí también tocan bandas de pop.' },
    ],
  },
  {
    id: 'ch3-demo', chapter: 3, trigger: 'week', place: 'estudio',
    when: (s) => inCh(s) && seen(s, 'ch3-apertura'),
    beats: [
      { who: 'ines', text: 'Tengo dos formas de trabajar. Un día completo en el estudio grande, por $8,000. O medio día en el estudio chico, por $3,000, para grabar un demo: una prueba cortita de la canción, para oír qué le falta.' },
      { who: 'me', text: '¿Y si la grabamos con el celular en la cochera? Es gratis.' },
      { who: 'ines', text: 'Se puede. Pero se va a oír a cochera. Con todo y los ronquidos de la siesta del Ingeniero Pacheco.' },
      { who: 'teclas', text: 'Ya hice cuentas. Les enseño cuánto hay en el ahorro antes de que alguien diga "todo el día".' },
      { who: 'papa', text: 'Yo no decido. ¿Y tú qué harías?' },
    ],
  },
  {
    id: 'ch3-bajista', chapter: 3, trigger: 'week', place: 'estudio',
    when: (s) => inCh(s) && seen(s, 'ch3-demo') && wk(s) >= 2 && recs(s) === 0,
    beats: [
      { who: 'narrador', text: 'El bajista que contrató Inés manda un mensaje: tiene gripa y no va a poder venir.' },
      { who: 'ines', text: 'Sin bajo, la canción suena flaquita. Como sopa sin fideos.' },
      { who: 'narrador', text: 'En la recepción, alguien levanta la vista de su tarea de mate. Trae un bajo verde limón, con stickers de dinosaurios, colgado en la espalda. Es más grande que su mochila.' },
      { who: 'narrador', text: 'Dice que se sabe la canción: la oyó por la pared toda la semana. Y la toca. Entera. Sin ver.' },
      { who: 'nina', text: '¿Cómo que te la sabes? ¡Si ni ha salido!' },
    ],
  },
  {
    id: 'ch3-mitad', chapter: 3, trigger: 'week', place: 'cocina',
    when: (s) => inCh(s) && seen(s, 'ch3-apertura') && wk(s) >= 3 && !studioWeek(s),
    beats: [
      { who: 'narrador', text: 'Domingo en la cocina. Papá abre su libreta en la página que dice "CAPÍTULO 3" y la pone en medio de la mesa.' },
      { who: 'papa', text: 'Ya vamos a la mitad del capítulo. Antes de seguir, revisemos juntos: ¿qué shows trajeron más fans y cuáles casi nada?' },
      { who: 'nina', text: 'Yo digo que repitamos lo que sí funcionó. Y lo que no, lo dejamos en la libreta, de recuerdo.' },
      { who: 'papa', text: 'A mitad del camino, revisa el mapa.', voice: 'mitad_camino' },
      { who: 'juju', text: '¿Puedo pintar el mapa? Con brillitos. Señor Brillitos dice que sí.' },
    ],
  },
  {
    // Tropiezo (versión con muchas tomas): solo si la grabación tuvo más de 6 tomas.
    id: 'ch3-tropiezo-tomas', chapter: 3, trigger: 'week', place: 'estudio',
    when: (s) => inCh(s) && recs(s) >= 1 && afterRecWeek(s) && muchasTomas(s) && !seen(s, 'ch3-tropiezo'),
    beats: [
      { who: 'narrador', text: '{nombre} quería la toma perfecta. Fueron tantas tomas que a Nina se le fue la voz y se acabaron las horas pagadas.' },
      { who: 'nina', text: '(con voz de pato ronco) Una más y... no. Ya no puedo ni decir "ya".' },
      { who: 'narrador', text: 'Y encima, cuando Inés pone la mezcla (todos los instrumentos juntos en una sola canción), suena igualita a "Corazón de Chicle", la canción de moda.' },
      { who: 'ines', text: 'Bonito no basta: tiene que sonar a ustedes.' },
      { who: 'nina', text: '(ronca) Y Pulpo Neón saca una igualita con boletos a mitad de precio. ¿Bajamos el nuestro para ganarles?' },
      { who: 'papa', text: 'Compite con lo que te hace distinta, no solo con precio.', voice: 'diferencia' },
    ],
  },
  {
    // Tropiezo (versión de siempre): la mezcla suena a la canción de moda.
    id: 'ch3-tropiezo', chapter: 3, trigger: 'week', place: 'estudio',
    when: (s) => inCh(s) && recs(s) >= 1 && afterRecWeek(s) && !muchasTomas(s) && !seen(s, 'ch3-tropiezo-tomas'),
    beats: [
      { who: 'narrador', text: 'Inés pone la mezcla en las bocinas grandes. La mezcla es cuando se juntan todos los instrumentos en una sola canción.' },
      { who: 'me', text: '...¿Por qué suena igualita a "Corazón de Chicle"?' },
      { who: 'nina', text: 'Está bonita. Pero suena a la radio, no a nosotros.' },
      { who: 'ines', text: 'Bonito no basta: tiene que sonar a ustedes.' },
      { who: 'me', text: 'Y Pulpo Neón saca una igualita con boletos a mitad de precio. ¿Bajamos el nuestro para ganarles?' },
      { who: 'papa', text: 'Compite con lo que te hace distinta, no solo con precio.', voice: 'diferencia' },
    ],
  },
  {
    // Momento gracioso: el "¡YA!" de Juju. Sale justo después del tropiezo, para reírse después del susto.
    id: 'ch3-ya', chapter: 3, trigger: 'week', place: 'estudio',
    when: (s) => inCh(s) && tropezo(s) && afterRecWeek(s),
    beats: [
      { who: 'narrador', text: 'Inés pone la grabación. Todo va perfecto hasta justo antes del coro, cuando se oye clarito, fuertísimo: "¡YA!".' },
      { who: 'juju', text: '(escondida detrás de Señor Brillitos) ...Se me salió. Tenía prohibido hablar. Fue la emoción.' },
      { who: 'narrador', text: 'Todos se congelan. Nina con la boca abierta. {nombre} con la púa en el aire. Inés la escucha otra vez. Y otra.' },
      { who: 'ines', text: 'Se queda.' },
      { who: 'juju', text: 'Si se oye bonito, aunque sea un error, se queda.' },
    ],
  },
  {
    id: 'ch3-portada', chapter: 3, trigger: 'week', place: 'cocina',
    when: (s) => inCh(s) && tropezo(s) && (s.week >= firstRecWeek(s) + 2 || (s.m?.fans || 0) >= 1200),
    beats: [
      { who: 'narrador', text: 'Ya grabaron. Ahora falta la portada del sencillo, y hay dos fotos sobre la mesa.' },
      { who: 'narrador', text: 'Una es de catálogo: modelos parecidos a ustedes, pero más brillosos. La otra es de {hermana}: los cuatro en la cochera, despeinados, con Juju asomándose por la puerta.' },
      { who: 'hermana', text: 'La mía no tiene brillitos. Pero son ustedes.' },
      { who: 'juju', text: 'En la otra no salgo. Exijo salir.' },
    ],
  },
  {
    id: 'ch3-hito', chapter: 3, trigger: 'milestone', place: 'indie',
    when: (s) => s.lastClose?.milestone?.chapter === 3,
    beats: [
      { who: 'narrador', text: 'Foro Indie Rocks, 600 personas y luces de colores de verdad. Antes de que salgan, ponen el sencillo en las bocinas.' },
      { who: 'narrador', text: 'Justo antes del coro, 600 personas gritan al mismo tiempo: "¡YA!".' },
      { who: 'juju', text: '(tapándose la boca) ¡Ese es MÍO! ¡Yo lo inventé!' },
      { who: 'narrador', text: 'En la última fila, alguien con un bajo verde limón en la espalda mueve la cabeza al ritmo. (¿Dónde has visto ese bajo?) Mamá pega el póster nuevo: la portada con los cuatro y un globito chiquito que dice "¡YA!".' },
      { who: 'papa', text: '(en la cena, viendo su celular) Oigan. Alguien en Guadalajara está escuchando su canción. Mucho.' },
    ],
  },
  {
    id: 'ch3-descanso', chapter: 3, trigger: 'pause', place: 'estudio', repeat: true,
    when: (s) => inCh(s) && s.phase === 'pause',
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Inés apaga el foco rojo de GRABANDO. Pasa en todas las bandas, hasta en las que llenan estadios.' },
      { who: 'ines', text: 'Las canciones también tienen silencios. Sin ellos, todo sería puro ruido.' },
      { who: 'teclas', text: 'Guardé la sesión en la computadora del estudio. La canción nos espera ahí, quietita.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué semana empezó a bajar?' },
      { who: 'juju', text: 'Yo cuido el foco rojo mientras regresan. Nadie lo prende sin mí.' },
    ],
  },
];

export default SCENES;
