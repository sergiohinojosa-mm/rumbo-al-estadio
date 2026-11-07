// Todas las cartas de la semana, del Prólogo al Final: une js/data/cards/ch0.js … ch7.js.
// Cada capítulo exporta `export default [ … ]` (o `export const CARDS`).
// Esquema (DISENO §7.3): { id, chapter, weight, when: (s) => bool, who, title, text, tip: '💡 …', remind?, kind?, role?,
//   options: [ { label, effects: { fans, caja, talent, mood, ahorro (pasos −3..+3), flag, promise, member: { role, id } },
//                verdict: 'good'|'ok'|'bad', why: '✅ ¡Gran decisión! … porque …' | '💡 La próxima vez … porque …',
//                lesson?: { discover|apply: id } } ], after?: { who, text } }
// Audiciones: kind: 'audition', role: 'teclas'|'bateria'|'bajo', una opción por candidato (cast.CANDIDATES).
import * as C0 from './cards/ch0.js';
import * as C1 from './cards/ch1.js';
import * as C2 from './cards/ch2.js';
import * as C3 from './cards/ch3.js';
import * as C4 from './cards/ch4.js';
import * as C5 from './cards/ch5.js';
import * as C6 from './cards/ch6.js';
import * as C7 from './cards/ch7.js';

const list = (m) => (Array.isArray(m?.default) ? m.default : Array.isArray(m?.CARDS) ? m.CARDS : []);

export const CARDS_BY_CHAPTER = [C0, C1, C2, C3, C4, C5, C6, C7].map(list);
export const CARDS = CARDS_BY_CHAPTER.flat();
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export default CARDS;
