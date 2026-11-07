// Where the band can play. Numbers are real Mexican pesos, simplified.
//   cap        lugares                    pay.type   'hat' sombrero ($ por persona × calidad) · 'fixed' pago pactado · 'door' boletos
//   fairPrice  precio justo del boleto    minPrice/maxPrice  límites del deslizador
//   venueCut   parte que se queda el lugar   cost  renta, sonido o viáticos (se paga aunque no llegue nadie)
//   walkIns    gente que pasa por ahí     conv  qué tanto el público nuevo se vuelve fan
//   reach      qué parte de tus fans puede llegar (en otra ciudad, solo unos cuantos)
//   chapter..until  capítulos en que aparece     needs(s) → true | 'razón para una niña de 9 años'
//   fillGate   (opcional) el lugar abre solo cuando, al precio justo, llegarían al menos esa parte del cupo
//              (show.venueOptions lo revisa con el público esperado: fans, promoción y reproducciones)
import { plural, money, num } from '../util.js';

// Money model (realista y simplificado), como el trato de puerta de la vida real: de los boletos, el lugar (o la
// empresa que organiza) se queda con venueCut (20 a 30 de cada 100: boletera, seguridad, su ganancia) y la banda con
// el resto (70 a 80 de cada 100). Lo que aprieta son los gastos: `cost` (renta, sonido, luces, producción o
// viáticos) se paga aunque llegue poca gente, así que el margen solo aparece cuando el lugar está (casi) lleno.
// Costos proporcionales (QA ronda 3): en cada lugar con boletos, `cost` es de 50 a 85 de cada 100 de lo que le toca
// a la banda con el lugar lleno al precio justo. Antes la Arena, el Palacio y el Estadio estaban en 97 a 99 de cada
// 100: lleno y al precio justo casi no dejaban nada (la Arena ni cubría los gastos de la semana) y a medias perdían
// millones en una noche. Ahora (Arena 82, Palacio 89, Estadio 97 de cada 100) lleno al precio justo deja ganancia que
// cubre los gastos de la semana, el precio mínimo cubre la renta si se llena, y abren solo cuando, al precio justo,
// llegarían al menos 80 (Arena), 85 (Palacio) o 97 (Estadio) de cada 100 lugares (fillGate): el peor show posible al
// abrir pierde menos de lo que deja una noche llena, no millones. Un estadio a medias ya no se puede elegir. Los tips se arman con
// estos mismos números (doorTip).
// "De cada $10" cuando la parte del lugar es redonda (20, 30 de cada 100); si no (25), "de cada $100".
const cutWords = (cut) => {
  const per = Number.isInteger(Math.round(cut * 1000) / 100) ? 10 : 100;
  const venue = Math.round(cut * per);
  return { per, venue, band: per - venue };
};
const fullNet = (v) => Math.round((v.fairPrice * v.cap * (1 - v.pay.venueCut) - v.cost) / 100) * 100;
// Cifras grandes en millones ("$33 millones"): leer $33,000,000 con todos los ceros es difícil a los 9 años.
const big = (v) => (Math.abs(v) >= 1e6 ? `$${num(v)}` : money(v));
const cap1 = (x) => x[0].toUpperCase() + x.slice(1);
const doorTip = (v, what, extra = '') => {
  const c = cutWords(v.pay.venueCut);
  return `💡 De cada $${c.per} de boletos, ${what} se queda con $${c.venue} y la banda con $${c.band}. ${cap1(v.costLabel)} ${v.costPlural ? 'cuestan' : 'cuesta'} ${big(v.cost)}, llegue quien llegue. Lleno y a ${money(v.fairPrice)}, les deja unos ${big(fullNet(v))}.${extra}`;
};
// "a" + lugar con artículo: "al Foro Indie Rocks", "a la Arena".
export const aLugar = (en) => (/^el /i.test(en) ? `al ${en.slice(3)}` : `a ${en}`);
const door = (v, what, extra) => ({ ...v, tip: doorTip(v, what, extra) });

export const VENUES = [
  {
    // 3 sillas para la familia y, desde el cap. 1, unos 15 vecinos más.
    id: 'cochera', en: 'la cochera', name: 'La cochera', icon: '🏠', chapter: 0, until: 1, cap: 18,
    pay: { type: 'hat', amount: 2, perQuality: 3 }, walkIns: 3, conv: 0.5, reach: 1, cost: 0,
    tip: (s) => (s.chapter === 0
      ? '💡 El primer show es para 3 sillas: Mamá, Juju y Señor Brillitos. Más adelante también vendrán los vecinos.'
      : '💡 La cochera es gratis y siempre está. Ya no es solo para 3 sillas: ahora vienen los vecinos y caben unos 15 más.'),
    needs: () => true,
  },
  {
    id: 'cumple', en: 'la fiesta de cumpleaños', name: 'Fiesta de cumpleaños', icon: '🎂', chapter: 1, until: 1, cap: 25,
    pay: { type: 'fixed', amount: 800 }, walkIns: 23, conv: 0.12, reach: 0, cost: 0,
    tip: '💡 Un cumpleaños paga $800 seguros, pero casi todos son niños chiquitos: pocos se vuelven fans.',
    needs: (s) => (s.flags.lastCumple && s.week - s.flags.lastCumple < 2 ? 'La siguiente fiesta es hasta dentro de dos semanas.' : true),
  },
  {
    id: 'cafe', en: 'el Café La Glorieta', name: 'Café La Glorieta', icon: '☕', chapter: 1, until: 3, cap: 40,
    pay: { type: 'hat', amount: 10, perQuality: 10 }, walkIns: 12, conv: 0.4, reach: 1, cost: 0,
    tip: '💡 En el café pasan el sombrero: entre más bonito suena, más deja cada persona ($10 a $20).',
    // Don Beto los invita en la carta c1_pastel (ahí se negocia el trato); por si no salió, desde la semana 3.
    needs: (s) => (s.chapter >= 2 || (s.seenCards || []).includes('c1_pastel') || (s.weekInChapter || 1) >= 3
      ? true : 'Don Beto todavía no los invita a tocar en su café.'),
  },
  door({
    id: 'kermes', en: 'la kermés de la escuela', name: 'Kermés de la escuela', icon: '🎪', chapter: 1, until: 2, cap: 80,
    pay: { type: 'door', venueCut: 0.3 }, fairPrice: 40, minPrice: 20, maxPrice: 60, walkIns: 30, conv: 0.32, reach: 1, cost: 300,
    costLabel: 'la renta de la bocina',
    needs: (s) => (s.week % 2 === 0 ? true : 'La kermés es cada dos semanas: la próxima semana sí hay.'),
  }, 'la escuela (para la cooperativa)'),
  door({
    id: 'foro', en: 'el Foro Cachito', name: 'El Foro Cachito', icon: '🎸', chapter: 2, until: 3, cap: 150,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 80, minPrice: 50, maxPrice: 130, walkIns: 10, conv: 0.35, reach: 1, cost: 5000,
    costLabel: 'la renta con sonido',
    needs: (s) => (s.songs.length >= 3 ? true : `Doña Rocío pide 3 canciones propias. Llevan ${s.songs.length}.`),
  }, 'el foro'),
  {
    id: 'plaza', en: 'la plaza de la colonia', name: 'Plaza de la colonia', icon: '⛲', chapter: 2, until: 2, cap: 300,
    pay: { type: 'hat', amount: 2, perQuality: 4 }, walkIns: 50, conv: 0.3, reach: 1, cost: 400,
    tip: '💡 En la plaza pasa mucha gente, pero el sombrero deja poquito por persona y el permiso cuesta $400.',
    needs: () => true,
  },
  door({
    id: 'indie', en: 'el Foro Indie Rocks', name: 'Foro Indie Rocks', icon: '🌟', chapter: 3, until: 5, cap: 600,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 180, minPrice: 120, maxPrice: 240, walkIns: 30, conv: 0.35, reach: 1, cost: 60000,
    costLabel: 'la renta con sonido y luces',
    needs: (s) => (s.m.fans >= 800 ? true : `Indie Rocks pide 800 fans. Llevan ${plural(s.m.fans, 'fan', 'fans')}.`),
  }, 'el foro', ' Ahí también tocan bandas de pop.'),
  door({
    id: 'nave', en: 'el Foro La Nave', name: 'Foro La Nave', icon: '🚀', chapter: 4, until: 7, cap: 1000,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 220, minPrice: 150, maxPrice: 280, walkIns: 50, conv: 0.3, reach: 0.6, cost: 140000,
    costLabel: 'la renta con sonido, luces y seguridad',
    needs: (s) => (s.m.fans >= 1500 ? true : 'La Nave pide 1,500 fans.'),
  }, 'el foro', ' También llega gente que ya oyó su canción.'),
  door({
    id: 'gdl', en: 'Guadalajara', name: 'Guadalajara', icon: '🌮', chapter: 5, until: 5, cap: 2500, city: true,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 250, minPrice: 150, maxPrice: 320, walkIns: 150, conv: 0.3, reach: 0.12, cost: 380000,
    costPlural: true, costLabel: 'el foro y los viáticos (camión, hotel, comida y sonido)',
    needs: () => true,
  }, 'quien organiza en Guadalajara'),
  door({
    id: 'mty', en: 'Monterrey', name: 'Monterrey', icon: '⛰️', chapter: 5, until: 5, cap: 3000, city: true,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 250, minPrice: 150, maxPrice: 320, walkIns: 150, conv: 0.3, reach: 0.12, cost: 460000,
    costPlural: true, costLabel: 'el foro y los viáticos (Monterrey queda lejos)',
    needs: () => true,
  }, 'quien organiza en Monterrey', ' Revisa cuántos llegarían.'),
  door({
    id: 'pue', en: 'Puebla', name: 'Puebla', icon: '⛪', chapter: 5, until: 5, cap: 1500, city: true,
    pay: { type: 'door', venueCut: 0.2 }, fairPrice: 230, minPrice: 140, maxPrice: 300, walkIns: 120, conv: 0.3, reach: 0.1, cost: 215000,
    costPlural: true, costLabel: 'el foro y los viáticos (Puebla queda cerca)',
    needs: () => true,
  }, 'quien organiza en Puebla'),
  door({
    id: 'arena', en: 'la Arena de la Ciudad', name: 'Arena de la Ciudad', icon: '🎡', chapter: 6, until: 7, cap: 10000,
    pay: { type: 'door', venueCut: 0.25 }, fairPrice: 350, minPrice: 290, maxPrice: 380, walkIns: 300, conv: 0.25, reach: 0.6, cost: 2150000,
    costPlural: true, costLabel: 'la renta, las luces, el sonido y las pantallas',
    fillGate: 0.8,
    needs: (s) => (s.m.fans >= 10000 ? true : 'La Arena pide 10,000 fans.'),
  }, 'la empresa que organiza'),
  door({
    id: 'palacio', en: 'el Palacio de los Deportes', name: 'Palacio de los Deportes', icon: '🏛️', chapter: 6, until: 6, cap: 24500,
    pay: { type: 'door', venueCut: 0.25 }, fairPrice: 450, minPrice: 420, maxPrice: 480, walkIns: 500, conv: 0.25, reach: 0.7, cost: 7400000,
    costPlural: true, costLabel: 'la renta y la producción de 24,500 lugares',
    fillGate: 0.85,
    needs: (s) => (s.m.fans >= 25000 ? true : `El Palacio pide 25,000 fans. Llevan ${plural(s.m.fans, 'fan', 'fans')}.`),
  }, 'la empresa que organiza', ' A medias se pierde mucho.'),
  door({
    id: 'estadio', en: 'el Estadio de la CDMX', name: 'Estadio de la CDMX', icon: '🏟️', chapter: 7, until: 7, cap: 87000,
    pay: { type: 'door', venueCut: 0.3 }, fairPrice: 550, minPrice: 540, maxPrice: 560, walkIns: 1500, conv: 0.2, reach: 0.85, cost: 32500000,
    costPlural: true, costLabel: 'la renta y la producción del estadio',
    // Abre cuando, al precio justo, llegarían unas 84,400 (97 de cada 100 lugares): a medias se pierde dinero.
    fillGate: 0.97,
    needs: (s) => (s.m.fans >= 60000 ? true : `El estadio pide 60,000 fans. Llevan ${plural(s.m.fans, 'fan', 'fans')}.`),
  }, 'la empresa que organiza', ' Abre cuando lo pueden llenar.'),
];

export const VENUE_BY_ID = Object.fromEntries(VENUES.map((v) => [v.id, v]));
export const enOf = (id, fallback = '') => VENUE_BY_ID[id]?.en || fallback;
