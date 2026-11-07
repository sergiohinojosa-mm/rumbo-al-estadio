// Escenas del Capítulo 2 · Boletos agotados (HISTORIA_TMP §4.3). Esquema y campos: ver story/ch0.js.
// El baterista o la baterista se elige por audición (carta c2_audicion_bateria): Tambo, Vale o Emilio.
// Las escenas usan {teclas} y {bateria} (el nombre de quien eligió) y, si hace falta, {bateria.quirk}.
// Banderas que usan estas escenas (las ponen las cartas y js/data/triggers/ch2.js):
//   bateriaWeek   semana de la audición de batería      pago_grande   eligió el pago grande en c2_pedal
//   noche_canciones   ya hacen la "Noche de canciones nuevas"

const seen = (s, id) => (s.seenScenes || []).includes(id);
const played = (s, venue) => (s.history || []).some((h) => h.venue === venue);
// Solo cuando se cumplió el hito del capítulo 2 (no el del cap. 1, que también deja chapter = 2 en 'milestone').
const after2 = (s) => s.chapter >= 3 || (s.phase === 'milestone' && s.lastClose?.milestone?.chapter === 2);
const role = (s, r, id) => s.roles?.[r] === id;

export default [
  {
    id: 'c2_foro', chapter: 2, trigger: 'start', place: 'foro_cachito', screen: 'goals',
    when: (s) => s.chapter === 2,
    beats: [
      { who: 'rocio', text: '(sin quitarse los lentes oscuros) ¿Cuántas canciones propias tienen?' },
      { who: 'me', text: 'Ya no son puros covers. Y traemos una a medias.' },
      { who: 'rocio', text: 'La de a medias me la terminan. Les doy un sábado de prueba. 150 lugares. Si lo llenan, hablamos. El día que lo llenen, el plumón lo pongo yo.' },
      { who: 'teclas', text: 'Nos falta una cosa para llenar 150 lugares. Alguien en la batería.' },
      { who: 'papa', text: 'Y la meta del capítulo: 300 fans, llenar este foro y $3,000 ahorrados para grabar en un estudio.' },
    ],
  },
  {
    id: 'c2_audiciones', chapter: 2, trigger: 'start', place: 'cochera_audiciones',
    when: (s) => s.chapter === 2 && !s.roles?.bateria,
    beats: [
      { who: 'narrador', text: 'La cochera tiene otro letrero de Juju: "AUDICIONES HOY". Llegan tres.' },
      { who: 'narrador', text: 'Tambo trae una batería vieja y una cubeta. No hace solos. Cuando Nina se acelera, él la regresa al ritmo, y toca la canción entera sin perderse.' },
      { who: 'narrador', text: 'Vale llega corriendo de natación, con el pelo mojado y diez minutos tarde. Toca rapidísimo y hace girar las baquetas. Juju le aplaude de pie.' },
      { who: 'narrador', text: 'Emilio pone en el piso un metrónomo con forma de pingüino: un aparatito que marca el tiempo con un clic. Se aprendió la canción en un día, pero toca bajito, bajito.' },
      { who: 'tambo', text: 'Tranqui. Yo llevo el ritmo. ...¿Alguien trajo tortas?' },
    ],
  },
  {
    id: 'c2_llega_tambo', chapter: 2, trigger: 'week', place: 'cochera_bateria',
    when: (s) => s.chapter === 2 && role(s, 'bateria', 'tambo'),
    beats: [
      { who: 'tambo', text: '(acomodando su banco) ¿Dónde pongo la cubeta?' },
      { who: 'teclas', text: '¿Para qué quieres una cubeta si ya tienes batería?' },
      { who: 'tambo', text: 'La cubeta es para emergencias. Por si se me olvida la batería.' },
      { who: 'nina', text: 'Bienvenido a {banda}. Aquí también se nos olvidan cosas. A mí, las letras.' },
      { who: 'narrador', text: 'Vale entra a un equipo de natación que va a competencias y Emilio a la banda de guerra de la escuela. Los dos prometen ir al foro.' },
    ],
  },
  {
    id: 'c2_llega_vale', chapter: 2, trigger: 'week', place: 'cochera_bateria',
    when: (s) => s.chapter === 2 && role(s, 'bateria', 'vale'),
    beats: [
      { who: 'vale', text: '(llega corriendo, con el pelo mojado) ¡Perdón, perdón! La natación se alargó. ¿Ya empezamos?' },
      { who: 'teclas', text: 'Movemos el ensayo de las 5 a las 6. Así llegas sin correr.' },
      { who: 'vale', text: '¡Uno, dos, tres, cuatro y a volar!' },
      { who: 'nina', text: 'Vamos a volar... pero a mi velocidad, ¿sale?' },
      { who: 'narrador', text: 'Tambo arma una banda con su primo y los invita a comer tortas. Emilio entra a la banda de guerra de la escuela. Los dos prometen ir al foro.' },
    ],
  },
  {
    id: 'c2_llega_emilio', chapter: 2, trigger: 'week', place: 'cochera_bateria',
    when: (s) => s.chapter === 2 && role(s, 'bateria', 'emilio'),
    beats: [
      { who: 'emilio', text: '(pone su metrónomo de pingüino) Lo marco con el metrónomo y sale.' },
      { who: 'nina', text: '¿Y si tocas tantito más fuerte?' },
      { who: 'emilio', text: '...¿Más fuerte? ¿Se puede?' },
      { who: 'juju', text: '¡Se puede! ¡Yo lo hago todo el día!' },
      { who: 'narrador', text: 'Tambo arma una banda con su primo y los invita a comer tortas. Vale entra a un equipo de natación que va a competencias. Los dos prometen ir al foro.' },
    ],
  },
  {
    id: 'c2_ajuste', chapter: 2, trigger: 'start', place: 'cochera_bateria',
    when: (s) => s.chapter === 2 && !!s.roles?.bateria && s.flags?.bateriaWeek != null && s.week - s.flags.bateriaWeek >= 2,
    beats: [
      { who: 'narrador', text: 'Llevan dos semanas con {bateria} en la batería. Ya saben lo que trae a la banda... y lo que les cuesta.' },
      { who: 'papa', text: '(con su libreta) Cuando eligieron, sabían poquito. Ahora saben más. ¿Hay algo que ajustar?' },
      { who: 'nina', text: 'Sí: lo que nos cuesta trabajo, lo arreglamos juntos. Lo bueno, lo cuidamos.' },
      { who: 'papa', text: 'Decide con la información que tienes.', lesson: 'decide_info' },
      { who: 'bateria', text: '{bateria.line}' },
    ],
  },
  {
    id: 'c2_pulpo', chapter: 2, trigger: 'start', place: 'banqueta_foro',
    when: (s) => s.chapter === 2 && (s.weekInChapter || 1) >= 2 && (s.songs || []).length >= 3,
    beats: [
      { who: 'narrador', text: 'Afuera del foro hay un póster nuevo, pegado justito encima del suyo: "Pulpo Neón · mismo sábado · ¡boletos a mitad de precio!".' },
      { who: 'dafne', text: (s) => `(con tenis de plataforma brillantes) Ustedes son {banda}, los de la ${s.flags?.licuadora ? 'licuadora' : 'cochera'}, ¿no? Que gane el mejor show.` },
      { who: 'nina', text: '(cuando Dafne se va) ¿Eso fue amable o fue amenaza?' },
      { who: 'teclas', text: 'Fue las dos. Lo apunto.' },
    ],
  },
  {
    id: 'c2_medio', chapter: 2, trigger: 'after_show', place: 'foro_medio',
    when: (s) => s.chapter === 2 && s.last?.venue === 'foro' && s.last.attendance < s.last.cap * 0.75,
    beats: [
      { who: 'narrador', text: 'El sábado, El Foro Cachito está a la mitad. La otra mitad se fue a dos cuadras.' },
      { who: 'me', text: 'Bajamos el boleto a casi nada y ya. Así viene todo el mundo.' },
      { who: 'bateria', text: 'O tocamos increíble para los que sí vinieron.' },
      { who: 'narrador', text: 'Tocan. Juju grita como si estuviera lleno.' },
    ],
  },
  {
    id: 'c2_porque', chapter: 2, trigger: 'after_show', place: 'foro_salida',
    when: (s) => s.chapter === 2 && seen(s, 'c2_medio'),
    beats: [
      { who: 'me', text: '(a una fan) Oye, ¿por qué viniste hoy? Allá estaba más barato.' },
      { who: 'fan', text: (s) => `¡Por ${s.flags?.licuadora ? 'la canción de la licuadora' : 'sus canciones'}! Y porque mi prima los vio en el café y dijo que se reían cuando se equivocaban.` },
      { who: 'me', text: '(a la banda) Nadie dijo "porque estaba barato". Ni uno.' },
      { who: 'teclas', text: 'Entonces no vendemos barato. Vendemos lo que solo nosotros tenemos. Lo apunto: "Noche de canciones nuevas".' },
    ],
  },
  {
    id: 'c2_iker_escena', chapter: 2, trigger: 'after_show', place: 'foro_puerta',
    when: (s) => s.chapter === 2 && played(s, 'foro'),
    beats: [
      { who: 'iker', text: '¡Hola! Me sé todas sus canciones. Hasta la que no han sacado. La oigo desde la banqueta cuando ensayan.' },
      { who: 'juju', text: '(lo mira de arriba abajo, con su letrero) Yo soy la fan número uno.' },
      { who: 'iker', text: '...¿Y yo?' },
      { who: 'juju', text: 'Tú eres el número uno y medio.' },
      { who: 'iker', text: '(lo piensa) Acepto.' },
    ],
  },
  {
    id: 'c2_pago', chapter: 2, trigger: 'start', place: 'cocina_pagare',
    when: (s) => s.chapter === 2 && !!s.flags?.pago_grande,
    beats: [
      { who: 'me', text: '(pone billetes en la mesa) Pago. El más grande hasta hoy.' },
      { who: 'papa', text: 'Recibido. Apunto. ¿Saben cuánto les falta?' },
      { who: 'nina', text: 'Sí. Lo tienes tú en tu libreta. Con flechitas.' },
      { who: 'papa', text: '(tararea unas trompetas de boca horribles) Es la ceremonia oficial del pago grande.' },
      { who: 'juju', text: '¿Puedo poner otra huella de mermelada?' },
    ],
  },
  {
    id: 'c2_agotado', chapter: 2, trigger: 'milestone', place: 'foro_lleno',
    when: (s) => after2(s),
    beats: [
      { who: 'narrador', text: 'Sábado. Noche de canciones nuevas. Doña Rocío sale con un plumón grueso y escribe en la puerta: AGOTADO.' },
      { who: 'rocio', text: 'Les pedí canciones, no pretextos. Me trajeron canciones. Y el plumón lo puse yo.' },
      { who: 'narrador', text: 'En primera fila, Juju y su letrero. Junto a ella, Iker y el suyo. Más atrás, el Ingeniero Pacheco, con boleto.' },
      { who: 'dafne', text: '(al final, cruzada de brazos) Ok, ok... estuvo buenísimo. No se lo digas a nadie.' },
      { who: 'bateria', text: '(levanta las baquetas al aire) ¡AGOTADO! Esa palabra la quiero en mi pared.' },
    ],
  },
  {
    id: 'c2_alcancia', chapter: 2, trigger: 'milestone', place: 'cochera_alcancia',
    when: (s) => after2(s),
    beats: [
      { who: 'teclas', text: 'Ahorro para grabar: completo.' },
      { who: 'papa', text: 'Les conseguí una cita con Inés Salgado, del estudio Casa Eco. Una productora es quien dirige la grabación. Dice que no graba a nadie que no haya ensayado.' },
      { who: 'me', text: 'Entonces... ¿una más y ya?' },
      { who: 'narrador', text: 'Todos: ¡Una más y ya!' },
    ],
  },
  {
    id: 'c2_pausa', chapter: 2, trigger: 'pause', place: 'cochera_apagada', repeat: true,
    when: (s) => s.phase === 'pause' && s.chapter === 2,
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. Pasa en todas las bandas, hasta en las que llenan estadios.' },
      { who: 'papa', text: 'Primero, un abrazo. Luego, si quieres, revisamos juntos la libreta: ¿en qué semana empezó a bajar?' },
      { who: 'rocio', text: 'El foro no se va a ningún lado. Cuando regresen, el plumón sigue aquí.' },
      { who: 'nina', text: 'Las bandas también se van de vacaciones. Y regresan con canciones nuevas.' },
      { who: 'juju', text: 'Yo los espero en primera fila. Iker también. Pero yo más adelante.' },
    ],
  },
];
