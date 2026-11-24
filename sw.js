// Service worker: l'app funziona offline dopo la prima apertura.
// Per pubblicare una nuova versione cambia VERSION.
const VERSION = 'apexpress24-ape-v2';
const ASSETS = [
  './', './index.html', './app.js', './style.css', './manifest.webmanifest',
  './lib/jszip.min.js', './lib/jspdf.umd.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/logo.png', './icons/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(ASSETS.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (r.ok) return c.put(u, r); })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete per prima (con attesa massima di 4 secondi), cache come riserva: online l'app è sempre aggiornata, offline funziona dalla cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await Promise.race([
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }
  })());
});
