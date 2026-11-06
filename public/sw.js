const CACHE_NAME = 'sec-patrol-v25';
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/logo-jec.png',
  '/Logo RS JEC ORBITA.png',
  '/Logo%20RS%20JEC%20ORBITA.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const PRECACHE_SHELLS = [
  '/security/patrol',
  '/security/patrol/summary',
  '/security/dashboard',
  '/security/patrol/floor/f-sb/qr-scan',
  '/security/patrol/floor/e20088de-d3c8-4079-9532-3c5eeffe31ea/qr-scan',
  '/security/patrol/floor/f-sb',
  '/security/patrol/floor/e20088de-d3c8-4079-9532-3c5eeffe31ea',
  '/security/patrol/room/rm-sb-01'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Pre-cache pure static assets (logos, manifest, icons, offline shell)
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
      // 2. Pre-cache HTML app shells for offline fallback (NOT served cache-first when online)
      await Promise.allSettled(
        PRECACHE_SHELLS.map(async (shell) => {
          try {
            const res = await fetch(shell, { cache: 'no-cache', credentials: 'include' });
            if (res && res.status === 200) {
              await cache.put(shell, res);
            }
          } catch (err) {
            console.warn('Pre-cache shell warning:', shell, err);
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Don't intercept non-GET or API endpoints (API handled by data-client with IndexedDB fallback)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Static assets (icons, manifest, offline page, core shells) — cache-first
  const decodedPath = decodeURIComponent(url.pathname);
  if (STATIC_ASSETS.some(asset => url.pathname === asset || decodedPath === asset)) {
    e.respondWith(
      caches.match(e.request).then(async (cached) => {
        if (cached) return cached;
        const decodedMatch = await caches.match(decodedPath);
        if (decodedMatch) return decodedMatch;
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
  const isRscRequest = url.searchParams.has('_rsc') || 
                       e.request.headers.get('RSC') === '1' || 
                       e.request.headers.get('accept')?.includes('text/x-component');

  if (isRscRequest) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) {
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

        // Fast-timeout (1200ms) for RSC fetch so weak signal doesn't hang UI
        return new Promise((resolve) => {
          let resolved = false;

          const handleRscFallback = async () => {
            if (resolved) return;
            resolved = true;
            try {
              const cache = await caches.open(CACHE_NAME);
              const keys = await cache.keys();

              if (url.pathname.includes('/room/')) {
                const anyRoomRsc = keys.find(k => k.url.includes('/room/') && (k.url.includes('_rsc') || k.url.includes('?_rsc')));
                if (anyRoomRsc) {
                  const match = await cache.match(anyRoomRsc);
                  if (match) return resolve(match);
                }
              }

              if (url.pathname.includes('/floor/')) {
                const anyFloorRsc = keys.find(k => k.url.includes('/floor/') && !k.url.includes('/qr-scan') && (k.url.includes('_rsc') || k.url.includes('?_rsc')));
                if (anyFloorRsc) {
                  const match = await cache.match(anyFloorRsc);
                  if (match) return resolve(match);
                }
              }
            } catch {}

            // When offline or server unreachable, return 504 Gateway Timeout.
            // In Next.js App Router, 504 triggers clean fallback to browser document navigation,
            // which Rule 4 intercepts and serves from the cached HTML shell!
            resolve(new Response('RSC Offline Fallback', {
              status: 504,
              statusText: 'Gateway Timeout',
              headers: { 'Content-Type': 'text/plain' }
            }));
          };

          const rscTimer = setTimeout(handleRscFallback, 1200);

          fetch(e.request)
            .then((response) => {
              clearTimeout(rscTimer);
              if (!resolved) {
                resolved = true;
                if (response.status === 200) {
                  const clone = response.clone();
                  caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                resolve(response);
              }
            })
            .catch(() => {
              clearTimeout(rscTimer);
              handleRscFallback();
            });
        });
      })
    );
    return;
  }

  // 4. HTML navigation pages — network-first with fast 1200ms timeout & instant offline fallback
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

              // 1. Room inspection: find cached room HTML or fallback to floor or patrol shell
              if (url.pathname.includes('/room/')) {
                const roomKey = validHtmlKeys.find(k => k.url.includes('/security/patrol/room/'));
                if (roomKey) {
                  const roomRes = await cache.match(roomKey);
                  if (roomRes && !roomRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(roomRes);
                  }
                }
                const floorKey = validHtmlKeys.find(k => k.url.includes('/security/patrol/floor/') && !k.url.includes('/qr-scan'));
                if (floorKey) {
                  const floorRes = await cache.match(floorKey);
                  if (floorRes && !floorRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(floorRes);
                  }
                }
                const patrolShell = await cache.match('/security/patrol');
                if (patrolShell) return resolve(patrolShell);
              }

              // 2. QR scan: find cached qr-scan HTML or fallback to patrol shell
              if (url.pathname.includes('/qr-scan')) {
                const qrKey = validHtmlKeys.find(k => k.url.includes('/qr-scan'));
                if (qrKey) {
                  const qrRes = await cache.match(qrKey);
                  if (qrRes && !qrRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(qrRes);
                  }
                }
                const patrolShell = await cache.match('/security/patrol');
                if (patrolShell) return resolve(patrolShell);
              }

              // 3. Floor page: find exact cached floor HTML or any floor or fallback to patrol shell
              if (url.pathname.includes('/floor/')) {
                const exactFloorKey = validHtmlKeys.find(k => k.url.endsWith(url.pathname) || k.url.includes(url.pathname));
                if (exactFloorKey) {
                  const floorRes = await cache.match(exactFloorKey);
                  if (floorRes && !floorRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(floorRes);
                  }
                }
                const anyFloorKey = validHtmlKeys.find(k => k.url.includes('/security/patrol/floor/') && !k.url.includes('/qr-scan'));
                if (anyFloorKey) {
                  const floorRes = await cache.match(anyFloorKey);
                  if (floorRes && !floorRes.headers.get('content-type')?.includes('text/x-component')) {
                    return resolve(floorRes);
                  }
                }
                const patrolShell = await cache.match('/security/patrol');
                if (patrolShell) return resolve(patrolShell);
              }

              // 4. Default patrol shell (Guaranteed pure HTML)
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

            // Fallback for dashboard, login, and profile
            if (url.pathname.startsWith('/security/dashboard')) {
              const dashShell = await cache.match('/security/dashboard');
              if (dashShell) return resolve(dashShell);
            }
            if (url.pathname === '/login' || url.pathname.startsWith('/login')) {
              const loginShell = await cache.match('/login');
              if (loginShell) return resolve(loginShell);
            }
            if (url.pathname.startsWith('/security/profile')) {
              const profileShell = await cache.match('/security/profile');
              if (profileShell) return resolve(profileShell);
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

        // If offline right now, serve from cache instantly (0ms delay)
        if (typeof self !== 'undefined' && self.navigator && !self.navigator.onLine) {
          handleOfflineOrTimeout();
          return;
        }

        const timeoutId = setTimeout(handleOfflineOrTimeout, 1200);

        fetch(e.request)
          .then((response) => {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              // Never cache redirected responses or login pages to avoid session redirect poison loops
              if (response.status === 200 && !response.redirected && !response.url.includes('/login') && url.pathname !== '/login') {
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
