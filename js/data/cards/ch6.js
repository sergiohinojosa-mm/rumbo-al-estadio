// Cartas del Capítulo 6 · Palacio de los Deportes (HISTORIA_TMP §3, cap. 6 y tabla 3.0, lecciones 29 a 33).
// Esquema (DISENO §7.3): { id, chapter, weight, when(s), who, title, text, tip, remind?,
//   options: [ { label, effects: { fans, caja, talent, mood, ahorro, flag, promise }, verdict, why, lesson? } ], after? }
// effects en pasos enteros de -3 a +3 (el motor los escala). `after` = lo que dice alguien después de decidir.
//
// Mecánica nueva: equipo de producción (luces, sonido y pantallas), contratos de foro grande, precio del
// boleto cuando muchísima gente quiere ir y el costo de cancelar (reembolso: devolver el dinero).
// Lecciones que se descubren aquí: exito (c6_hormiguitas), verdad_tiempo (c6_nina_voz), mentora (c6_nina_guitarra).
// fan_visto y nervios se descubren en escenas (story/ch6.js). Recordatorios: guerra_precios (c6_precios),
// agua_aplausos (c6_nina_voz) y practica (c6_nina_guitarra, lo aplica triggers/ch6.js).

import { forecast } from '../../engine/show.js';

const ch6 = (s) => s.chapter === 6;
const playedCh6 = (s) => (s.history || []).some((h) => h.chapter === 6);
// "Ya tienen fecha para el Palacio": 25,000 fans y, al precio justo, llegarían al menos 70 de cada 100 lugares. El
// Palacio se puede elegir desde 85 de cada 100 (venues.js fillGate); estas cartas salen un poco antes, cuando ya casi
// abre (si se espera solo a que abra, a veces se llenaba esa misma semana y Nina sin voz ya no salía).
const palacioOpen = (s) => (s.m?.fans || 0) >= 25000 && forecast(s, { venueId: 'palacio' }).expected >= 24500 * 0.7;
const palacioDone = (s) => !!s.flags?.soldOut_palacio;

export const CARDS = [
  // ——— Momento 1: lo que funcionaba ya no funciona · lección exito ———
  {
    id: 'c6_hormiguitas', chapter: 6, weight: 8, who: 'hermana',
    when: (s) => ch6(s) && playedCh6(s),
    title: 'Hormiguitas',
    text: 'Tocaron en un foro grande con el mismo show de los foros chicos. Los de hasta atrás los veían como hormiguitas y aplaudían con flojera. Lo que en un foro chico se sentía calientito, aquí se sintió frío.',
    tip: '💡 Si cambió el tamaño del lugar, ¿qué tiene que cambiar en el show?',
    options: [
      { label: '🔊 El mismo show, pero más fuerte',
        effects: { mood: -1 }, verdict: 'bad', lesson: { discover: 'exito' },
        why: '💡 La próxima vez cambia el show cuando cambia el lugar, porque más volumen no hizo que los de hasta atrás los vieran.' },
      { label: '🎪 Un escenario chiquito al fondo, cerca de los de atrás',
        effects: { fans: 2, caja: -1, flag: 'escenarioChico' }, verdict: 'good', lesson: { discover: 'exito' },
        why: '✅ ¡Gran decisión! Los de hasta atrás gritaron como si estuvieran en primera fila, porque llevaste el show hasta donde estaban ellos.' },
      { label: '📺 Pantallas con fotos de {hermana} y la "cámara del letrero"',
        effects: { fans: 2, caja: -2, mood: 1, flag: 'camaraLetrero' }, verdict: 'good', lesson: { discover: 'exito' },
        why: '✅ ¡Gran decisión! Todos vieron sus caras y sus letreros en grande, porque usaste las pantallas para acercar a la gente. Cuesta más que el escenario chiquito: si la caja está justa, empieza por ese.' },
    ],
    after: { who: 'papa', text: 'El éxito de ayer no garantiza el de mañana.', voice: 'exito' },
  },

  // ——— Momento 2: boletos para 24,500 · recordatorio guerra_precios ———
  {
    id: 'c6_precios', chapter: 6, weight: 5, who: 'papa', remind: 'guerra_precios',
    when: (s) => ch6(s) && !palacioDone(s) && (s.m?.fans || 0) >= 20000,
    title: 'Boletos para 24,500',
    text: 'Hay que ponerle precio a los boletos del Palacio. Muchísima gente quiere ir: eso es mucha demanda. Si todos son caros, los fans chicos no alcanzan. Si todos son baratísimos, no alcanza para pagar las luces y el sonido.',
    tip: '💡 Piensa en tus fans de todos los tamaños de alcancía. ¿Hay una forma de que quepan todos?',
    options: [
      { label: '🪙 Todos baratísimos, para que vengan todos',
        effects: { fans: 1, caja: -2 }, verdict: 'bad',
        why: '💡 La próxima vez cobra lo justo, porque se acabaron en un minuto, casi no alcanzó para la producción, y bajar el precio es fácil, pero volver a subirlo no.' },
      { label: '🏟️ Zonas: abajo más caro y hasta arriba una zona económica para fans chicos',
        effects: { caja: 1, fans: 2, mood: 1, flag: 'preciosZonas' }, verdict: 'good', lesson: { apply: 'guerra_precios' },
        why: '✅ ¡Gran decisión! Se pagó la producción y los fans chicos también entraron, porque cada quien eligió el lugar que su alcancía aguanta.' },
      { label: '💎 Todos caros: hay mucha demanda',
        effects: { caja: 2, fans: -1, mood: -1 }, verdict: 'ok',
        why: '💡 La próxima vez deja lugares para todos, porque se vendieron, pero Iker y su club no alcanzaron boleto. Otra pista: caro funciona en un show chiquito y especial, no en uno para todos tus fans.' },
    ],
    after: { who: 'teclas', text: 'Hice una gráfica de zonas. Arriba, de color verde. Verde es el de las buenas noticias.' },
  },

  // ——— Momento 3a: el contrato del Palacio ———
  {
    id: 'c6_contrato', chapter: 6, weight: 5, who: 'papa', remind: 'negocia',
    when: (s) => ch6(s) && !palacioDone(s) && (s.m?.fans || 0) >= 20000,
    title: 'El contrato del Palacio',
    text: 'El contrato del Palacio, lo que promete cada lado por escrito, tiene 14 hojas. Papá lo lee con {nombre}: el Palacio se queda con parte de cada boleto, y si el show se cancela, la banda paga lo gastado.',
    tip: '💡 Antes de firmar, busca la parte que dice qué pasa si algo sale mal.',
    options: [
      { label: '🔍 Leerlo todo con Papá y preguntar lo que no entendamos',
        effects: { caja: 1, flag: 'contratoLeido' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Encontraron un cobro escondido y lo quitaron, porque leyeron las letras chiquitas antes de firmar.' },
      { label: '✍️ Firmar rápido: ya queremos tocar',
        effects: { mood: 1, caja: -2 }, verdict: 'bad',
        why: '💡 La próxima vez lee todo antes de firmar, porque en la hoja 12 había un cobro por "limpieza de confeti" que nadie había visto.' },
      { label: '🗓️ Pedir una fecha de respaldo por si alguien se enferma',
        effects: { caja: -1, mood: 2, flag: 'fechaRespaldo' }, verdict: 'good', lesson: { apply: 'negocia' },
        why: '✅ ¡Gran decisión! Si algo sale mal, ya hay un plan, porque negociaste antes de necesitarlo. Cuesta un poquito más, pero da tranquilidad.' },
    ],
    after: { who: 'papa', text: 'Apunto: hoja 12, limpieza de confeti. La próxima vez ya sabemos dónde buscar.' },
  },

  // ——— Momento 3b: ¿cuánta producción? (sin lección: decisión de dinero con regla) ———
  {
    id: 'c6_produccion', chapter: 6, weight: 5, who: 'papa',
    when: (s) => ch6(s) && !palacioDone(s),
    title: '¿Cuánta producción?',
    text: 'La producción es todo lo que hace que un show grande se vea y se oiga. Hay tres paquetes: el grande, con fuegos y pantallas enormes; el mediano, con buen sonido y dos pantallas; y el de siempre: su equipo.',
    tip: '💡 Pregúntate: ¿cuánta gente te va a ver desde lejos?',
    options: [
      { label: '🎆 El grande, con todo',
        effects: { fans: 2, caja: -3 }, verdict: 'ok',
        why: '💡 La próxima vez paga lo que el lugar necesita, porque los fuegos se veían increíbles, pero se comieron casi toda la ganancia. Otra pista: en un estadio sí vale la pena; en el Palacio, con menos alcanza.' },
      { label: '🎹 El de siempre, con los sonidos de {teclas}',
        effects: { mood: 2, caja: -1, fans: -1 }, verdict: 'ok',
        why: '💡 La próxima vez, en un lugar enorme, suma pantallas, porque los sonidos raros se oyeron lindos, pero los de hasta atrás no veían nada. Otra pista: en un foro chico, el de siempre gana.' },
      { label: '📺 El mediano: buen sonido y dos pantallas',
        effects: { fans: 2, talent: 1, caja: -2, flag: 'produccionMediana' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Hasta la última fila los vio y los oyó, porque pagaste lo que necesita un lugar de 24,500.' },
    ],
    after: { who: 'teclas', text: 'Igual voy a meter un sonido raro. Uno chiquito. Nadie se va a dar cuenta.' },
  },

  // ——— Momento 4: Nina sin voz · lección verdad_tiempo (Abuela) · recordatorio agua_aplausos ———
  {
    id: 'c6_nina_voz', chapter: 6, weight: 8, who: 'alma', remind: 'agua_aplausos',
    when: (s) => ch6(s) && palacioOpen(s) && !palacioDone(s),
    title: 'Nina sin voz',
    text: 'A tres días del Palacio, a Nina le sale un hilito de voz, como de ratón. El doctor dice: nada de cantar en una semana. Si cambian la fecha, hay reembolso: devolverle su dinero a quien no pueda venir.',
    tip: '💡 ¿Qué va primero, la voz de Nina o el show? Y si algo cambia, ¿cuándo conviene avisarle a la gente?',
    options: [
      { label: '🎤 Que Nina cante de todos modos',
        effects: { caja: 1, mood: -3, flag: 'palacioForzo' }, verdict: 'bad', lesson: { discover: 'verdad_tiempo' },
        why: '💡 La próxima vez cuida la voz primero, porque Nina cantó con dolor, la voz se le rompió y de todos modos hubo que cambiar la fecha.' },
      { label: '📢 Posponer, decir la verdad y devolver el dinero',
        effects: { caja: -2, mood: 1, fans: 1, flag: 'palacioPospuesto' }, verdict: 'good', lesson: { discover: 'verdad_tiempo' },
        why: '✅ ¡Gran decisión! Nina se curó y los fans se sintieron respetados, porque les dijiste la verdad a tiempo. Devolver dinero cuesta, pero la confianza vale más.' },
      { label: '🙌 Hacer el show con el público cantando las partes de Nina',
        effects: { fans: 2, mood: 1, talent: -1, flag: 'palacioCoro' }, verdict: 'good', lesson: { discover: 'verdad_tiempo' },
        why: '✅ ¡Gran decisión! El público cantó por Nina y fue una noche única, porque avisaste antes y cuidaste su voz sin cancelar. 💡 Funciona si los fans se saben todas las canciones; si no, mejor posponer.' },
    ],
    after: { who: 'alma', text: 'Decir la verdad a tiempo también es cuidar.' },
  },

  // ——— Momento 5: una niña con guitarra · lección mentora · recordatorio practica ———
  {
    id: 'c6_nina_guitarra', chapter: 6, weight: 5, who: 'me', remind: 'practica',
    // Nina sin voz solo puede salir antes del Palacio: si ya se puede, sale primero (esta carta espera una semana).
    when: (s) => ch6(s) && playedCh6(s) && !(palacioOpen(s) && !palacioDone(s) && !(s.seenCards || []).includes('c6_nina_voz')),
    title: 'Una niña con guitarra',
    text: 'En la firma de autógrafos, una niña de 9 años con una guitarra más grande que ella le pregunta a {nombre}: "¿Cómo se empieza? A mí todo me sale feo". Atrás hay una fila larguísima.',
    tip: '💡 Acuérdate de cómo empezaste tú. ¿Qué te ayudó a ti?',
    options: [
      { label: '⚡ Tocárselo una vez a toda velocidad',
        effects: { fans: 1, mood: 1 }, verdict: 'ok', lesson: { discover: 'mentora' },
        why: '💡 La próxima vez enséñalo despacito, porque a toda velocidad la niña nomás vio dedos volando. Primero lento, luego rápido.' },
      { label: '🐢 Enseñarle el truco: el riff a la mitad de velocidad',
        effects: { mood: 2, fans: 1, flag: 'ensenoRiff' }, verdict: 'good', lesson: { discover: 'mentora' },
        why: '✅ ¡Gran decisión! A la niña le salió el riff despacito, porque le explicaste lo que a ti te funcionó cuando todo te sonaba feo.' },
      { label: '✏️ Dibujarle el riff con numeritos en un papel y firmárselo',
        effects: { fans: 2 }, verdict: 'good', lesson: { discover: 'mentora' },
        why: '✅ ¡Gran decisión! Se llevó el riff a su casa para practicar, porque se lo explicaste de una forma que no se olvida. Y la fila avanzó más rápido.' },
    ],
    after: { who: 'papa', text: 'Si lo puedes explicar, lo entendiste.', voice: 'mentora' },
  },

  // ——— Reventa ———
  {
    id: 'c6_reventa', chapter: 6, weight: 3, who: 'iker', remind: 'cuida_fans',
    when: (s) => ch6(s) && palacioOpen(s) && !palacioDone(s),
    title: 'Boletos al triple',
    text: 'Iker llega furioso: unos señores compraron muchísimos boletos del Palacio y ahora los venden al triple. Eso se llama reventa. Su primo no alcanzó boleto y no tiene para pagar el triple.',
    tip: '💡 ¿Cómo haces que los boletos les lleguen a los fans y no a quien solo quiere ganar con ellos?',
    options: [
      { label: '🎫 Máximo 4 boletos por persona, con su nombre',
        effects: { fans: 2, mood: 1, flag: 'boletosNombre' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Los boletos llegaron a los fans, porque pusiste reglas que hacen difícil revender.', after: { who: 'iker', text: 'Como presidente del club, declaro que esto es justicia. Y que mi primo ya no llora.' } },
      { label: '💛 Apartar boletos para el club de fans de Iker',
        effects: { fans: 1, caja: -1, mood: 2 }, verdict: 'good', lesson: { apply: 'cuida_fans' },
        why: '✅ ¡Gran decisión! El club de Iker entró completo, porque cuidaste a los que te siguen desde el principio. 💡 Esto sirve para pocos; para miles, hacen falta reglas para todos.', after: { who: 'iker', text: 'Como presidente del club, declaro que esto es justicia. Y que mi primo ya no llora.' } },
      { label: '🤷 No hacer nada: ya se vendieron',
        effects: { fans: -1 }, verdict: 'bad',
        why: '💡 La próxima vez cuida cómo se venden tus boletos, porque muchos fans pagaron el triple o se quedaron afuera.' },
    ],
  },

  // ——— Entrevista a las seis de la mañana · aplica delegar ———
  {
    id: 'c6_entrevista', chapter: 6, weight: 3, who: 'papa', remind: 'delegar',
    when: (s) => ch6(s) && playedCh6(s),
    title: 'Entrevista a las seis de la mañana',
    text: 'Un programa de la tele los invita al día siguiente de un show, a las seis de la mañana. Llegaron a dormir a la una. {bateria} ya dijo "zzz" tres veces y todavía ni se acuesta.',
    tip: '💡 Que la gente los conozca es importante. Dormir también. ¿Hay forma de hacer las dos?',
    options: [
      { label: '📺 Ir todos, aunque sea con sueño',
        effects: { fans: 2, mood: -3 }, verdict: 'ok',
        why: '💡 La próxima vez reparte la chamba, porque salieron en la tele todos bostezando y ese día el ensayo no rindió.', after: { who: 'nina', text: 'En la tele dije "buenas noches" a las seis de la mañana. Nadie se dio cuenta. Bueno, todos.' } },
      { label: '🎤 Que vayan Nina y {nombre}; los demás duermen',
        effects: { fans: 2, mood: -1 }, verdict: 'good', lesson: { apply: 'delegar' },
        why: '✅ ¡Gran decisión! Salieron en la tele y medio equipo descansó, porque repartiste el trabajo y luego les contaste todo a los demás.', after: { who: 'nina', text: 'En la tele dije "buenas noches" a las seis de la mañana. Nadie se dio cuenta. Bueno, todos.' } },
      { label: '📅 Pedir otro día para la entrevista',
        effects: { mood: 1, fans: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Dieron la entrevista bien despiertos otro día, porque pediste un horario que les sirviera. 💡 Si la tele no puede cambiar y es una sola vez, conviene ir.' },
    ],
  },

  // ——— Playeras del Palacio ———
  {
    id: 'c6_playeras', chapter: 6, weight: 3, who: 'mama', remind: 'integridad',
    when: (s) => ch6(s) && !palacioDone(s),
    title: 'Playeras del Palacio',
    text: 'Para el Palacio quieren playeras nuevas. Una fábrica las hace baratísimas, pero la tela es delgadita y se despinta a la primera lavada. El taller de la colonia, donde hicieron las primeras, cobra el doble y quedan bonitas por años.',
    tip: '💡 Una playera lleva el nombre de la banda. ¿Qué quieres que piensen los fans cuando la laven?',
    options: [
      { label: '🏭 La fábrica barata: ganamos más por playera',
        effects: { caja: 2, fans: -2 }, verdict: 'bad',
        why: '💡 La próxima vez cuida lo que lleva tu nombre, porque las playeras se despintaron y los fans le escribieron a Papá muy enojados.' },
      { label: '🧵 El taller de la colonia',
        effects: { caja: -1, fans: 2, mood: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Los fans las usan una y otra vez, porque elegiste calidad aunque costara más.', after: { who: 'mama', text: 'El logo va bordado. Lo bordado no se despinta, solo se encariña.' } },
      { label: '📝 Pocas del taller y apuntar pedidos en los shows',
        effects: { fans: 1, mood: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! No sobró ninguna y todas son buenas, porque probaste antes de gastar mucho. 💡 Si ya sabes que se venden todas, hacer muchas de una vez sale más barato.', after: { who: 'mama', text: 'El logo va bordado. Lo bordado no se despinta, solo se encariña.' } },
    ],
  },

  // ——— Dónde ensayar el show grande ———
  {
    id: 'c6_ensayo', chapter: 6, weight: 3, who: 'teclas',
    when: (s) => ch6(s) && !palacioDone(s),
    title: '¿Dónde ensayamos el show grande?',
    text: 'El show del Palacio tiene luces que se mueven, pantallas y un escenario chiquito al fondo. En la cochera no caben ni las luces. Hay una bodega enorme que se renta por día para ensayar con todo puesto.',
    tip: '💡 Lo que es nuevo, ¿dónde conviene ensayarlo?',
    options: [
      { label: '🏠 Las canciones en la cochera y un día en la bodega con luces',
        effects: { talent: 2, caja: -1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Ensayaron lo nuevo donde se iba a usar, porque solo rentaste lo que no cabía en la cochera.', after: { who: 'bateria', text: 'En la bodega hay eco. Toqué un golpe y me contestaron tres.' } },
      { label: '🏢 Rentar la bodega toda la semana',
        effects: { talent: 2, caja: -3, mood: -1 }, verdict: 'ok',
        why: '💡 La próxima vez renta solo lo necesario, porque las canciones ya se las sabían; lo único nuevo eran las luces.', after: { who: 'bateria', text: 'En la bodega hay eco. Toqué un golpe y me contestaron tres.' } },
      { label: '🤞 Todo en la cochera, y que las luces salgan como salgan',
        effects: { mood: 1, fans: -1 }, verdict: 'bad',
        why: '💡 La próxima vez ensaya lo nuevo antes, porque en el show una luz le pegó en los ojos a Nina a media canción y cantó con los ojos cerrados.' },
    ],
  },

  // ——— La vida fuera de la banda ———
  {
    id: 'c6_cumple_valeria', chapter: 6, weight: 2, who: 'mama',
    when: (s) => ch6(s) && (s.weekInChapter || 0) >= 2,
    title: 'El cumpleaños de Ximena',
    text: 'Ximena, la amiga de la escuela de {nombre}, cumple años el sábado. Le hizo una invitación a mano, con brillantina. Ese mismo sábado hay ensayo largo para el Palacio.',
    tip: '💡 La banda es importante, y tu vida fuera de la banda también. ¿Cómo cuidas las dos?',
    options: [
      { label: '🎂 Ir dos horas al cumple y luego al ensayo',
        effects: { mood: 2, talent: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Celebraste con Ximena y llegaste contenta al ensayo, porque acomodaste tiempo para las dos cosas.' },
      { label: '🎸 Faltar al cumple: el Palacio va primero',
        effects: { talent: 1, mood: -2 }, verdict: 'ok',
        why: '💡 La próxima vez busca un rato para tus amigas, porque ensayaste bien, pero estuviste pensando en el pastel de Ximena todo el día.' },
      { label: '🎟️ Invitar a Ximena al ensayo como invitada especial',
        effects: { mood: 1, fans: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Ximena vio el ensayo desde la primera fila, porque la hiciste parte. 💡 Funciona si a ella le late; es su cumpleaños, no el tuyo.' },
    ],
    after: { who: 'me', text: 'La fama está padre. Pero el pastel de Ximena también.' },
  },

  // ——— Video para llegar a 2 millones de reproducciones ———
  {
    id: 'c6_video', chapter: 6, weight: 3, who: 'hermana', remind: 'aplausos_mentira',
    when: (s) => ch6(s) && (s.streams || 0) < 2000000,
    title: 'Video para la canción nueva',
    text: 'Para llegar a 2 millones de reproducciones quieren un video. Una compañía ofrece uno con rayos y un dragón de computadora. {hermana} propone grabarlo en la cochera con los fans bailando, y que Papá lo publique.',
    tip: '💡 ¿Qué video se parece más a ustedes? ¿Y cuál pueden pagar sin vaciar la caja?',
    options: [
      { label: '🐉 El del dragón de computadora',
        effects: { fans: 1, caja: -3 }, verdict: 'ok',
        why: '💡 La próxima vez elige lo que se parece a ustedes, porque el dragón se veía carísimo, pero Papá les leyó los comentarios y todos preguntaban "¿y la banda?". Si la canción fuera de dragones, valdría la pena.' },
      { label: '📸 El de {hermana}, en la cochera con los fans',
        effects: { fans: 3, caja: -1, mood: 1, flag: 'videoCochera' }, verdict: 'good',
        why: '✅ ¡Gran decisión! La gente se lo pasó a sus amigos, porque se ve cómo son de verdad y los fans salen en él.', after: { who: 'hermana', text: 'Quietos... ¡otra! Juju salió bailando con Señor Brillitos en la cabeza.' } },
      { label: '🔤 Solo la letra en la pantalla',
        effects: { fans: 1 }, verdict: 'ok',
        why: '💡 La próxima vez enseña sus caras, porque la letra sola se oyó bien, pero nadie supo quiénes eran.' },
    ],
  },
];

export default CARDS;
