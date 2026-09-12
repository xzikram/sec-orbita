const CACHE_NAME = 'sec-patrol-v8';
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/security/patrol',
  '/security/patrol/summary',
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

  // 1. Static assets (icons, manifest, offline page, core shells) — cache-first
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((response) => {
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

  // 3. Next.js RSC requests (_rsc query or RSC header) — cache with network fallback
  const isRscRequest = url.searchParams.has('_rsc') || 
                       e.request.headers.get('RSC') === '1' || 
                       e.request.headers.get('accept')?.includes('text/x-component');

  if (isRscRequest) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) {
          // Serve cached RSC immediately, update cache in background if online
          fetch(e.request)
            .then(res => {
              if (res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(e.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return response;
          })
          .catch(() => {
            // If offline and RSC not cached, return 503 so client-side router falls back to hard navigation
            // Hard navigation will be seamlessly handled by our patrol app shell!
            return new Response('Offline RSC', { status: 503, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 4. HTML navigation pages — network-first with 1.5s timeout for fast offline fallback
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      new Promise((resolve) => {
        let isResolved = false;

        const handleOfflineOrTimeout = async () => {
          if (isResolved) return;
          isResolved = true;

          // A. Try exact URL match in cache
          const exactCached = await caches.match(e.request);
          if (exactCached) return resolve(exactCached);

          // B. If navigating anywhere inside /security/patrol/**, fallback to ANY cached patrol page shell!
          // This ensures guards NEVER see "Server Tidak Dijangkau" during offline patrol rounds!
          if (url.pathname.startsWith('/security/patrol')) {
            const patrolShell = (await caches.match('/security/patrol')) ||
                                (await caches.match('/security/patrol/summary'));
            if (patrolShell) return resolve(patrolShell);
          }

          // C. Fallback to offline notice page only for non-patrol routes (admin/supervisor)
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return resolve(offlinePage);

          resolve(new Response('Server RS Mata JEC ORBITA tidak dapat dijangkau. Pastikan HP terhubung ke Wi-Fi RS.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }));
        };

        const timeoutId = setTimeout(handleOfflineOrTimeout, 1500);

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
          .catch(() => {
            clearTimeout(timeoutId);
            handleOfflineOrTimeout();
          });
      })
    );
    return;
  }
});
