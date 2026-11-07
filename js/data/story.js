// Todas las escenas de historia, del Prólogo al Final: une js/data/story/ch0.js … ch7.js.
// Cada capítulo exporta `export default [ … ]` (o `export const SCENES`).
// Esquema: { id, chapter, when: (s) => bool, trigger: 'start'|'week'|'milestone'|'pause'|'after_show', place,
//   beats: [ { who, text, lesson? } ], screen?, repeat? }   (campos explicados en story/ch0.js)
// El orden importa: de varias escenas pendientes sale primero la que está antes (por eso el hito de un capítulo,
// que vive en su archivo, sale antes que la apertura del siguiente).
// Al final va una escena de descanso general por si un capítulo no tiene la suya.
import * as S0 from './story/ch0.js';
import * as S1 from './story/ch1.js';
import * as S2 from './story/ch2.js';
import * as S3 from './story/ch3.js';
import * as S4 from './story/ch4.js';
import * as S5 from './story/ch5.js';
import * as S6 from './story/ch6.js';
import * as S7 from './story/ch7.js';

const list = (m) => (Array.isArray(m?.default) ? m.default : Array.isArray(m?.SCENES) ? m.SCENES : []);

export const SCENES_BY_CHAPTER = [S0, S1, S2, S3, S4, S5, S6, S7].map(list);

const hasOwnPause = (ch) => (SCENES_BY_CHAPTER[ch] || []).some((sc) => sc.trigger === 'pause');

// HISTORIA_TMP §5E. Los 📒 con números (canciones, lecciones, récord, fans, semana de regreso) están en motivation.js (kind 'E').
export const PAUSE_SCENE = {
  id: 'pausa_general', chapter: null, trigger: 'pause', place: 'cochera_apagada', repeat: true,
  when: (s) => s.phase === 'pause' && !hasOwnPause(s.chapter),
  beats: [
    { who: 'narrador', text: 'La banda se toma un descanso. Pasa en todas las bandas, hasta en las que llenan estadios.' },
    { who: 'papa', text: 'Revisemos los números juntos. ¿En qué semana empezó a bajar? ¿Qué pasó esa semana?' },
    { who: 'nina', text: 'Las bandas también se van de vacaciones. Y regresan con canciones nuevas.' },
    { who: 'juju', text: 'Yo los espero en primera fila. Ya estoy haciendo letrero nuevo.' },
  ],
};

export const SCENES = [...SCENES_BY_CHAPTER.flat(), PAUSE_SCENE];
export const STORY = SCENES;
export const SCENE_BY_ID = Object.fromEntries(SCENES.map((sc) => [sc.id, sc]));
export default SCENES;
