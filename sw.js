const VERSION = 'kharcha-v9';
const SHELL = ['./', 'index.html', 'manifest.json', 'pdf.min.js', 'pdf.worker.min.js',
  'fonts/fraunces-latin-opsz-normal.woff2', 'fonts/fraunces-latin-ext-opsz-normal.woff2', 'fonts/plus-jakarta-sans-latin-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2',
  'jspdf.umd.min.js', 'fonts/pdf-jakarta-400.ttf', 'fonts/pdf-jakarta-700.ttf', 'fonts/pdf-fraunces-500.ttf',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== 'shared-files').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Statements shared from another app (Android share sheet)
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const c = await caches.open('shared-files');
        let i = 0;
        for (const f of form.getAll('pdfs')) {
          if (!f || !f.size) continue;
          await c.put('./shared/' + Date.now() + '-' + (i++),
            new Response(f, { headers: { 'Content-Type': 'application/pdf', 'X-Name': encodeURIComponent(f.name || 'statement.pdf') } }));
        }
      } catch (err) {}
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // App shell: cache first, refresh in background
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (e.request.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
