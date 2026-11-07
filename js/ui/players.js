// "¿Quién juega hoy?": one profile per player on this device (Mariel, Luciana…), each with her own
// band and progress. Create, edit and delete. Everything stays in this device: no cloud.
// The avatar editor is art.js's lookEditor when it exists; otherwise just name + color.

import { h } from '../util.js';
import * as store from '../store.js';
import { mount, modal, sfx, toast, lookFace, artReady, art } from './core.js';

const FALLBACK_COLORS = ['#c2185b', '#7b2fbf', '#2f5fc4', '#17794a', '#a3530f', '#2d6a8e', '#b3123a', '#241a33'];
const norm = (t) => String(t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// "Las Estrellas Fugaces", or a friendly line when there's no band yet. Never fans or money:
// the cards are side by side and nobody competes.
export function profileSubtitle(p) {
  let s = null;
  try { s = store.loadGameOf ? store.loadGameOf(p.id) : null; } catch { s = null; }
  if (!s) return 'Todavía sin banda';
  const band = s.band?.name?.trim();
  // Only her band, never her chapter: two profiles side by side must not invite comparing sisters (sin competencia).
  return band || 'Todavía sin nombre de banda';
}

export function pickPlayer(onPick) {
  const draw = () => {
    const list = store.profiles();
    mount(h('div', { class: 'page players-page' },
      h('div', { class: 'stack center' },
        h('p', { class: 'eyebrow' }, 'Rumbo al Estadio'),
        h('h1', null, '¿Quién juega hoy? 🎸')),
      h('div', { class: 'profiles' },
        list.map((p) => h('div', { class: 'prof' },
          h('button', { class: 'prof-main', type: 'button', onclick: () => { sfx('tap'); store.selectProfile(p.id); onPick(p.id); } },
            lookFace(p.look || {}, { name: p.name }),
            h('b', null, p.name),
            h('small', null, profileSubtitle(p))),
          h('div', { class: 'prof-tools' },
            h('button', { type: 'button', 'aria-label': `Editar a ${p.name}`, onclick: async () => {
              const r = await editor(p);
              if (r) { store.updateProfile(p.id, r); toast('¡Listo! Se guardó.'); draw(); }
            } }, '✏️ Editar'),
            h('button', { type: 'button', 'aria-label': `Borrar a ${p.name}`, onclick: async () => {
              if (await confirmDelete(p)) {
                store.deleteProfile(p.id);
                try { localStorage.removeItem(`rumbo.lastPlayed.${p.id}`); } catch { /* storage blocked */ }   // main.js's "welcome back" clock
                sfx('bad'); draw();
              }
            } }, '🗑️ Borrar')))),
        h('div', { class: 'prof new' },
          h('button', { class: 'prof-main', type: 'button', onclick: async () => {
            const r = await editor(null);
            if (r) { const id = store.createProfile(r.name, r.look); sfx('fanfare'); onPick(id); }
          } },
          h('span', { class: 'plus', 'aria-hidden': 'true' }, '＋'),
          h('b', null, 'Nueva jugadora'),
          h('small', null, 'Cada quien con su propia banda'))))));
  };
  draw();
}

function confirmDelete(p) {
  return modal((close) => h('div', { class: 'msg' },
    h('div', { class: 'big-ic', 'aria-hidden': 'true' }, '🗑️'),
    h('h3', null, `¿Borrar a ${p.name}?`),
    h('p', { class: 'meaning' }, 'Se borran su banda, sus canciones, sus lecciones y su diario en este dispositivo. No se puede deshacer.'),
    h('button', { class: 'btn block', type: 'button', onclick: () => close(true) }, 'Sí, borrar'),
    h('button', { class: 'btn alt block', type: 'button', onclick: () => close(false) }, 'Cancelar')), { dismissable: true, label: `Borrar a ${p.name}` });
}

// Name + look. Resolves to { name, look } or null.
export async function editor(existing) {
  await artReady;
  const A = art() || {};
  // Ready-made portraits that follow the name: Mariel and Luciana (REQUISITOS 3 y 4).
  const PRESETS = { mariel: A.MARIEL_LOOK || null, luciana: A.LUCIANA_LOOK || null };
  const base = () => (A.DEFAULT_LOOK ? { ...A.DEFAULT_LOOK } : { color: FALLBACK_COLORS[Math.floor(Math.random() * 4)] });
  let name = existing?.name || '';
  let look = existing?.look && Object.keys(existing.look).length ? { ...existing.look } : base();
  // The look follows the name only until she changes something by hand.
  let touched = !!(existing?.look && Object.keys(existing.look).length);
  let auto = false;

  return modal((close) => {
    const preview = h('div', { class: 'editor-prev' });
    // art.js's lookEditor brings its own big preview; the fallback editor uses this one.
    const drawPreview = () => { if (!A.lookEditor) preview.replaceChildren(lookFace(look, { name: name || '?', big: true })); };
    const save = h('button', { class: 'btn block big', type: 'button', disabled: !name.trim(),
      onclick: () => { sfx('good'); close({ name: name.trim().slice(0, 16), look }); } }, existing ? '✔ Guardar' : '✔ ¡Lista!');
    const body = h('div', { class: 'stack' });

    const onLook = (next) => { look = { ...next }; touched = true; auto = false; drawPreview(); };
    const drawBody = () => {
      let ed = null;
      if (typeof A.lookEditor === 'function') {
        try {
          const out = A.lookEditor(look, onLook);
          ed = out instanceof Node ? out : out ? h('div', { html: String(out) }) : null;
        } catch { ed = null; }
      }
      if (!ed) {
        ed = h('div', { class: 'stack' },
          h('b', null, '🎨 Tu color'),
          h('div', { class: 'sws', role: 'group', 'aria-label': 'Color' }, FALLBACK_COLORS.map((c) => h('button', {
            class: 'sw', type: 'button', style: { background: c }, 'aria-label': `Color ${c}`, 'aria-pressed': String(look.color === c),
            onclick: (e) => {
              sfx('tap'); onLook({ ...look, color: c });
              e.currentTarget.parentElement.querySelectorAll('.sw').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
            },
          }))));
      }
      body.replaceChildren(h('b', null, '✏️ Tu look'), ed);
    };

    const input = h('input', {
      class: 'text-input', type: 'text', value: name, maxlength: 16, placeholder: 'Tu nombre', 'aria-label': 'Tu nombre',
      autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done',
      oninput: (e) => {
        name = e.target.value;
        save.disabled = !name.trim();
        // Mariel's and Luciana's portraits come ready (Mariel: long wavy light-brown hair, blue-grey eyes,
        // golden chain). The look follows the name until she changes something by hand.
        if (!touched) {
          const preset = PRESETS[norm(name)];
          if (preset && auto !== norm(name)) { look = { ...preset }; auto = norm(name); drawBody(); }
          else if (!preset && auto) { look = base(); auto = false; drawBody(); }
        }
        drawPreview();
      },
      onkeydown: (e) => { if (e.key === 'Enter' && name.trim()) save.click(); },
    });
    drawPreview();
    drawBody();
    setTimeout(() => input.focus(), 80);
    return h('div', { class: 'msg' },
      h('div', { class: 'from' }, existing ? 'Editar jugadora' : 'Nueva jugadora'),
      preview,
      h('label', { class: 'field', style: { textAlign: 'left' } }, h('span', null, '¿Cómo te llamas?'), input),
      h('div', { style: { textAlign: 'left' } }, body),
      save,
      h('button', { class: 'btn alt block', type: 'button', onclick: () => close(null) }, 'Cancelar'));
  }, { dismissable: true, wide: !!A.lookEditor, label: existing ? 'Editar jugadora' : 'Nueva jugadora' });
}
