// Preparar el show (DISENO §2.5): lugar → cobro (deslizador solo si el lugar cobra entrada) → setlist.
// Before choosing, a 💡 with the numbers of her game; after confirming, a short ✅ / 💡 with the rule of
// place and price. show.setPrep() keeps the choice in s.week$.prep = { venueId, price, setlist, songId } and
// moves the phase to 'live' (playShow reads it in live.js).
//
// Also exports the stage helpers that live.js and close.js reuse: sceneNode() and placeOf().

import { h, money, num, plural } from '../util.js';
import { mount, art, artReady, sfx, tipBox, verdictBox, metricBar, fill, remindBox } from './core.js';
import * as show from '../engine/show.js';
import * as store from '../store.js';
import { VENUE_BY_ID } from '../data/venues.js';

// ---- Shared stage pieces (live.js and close.js import them) ----
const PLACE = {
  cochera: 'cochera', cumple: 'cumple', cafe: 'cafe', kermes: 'kermes', foro: 'foro', plaza: 'plaza',
  indie: 'indierocks', nave: 'foro_mediano', gdl: 'gira', mty: 'gira', pue: 'gira', arena: 'palacio',
  palacio: 'palacio', estadio: 'estadio',
};
const DAYTIME = new Set(['cochera', 'cumple', 'cafe', 'kermes', 'plaza']);
export const placeOf = (venueId) => PLACE[venueId] || 'cochera';

// Juju's sign says "VAMOS {NOMBRE}": art.js writes VAMOS, we pass the player's name (never the band's).
export const playerSign = (s) => String(fill(s, '{nombre}') || 'Mariel').toUpperCase();
const myLook = (s) => s.look || store.currentProfile?.()?.look || art()?.MARIEL_LOOK || undefined;

// The venue drawn with the band and a crowd of `count` out of `cap`. Falls back to emojis without art.js.
export function sceneNode(s, { venueId, count = 0, cap = 10, lit = false, juju = true, cls = '' } = {}) {
  const el = h('div', { class: `sh-scene ${cls}` });
  const v = venueById(venueId);
  const draw = () => {
    const a = art();
    if (a?.sceneSvg) {
      try {
        el.innerHTML = a.sceneSvg({
          place: placeOf(venueId), members: s.members, look: myLook(s), city: ['gdl', 'mty', 'pue'].includes(venueId) ? venueId : undefined,
          night: !DAYTIME.has(venueId), garageLevel: Math.min(2, s.unlocks?.garage || 0), band: s.band?.name,
          poster: { band: s.band?.name, logo: s.band?.logo, stage: s.unlocks?.poster || 'copy' },
          crowd: { count: Math.round(count), cap, lit, juju: juju && count > 0, sign: { text: playerSign(s), level: Math.min(2, s.chapter >> 1) } },
        });
        return true;
      } catch (e) { console.warn('[prep] sceneSvg', e); }
    }
    el.replaceChildren(h('div', { class: 'sh-fallback', role: 'img', 'aria-label': `${v?.name || 'Escenario'}: ${count} de ${cap}` },
      h('span', { class: 'sh-fb-ic' }, v?.icon || '🎤'), h('span', null, '🧍'.repeat(Math.min(24, Math.round((24 * count) / Math.max(1, cap)))))));
    return false;
  };
  if (!draw()) artReady.then(() => { if (el.isConnected || !el.parentNode) draw(); });
  return el;
}

export const venueById = (id) => VENUE_BY_ID[id] || null;

// A row of little people that grows and shrinks with the forecast (each 🧍 can stand for several).
export function queueRow(count, cap) {
  // One 🧍 stands for a round number (5, 10, 20, 25, 50, 100…), never "🧍 = 34".
  const raw = Math.max(1, Math.ceil(cap / 30));
  const mag = 10 ** Math.floor(Math.log10(raw));
  const per = raw <= 1 ? 1 : ([1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw && Number.isInteger(k)) || 10 * mag);
  const shown = Math.round(count / per);
  const empty = Math.max(0, Math.round(cap / per) - shown);
  return h('div', { class: 'sh-queue', role: 'img', 'aria-label': `${plural(count, 'persona', 'personas')} de ${num(cap)} lugares` },
    h('span', { class: 'sh-q-on', 'aria-hidden': 'true' }, '🧍'.repeat(shown)),
    h('span', { class: 'sh-q-off', 'aria-hidden': 'true' }, '·'.repeat(Math.min(30, empty))),
    per > 1 ? h('small', { class: 'muted' }, ` 🧍 = ${per}`) : null);
}

// ---- Rules (pure) ----
// "en la cochera", "en la fiesta de cumpleaños": venues.js `en` if it has one, else a local article.
const EN = { cochera: 'la cochera', cumple: 'la fiesta de cumpleaños', cafe: 'el Café La Glorieta', kermes: 'la kermés de la escuela',
  foro: 'el Foro Cachito', plaza: 'la plaza de la colonia', indie: 'el Foro Indie Rocks', nave: 'el Foro La Nave',
  arena: 'la Arena de la Ciudad', palacio: 'el Palacio de los Deportes', estadio: 'el Estadio de la CDMX' };
export const venueEn = (v) => v?.en || EN[v?.id] || v?.name || 'el escenario';
// "De cada $10, el lugar se queda con $2"; a cut like 0.25 reads "De cada $100… $25" (never "$3" for $2.50).
const cutLine = (v) => {
  const c = v.pay.venueCut || 0;
  return Number.isInteger(Math.round(c * 1000) / 100)
    ? `${v.icon} De cada $10, el lugar se queda con $${Math.round(c * 10)}`
    : `${v.icon} De cada $100, el lugar se queda con $${Math.round(c * 100)}`;
};
const payLine = (v) => (v.pay.type === 'door' ? `🎟️ entrada` : v.pay.type === 'fixed' ? `💵 ${money(v.pay.amount)} fijos` : '🎩 sombrero');

// 💡 before deciding, with her numbers: which place she can fill.
export function prepTip(s, opts) {
  const fans = s.m.fans;
  const scored = opts.filter((o) => o.open).map((o) => ({ o, f: show.forecast(s, { venueId: o.venue.id }) }));
  const fill80 = scored.filter((x) => x.f.cap > 3 && x.f.expected >= x.f.cap * 0.8).sort((a, b) => b.f.cap - a.f.cap)[0];
  if (fill80) return `Tienen ${plural(fans, 'fan', 'fans')}: ${fill80.o.venue.icon} ${fill80.o.venue.name} (caben ${num(fill80.f.cap)}) se puede llenar.`;
  if (fans < 10) return `Tienen ${plural(fans, 'fan', 'fans')}. Un lugar chico lleno se siente mejor que uno grande vacío.`;
  return `Tienen ${plural(fans, 'fan', 'fans')}. Mira cuántos caben y cuántos llegarían en cada lugar.`;
}

// ✅ / 💡 after confirming: the rule of place and price, with this forecast.
export function prepVerdict(s, v, f, price) {
  const ratio = f.expected / Math.max(1, f.cap);
  const door = v.pay.type === 'door';
  const fair = v.fairPrice || 0;
  if (door && price > fair * 1.15) return { verdict: 'ok', why: `💡 La próxima vez pon el boleto cerca de ${money(fair)}, porque un boleto caro deja gente en su casa.` };
  if (f.earnings < 0) return { verdict: 'ok', why: `💡 La próxima vez revisa cuántos llegarían, porque la renta de ${money(v.cost)} se paga aunque llegue poca gente.` };
  if (door && price < fair * 0.75) return { verdict: 'ok', why: '💡 La próxima vez piensa antes de bajar tanto el boleto, porque volver a subirlo cuesta trabajo.' };
  if (f.cap > 20 && ratio < 0.4) return { verdict: 'ok', why: '💡 La próxima vez elige un lugar más chico, porque un lugar lleno se siente mejor que uno vacío.' };
  if (door) return { verdict: 'good', why: `✅ ¡Gran decisión! porque un boleto de ${money(price)} es justo y esperan a unas ${plural(f.expected, 'persona', 'personas')}.` };
  if (v.pay.type === 'fixed') return { verdict: 'good', why: `✅ ¡Gran decisión! porque ${money(v.pay.amount)} seguros ayudan a la caja, llegue quien llegue.` };
  if (ratio >= 0.7) return { verdict: 'good', why: `✅ ¡Gran decisión! porque con ${plural(s.m.fans, 'fan', 'fans')} es más fácil llenar ${num(f.cap)} lugares.` };
  return { verdict: 'good', why: '✅ ¡Gran decisión! porque en el sombrero cada persona deja más si el show suena bonito.' };
}

const step5 = (v) => {
  const span = (v.maxPrice || 100) - (v.minPrice || 0);
  return span >= 600 ? 50 : span >= 200 ? 10 : 5;
};

// ---- Screen ----
export async function renderPrep(s, ctx = {}) {
  await artReady;
  const opts = show.venueOptions(s);
  const saved = s.week$.prep || {};
  const n = show.setSize(s);
  const ui = {
    venueId: opts.some((o) => o.open && o.venue.id === saved.venueId) ? saved.venueId : null,
    price: saved.price,
    // This week's choice if she already made it; if not, her newest songs (a new song goes in by itself).
    setlist: (saved.setlist || []).filter((id) => s.songs.some((x) => x.id === id)).slice(0, n),
    confirmed: false,
  };
  if (!saved.setlist && !ui.setlist.length) ui.setlist = show.defaultSetlist(s).filter((id) => id !== 'cover');
  if (opts.filter((o) => o.open).length === 1 && !ui.venueId) ui.venueId = opts.find((o) => o.open).venue.id;
  // A venue picked by itself (the only one open, or saved) still needs a ticket price: never $NaN.
  const v0 = opts.find((o) => o.venue.id === ui.venueId)?.venue;
  if (v0 && v0.pay.type === 'door' && !Number.isFinite(ui.price)) ui.price = lastPrice(s, v0);

  const venue = () => opts.find((o) => o.venue.id === ui.venueId)?.venue || null;
  const fullSet = () => [...ui.setlist, ...Array(Math.max(0, n - ui.setlist.length)).fill('cover')];
  const fc = () => show.forecast(s, { venueId: ui.venueId, price: ui.price, setlist: fullSet() });

  const sceneWrap = h('div', { class: 'sh-left' });
  const right = h('div', { class: 'sh-right stack' });
  const page = h('div', { class: 'page sh-page' },
    metricBar(s, {}, { onNotebook: ctx.openNotebook }),
    h('div', { class: 'sh-cols' }, sceneWrap, right));

  let raf = 0;
  const drawScene = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const v = venue();
      if (!v) { sceneWrap.replaceChildren(sceneNode(s, { venueId: 'cochera', count: 0, cap: 10, juju: false })); return; }
      const f = fc();
      sceneWrap.replaceChildren(sceneNode(s, { venueId: v.id, count: f.expected, cap: f.cap }));
    });
  };

  function venueStep() {
    const tip = tipBox(prepTip(s, opts));
    const list = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Lugares' }, opts.map((o) => {
      const v = o.venue;
      const f = o.open ? show.forecast(s, { venueId: v.id }) : null;
      return h('button', {
        class: `opt sh-venue ${ui.venueId === v.id ? 'sel' : ''} ${o.open ? '' : 'off'}`, type: 'button', role: 'radio',
        'aria-checked': String(ui.venueId === v.id), disabled: !o.open,
        onclick: () => { sfx('tap'); ui.venueId = v.id; ui.price = v.pay.type === 'door' ? lastPrice(s, v) : undefined; draw(); },
      },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, v.icon),
      h('span', { class: 'sh-v' },
        h('b', null, v.name),
        h('small', null, o.open ? `caben ${num(v.cap)} · ${payLine(v)} · llegarían unas ${num(f.expected)}` : `🔒 ${o.reason}`)));
    }));
    return [h('h2', null, '¿Dónde tocan el sábado?'), tip, list];
  }

  function moneyBox(v) {
    const f = fc();
    if (v.pay.type === 'hat') return h('div', { class: 'box sh-money' }, h('span', null, `🎩 Pasan el sombrero: entre mejor suene, más dejan. Unos ${money(f.earnings)}.`));
    if (v.pay.type === 'fixed') return h('div', { class: 'box sh-money' }, h('span', null, `💵 Pago fijo de ${money(v.pay.amount)}, llegue quien llegue.`));
    const tickets = ui.price * f.expected;
    const cut = Math.round(tickets * v.pay.venueCut);
    return h('div', { class: 'box sh-money num' },
      h('div', { class: 'ln' }, h('span', null, `🎟️ ${money(ui.price)} × ${num(f.expected)}`), h('b', null, money(tickets))),
      h('div', { class: 'ln' }, h('span', null, cutLine(v)), h('b', null, `−${money(cut)}`)),
      v.cost ? h('div', { class: 'ln' }, h('span', null, '🔊 Renta'), h('b', null, `−${money(v.cost)}`)) : null,
      h('div', { class: `ln sh-net ${f.earnings < 0 ? 'neg' : ''}` }, h('span', null, 'Les quedan unos'), h('b', null, money(f.earnings))));
  }

  function priceBox(v) {
    const slider = h('input', {
      type: 'range', min: v.minPrice, max: v.maxPrice, step: step5(v), value: ui.price, 'aria-label': 'Precio del boleto',
      'aria-valuetext': money(ui.price),
    });
    const setFill = () => slider.style.setProperty('--fill', `${(100 * (ui.price - v.minPrice)) / Math.max(1, v.maxPrice - v.minPrice)}%`);
    setFill();
    const label = h('b', null, `🎟️ Entrada: ${money(ui.price)}`);
    const live = h('div', { class: 'sh-live' });
    const paint = () => {
      const g = fc();
      // 📖 Recuerda when she slides the ticket far below the fair price and already learned why that hurts.
      const cheap = ui.price < (v.fairPrice || 0) * 0.75 ? remindBox(s, 'guerra_precios') : null;
      live.replaceChildren(queueRow(g.expected, g.cap), h('span', { class: 'sh-count' }, `Llegarían unas ${num(g.expected)} de ${num(g.cap)}`), moneyBox(v), cheap || '');
    };
    slider.addEventListener('input', () => {
      ui.price = Number(slider.value);
      label.textContent = `🎟️ Entrada: ${money(ui.price)}`;
      slider.setAttribute('aria-valuetext', money(ui.price));
      setFill();
      paint();
      drawScene();
    });
    paint();
    return h('div', { class: 'box sh-price' }, label, slider, live);
  }

  function setlistBox() {
    const own = s.songs;
    const learning = (s.stats?.shows || 0) < 3;   // the first shows explain the words
    const count = ui.setlist.length;
    const covers = n - count;
    const chips = own.length
      ? h('div', { class: 'chips', role: 'group', 'aria-label': 'Tus canciones' }, own.map((song) => {
        const on = ui.setlist.includes(song.id);
        return h('button', {
          class: `chip ${on ? 'on' : ''}`, type: 'button', 'aria-pressed': String(on), disabled: !on && count >= n,
          onclick: () => {
            sfx('tap');
            ui.setlist = on ? ui.setlist.filter((id) => id !== song.id) : [...ui.setlist, song.id];
            draw();
          },
        }, `🎵 ${song.title}`);
      }))
      : null;
    return h('div', { class: 'box sh-set' },
      h('b', null, `🎶 Setlist: ${plural(count, 'tuya', 'tuyas')}${covers ? ` + ${plural(covers, 'cover', 'covers')}` : ''}`),
      learning ? h('small', { class: 'muted' }, 'Setlist: la lista de canciones del show. Cover: una canción de otra banda.') : null,
      chips,
      own.length ? null : h('small', { class: 'muted' }, 'Una canción propia suena más a ustedes que un cover.'));
  }

  function detailStep(v) {
    const f = fc();
    const o = opts.find((x) => x.venue.id === v.id);
    return [
      h('div', { class: 'row between' },
        h('h2', null, `${v.icon} ${v.name}`),
        opts.filter((x) => x.open).length > 1 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { sfx('tap'); ui.venueId = null; draw(); } }, 'Cambiar') : null),
      // Each place's own tip (venues.js → show.venueOptions): sombrero, permiso, "en Indie Rocks también tocan bandas de pop"…
      o?.tip ? tipBox(o.tip) : null,
      v.pay.type === 'door' ? tipBox(`Precio justo: unos ${money(v.fairPrice)}. Si sube el precio, ¿llega más o menos gente?`)
        : opts.filter((x) => x.open).length === 1 ? tipBox(`${prepTip(s, opts)} Una canción propia suena más a ustedes que un cover.`) : null,
      v.pay.type === 'door' ? priceBox(v) : h('div', { class: 'stack' }, queueRow(f.expected, f.cap), h('span', { class: 'sh-count' }, `Llegarían unas ${num(f.expected)} de ${num(f.cap)}`), moneyBox(v)),
      setlistBox(),
      h('button', { class: 'btn big block', type: 'button', onclick: confirm }, '🎤 ¡Al escenario!'),
    ];
  }

  function confirm() {
    const v = venue();
    if (!v) return;
    sfx('good');
    ui.confirmed = true;
    draw();
  }

  function go() {
    const v = venue();
    // The engine keeps the choice (s.week$.prep) and moves the phase to 'live'.
    show.setPrep(s, { venueId: v.id, price: v.pay.type === 'door' ? ui.price : undefined, setlist: fullSet(), songId: ui.setlist[0] || null });
    sfx('tap');
    ctx.save?.();
    ctx.refresh?.();
  }

  function doneStep(v) {
    const f = fc();
    const verdict = prepVerdict(s, v, f, ui.price);
    return [
      h('h2', null, `🎸 ¡A tocar en ${venueEn(v)}!`),
      verdictBox(verdict),
      // Before playing she can still change her mind: the 💡 above is for this show, not only "la próxima vez".
      verdict.verdict !== 'good' ? h('button', {
        class: 'btn alt block', type: 'button', onclick: () => { sfx('tap'); ui.confirmed = false; draw(); },
      }, f.earnings < 0 ? `↩ Cambiar el plan (perderían ${money(-f.earnings)})` : '↩ Cambiar el plan') : null,
      h('button', { class: 'btn big block', type: 'button', onclick: go }, '🎸 ¡A tocar!'),
    ];
  }

  function draw() {
    const v = venue();
    const body = !v ? venueStep() : ui.confirmed ? doneStep(v) : detailStep(v);
    right.replaceChildren(...body.filter(Boolean));
    drawScene();
  }

  draw();
  mount(page);
}

function lastPrice(s, v) {
  const prev = [...(s.history || [])].reverse().find((x) => x.venue === v.id && x.price);
  const p = prev?.price ?? v.fairPrice;
  return Math.min(v.maxPrice, Math.max(v.minPrice, p));
}
