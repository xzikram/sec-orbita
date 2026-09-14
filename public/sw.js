const CACHE_NAME = 'sec-patrol-v9';
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

  // 3. Next.js RSC requests (_rsc query or RSC header) — cache with hierarchical fallback
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
          .catch(async () => {
            // If offline and RSC not cached for this specific item, check if we have a matching type RSC shell
            try {
              const cache = await caches.open(CACHE_NAME);
              const keys = await cache.keys();
              
              if (url.pathname.includes('/room/')) {
                const rscKey = keys.find(k => k.url.includes('/room/'));
                if (rscKey) {
                  const rscRes = await cache.match(rscKey);
                  if (rscRes) return rscRes;
                }
              } else if (url.pathname.includes('/floor/')) {
                const rscKey = keys.find(k => k.url.includes('/floor/'));
                if (rscKey) {
                  const rscRes = await cache.match(rscKey);
                  if (rscRes) return rscRes;
                }
              }
            } catch {}

            return new Response('Offline RSC', { status: 503, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 4. HTML navigation pages — network-first with 1.2s timeout for fast offline fallback
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

          // B. Hierarchical shell fallback for /security/patrol/**
          if (url.pathname.startsWith('/security/patrol')) {
            try {
              const cache = await caches.open(CACHE_NAME);
              const keys = await cache.keys();

              // 1. If room inspection: find any cached room shell
              if (url.pathname.includes('/room/')) {
                const roomKey = keys.find(k => k.url.includes('/security/patrol/room/'));
                if (roomKey) {
                  const roomRes = await cache.match(roomKey);
                  if (roomRes) return resolve(roomRes);
                }
              }

              // 2. If QR scan: find any cached qr-scan shell
              if (url.pathname.includes('/qr-scan')) {
                const qrKey = keys.find(k => k.url.includes('/qr-scan'));
                if (qrKey) {
                  const qrRes = await cache.match(qrKey);
                  if (qrRes) return resolve(qrRes);
                }
              }

              // 3. If floor page: find any cached floor shell
              if (url.pathname.includes('/floor/')) {
                const floorKey = keys.find(k => k.url.includes('/security/patrol/floor/') && !k.url.includes('/qr-scan'));
                if (floorKey) {
                  const floorRes = await cache.match(floorKey);
                  if (floorRes) return resolve(floorRes);
                }
              }

              // 4. Default patrol shell
              const patrolShell = (await cache.match('/security/patrol')) ||
                                  (await cache.match('/security/patrol/summary'));
              if (patrolShell) return resolve(patrolShell);
            } catch {}
          }

          // C. Fallback to offline notice page only for non-patrol routes (admin/supervisor)
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return resolve(offlinePage);

          resolve(new Response('Server RS Mata JEC ORBITA tidak dapat dijangkau. Data patroli tersimpan aman di HP Anda.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }));
        };

        const timeoutId = setTimeout(handleOfflineOrTimeout, 1200);

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
