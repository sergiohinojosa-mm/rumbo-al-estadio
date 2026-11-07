// Compose minigame: style, speed, feeling, a tappable 4x4 riff, a chorus of word magnets and a title.
// It can't go wrong: every riff note fits, every choice sounds good, and Save always works
// (missing words or title get filled in from suggestions, and she sees which ones we added).
// Styles that open later in the story are teasers: she can hear them, not pick them yet.

import { h } from '../util.js';
import { normalizeSong, randomRiff, playSong, previewRiff, riffNote, stopMusic, laneOf, STYLES } from '../music/song.js';
import { unlock } from '../music/synth.js';
import { modal, toast } from './core.js';

const TEMPO_CHIPS = [['lento', '🐢', 'Lento'], ['bailable', '💃', 'Bailable'], ['rapido', '⚡', 'Rápido']];
const MOOD_CHIPS = [['alegre', '😄', 'Alegre'], ['sonador', '🌙', 'Soñador'], ['valiente', '🦁', 'Valiente']];
const FALLBACK_WORDS = ['sol', 'bailar', 'contigo', 'luna', 'volar', 'amigas', 'brillar', 'cantar', 'estrellas',
  'juntas', 'cielo', 'hoy', 'corazón', 'sueños', 'noche', 'gritar', 'bicis', 'mar', 'fuego', 'glorieta'];
const MIN_WORDS = 3;
const MAX_WORDS = 6;
const SUGGEST = 8;

const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : '');
const shuffled = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

export function titleIdeas(words) {
  const w = words.filter(Boolean);
  if (!w.length) return ['Mi canción', '¡Nuestra canción!', 'Desde la cochera'];
  const [a, b, c] = w;
  const ideas = [
    b ? `${cap(a)} y ${b}` : `${cap(a)} y yo`,
    `¡${cap(c || b || a)}!`,
    w.length >= 3 ? `${cap(a)} ${b} ${c}` : `${cap(b || a)} para ti`,
  ];
  return [...new Set(ideas)];
}

// Kind exit check: in the game a modal (core.js #overlay); in a QA page without it, the browser's confirm.
function askLeave() {
  if (!document.getElementById('overlay')) return Promise.resolve(window.confirm('¿Salir sin guardar tu canción?'));
  return modal((close) => h('div', { class: 'msg' },
    h('h3', null, '✍️ ¿Salir sin guardar?'),
    h('p', { class: 'meaning' }, 'Tu canción va muy bien. Si sales ahora, no se guarda.'),
    h('button', { class: 'btn block', type: 'button', onclick: () => close(false) }, '🎸 Seguir componiendo'),
    h('button', { class: 'btn alt block', type: 'button', onclick: () => close(true) }, 'Salir sin guardar')),
  { dismissable: true, label: '¿Salir sin guardar?' }).then((v) => v === true);
}

// chapter: the story chapter (styles open as it advances). songs: her saved songs (a style she has
// never used shows ✨ Nuevo).
export function composeScreen({ song, wordBank, chapter = 0, songs = [], onSave, onCancel } = {}) {
  // Words keep their case (Guadalajara, Palacio); duplicates are dropped ignoring case.
  const seen = new Set();
  const bank = (Array.isArray(wordBank) && wordBank.length >= MIN_WORDS ? wordBank : FALLBACK_WORDS)
    .map((w) => String(w).trim()).filter((w) => w && !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase()));
  const editing = !!song;
  const base = normalizeSong(song || {});
  const ch = Math.max(0, Number(chapter) || 0);
  const isOpen = (x) => x.chapter <= ch || x.id === base.style;
  const used = new Set((Array.isArray(songs) ? songs : []).map((x) => x?.style || 'pop'));
  const st = {
    style: base.style,
    tempo: base.tempo,
    mood: base.mood,
    riff: song && song.riff?.some((v) => v >= 0) ? [...base.riff] : randomRiff(),
    chorus: [...base.chorus],
    title: song ? base.title : '',
  };
  const start = JSON.stringify(st);
  const changed = () => JSON.stringify(st) !== start;
  let player = null;   // full-song playback
  let suggestions = [];
  let prevRiff = null; // the riff before 🎲, so she can go back

  const stopAll = () => { stopMusic(0.15); player = null; setListen(false); lightStep(-1); };
  const alive = () => root.isConnected;

  // ---- 1, 2, 3: chips ----
  const chipRow = (items, key, label, after) => {
    const row = h('div', { class: 'cmp-chips', role: 'group', 'aria-label': label });
    row.paint = () => row.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.v === st[key];
      b.classList.toggle('cmp-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    for (const [v, icon, text] of items) {
      row.append(h('button', {
        type: 'button', class: 'cmp-chip', 'data-v': v,
        onClick: () => { st[key] = v; row.paint(); after?.(v); unlock(); playRiff(); },
      }, h('span', { 'aria-hidden': 'true' }, icon), ' ', text));
    }
    row.paint();
    return row;
  };
  const tempoRow = chipRow(TEMPO_CHIPS, 'tempo', 'Velocidad');
  const moodRow = chipRow(MOOD_CHIPS, 'mood', '¿Cómo se siente?');

  // Style: open styles first, teasers (🔒 + the story stop where it opens) last. A teaser can't be picked,
  // but tapping it plays her riff in that style and says where it opens. Picking a style suggests a speed.
  const styleRow = h('div', { class: 'cmp-chips cmp-styles', role: 'group', 'aria-label': 'Estilo' });
  const paintStyles = () => styleRow.querySelectorAll('button:not(.cmp-locked)').forEach((b) => {
    const on = b.dataset.v === st.style;
    b.classList.toggle('cmp-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  for (const x of [...STYLES.filter(isOpen), ...STYLES.filter((y) => !isOpen(y))]) {
    if (isOpen(x)) {
      const fresh = x.chapter > 0 && !used.has(x.id) && x.id !== base.style;
      styleRow.append(h('button', {
        type: 'button', class: 'cmp-chip', 'data-v': x.id,
        onClick: (e) => {
          st.style = x.id;
          if (st.tempo !== x.tempo) { st.tempo = x.tempo; tempoRow.paint(); }
          e.currentTarget.querySelector('.cmp-new')?.remove();
          paintStyles(); unlock(); playRiff();
        },
      }, h('span', { 'aria-hidden': 'true' }, x.icon), ' ', x.label,
      fresh ? h('small', { class: 'cmp-new' }, '✨ Nuevo') : null));
    } else {
      styleRow.append(h('button', {
        type: 'button', class: 'cmp-chip cmp-locked', 'data-v': x.id, 'aria-disabled': 'true',
        'aria-label': `${x.label}: se abre ${x.where}. Toca para oír cómo suena.`,
        onClick: () => {
          unlock();
          playRiff({ style: x.id, tempo: x.tempo });
          toast(`${x.icon} ${x.label} se abre ${x.where}. ¡Así va a sonar tu riff!`, 3200);
        },
      }, h('span', { 'aria-hidden': 'true' }, x.icon), ' ', x.label,
      h('small', { class: 'cmp-lock', 'aria-hidden': 'true' }, `🔒 ${x.place}`)));
    }
  }
  paintStyles();

  // ---- 4: riff grid ----
  const cells = [];
  const grid = h('div', { class: 'cmp-grid', role: 'group', 'aria-label': 'Tu riff: 16 cuadritos' });
  const paintCell = (i) => {
    const v = st.riff[i];
    const b = cells[i];
    b.dataset.v = String(v);
    b.dataset.lane = v >= 0 ? String(laneOf(v)) : '';
    b.style.setProperty('--lvl', v >= 0 ? String(v) : '0');
    b.firstChild.textContent = v >= 0 ? String(v + 1) : '';
    b.setAttribute('aria-label', `Cuadrito ${i + 1}: ${v >= 0 ? 'nota ' + (v + 1) : 'silencio'}`);
  };
  for (let i = 0; i < 16; i++) {
    const b = h('button', {
      type: 'button', class: 'cmp-cell',
      onClick: () => {
        unlock();
        st.riff[i] = st.riff[i] >= 4 ? -1 : st.riff[i] + 1;
        paintCell(i);
        if (st.riff[i] >= 0) riffNote(st.riff[i], st.mood);
      },
    }, h('span', { class: 'cmp-dot', 'aria-hidden': 'true' }));
    cells.push(b);
    grid.append(b);
    paintCell(i);
  }
  const lightStep = (k) => cells.forEach((c, i) => c.classList.toggle('cmp-now', i === k));
  function playRiff(over = {}) {
    if (!alive()) return;
    stopMusic(0.05); player = null; setListen(false);
    previewRiff(st.riff, st.mood, {
      tempo: over.tempo || st.tempo, style: over.style || st.style,
      onStep: (k) => (alive() ? lightStep(k) : stopMusic()),
    });
  }
  const backBtn = h('button', {
    type: 'button', class: 'cmp-btn cmp-alt', hidden: true,
    onClick: () => { if (!prevRiff) return; unlock(); st.riff = prevRiff; prevRiff = null; backBtn.hidden = true; cells.forEach((_, i) => paintCell(i)); playRiff(); },
  }, '↩️ Volver');

  // ---- 5: chorus magnets (6 slots, the first 3 marked ★) ----
  const chosenBox = h('div', { class: 'cmp-magnets cmp-chosen', 'aria-live': 'polite' });
  const suggestBox = h('div', { class: 'cmp-magnets' });
  const lyric = h('p', { class: 'cmp-lyric' });
  const counter = h('span', { class: 'cmp-count' });
  const refreshSuggestions = () => {
    const free = bank.filter((w) => !st.chorus.includes(w));
    suggestions = shuffled(free).slice(0, SUGGEST);
    if (suggestions.length < SUGGEST) {
      suggestions.push(...shuffled(FALLBACK_WORDS.filter((w) => !st.chorus.includes(w) && !suggestions.includes(w)))
        .slice(0, SUGGEST - suggestions.length));
    }
  };
  const paintChorus = () => {
    chosenBox.replaceChildren(...Array.from({ length: MAX_WORDS }, (_, i) => {
      const w = st.chorus[i];
      if (w) {
        return h('button', {
          type: 'button', class: 'cmp-magnet cmp-on', 'aria-label': `Quitar ${w}`,
          onClick: () => { st.chorus.splice(i, 1); if (!suggestions.includes(w)) suggestions.unshift(w); paintChorus(); },
        }, w, h('span', { class: 'cmp-x', 'aria-hidden': 'true' }, '✕'));
      }
      return h('span', { class: `cmp-slot${i < MIN_WORDS ? ' cmp-star' : ''}`, 'aria-hidden': 'true' }, i < MIN_WORDS ? '★' : '');
    }));
    const full = st.chorus.length >= MAX_WORDS;
    suggestBox.replaceChildren(...suggestions.filter((w) => !st.chorus.includes(w)).map((w) => h('button', {
      type: 'button', class: 'cmp-magnet', disabled: full,
      onClick: () => { if (st.chorus.length < MAX_WORDS) { st.chorus.push(w); paintChorus(); } },
    }, w)));
    lyric.textContent = st.chorus.length ? `“${cap(st.chorus.join(' '))}”` : '';
    const n = st.chorus.length;
    counter.textContent = full ? '¡Ya tienes 6!' : n >= MIN_WORDS ? '✓ ¡Coro listo!' : 'Llena las ★';
    counter.setAttribute('aria-label', `${n} de 6 palabras. Con 3 ya está listo.`);
    counter.classList.toggle('cmp-okc', n >= MIN_WORDS);
    paintTitleIdeas();
  };

  // ---- 6: title ----
  const titleInput = h('input', {
    class: 'cmp-input', type: 'text', maxlength: '32', placeholder: 'Ponle nombre', 'aria-label': 'Título de la canción',
    autocomplete: 'off', enterkeyhint: 'done', spellcheck: 'false',
    onInput: (e) => { st.title = e.target.value; },
  });
  titleInput.value = st.title;
  const ideasBox = h('div', { class: 'cmp-chips cmp-ideas' });
  function paintTitleIdeas() {
    ideasBox.replaceChildren(...titleIdeas(st.chorus).map((t) => h('button', {
      type: 'button', class: 'cmp-chip cmp-small',
      onClick: () => { st.title = t; titleInput.value = t; },
    }, t)));
  }

  // ---- listen + save ----
  const listenBtn = h('button', { type: 'button', class: 'cmp-btn cmp-alt', onClick: () => toggleListen() });
  function setListen(on) { listenBtn.textContent = on ? '■ Parar' : '▶ Escuchar'; listenBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function toggleListen() {
    if (player) { stopAll(); return; }
    unlock();
    lightStep(-1);
    player = playSong(finalSong(false), {
      loops: 1,
      onBeat: () => { if (!alive()) stopAll(); },
      onEnd: () => { player = null; setListen(false); },
    });
    setListen(true);
  }
  setListen(false);

  function finalSong(fill = true) {
    const chorus = [...st.chorus];
    if (fill) {
      const extra = [...suggestions, ...shuffled(bank), ...FALLBACK_WORDS].filter((w) => !chorus.includes(w));
      while (chorus.length < MIN_WORDS && extra.length) chorus.push(extra.shift());
    }
    const riff = st.riff.some((v) => v >= 0) ? [...st.riff] : randomRiff();
    const title = st.title.trim() || titleIdeas(chorus)[0];
    return normalizeSong({ ...(song || {}), style: st.style, tempo: st.tempo, mood: st.mood, riff, chorus, title });
  }

  const save = () => {
    stopAll();
    const s = finalSong(true);
    const added = s.chorus.filter((w) => !st.chorus.includes(w));
    st.chorus = [...s.chorus]; st.title = s.title; titleInput.value = s.title;
    paintChorus();
    if (added.length) toast(`✨ Completamos tu coro con: ${added.join(', ')}`, 3600);
    onSave?.(s);
  };
  const cancel = async () => {
    stopAll();
    if (changed() && !(await askLeave())) return;
    onCancel?.();
  };

  refreshSuggestions();

  const step = (n, title, ...body) => h('section', { class: 'cmp-step' },
    h('h3', { class: 'cmp-h' }, h('span', { class: 'cmp-n', 'aria-hidden': 'true' }, n), title), ...body);

  const root = h('div', { class: 'cmp' },
    h('header', { class: 'cmp-top' },
      h('h2', { class: 'cmp-title' }, editing ? '✍️ Tu canción' : '✍️ Nueva canción'),
      onCancel ? h('button', { type: 'button', class: 'cmp-btn cmp-ghost', 'aria-label': 'Salir sin guardar', onClick: cancel }, '✕') : null),
    h('div', { class: 'cmp-col' },
      step(1, '🎤 Estilo', styleRow),
      step(2, '🥁 Velocidad', tempoRow),
      step(3, '🎨 ¿Cómo se siente?', moodRow),
      step(4, '🎸 Tu riff',
        h('p', { class: 'cmp-hint' }, 'Toca los cuadritos: cada toque sube la nota. Todas combinan.'),
        grid,
        h('div', { class: 'cmp-row' },
          h('button', { type: 'button', class: 'cmp-btn cmp-alt', onClick: () => { unlock(); playRiff(); } }, '▶ Oír riff'),
          h('button', {
            type: 'button', class: 'cmp-btn cmp-alt',
            onClick: () => { unlock(); prevRiff = [...st.riff]; backBtn.hidden = false; st.riff = randomRiff(); cells.forEach((_, i) => paintCell(i)); playRiff(); },
          }, '🎲 Otro riff'),
          backBtn))),
    h('div', { class: 'cmp-col' },
      step(5, '💬 Tu coro',
        h('div', { class: 'cmp-row cmp-between' }, h('span', { class: 'cmp-hint' }, 'Arma tu coro con imanes.'), counter),
        chosenBox, lyric,
        suggestBox,
        h('button', { type: 'button', class: 'cmp-btn cmp-ghost cmp-more', onClick: () => { refreshSuggestions(); paintChorus(); } }, '🔄 Otras palabras')),
      step(6, '🏷️ Título', titleInput, ideasBox)),
    h('div', { class: 'cmp-row cmp-actions' },
      listenBtn,
      h('button', { type: 'button', class: 'cmp-btn cmp-main', onClick: save }, '💾 Guardar')),
    h('p', { class: 'cmp-hint cmp-foot' }, 'Es imposible fallar. Tu coro lo cantará el público en los shows.'));

  paintChorus();
  root.stop = stopAll;
  return root;
}
