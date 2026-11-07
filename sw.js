// Permite jugar sin internet una vez que el juego se abrió: primero intenta la red (para recibir
// siempre la versión nueva) y, si no hay conexión, usa la copia guardada.
//
// Al instalarse guarda TODO el juego (no solo la portada): así funciona sin internet desde la primera
// visita, aunque esa primera vez la página cargó antes de que existiera el service worker.
// Cada archivo se guarda por separado: si uno falta, los demás sí quedan guardados.
// Si se agrega un archivo nuevo al juego, va en SHELL (o se guarda solo la primera vez que se pide).
const CACHE = 'rumbo-estadio-v5';
const PREFIX = 'rumbo-estadio';

const JS = [
  'main.js', 'store.js', 'util.js', 'audio/recorded.js', 'music/song.js', 'music/synth.js',
  ...['album', 'art', 'book', 'card', 'close', 'compose', 'core', 'export', 'home', 'inbox', 'live', 'map', 'photo', 'plan', 'players', 'prep', 'rehearse', 'scenes', 'share'].map((x) => `ui/${x}.js`),
  ...['explain', 'lessons', 'progress', 'show', 'state', 'triggers-default', 'week'].map((x) => `engine/${x}.js`),
  ...['activities', 'cards', 'cast', 'chapters', 'lessons', 'motivation', 'story', 'triggers', 'venues'].map((x) => `data/${x}.js`),
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((n) => [`data/cards/ch${n}.js`, `data/story/ch${n}.js`, `data/triggers/ch${n}.js`]),
  'data/triggers/aplicar.js',
].map((x) => `./js/${x}`);
// La voz de Papá (js/audio/recorded.js): sin internet también se oye.
const VOICE = ['aprende_ano', 'cuida_fans', 'cumple', 'decide_info', 'defiende', 'delegar', 'diferencia', 'duena', 'exito', 'guerra_precios', 'innovar',
  'integridad', 'largo_plazo', 'mentora', 'mitad_camino', 'negocia', 'practica', 'prueba_chico', 'riesgo_premio', 'un_no'].map((x) => `./audio/${x}.m4a`);
const SHELL = [
  './', './index.html', './manifest.json',
  ...['styles', 'music', 'art', 'screens', 'show', 'export', 'album', 'week'].map((x) => `./css/${x}.css`),
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  ...JS, ...VOICE,
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()),
));

// The voice player asks for pieces of the file (Range). Safari only plays audio that answers with 206, so a cached
// file is cut to the piece it asked for.
async function partial(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m || res.status !== 200) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === '' ? Math.max(0, size - Number(m[2] || 0)) : Number(m[1]);
  let end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (!(start <= end) || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const ranged = req.headers.has('range');
  // no-cache: ask the server every time (the browser's own cache could hand back an old file).
  const net = req.mode === 'navigate' || ranged ? fetch(req) : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    net.then((res) => {
      if (res.status === 200 && !ranged) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' || ranged })
      .then((hit) => {
        if (hit) return ranged ? partial(req, hit) : hit;
        return req.mode === 'navigate' ? caches.match('./index.html') : Response.error();
      })),
  );
});
