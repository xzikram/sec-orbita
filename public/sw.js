const CACHE_NAME = 'sec-patrol-v6';
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/Logo RS JEC ORBITA.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Don't intercept non-GET or API endpoints (API handled by data-client with IndexedDB fallback)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Static assets (icons, manifest, offline page) — cache-first
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 2. Next.js static JS/CSS chunks — cache-first with background network update
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. HTML navigation pages — network-first with fast 3s timeout for Wi-Fi roaming resilience
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      new Promise((resolve) => {
        let isResolved = false;
        const timeoutId = setTimeout(async () => {
          if (!isResolved) {
            isResolved = true;
            const cached = await caches.match(e.request);
            if (cached) {
              resolve(cached);
            } else {
              const offlinePage = await caches.match('/offline.html');
              if (offlinePage) resolve(offlinePage);
              else {
                resolve(new Response('Server RS Mata JEC ORBITA tidak dapat dijangkau. Pastikan HP terhubung ke Wi-Fi RS.', {
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }));
              }
            }
          }
        }, 3000);

        fetch(e.request)
          .then((response) => {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
              }
              resolve(response);
            }
          })
          .catch(async () => {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              const cached = await caches.match(e.request);
              if (cached) return resolve(cached);
              const offlinePage = await caches.match('/offline.html');
              if (offlinePage) return resolve(offlinePage);
              resolve(new Response('Server RS Mata JEC ORBITA tidak dapat dijangkau. Pastikan HP terhubung ke Wi-Fi RS.', {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
              }));
            }
          });
      })
    );
    return;
  }
});
