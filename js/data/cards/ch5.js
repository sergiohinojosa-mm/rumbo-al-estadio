// Cartas del Capítulo 5 · De gira (HISTORIA_TMP §3, cap. 5 y tabla 3.0, lecciones 24 a 28).
// Esquema (DISENO §7.3): { id, chapter, weight, when(s), who, title, text, tip, remind?, kind?, role?,
//   options: [ { label, effects: { fans, caja, talent, mood, ahorro, papa, flag, promise }, verdict, why, lesson?, member? } ], after? }
// effects en pasos enteros de -3 a +3 (el motor los escala). `after` = lo que dice alguien después de decidir
// (`voice` = id del audio de Papá). Los integrantes por audición se nombran {teclas}, {bateria} y {bajo}.
//
// Mecánica nueva del capítulo: viáticos ("lo que cuesta viajar") y el cansancio que pega más (chapters.tired).
// Lecciones que se descubren aquí: largo_plazo (c5_viaticos), delegar (c5_delegar), agua_aplausos (c5_fiebre).
// equipo_casa y escenario_fans se descubren en escenas (story/ch5.js). Recordatorio: cumple (c5_pago_final).
// El pago a Papá usa effects.papa (pasos, como en cards/ch2.js): papa 3 en el cap. 5 cubre toda la deuda que quede.

const CITIES = ['gdl', 'mty', 'pue'];
const cities = (s) => (s.citiesPlayed || []).filter((c) => CITIES.includes(c));
const played = (s, id) => cities(s).includes(id);
const seenCard = (s, id) => (s.seenCards || []).includes(id);
// Hay bajista cuando ya pasó la audición (s.roles.bajo), aunque sea de invitado en la gira.
export const hasBass = (s) => !!(s.roles?.bajo || s.flags?.bajo || seenCard(s, 'c5_audicion_bajo'));
const ch5 = (s) => s.chapter === 5;
// Todas las cartas del capítulo, menos la audición, esperan a que haya bajista: así la audición sale primero.
// Las de los momentos con lección (viáticos, delegar y fiebre) pesan más que las demás para que salgan en la gira.
const onTour = (s) => ch5(s) && hasBass(s);

export const CARDS = [
  // ——— Audición de bajo (sale primero) ———
  {
    id: 'c5_audicion_bajo', chapter: 5, weight: 20, who: 'papa', kind: 'audition', role: 'bajo', remind: 'decide_info',
    when: (s) => ch5(s) && !hasBass(s),
    title: 'Audición de bajo',
    text: 'La gira necesita bajo. Bruno, sobrino de Inés, casi no habla, pero cuando toca todos bailan. Paz ayuda con todo, pero olvida afinar. Ollin toca son jarocho, de Veracruz, con jarana, una guitarrita, pero a veces no puede ir.',
    tip: '💡 Nadie es perfecto. ¿Qué le falta hoy a la banda: que el público baile, ayuda en la gira o un sonido único?',
    options: [
      { label: '🦕 Bruno: cuando toca, todos bailan',
        member: { role: 'bajo', id: 'bruno' },
        effects: { fans: 1, talent: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! En el primer ensayo hasta Juju bailó sin darse cuenta, porque Bruno hace que la canción se sienta en los pies. 💡 Como habla poquito, pregúntale dos veces qué piensa.' },
      { label: '🧶 Paz: "¡Yo me encargo!"',
        member: { role: 'bajo', id: 'paz' },
        effects: { mood: 2, fans: 1, talent: -1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! La gira pesa menos, porque Paz ayuda con las playeras, la fila y los fans. 💡 Antes de cada show, recuérdale afinar.' },
      { label: '🪕 Ollin: "¿Y si le metemos tantito son?"',
        member: { role: 'bajo', id: 'ollin' },
        effects: { talent: 2, fans: 1, mood: -1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Las canciones suenan distintas a las de cualquier otra banda, porque Ollin les pone un ritmo que solo ustedes tienen. 💡 Revisen juntos sus fechas antes de cerrar cada show.' },
    ],
    after: { who: 'papa', text: '{bajo}, ya tienes lugar en La Burra. Esta gira es de prueba: si al final todos quieren, te quedas en la banda.' },
  },

  // ——— Momento 1: viáticos · lección largo_plazo ———
  {
    id: 'c5_viaticos', chapter: 5, weight: 20, who: 'papa',
    when: (s) => onTour(s),
    title: '¿Dónde dormimos?',
    text: 'Papá reparte la hoja de viáticos: lo que cuesta viajar. Hay dos hoteles. El del centro tiene alberca y cuesta el doble. El sencillo está limpio y, con lo que se ahorran, alcanza para rentar mejores bocinas.',
    tip: '💡 Piensa qué te sirve más: algo que se disfruta esta noche o algo que se queda con la banda para muchos shows.',
    options: [
      { label: '🏊 El del centro, con alberca',
        effects: { mood: 2, caja: -3, flag: 'hotelCaro' }, verdict: 'ok', lesson: { discover: 'largo_plazo' },
        why: '💡 La próxima vez, si el ánimo no está en el piso, elige lo que se queda con la banda, porque la alberca se disfrutó una noche y la caja bajó mucho.' },
      { label: '🔊 El sencillo, y rentar mejores bocinas',
        effects: { fans: 2, talent: 1, caja: -1, flag: 'mejorSonido' }, verdict: 'good', lesson: { discover: 'largo_plazo' },
        why: '✅ ¡Gran decisión! El show se oyó fuerte y claro hasta atrás, porque gastaste en lo que oye el público y no en lo que solo ves tú.' },
      { label: '🐷 El sencillo, y guardar la diferencia',
        effects: { ahorro: 2, caja: -1, flag: 'hotelSencillo' }, verdict: 'good', lesson: { discover: 'largo_plazo' },
        why: '✅ ¡Gran decisión! El ahorro creció para lo que venga, porque guardaste lo que no necesitabas hoy. 💡 Si las bocinas del foro ya suenan bien, guardar gana; si suenan feo, conviene rentar las buenas.' },
    ],
    after: { who: 'papa', text: 'Piensa a largo plazo.', voice: 'largo_plazo' },
  },

  // ——— Momento 2: Guadalajara con lluvia (el azar cambia el lugar, no la decisión) ———
  {
    id: 'c5_lluvia', chapter: 5, weight: 3, who: 'memo',
    when: (s) => onTour(s) && !played(s, 'gdl'),
    title: 'Guadalajara con lluvia',
    text: 'Llueve en Guadalajara como si alguien hubiera abierto una regadera. No hay rayos, solo agua. El foro tiene techo de lámina y cada gota suena como un tambor. {bateria} da un redoble y sonríe: "Hoy la lluvia toca de invitada".',
    tip: '💡 La lluvia no la decides tú. Lo que sí decides es qué show se puede dar con ella.',
    options: [
      { label: '🎸 Show acústico, con todos más cerquita',
        effects: { fans: 2, mood: 2, flag: 'acusticoLluvia' }, verdict: 'good',
        why: '✅ ¡Gran decisión! La gente se acercó y cantó bajito con ustedes, porque cambiaste el show para que la lluvia fuera parte de él. 💡 Si es peligroso, se cambia la fecha; si solo hace ruido, se adapta el show.' },
      { label: '⛈️ Tocar igual, con el ruido de la lámina',
        effects: { fans: 1, mood: -1 }, verdict: 'ok',
        why: '💡 La próxima vez adapta el show a la lluvia, porque las canciones bajitas se perdieron entre las gotas y la gente se tapaba las orejas.' },
      { label: '📅 Cambiar la fecha para otra semana',
        effects: { caja: -2, mood: 1 }, verdict: 'ok',
        why: '💡 La próxima vez busca qué sí se puede hacer hoy, porque cambiar la fecha costó otra noche de hotel. Otra pista: si es peligroso, se cambia la fecha; si solo hace ruido, se adapta el show.' },
    ],
    after: { who: 'nina', text: '♪ Llueve en la lámina, tun, tun, tun... ♪ ¡Eso es canción!' },
  },

  // ——— Momento 3: {nombre} quiere hacerlo todo · lección delegar ———
  {
    id: 'c5_delegar', chapter: 5, weight: 20, who: 'nina',
    when: (s) => onTour(s) && cities(s).length >= 1,
    title: 'Yo lo hago todo',
    text: 'Sábado de gira. {nombre} hizo la prueba de sonido, contó las playeras, cargó cables y reescribió el setlist (la lista de canciones) tres veces. Son las seis y ya bosteza. Faltan dos horas para el show.',
    tip: '💡 ¿Qué cosas puede hacer alguien más del equipo? ¿Y cómo vas a saber que quedaron bien?',
    options: [
      { label: '💪 Seguir haciéndolo todo yo, así sale bien',
        effects: { mood: -3 }, verdict: 'bad', lesson: { discover: 'delegar' },
        why: '💡 La próxima vez reparte el trabajo, porque llegaste al show sin energía y se notó desde el primer coro.' },
      { label: '📋 Repartir tareas y revisar al final',
        effects: { mood: 2, fans: 1, flag: 'giraRepartida' }, verdict: 'good', lesson: { discover: 'delegar' },
        why: '✅ ¡Gran decisión! {teclas} y {hermana} con las playeras, {bateria} y {bajo} con el sonido: todo quedó listo y tú llegaste con energía, porque repartiste y al final revisaste.' },
      { label: '🙈 Que lo haga otro y ya no me fijo',
        effects: { mood: 1, fans: -1 }, verdict: 'bad', lesson: { discover: 'delegar' },
        why: '💡 La próxima vez revisa al final, porque nadie se fijó en las playeras y llegaron dos cajas de pura talla XXL.' },
    ],
    after: { who: 'papa', text: 'Delegar no es desentenderse.', voice: 'delegar' },
  },

  // ——— Momento 4: {bateria} con fiebre (en la ciudad que les toque) · lección agua_aplausos (Mamá) ———
  {
    id: 'c5_fiebre', chapter: 5, weight: 25, who: 'mama',
    // Sale en cualquier semana de la gira (las ciudades se pueden repetir), en la ciudad que les toque.
    when: (s) => onTour(s),
    title: '{bateria} amanece con fiebre',
    text: 'Hotel de la gira, siete de la mañana. {bateria} amanece con fiebre y pide caldito. El show es esta noche y ya se vendieron boletos. Si cambian la fecha, hay que devolverle su dinero a quien no pueda venir.',
    tip: '💡 ¿Qué va primero: que {bateria} se cure o que haya show? ¿Hay forma de cuidar las dos cosas?',
    options: [
      { label: '📞 Que toque alguien de la ciudad',
        effects: { caja: -1, talent: -1, fans: 1 }, verdict: 'ok', lesson: { discover: 'agua_aplausos' },
        why: '💡 La próxima vez, si entra alguien nuevo, ensáyalo antes, porque quien tocó la batería tocaba bien, pero no se sabía los finales y cada canción terminaba dos veces.' },
      { label: '🎹 Tocar sin batería, con un arreglo nuevo',
        effects: { fans: 1, talent: 1, mood: 1, flag: 'sinBateria' }, verdict: 'good', lesson: { discover: 'agua_aplausos' },
        why: '✅ ¡Gran decisión! {bateria} descansó y el show salió distinto pero bonito, porque cuidaste a quien estaba enfermo y buscaste otra forma de tocar. 💡 Funciona si ya ensayaron mucho; si no, mejor cambiar la fecha.' },
      { label: '📅 Cambiar la fecha y devolver el dinero a quien no pueda',
        effects: { caja: -2, mood: 2, flag: 'pueblaPospuesto' }, verdict: 'good', lesson: { discover: 'agua_aplausos' },
        why: '✅ ¡Gran decisión! {bateria} se curó y nadie se sintió engañado, porque avisaste con tiempo. Devolver dinero cuesta, pero la gente sigue confiando en ustedes.' },
    ],
    after: { who: 'mama', text: 'Primero agua, luego aplausos.' },
  },

  // ——— Momento 5: el último pago a Papá · recordatorio cumple ———
  {
    id: 'c5_pago_final', chapter: 5, weight: 6, who: 'papa', remind: 'cumple', repeat: true,
    // Sale la semana en que la caja alcanza para pagar todo y los gastos de la semana. Si eligen el
    // amplificador, vuelve a salir la siguiente semana buena: no hay fecha límite.
    when: (s) => ch5(s) && hasBass(s) && s.money.deuda > 0 && s.money.caja >= s.money.deuda + 2000,
    title: 'El último pago',
    text: 'Con lo de la gira, en la caja hay más que nunca. Alcanza para pagarle a Papá todo lo que falta. También alcanza para el amplificador de Chava, el que suena como trueno bonito. Para las dos cosas, no.',
    tip: '💡 ¿Qué prometieron primero? No hay fecha límite, pero la promesa sigue ahí hasta que la cumplan.',
    options: [
      { label: '🤝 Pagarle todo a Papá',
        effects: { papa: 3, mood: 2, flag: 'pagoFinalPapa' }, verdict: 'good', lesson: { discover: 'cumple' },
        why: '✅ ¡Gran decisión! El pagaré ya puede llevar su sticker de PAGADO, porque cumplieron la primera promesa que hicieron como banda.', after: { who: 'papa', text: 'Apunto. Y que conste que no les cobré intereses en mermelada.' } },
      { label: '🔊 Comprar el amplificador y pagar después',
        effects: { talent: 2, caja: -2 }, verdict: 'ok',
        why: '💡 La próxima vez paga primero lo que prometiste, porque el amplificador suena increíble, pero el pagaré sigue sin sticker. Papá lo guarda en la libreta: ahí sigue, sin prisa.' },
      { label: '➗ Pagar una parte y ahorrar para el amplificador',
        effects: { papa: 1, ahorro: 1, mood: 1, flag: 'pagoPartePapa' }, verdict: 'good', lesson: { discover: 'cumple' },
        why: '✅ ¡Gran decisión! Avanzaron en las dos cosas, porque repartiste en orden: primero la promesa y luego el amplificador. Va más lento, pero no se olvida ninguna.', after: { who: 'papa', text: 'Apunto. Y que conste que no les cobré intereses en mermelada.' } },
    ],
  },

  // ——— Viáticos 2: cómo llegar a Monterrey ———
  {
    id: 'c5_transporte', chapter: 5, weight: 3, who: 'memo',
    when: (s) => onTour(s) && !played(s, 'mty'),
    title: '¿Cómo llegamos a Monterrey?',
    text: 'Monterrey queda lejísimos: unas 12 horas de carretera. Don Memo acaricia el volante de La Burra. En avión se hace una hora, pero cuesta mucho más. El autobús de noche es el más barato, pero se duerme sentado.',
    tip: '💡 Cuenta todo: el dinero, las horas y cómo va a llegar la banda a tocar.',
    options: [
      { label: '🚌 En autobús de noche',
        effects: { mood: -3 }, verdict: 'bad',
        why: '💡 La próxima vez cuida el sueño antes de un show, porque durmieron sentados y {bateria} tocó con el cuello torcido como búho.' },
      { label: '✈️ En avión',
        effects: { caja: -3, mood: 2 }, verdict: 'ok',
        why: '💡 La próxima vez compara cuánto cuesta cada hora que te ahorras, porque llegaron frescos, pero el avión se comió casi toda la ganancia del show. Otra pista: el avión conviene si el show es al día siguiente.' },
      { label: '🚐 En La Burra, con paradas para estirarse',
        effects: { caja: -1, mood: -1, fans: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Llegaron con dinero para el show y en una gasolinera firmaron autógrafos, porque elegiste el camino que la caja aguanta. 💡 Si hay un día de descanso antes del show, la carretera conviene.' },
    ],
    after: { who: 'memo', text: 'La Burra no corre, pero llega. Y en las curvas canta.' },
  },

  // ——— Fans en el lobby · recordatorio cuida_fans ———
  {
    id: 'c5_fans_hotel', chapter: 5, weight: 3, who: 'papa', remind: 'cuida_fans',
    when: (s) => onTour(s) && cities(s).length >= 1,
    title: 'Fans en el lobby',
    text: 'Once de la noche. En el lobby del hotel (la entrada con sillones) hay veinte fans con letreros: vinieron desde otro pueblo. Mañana salen a las siete. Juju ya se durmió en un sillón, tapada con su letrero.',
    tip: '💡 Los fans les dieron su noche. ¿Cómo se lo regresas sin quedarte sin energía para mañana?',
    options: [
      { label: '📸 Diez minutos de fotos y firmas, y a dormir',
        effects: { fans: 2, mood: -1 }, verdict: 'good', lesson: { apply: 'cuida_fans' },
        why: '✅ ¡Gran decisión! Los fans se fueron felices y la banda durmió, porque les diste un rato de verdad y cuidaste el show de mañana.' },
      { label: '✍️ Firmar hasta que se vaya el último',
        effects: { fans: 3, mood: -3 }, verdict: 'ok',
        why: '💡 La próxima vez ponle un tiempo, porque los fans se fueron felices, pero al día siguiente la banda tocó con sueño.' },
      { label: '😴 Que Papá les avise que ya se fueron a dormir',
        effects: { mood: 1 }, verdict: 'ok',
        why: '💡 La próxima vez sal aunque sea cinco minutos, porque hicieron un viaje largo solo para verlos. Descansar sí estuvo bien.' },
    ],
    after: { who: 'juju', text: '(dormida, abrazando su letrero) ...yo soy la fan número uno... zzz...' },
  },

  // ——— "¡Una más y ya!" a medianoche: el cansancio pega más ———
  {
    id: 'c5_desvelo', chapter: 5, weight: 3, who: 'mama',
    when: (s) => onTour(s) && cities(s).length >= 1,
    title: '¡Una más y ya! (a medianoche)',
    text: 'El show salió bien, pero en el solo se le escapó una nota. Es medianoche en el hotel y {nombre} saca la guitarra: "¡Una más y ya!". Nina la mira con un ojo abierto. Mañana hay carretera y otro show.',
    tip: '💡 De gira, el cansancio pega más. ¿Qué le sirve más a tu solo de mañana?',
    options: [
      { label: '🎸 Ensayar el solo una hora',
        effects: { talent: 1, mood: -3 }, verdict: 'bad',
        why: '💡 La próxima vez guárdalo para mañana, porque de gira dormir poco pesa el doble y al día siguiente se te escaparon más notas.' },
      { label: '🐢 Tocarlo una vez despacito, sin amplificador, y a dormir',
        effects: { talent: 1, mood: 1 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Tus dedos repasaron el camino y descansaste, porque una vuelta despacito basta para que no se olvide.', after: { who: 'nina', text: 'Gracias. Mi ojo abierto ya se puede cerrar.' } },
      { label: '🛏️ Guardar la guitarra y dormir',
        effects: { mood: 2 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Amaneciste con energía, porque de gira el descanso vale el doble. 💡 Si el error fuera de toda la canción, sí convendría un ensayo mañana, con calma.', after: { who: 'nina', text: 'Gracias. Mi ojo abierto ya se puede cerrar.' } },
    ],
  },

  // ——— Una fecha extra en el día de descanso ———
  {
    id: 'c5_fecha_extra', chapter: 5, weight: 3, who: 'papa', remind: 'negocia',
    when: (s) => onTour(s) && cities(s).length >= 1,
    title: 'Una fecha extra',
    text: 'Un señor de Querétaro llama a Papá: quiere que toquen el domingo, el único día de descanso de la gira. Paga bien. {bateria} ya se durmió sobre la mesa del restaurante, con la cara en las servilletas.',
    tip: '💡 Mira el 💛 ánimo antes de decir que sí. Un sí cansado también cuesta.',
    options: [
      { label: '💰 Aceptar: es buen dinero',
        effects: { caja: 3, mood: -3 }, verdict: 'ok',
        why: '💡 La próxima vez revisa el ánimo antes de aceptar, porque ganaron dinero, pero llegaron al siguiente show sin pilas. Otra pista: si el ánimo está alto, una fecha extra sí conviene.' },
      { label: '🛋️ Decir que no esta vez',
        effects: { mood: 2 }, verdict: 'good',
        why: '✅ ¡Gran decisión! La banda llegó descansada al siguiente show, porque cuidaste el único día libre de la gira.' },
      { label: '🤝 Proponer Querétaro para la próxima gira',
        effects: { mood: 1, fans: 1, flag: 'queretaroLuego' }, verdict: 'good', lesson: { apply: 'negocia' },
        why: '✅ ¡Gran decisión! Descansaron y quedó una fecha apartada para después, porque buscaste un trato bueno para los dos.' },
    ],
    after: { who: 'bateria', text: '(despertando) ¿Ya llegamos? ¿A dónde? ¿Ya es mañana?' },
  },

  // ——— Lejos de casa · aplica equipo_casa (se descubre en la videollamada) ———
  {
    id: 'c5_extranar', chapter: 5, weight: 3, who: 'nina', remind: 'equipo_casa',
    when: (s) => onTour(s) && cities(s).length >= 1,
    title: 'Nina extraña su casa',
    text: 'Tercera noche fuera. Nina no quiere cenar. Dice que el hotel huele raro y que extraña a su perro, a su mamá y hasta a su hermano, "y eso que mi hermano es insoportable".',
    tip: '💡 Lejos de casa, ¿quién puede hacer que Nina se sienta acompañada?',
    options: [
      { label: '📱 Videollamada con su familia',
        effects: { mood: 2 }, verdict: 'good',
        why: '✅ ¡Gran decisión! Nina vio a su perro por la pantalla y se rió, porque la conectaste con su casa.' },
      { label: '🛌 Piyamada del equipo con historias de miedo (de las que no dan miedo)',
        effects: { mood: 3 }, verdict: 'good', lesson: { apply: 'equipo_casa' },
        why: '✅ ¡Gran decisión! Terminaron todos riéndose en el mismo cuarto, porque el equipo se cuidó entre sí. 💡 Si es una noche, el equipo basta; si son muchas, también llamen a casa.' },
      { label: '🚪 Dejarla sola para que descanse',
        effects: { mood: -1 }, verdict: 'ok',
        why: '💡 La próxima vez pregúntale qué necesita, porque a veces estar sola ayuda, pero esta vez Nina quería compañía.' },
    ],
    after: { who: 'nina', text: 'Ok. Ya me siento mejor. Pero el hotel sí huele raro.' },
  },

  // ——— Pulpo Neón en la misma ciudad ———
  {
    id: 'c5_dafne', chapter: 5, weight: 3, who: 'dafne', remind: 'negocia',
    when: (s) => onTour(s) && cities(s).length >= 1 && cities(s).length < 3,
    title: 'Pulpo Neón en la misma ciudad',
    text: 'Pulpo Neón, la banda de Dafne, toca en la misma ciudad el mismo fin de semana. La mamá de Dafne le pasa un recado a Papá: "¿Y si en vez de competir, tocan una canción con nosotras?".',
    tip: '💡 Antes, Dafne era competencia. ¿Qué ganan las dos bandas si se juntan?',
    options: [
      { label: '🎤 Cada banda su show, en su fecha',
        effects: { fans: 1 }, verdict: 'ok',
        why: '💡 La próxima vez prueba juntarte, porque cada banda tocó para su misma gente de siempre. Otra pista: si las dos bandas tocan el mismo día y a la misma hora, separarse está bien.' },
      { label: '🐙 Subirse a tocar una canción juntas',
        effects: { fans: 2, mood: 2, flag: 'dafneGira' }, verdict: 'good',
        why: '✅ ¡Gran decisión! Los fans de Pulpo Neón conocieron a {banda}, porque juntas llegaron a más gente que separadas.' },
      { label: '🎟️ Un show doble y repartir la taquilla a la mitad',
        effects: { fans: 2, caja: 1, mood: -1, flag: 'dafneGira' }, verdict: 'good', lesson: { apply: 'negocia' },
        why: '✅ ¡Gran decisión! El foro se llenó y las dos bandas ganaron, porque negociaste un reparto justo de la taquilla (el dinero de los boletos). Eso sí: organizarlo dio más trabajo.' },
    ],
    after: { who: 'dafne', text: 'Que gane el mejor show. O sea, los dos. Ya sé, ya sé: qué cursi.' },
  },
];

export default CARDS;
