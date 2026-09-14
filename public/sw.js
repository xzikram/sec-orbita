const CACHE_NAME = 'sec-patrol-v11';
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/security/dashboard',
  '/security/patrol',
  '/security/patrol/summary',
  '/security/patrol/floor/floor-sb',
  '/security/patrol/floor/floor-1',
  '/security/patrol/floor/floor-2',
  '/security/patrol/floor/floor-3',
  '/security/patrol/floor/floor-4',
  '/security/patrol/floor/floor-5',
  '/security/patrol/floor/floor-6',
  '/security/patrol/floor/floor-7',
  '/security/patrol/floor/floor-8',
  '/security/patrol/floor/floor-9',
  '/security/patrol/floor/floor-10',
  '/security/patrol/floor/floor-11',
  '/security/patrol/floor/floor-1/qr-scan',
  '/security/patrol/room/room-l1-01',
  '/Logo RS JEC ORBITA.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(asset, { cache: 'no-cache' });
            if (res && res.status === 200) {
              await cache.put(asset, res);
            }
          } catch (err) {
            console.warn('Pre-cache asset warning:', asset, err);
          }
        })
      );
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

  // 3. Next.js RSC requests (_rsc query or RSC header)
  // NEVER cross-serve RSC from Room A to Room B (causes client route crash)
  const isRscRequest = url.searchParams.has('_rsc') || 
                       e.request.headers.get('RSC') === '1' || 
                       e.request.headers.get('accept')?.includes('text/x-component');

  if (isRscRequest) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) {
          // Serve exact match if cached
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
            // When offline and exact RSC not cached, return 503 so client router initiates clean hard navigation
            // Hard navigation will receive the real HTML document shell!
            return new Response('Offline RSC', { status: 503, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 4. HTML navigation pages — network-first with 1000ms timeout
  // STRICT RULE: Navigation requests MUST ONLY return valid text/html, NEVER raw RSC stream!
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      new Promise((resolve) => {
        let isResolved = false;

        const handleOfflineOrTimeout = async () => {
          if (isResolved) return;
          isResolved = true;

          try {
            const cache = await caches.open(CACHE_NAME);

            // A. Exact URL match in cache — ONLY accept if it is actual text/html
            const exactCached = await cache.match(e.request);
            if (exactCached) {
              const ct = exactCached.headers.get('content-type') || '';
              if (ct.includes('text/html') || !exactCached.url.includes('_rsc')) {
                return resolve(exactCached);
              }
            }

            // B. Hierarchical shell fallback for /security/patrol/**
            // STRICTLY filter out any cached items containing '_rsc' or 'text/x-component'
            if (url.pathname.startsWith('/security/patrol')) {
              const keys = await cache.keys();
              const validHtmlKeys = keys.filter(k => 
                !k.url.includes('_rsc') && 
                !k.url.includes('text/x-component') &&
                !k.url.includes('.json')
              );

              // 1. Room inspection: find cached room HTML
              if (url.pathname.includes('/room/')) {
                const roomKey = validHtmlKeys.find(k => k.url.includes('/security/patrol/room/'));
                if (roomKey) {
                  const roomRes = await cache.match(roomKey);
                  if (roomRes && !roomRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(roomRes);
                  }
                }
              }

              // 2. QR scan: find cached qr-scan HTML
              if (url.pathname.includes('/qr-scan')) {
                const qrKey = validHtmlKeys.find(k => k.url.includes('/qr-scan'));
                if (qrKey) {
                  const qrRes = await cache.match(qrKey);
                  if (qrRes && !qrRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(qrRes);
                  }
                }
              }

              // 3. Floor page: find cached floor HTML
              if (url.pathname.includes('/floor/')) {
                const floorKey = validHtmlKeys.find(k => k.url.includes('/security/patrol/floor/') && !k.url.includes('/qr-scan'));
                if (floorKey) {
                  const floorRes = await cache.match(floorKey);
                  if (floorRes && !floorRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(floorRes);
                  }
                }
              }

              // 4. Default patrol shell (Guaranteed pure HTML) — ONLY for patrol route or summary
              if (url.pathname === '/security/patrol' || url.pathname === '/security/patrol/') {
                const patrolShell = (await cache.match('/security/patrol')) ||
                                    (await cache.match('/security/patrol/summary'));
                if (patrolShell) return resolve(patrolShell);
              }
              if (url.pathname.startsWith('/security/patrol/summary')) {
                const summaryShell = (await cache.match('/security/patrol/summary')) ||
                                     (await cache.match('/security/patrol'));
                if (summaryShell) return resolve(summaryShell);
              }
            }

            // C. Fallback to offline notice page for other routes
            const offlinePage = await cache.match('/offline.html');
            if (offlinePage) return resolve(offlinePage);
          } catch (err) {
            console.warn('Offline navigation fallback error:', err);
          }

          resolve(new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>RS Mata JEC ORBITA - Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#0f172a;color:#fff"><h2>Mode Offline</h2><p>Data tersimpan di HP Anda. Silakan kembali ke rute patroli.</p><a href="/security/patrol" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Ke Rute Patroli</a></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          ));
        };

        const timeoutId = setTimeout(handleOfflineOrTimeout, 1000);

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
