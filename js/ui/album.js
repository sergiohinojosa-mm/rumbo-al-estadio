// 📸 El álbum de {hermana}: una foto por show, agrupadas por capítulo, en el orden de la historia (de las 3 sillas de
// la cochera al estadio: ver crecer a la banda es el premio, regla 37). Al abrir baja a la foto más nueva.
// Tocar una foto la abre en grande con la nota de {hermana}; "📤 Guardar foto" la entrega como PNG de 1080 px
// (share.js: hoja de compartir en iPhone, descarga en la Mac). Papá decide con quién compartirla (regla 11).
//
// API: albumModal(s, { open }) → Promise (resolves when it closes). open: an entry of s.history to show big first.

import { h, plural } from '../util.js';
import { modal, sfx, toast, fill, artReady, scrollBehavior } from './core.js';
import { CHAPTERS } from '../data/chapters.js';
import { svgToPng, shareFiles, safeName } from './share.js';
import { photosOf, photoSvg, photoImg, photoNote, photoTitle, photoAlt, EXPORT_W, EXPORT_H } from './photo.js';
import { VENUE_BY_ID } from '../data/venues.js';

const chapterName = (c) => {
  const ch = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, c | 0))];
  return ch ? `${ch.icon} ${ch.name}` : '📸 Shows';
};

export async function albumModal(s, { open = null } = {}) {
  await artReady;
  const list = photosOf(s);
  const sister = fill(s, '{hermana}');
  const urls = [];            // blob URLs of every picture shown, freed when the album closes
  const thumbs = new Map();   // index → <img> already drawn
  let io = null;

  // The modal box scrolls on its own when it is taller than the screen; on some layouts the overlay does.
  const scrollers = () => [grid.closest('.modal'), document.getElementById('overlay')].filter(Boolean);
  const setTop = (y) => scrollers().forEach((el) => { el.scrollTop = y; });
  const grid = h('div', { class: 'al-grid-wrap' });
  const big = h('div', { class: 'al-big', hidden: true });

  // ---- Grid ----
  const drawThumb = (slot) => {
    const i = Number(slot.dataset.i);
    if (thumbs.has(i)) return;
    const it = list[i];
    let img = null;
    try { img = photoImg(photoSvg(s, it.entry, { size: 'thumb', photo: it.photo }), { alt: '', keep: urls }); } catch (e) { console.warn('[album] foto', e); }
    if (!img) return;
    thumbs.set(i, img);
    slot.classList.add('on');
    slot.replaceChildren(img);
  };
  const tile = (it) => {
    const e = it.entry;
    const slot = h('span', { class: 'al-ph', 'data-i': String(it.i), 'aria-hidden': 'true' }, VENUE_BY_ID[e.venue]?.icon || '📸');
    return h('button', {
      class: 'al-tile', type: 'button', 'aria-label': photoAlt(s, e, it.photo),
      onclick: () => { sfx('tap'); showBig(it.i); },
    }, slot);
  };

  function buildGrid(close) {
    const head = h('div', { class: 'al-head' },
      h('h3', null, `📸 El álbum de ${sister}`),
      h('p', { class: 'muted small' }, list.length
        ? (list.length === 1 ? 'La foto del primer show. Tócala para verla en grande.'
          : `${plural(list.length, 'foto', 'fotos')}, una de cada show. Toca una para verla en grande.`)
        : 'Aquí van las fotos de cada show.'));
    if (!list.length) {
      grid.replaceChildren(head,
        h('div', { class: 'al-empty' },
          h('div', { class: 'al-empty-pic', 'aria-hidden': 'true' }, '📷'),
          h('p', null, `Todavía no hay fotos. En el primer show, ${sister} toma la primera.`)),
        h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Cerrar'));
      return;
    }
    // One section per chapter, in story order.
    const groups = [];
    for (const it of list) {
      const c = it.entry.chapter | 0;
      let g = groups[groups.length - 1];
      if (!g || g.c !== c) { g = { c, items: [] }; groups.push(g); }
      g.items.push(it);
    }
    grid.replaceChildren(head,
      ...groups.map((g) => h('section', { class: 'al-sec' },
        h('h4', null, chapterName(g.c), h('small', { class: 'muted' }, ` · ${plural(g.items.length, 'foto', 'fotos')}`)),
        h('div', { class: 'al-grid' }, g.items.map(tile)))),
      h('button', { class: 'btn block', type: 'button', onclick: () => close() }, 'Cerrar'));
  }

  // Thumbnails are drawn when they come near the screen (a long album never draws 40 photos at once).
  function watch() {
    const slots = [...grid.querySelectorAll('.al-ph')];
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); drawThumb(en.target); }
      }, { rootMargin: '400px 0px' });
      slots.forEach((sl) => io.observe(sl));
    } else {
      let k = 0;
      const step = () => { const end = Math.min(slots.length, k + 4); for (; k < end; k++) drawThumb(slots[k]); if (k < slots.length) setTimeout(step, 30); };
      step();
    }
  }

  // ---- Big view ----
  let bigToken = 0;
  function showBig(idx) {
    const it = list[idx];
    if (!it) return;
    const e = it.entry;
    const token = ++bigToken;
    big.dataset.i = String(idx);
    let blob = null;
    const save = h('button', { class: 'btn block', type: 'button', disabled: true }, 'Preparando la foto…');
    save.addEventListener('click', () => {
      if (!blob) return;
      sfx('tap');
      // iPhone: navigator.share has to start inside this tap, so the PNG was made before (no await before it).
      const name = `foto-${safeName(s.band?.name, 'banda')}-semana-${e.week}.png`;
      shareFiles([{ blob, name }], { title: photoTitle(s, e, it.photo) }).then((res) => {
        if (res === 'downloaded') toast('📸 Foto guardada en Descargas');
        else if (res === 'shared') toast('📸 ¡Lista!');
        else if (res === 'failed') toast('No se pudo guardar la foto. Intenta otra vez.');
      });
    });
    const nav = (d) => h('button', {
      class: 'btn alt', type: 'button', disabled: !list[idx + d],
      'aria-label': d < 0 ? 'Foto anterior' : 'Foto siguiente',
      onclick: () => { sfx('tap'); showBig(idx + d); },
    }, d < 0 ? '‹ Anterior' : 'Siguiente ›');
    const pic = photoImg(photoSvg(s, e, { size: 'big', photo: it.photo }), { alt: photoAlt(s, e, it.photo), keep: urls, cls: 'al-big-img' });
    // replaceChildren() writes a null as the text "null": leave the missing parts out.
    big.replaceChildren(...[
      h('div', { class: 'al-big-top' },
        h('button', { class: 'btn ghost al-back', type: 'button', onclick: () => { sfx('tap'); showGrid(); } }, '← Álbum'),
        h('small', { class: 'muted' }, `${idx + 1} de ${list.length}`)),
      h('h3', null, photoTitle(s, e, it.photo)),
      h('figure', { class: 'al-big-pic' }, pic),
      h('p', { class: 'al-note' }, photoNote(s, e, it.photo), h('span', { class: 'al-sign' }, `— ${sister} 📸`)),
      list.length > 1 ? h('div', { class: 'al-nav' }, nav(-1), nav(1)) : null,
      save,
      h('p', { class: 'muted small center' }, 'Papá decide con quién compartirla.')].filter(Boolean));
    grid.hidden = true;
    big.hidden = false;
    setTop(0);
    // The 1080 px PNG is made now, while she looks at the photo, so the tap on "Guardar" can share it right away.
    svgToPng(photoSvg(s, e, { size: 'export', photo: it.photo }), EXPORT_W, EXPORT_H, { background: '#FFFDF6' }).then((b) => {
      if (token !== bigToken) return;
      blob = b;
      save.disabled = !b;
      save.textContent = b ? '📤 Guardar foto' : 'No se pudo preparar la foto';
    });
  }
  // Back to the grid, where the photo she was looking at is (also when the album opened on a photo).
  function showGrid() {
    bigToken++;
    const at = big.dataset.i;
    big.hidden = true;
    big.replaceChildren();
    grid.hidden = false;
    grid.querySelector(`.al-ph[data-i="${at}"]`)?.closest('.al-tile')?.scrollIntoView?.({ block: 'center' });
  }

  const done = modal((close) => {
    buildGrid(close);
    return h('div', { class: 'al-album' }, grid, big);
  }, { dismissable: true, wide: true, label: `Álbum de ${sister}` });

  // Arrows flip photos in the big view (Mac).
  const onKey = (ev) => {
    if (big.hidden) return;
    const cur = Number(big.dataset.i);
    if (ev.key === 'ArrowLeft' && list[cur - 1]) showBig(cur - 1);
    if (ev.key === 'ArrowRight' && list[cur + 1]) showBig(cur + 1);
  };
  document.addEventListener('keydown', onKey);

  if (list.length) {
    watch();
    const at = open ? list.findIndex((it) => it.entry === open || (it.entry.week === open.week && it.entry.venue === open.venue)) : -1;
    if (at >= 0) showBig(at);
    else {
      // Down to the newest photo (the album reads in story order, from the first show).
      const last = grid.querySelector('.al-sec:last-of-type .al-tile:last-child');
      setTimeout(() => last?.scrollIntoView?.({ block: 'center', behavior: list.length > 6 ? 'auto' : scrollBehavior() }), 0);
    }
  }

  return done.then((v) => {
    io?.disconnect();
    document.removeEventListener('keydown', onKey);
    bigToken++;
    setTimeout(() => urls.splice(0).forEach((u) => URL.revokeObjectURL(u)), 500);
    return v;
  });
}
