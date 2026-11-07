// Escenas del Capítulo 4 · Sonando en todos lados (HISTORIA_TMP §3, cap. 4).
// Esquema: { id, chapter, when(s), trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place, beats: [ { who, text, voice? } ] }
// De 2 a 5 globos por escena. `who`: id de cast.js, 'me' (la jugadora), 'narrador' o un rol ('teclas' | 'bateria').
// `voice` (opcional) marca el globo donde Papá dice su frase aprobada, palabra por palabra.
// Orden del capítulo:
//   ch4-apertura (start) · momentos: ch4-reparto, ch4-max, ch4-cambios, ch4-dafne (cada uno antes de su carta)
//   tropiezo: ch4-tropiezo (el segundo sencillo no pega; los fans piden la acústica) → carta C4-06
//   gracioso: ch4-super · hito: ch4-hito (milestone) · descanso: ch4-descanso (pause)
// cuida_fans la descubre triggers/ch4.js cuando cruzan las 100 mil reproducciones, con sus números.

const seen = (s, id) => (s.seenScenes || []).includes(id);
const inCh = (s) => s.chapter === 4;
const wk = (s) => s.weekInChapter || 1;
// Cada momento espera a que se decida la carta del anterior, para que cada semana tenga una sola decisión de historia.
const card = (s, id) => (s.seenCards || []).includes(id);

export const SCENES = [
  {
    id: 'ch4-apertura', chapter: 4, trigger: 'start', place: 'sala',
    when: (s) => inCh(s) && wk(s) <= 1,
    beats: [
      { who: 'papa', text: '(gritando desde la sala, con el celular en la mano) ¡Nos puso en su lista una cuenta de Guadalajara!' },
      { who: 'narrador', text: 'Mientras cenan, el contador de reproducciones no deja de subir. Cada vez que alguien escucha su canción, cuenta como una reproducción.' },
      { who: 'papa', text: '(con una alcancía y un puño de monedas de 10 centavos) Esto se llama regalías: lo que les pagan cada vez que alguien escucha su canción. Les toca un pedacito cada vez. Por cada mil veces, unos 65 pesos.' },
      { who: 'juju', text: '¿Y si yo la escucho mil veces?' },
      { who: 'papa', text: 'Te va a doler la oreja, pero sí cuenta. Meta del capítulo: 5,000 fans, 100,000 reproducciones y una decisión grande: disquera o independientes. Ya les explico qué es eso.' },
    ],
  },
  {
    id: 'ch4-reparto', chapter: 4, trigger: 'week', place: 'cocina',
    when: (s) => inCh(s) && seen(s, 'ch4-apertura') && (s.royalties || 0) > 0,
    beats: [
      // Las regalías ya llegaban desde el cap. 3 (el cierre las muestra): aquí Papá las junta todas para repartirlas.
      { who: 'narrador', text: (s) => `Papá junta en un sobre todas las regalías que han llegado desde que grabaron: $${Math.round(s.royalties || 0).toLocaleString('es-MX')}. Llegaron solitas: nadie tuvo que tocar. Pone el sobre en medio de la mesa.` },
      { who: 'papa', text: '¿Cómo lo repartimos? Ustedes deciden. Yo nomás apunto.' },
      { who: 'me', text: '(bajito) Yo empecé la banda. ¿No me toca un poquito más?' },
      { who: 'nina', text: '...Yo también la empecé. ¿Te acuerdas de la idea gigantísima?' },
      { who: 'mama', text: 'Antes de que alguien se enoje, siéntense todos. Vamos a hacer las cuentas en voz alta.' },
    ],
  },
  {
    id: 'ch4-max', chapter: 4, trigger: 'week', place: 'cochera',
    when: (s) => inCh(s) && seen(s, 'ch4-apertura') && wk(s) >= 2 && !s.label && (card(s, 'C4-01') || wk(s) >= 4),
    beats: [
      { who: 'narrador', text: 'Llega un señor de traje morado brillante y lentes con estrellitas. Trae una tablet con un contrato (lo que promete cada lado, por escrito) tan largo que se desenrolla hasta el piso.' },
      { who: 'max', text: 'Max Ferrer, de Discos Galaxia. Una disquera es una compañía que paga para grabar y anunciar canciones, y a cambio se queda con una parte de lo que ganan. Y su canción... ¡es un hit! Bueno... con unos cambiecitos.' },
      { who: 'max', text: 'Les doy un adelanto: dinero que les pago hoy, a cuenta de lo que van a ganar después. Y su canción va a sonar en todos lados.' },
      { who: 'papa', text: '(leyendo las letras chiquitas con lupa) Mientras la disquera recupera el adelanto, a ustedes les tocan 18 de cada 100 pesos. Y la disquera se queda con el master: la grabación original.' },
      { who: 'me', text: '¿Y si no firmamos?' },
    ],
  },
  {
    // Firmaron con Discos Galaxia (completo o negociado): Max pide cambios para la siguiente canción.
    id: 'ch4-cambios', chapter: 4, trigger: 'week', place: 'cochera',
    when: (s) => inCh(s) && seen(s, 'ch4-max') && (card(s, 'C4-02') || !!s.label) && s.label !== 'indie' && !seen(s, 'ch4-cambios-indie'),
    beats: [
      { who: 'narrador', text: 'Max Ferrer vuelve a llamar. Ofrece pagarles más por la siguiente canción... con "unos cambiecitos".' },
      { who: 'max', text: 'Uno: alguien en la batería con más seguidores. Dos: que la canción diga que la compuso alguien de la disquera. Se vende mejor, créanme.' },
      { who: 'narrador', text: 'Silencio total en la cochera. Todos voltean hacia la batería, donde {bateria} deja las baquetas en el piso, despacito.' },
      { who: 'nina', text: '¿Que diga que la compuso otro? ¡Pero si la inventamos aquí, con la lonchera de testigo!' },
    ],
  },
  {
    // Siguieron independientes: Max no se rinde y vuelve con una oferta más grande, con condiciones.
    id: 'ch4-cambios-indie', chapter: 4, trigger: 'week', place: 'cochera',
    when: (s) => inCh(s) && seen(s, 'ch4-max') && s.label === 'indie' && !seen(s, 'ch4-cambios'),
    beats: [
      { who: 'narrador', text: 'Max Ferrer vuelve a llamar. No se rinde: "Si firman ahora, les pago más. Nomás con dos cambiecitos".' },
      { who: 'max', text: 'Uno: alguien en la batería con más seguidores. Dos: que la canción diga que la compuso alguien de la disquera. Se vende mejor, créanme.' },
      { who: 'narrador', text: 'Silencio total en la cochera. Todos voltean hacia la batería, donde {bateria} deja las baquetas en el piso, despacito.' },
      { who: 'nina', text: '¿Que diga que la compuso otro? ¡Pero si la inventamos aquí, con la lonchera de testigo!' },
    ],
  },
  {
    id: 'ch4-dafne', chapter: 4, trigger: 'week', place: 'cochera',
    when: (s) => inCh(s) && seen(s, 'ch4-apertura') && wk(s) >= 3 && (card(s, 'C4-03') || wk(s) >= 6),
    beats: [
      { who: 'dafne', text: '(con sus tenis de plataforma brillantes) Oigan. Tengo una idea, y no se rían. ¿Y si grabamos una canción juntas? Pulpo Neón y {banda}.' },
      { who: 'nina', text: '¿Juntas? ¿Las rivales?' },
      { who: 'dafne', text: 'Rivales de precio, ya no. Ok, ok... me caen bien. No se lo digan a nadie.' },
      { who: 'hermana', text: 'O hacemos un video con los fans bailando en la cochera. Yo lo grabo y Papá lo publica.' },
    ],
  },
  {
    // Tropiezo: el segundo sencillo no pega. Se levantan escuchando a los fans en la fila de firmas.
    id: 'ch4-tropiezo', chapter: 4, trigger: 'week', place: 'cochera',
    when: (s) => inCh(s) && seen(s, 'ch4-apertura') && wk(s) >= 4 && (card(s, 'C4-04') || wk(s) >= 7),
    beats: [
      // "Segundo sencillo" solo si grabaron dos canciones; si no, es la canción nueva que suben en video.
      { who: 'narrador', text: (s) => ((s.recorded || []).length >= 2 ? 'Sale su segundo sencillo. Pasa una semana entera y el contador casi no se mueve.' : 'Suben un video de su canción nueva, tocada en la cochera. Pasa una semana entera y el contador casi no se mueve.') },
      { who: 'papa', text: '(leyendo los comentarios en su celular) Uno dice: "suena igual al primero". Otro dice: "¿y la acústica de {cancion1} para cuándo?".' },
      { who: 'me', text: 'Ya se nos acabó la suerte.' },
      { who: 'narrador', text: 'Aun así, esa noche se quedan a firmar después del show, como siempre. En la fila, tres fans distintos piden lo mismo: la versión acústica de "{cancion1}".' },
      { who: 'hermana', text: 'Los fans ya nos dijeron qué quieren. Nomás hay que escucharlos.' },
    ],
  },
  {
    // Momento gracioso: su canción en el súper.
    id: 'ch4-super', chapter: 4, trigger: 'week', place: 'super',
    when: (s) => inCh(s) && seen(s, 'ch4-apertura') && wk(s) >= 3 && ((s.streams || 0) >= 30000 || wk(s) >= 5),
    beats: [
      { who: 'narrador', text: 'Sábado en el súper, sección de frutas. De las bocinas del techo sale... ¡su canción!' },
      { who: 'juju', text: '(gritando) ¡SOMOS NOSOTROS! ¡SEÑOR BRILLITOS, SOMOS NOSOTROS!' },
      { who: 'narrador', text: 'Sin pensarlo, {bateria} agarra dos pepinos y se pone a tocar en la báscula de las manzanas. Una señora empieza a bailar con su carrito.' },
      { who: 'narrador', text: 'El gerente del súper se acerca muy serio: "¿Me firman un autógrafo? Nomás traigo este ticket".' },
      { who: 'nina', text: 'Firmado. Pepinos: dos. Canciones: una. Fans nuevos: un gerente.' },
    ],
  },
  {
    id: 'ch4-hito', chapter: 4, trigger: 'milestone', place: 'cochera',
    when: (s) => s.lastClose?.milestone?.chapter === 4,
    beats: [
      { who: 'narrador', text: '¡100,000 reproducciones! Fiesta en la cochera, con las series de Navidad prendidas y Señor Brillitos con corbatita.' },
      { who: 'papa', text: '(colgando un marco en la pared) El papelito de las primeras regalías, enmarcado. Eran unos cientos de pesos, pero llegaron solitos. Y el primero es el primero.' },
      { who: 'narrador', text: 'Llega la placa de 100 mil: un cuadro con un disco que les dan cuando una canción llega a un número muy grande. Mamá ya rediseñó el logo para el póster nuevo.' },
      { who: 'narrador', text: 'Esa noche, de regreso a casa, ven su póster en un parabús de Reforma. Juju le da un beso al vidrio.' },
      { who: 'memo', text: '(tocando el claxon afuera de la cochera) Soy Don Memo y esta es La Burra, la camioneta de la gira. ¿A dónde vamos?' },
    ],
  },
  {
    id: 'ch4-descanso', chapter: 4, trigger: 'pause', place: 'cochera', repeat: true,
    when: (s) => inCh(s) && s.phase === 'pause',
    beats: [
      { who: 'narrador', text: 'La banda se toma un descanso. La cochera está en silencio... pero el contador de reproducciones sigue subiendo poquito a poquito.' },
      { who: 'papa', text: 'Apunto: aunque estén descansando, alguien está escuchando su canción ahorita. Primero, un abrazo. Luego, si quieres, revisamos juntos en qué semana empezó a bajar.' },
      { who: 'juju', text: 'Es Señor Brillitos. La está escuchando él. Por eso sube.' },
      { who: 'mama', text: 'Descansar también es ensayar. Y esta semana, nadie ensaya.' },
    ],
  },
];

export default SCENES;
