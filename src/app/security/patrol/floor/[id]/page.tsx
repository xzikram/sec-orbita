'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/dummy-data';
import {
  floors,
  getRoomsByFloor,
  getFloorById,
  isRoomChecked,
} from '@/lib/dummy-data';
import styles from './floor.module.css';
import { getCachedSettings } from '@/lib/settings-client';

export default function FloorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [dbFloor, setDbFloor] = useState<any>(null);
  const [cachedFloorsList, setCachedFloorsList] = useState<any[]>([]);
  const [floorRooms, setFloorRooms] = useState<Room[]>([]);
  const [defaultFloorRooms, setDefaultFloorRooms] = useState<Room[]>([]);
  const [saveToastText, setSaveToastText] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [offlineQrs, setOfflineQrs] = useState<any[]>([]);
  const [hasSessionQr, setHasSessionQr] = useState(false);
  const [settings, setSettings] = useState(() => getCachedSettings());
  const [loading, setLoading] = useState(true);

  const fallbackFloor = getFloorById(id) || 
    (() => {
      const match = session?.sessionFloors?.find((sf: any) => 
        sf.floorId === id || 
        sf.id === id || 
        String(sf.floorCodeSnapshot || '').toUpperCase() === String(id).toUpperCase() ||
        sf.floor?.id === id ||
        String(sf.floor?.code || '').toUpperCase() === String(id).toUpperCase()
      );
      if (match) {
        return getFloorById(match.floorCodeSnapshot) || getFloorById(match.floorId) || getFloorById(match.floor?.code);
      }
      const normCode = String(id).replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase();
      return floors.find(f => f.code.toUpperCase() === normCode || f.id.toLowerCase() === id.toLowerCase());
    })();

  const floor = dbFloor || fallbackFloor;

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Read cached user and active session instantly from localStorage
        let empId = 'guest';
        const cachedUser = localStorage.getItem('cached-user');
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            setCurrentUser(u);
            empId = u.employeeId || 'guest';
          } catch {}
        }

        let activeSess: any = null;
        const cachedSess = localStorage.getItem('cached-active-session');
        if (cachedSess) {
          try {
            const parsed = JSON.parse(cachedSess);
            const todayMakassar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
            const sessDate = parsed.patrolDate ? (typeof parsed.patrolDate === 'string' ? parsed.patrolDate.split('T')[0] : '') : '';
            const startedTime = parsed.startedAt ? new Date(parsed.startedAt).getTime() : 0;
            const isStale = (sessDate && sessDate < todayMakassar && Date.now() - startedTime > 12 * 60 * 60 * 1000) || (startedTime > 0 && Date.now() - startedTime > 12 * 60 * 60 * 1000);

            if (isStale) {
              localStorage.removeItem('cached-active-session');
              localStorage.removeItem('lastPatrolState');
            } else {
              activeSess = parsed;
              setSession(activeSess);
            }
          } catch {}
        }

        // 2. Resolve floor from IndexedDB master_floors if available
        let matchedFloor: any = null;
        const dbMod = await import('@/lib/db').catch(() => null);
        if (dbMod && dbMod.getCachedFloors) {
          try {
            const cachedFloors = await dbMod.getCachedFloors();
            setCachedFloorsList(cachedFloors);
            matchedFloor = cachedFloors.find((f: any) =>
              dbMod.matchFloor ? dbMod.matchFloor(f, id) : (
                String(f.id).toLowerCase() === String(id).toLowerCase() ||
                String(f.code || '').toLowerCase() === String(id).toLowerCase()
              )
            );
            if (matchedFloor) {
              setDbFloor(matchedFloor);
            }
          } catch {}
        }

        // 3. Resolve rooms from IndexedDB master_rooms
        const resolvedFloor = matchedFloor || fallbackFloor;
        const targetFloorIdentifier = resolvedFloor ? (resolvedFloor.code || resolvedFloor.id) : id;
        const targetFloorCode = String(resolvedFloor?.code || dbFloor?.code || id).replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();
        const { getResilientRoomsForFloor } = await import('@/lib/offline-cache');
        const defaultRooms = await getResilientRoomsForFloor(targetFloorIdentifier);
        setDefaultFloorRooms(defaultRooms);

        const applyRoomOrdering = (roomsToOrder: Room[], savedCodes: string[]): Room[] => {
          const sorted = [...roomsToOrder].sort((a, b) => {
            const idxA = savedCodes.indexOf(a.code.toUpperCase());
            const idxB = savedCodes.indexOf(b.code.toUpperCase());
            if (idxA === -1 && idxB === -1) return (a.patrolOrder ?? 0) - (b.patrolOrder ?? 0);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          const sortedCodes = new Set(sorted.map(r => r.code.toUpperCase()));
          const missing = roomsToOrder.filter(r => !sortedCodes.has(r.code.toUpperCase()));
          return [...sorted, ...missing];
        };

        let loadedFromLocal = false;
        const savedCodesStr = localStorage.getItem(`patrol-order-codes-${empId}-${targetFloorCode}`) || localStorage.getItem(`patrol-order-codes-guest-${targetFloorCode}`);
        if (savedCodesStr) {
          try {
            const savedCodes = JSON.parse(savedCodesStr) as string[];
            if (Array.isArray(savedCodes) && savedCodes.length > 0) {
              setFloorRooms(applyRoomOrdering(defaultRooms, savedCodes));
              loadedFromLocal = true;
            }
          } catch {}
        }

        if (!loadedFromLocal) {
          const savedLegacyOrder = localStorage.getItem(`patrol-order-${empId}-${id}`);
          if (savedLegacyOrder) {
            try {
              const orderIds = JSON.parse(savedLegacyOrder) as string[];
              const sorted = [...defaultRooms].sort((a, b) => {
                const idxA = orderIds.indexOf(a.id);
                const idxB = orderIds.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
              const sortedIds = new Set(sorted.map(r => r.id));
              const missing = defaultRooms.filter(r => !sortedIds.has(r.id));
              setFloorRooms([...sorted, ...missing]);
              loadedFromLocal = true;
            } catch {}
          }
        }

        if (!loadedFromLocal) {
          setFloorRooms(defaultRooms);
        }

        // Background server preference fetch for cross-device permanence
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          fetch('/api/users/preferences/route-order')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data?.preferences && data.preferences[targetFloorCode]) {
                const serverCodes = data.preferences[targetFloorCode];
                if (Array.isArray(serverCodes) && serverCodes.length > 0) {
                  setFloorRooms(applyRoomOrdering(defaultRooms, serverCodes));
                  localStorage.setItem(`patrol-order-codes-${empId}-${targetFloorCode}`, JSON.stringify(serverCodes));
                }
              }
            })
            .catch(() => {});
        }

        // 3. Get offline checks and QR scans from IndexedDB
        try {
          const { getOfflineChecks, getOfflineQrScans } = await import('@/lib/db');
          const [offline, offlineQrsList] = await Promise.all([
            getOfflineChecks().catch(() => []),
            getOfflineQrScans().catch(() => []),
          ]);
          setOfflineChecks(offline);
          setOfflineQrs(offlineQrsList || []);
          if (offlineQrsList && offlineQrsList.length > 0) {
            setHasSessionQr(true);
          }
        } catch (e) {
          console.error('IndexedDB load error:', e);
        }

        if (activeSess?.sessionFloors?.some((sf: any) => sf.qrValidated)) {
          setHasSessionQr(true);
        }

        import('@/lib/settings-client').then(({ fetchAndCacheSettings }) => {
          fetchAndCacheSettings().then(s => setSettings(s)).catch(() => {});
        }).catch(() => {});

        // 4. Set loading false immediately (< 25ms render)
        setLoading(false);
        setMounted(true);

        // 5. Background network update if online
        if (navigator.onLine) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);

          Promise.all([
            fetch('/api/auth/me', { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/patrol/sessions?personal=true', { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          ]).then(([meData, sessions]) => {
            clearTimeout(timer);
            if (meData?.user) {
              setCurrentUser(meData.user);
              try { localStorage.setItem('cached-user', JSON.stringify(meData.user)); } catch {}
            }
            if (Array.isArray(sessions)) {
              const myId = meData?.user?.id || currentUser?.id;
              const active = sessions.find((s: any) => s.status === 'in_progress' && (!myId || s.userId === myId)) || null;
              if (active) {
                setSession(active);
                if (active.sessionFloors?.some((sf: any) => sf.qrValidated)) {
                  setHasSessionQr(true);
                }
                try { localStorage.setItem('cached-active-session', JSON.stringify(active)); } catch {}
              }
            }
          }).catch(() => {
            clearTimeout(timer);
          });
        }
      } catch (err) {
        console.error('Floor load error:', err);
        setLoading(false);
        setMounted(true);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat progress lantai...</p></div>;
  }

  if (!floor) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Lantai tidak ditemukan</p>
        <button className="btn btn-outline btn-sm" onClick={() => router.push('/security/patrol')}>
          Kembali ke Rute Patroli
        </button>
      </div>
    );
  }

  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => {
    if (!floor) return false;
    const sfCode = String(sf.floorCodeSnapshot || sf.floor?.code || '').toUpperCase().trim();
    const fCode = String(floor.code || '').toUpperCase().trim();
    const sfName = String(sf.floorNameSnapshot || sf.floor?.name || '').toUpperCase().trim();
    const fName = String(floor.name || '').toUpperCase().trim();
    return (
      sfCode === fCode ||
      sf.floorId === id ||
      sf.id === id ||
      sf.floorId === floor.id ||
      sfName === fName ||
      (fCode && sfCode.includes(fCode))
    );
  });
  
  // Combine online (DB) checks and offline checks for this floor by code snapshot
  const combinedCheckedSet = new Set<string>();
  floorRooms.forEach((r: Room) => {
    if (isRoomChecked(r, sessionFloor?.patrolChecks, offlineChecks, currentSession?.id)) {
      combinedCheckedSet.add(r.code);
    }
  });

  // Also include any checks registered in sessionFloor.patrolChecks for this floor
  if (Array.isArray(sessionFloor?.patrolChecks)) {
    sessionFloor.patrolChecks.forEach((c: any) => {
      const cCode = c.roomCodeSnapshot;
      if (cCode) combinedCheckedSet.add(cCode);
    });
  }

  const isRequireQr = settings.require_qr !== 'false';
  const qrScanMode = settings.qr_scan_mode || 'session';
  const thisFloorCode = String(floor?.code || sessionFloor?.floorCodeSnapshot || id).replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();

  const hasThisFloorQr = Boolean(
    sessionFloor?.qrValidated ||
    offlineQrs.some((q: any) => {
      const qFloorCode = String(q.floorCode || '').toUpperCase().trim();
      return (thisFloorCode && qFloorCode === thisFloorCode) ||
        q.sessionFloorId === sessionFloor?.id ||
        (sessionFloor?.floorCodeSnapshot && q.sessionFloorId === `sf-${String(sessionFloor.floorCodeSnapshot).toLowerCase()}`);
    })
  );

  const isFloorQrSatisfied = !isRequireQr || (
    qrScanMode === 'per_floor' ? hasThisFloorQr : (hasThisFloorQr || hasSessionQr)
  );

  const isFloorCompleted = sessionFloor?.status === 'completed';
  const total = floorRooms.length;
  const checked = isFloorCompleted ? Math.max(combinedCheckedSet.size, total) : combinedCheckedSet.size;
  const boundedChecked = Math.min(checked, total);
  const percent = total > 0 ? (isFloorCompleted ? 100 : Math.min(100, Math.round((boundedChecked / total) * 100))) : 0;

  // Find next unchecked room by code snapshot
  const nextRoom = isFloorCompleted ? null : floorRooms.find(r => !combinedCheckedSet.has(r.code));

  const getProgressColor = () => {
    if (percent === 100) return 'progress-fill-success';
    return 'progress-fill-primary';
  };

  const triggerToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSaveToastText(text);
    toastTimeoutRef.current = setTimeout(() => {
      setSaveToastText(null);
    }, 1800);
  };

  const saveCustomOrder = (newList: Room[]) => {
    const empId = currentUser?.employeeId || 'guest';
    const targetFloorCode = String(floor?.code || dbFloor?.code || id).replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();
    const roomCodes = newList.map(r => r.code.toUpperCase());

    // 1. Save locally using room codes (permanent across sessions & catalog downloads)
    localStorage.setItem(`patrol-order-codes-${empId}-${targetFloorCode}`, JSON.stringify(roomCodes));
    localStorage.setItem(`patrol-order-codes-guest-${targetFloorCode}`, JSON.stringify(roomCodes));
    localStorage.setItem(`patrol-order-${empId}-${id}`, JSON.stringify(newList.map(r => r.id)));

    // 2. Sync to database server if online for cross-device permanence
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch('/api/users/preferences/route-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorCode: targetFloorCode, roomCodes }),
      }).catch(() => {});
    }

    // 3. Immediately update IndexedDB master_rooms locally for 100% offline consistency
    import('@/lib/db').then(async ({ openDB, STORE_MASTER_ROOMS }) => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_MASTER_ROOMS, 'readwrite');
        const store = tx.objectStore(STORE_MASTER_ROOMS);
        newList.forEach((r, idx) => {
          const req = store.get(r.id);
          req.onsuccess = () => {
            if (req.result) {
              const updated = { ...req.result, patrolOrder: idx + 1 };
              store.put(updated);
            }
          };
        });
      } catch {}
    }).catch(() => {});

    // 4. Visual feedback toast (Option A)
    triggerToast('✓ Urutan tersimpan');
  };

  const resetToDefaultOrder = () => {
    if (!confirm('Kembalikan urutan pemeriksaan ruangan lantai ini ke standar rumah sakit?')) return;

    const baseList = defaultFloorRooms.length > 0
      ? defaultFloorRooms
      : [...floorRooms].sort((a, b) => (a.patrolOrder ?? 0) - (b.patrolOrder ?? 0));
    setFloorRooms(baseList);

    const empId = currentUser?.employeeId || 'guest';
    const targetFloorCode = String(floor?.code || dbFloor?.code || id).replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();

    localStorage.removeItem(`patrol-order-codes-${empId}-${targetFloorCode}`);
    localStorage.removeItem(`patrol-order-codes-guest-${targetFloorCode}`);
    localStorage.removeItem(`patrol-order-${empId}-${id}`);

    // Update IndexedDB master_rooms locally
    import('@/lib/db').then(async ({ openDB, STORE_MASTER_ROOMS }) => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_MASTER_ROOMS, 'readwrite');
        const store = tx.objectStore(STORE_MASTER_ROOMS);
        baseList.forEach((r, idx) => {
          const req = store.get(r.id);
          req.onsuccess = () => {
            if (req.result) {
              const updated = { ...req.result, patrolOrder: idx + 1 };
              store.put(updated);
            }
          };
        });
      } catch {}
    }).catch(() => {});

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch('/api/users/preferences/route-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorCode: targetFloorCode, reset: true }),
      }).catch(() => {});
    }

    triggerToast('↺ Urutan standar dipulihkan');
  };

  const reverseOrder = () => {
    const newList = [...floorRooms].reverse();
    setFloorRooms(newList);
    saveCustomOrder(newList);
  };

  const moveRoom = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= floorRooms.length) return;
    const newList = [...floorRooms];
    const temp = newList[index];
    newList[index] = newList[newIndex];
    newList[newIndex] = temp;
    setFloorRooms(newList);
    saveCustomOrder(newList);
  };

  const handleGoToRoom = (roomId: string, e?: React.MouseEvent) => {
    // When offline, use window.location.href to guarantee instant document shell load from Service Worker cache
    // completely bypassing Next.js RSC fetch 503 error
    if (typeof window !== 'undefined' && !navigator.onLine) {
      if (e) e.preventDefault();
      window.location.href = `/security/patrol/room/${roomId}`;
    }
  };

  const handleGoToQr = (e?: React.MouseEvent) => {
    if (typeof window !== 'undefined' && !navigator.onLine && floor) {
      if (e) e.preventDefault();
      window.location.href = `/security/patrol/floor/${floor.id}/qr-scan`;
    }
  };

  const floorsSource = cachedFloorsList.length > 0 ? cachedFloorsList : (
    session?.sessionFloors && session.sessionFloors.length > 0
      ? session.sessionFloors.map((sf: any) => ({
          id: sf.floorId || sf.id,
          code: sf.floorCodeSnapshot || sf.floor?.code || '',
          name: sf.floorNameSnapshot || sf.floor?.name || '',
          sortOrder: typeof sf.floor?.sortOrder === 'number' ? sf.floor.sortOrder : (typeof sf.sortOrder === 'number' ? sf.sortOrder : 999),
        }))
      : floors
  );
  const getSortVal = (fl: any) => {
    if (typeof fl.sortOrder === 'number' && !isNaN(fl.sortOrder)) return fl.sortOrder;
    const c = String(fl.code || '').toUpperCase();
    if (c.includes('SB') || c.includes('SEMI')) return 0;
    const m = c.match(/\d+/);
    return m ? parseInt(m[0], 10) : 999;
  };
  const isReversed = typeof window !== 'undefined' && localStorage.getItem('patrol-reversed') === 'true';
  const sortedFloors = [...floorsSource].sort((a, b) => isReversed ? getSortVal(b) - getSortVal(a) : getSortVal(a) - getSortVal(b));
  const currentIdx = sortedFloors.findIndex(f => f.id === floor?.id || (floor?.code && f.code === floor?.code));
  const nextFloor = currentIdx !== -1 && currentIdx + 1 < sortedFloors.length ? sortedFloors[currentIdx + 1] : null;

  const markCurrentFloorCompletedInCache = () => {
    try {
      const cached = localStorage.getItem('cached-active-session');
      if (cached) {
        const sess = JSON.parse(cached);
        if (Array.isArray(sess.sessionFloors)) {
          const sf = sess.sessionFloors.find((f: any) => 
            f.floorCodeSnapshot === (floor?.code || id) || f.id === sessionFloor?.id || f.floorId === id || f.floor?.code === (floor?.code || id)
          );
          if (sf) {
            sf.status = 'completed';
            sf.completedAt = sf.completedAt || new Date().toISOString();
            localStorage.setItem('cached-active-session', JSON.stringify(sess));
          }
        }
      }
    } catch {}
  };

  const handleSkipFloorQr = () => {
    markCurrentFloorCompletedInCache();

    const targetUrl = nextFloor ? `/security/patrol/floor/${nextFloor.id}` : '/security/patrol/summary';
    if (typeof window !== 'undefined' && !navigator.onLine) {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  };

  const handleGoToPatrol = (e?: React.MouseEvent) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      if (e) e.preventDefault();
      window.location.href = '/security/patrol';
    }
  };

  return (
    <div className="page-content" style={{ paddingBottom: '96px' }}>
      {/* Back button & header */}
      <div className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <button
            className={`btn btn-ghost btn-icon ${styles.backBtn}`}
            onClick={(e) => {
              if (!navigator.onLine) {
                handleGoToPatrol(e);
              } else {
                router.back();
              }
            }}
            aria-label="Kembali"
            style={{ margin: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className={styles.floorTitle} style={{ margin: 0 }}>{floor.name}</h1>
            <p className={styles.floorSubtitle} style={{ margin: 0 }}>{checked} dari {total} ruangan diperiksa</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className={`${styles.progressCard} animate-slide-up`}>
        <div className={styles.progressHeader}>
          <span className="text-sm font-medium">Progress</span>
          <span className="font-bold text-lg">{percent}%</span>
        </div>
        <div className="progress-bar progress-bar-lg">
          <div
            className={`progress-bar-fill ${getProgressColor()}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Reorder controls header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>Rute Pemeriksaan Ruangan</h3>
          {saveToastText && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#059669',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '2px 8px',
              borderRadius: '12px',
              animation: 'fadeIn 0.2s ease',
            }}>
              {saveToastText}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            type="button"
            className="btn btn-ghost btn-sm" 
            onClick={resetToDefaultOrder} 
            title="Kembalikan urutan ke standar rumah sakit"
            id="btn-reset-order"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '4px 8px', height: 'auto', background: 'var(--color-neutral-100)', color: 'var(--text-secondary)' }}
          >
            ↺ Reset Standar
          </button>
          <button 
            type="button"
            className="btn btn-ghost btn-sm" 
            onClick={reverseOrder} 
            id="btn-reverse-order"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 8px', height: 'auto', background: 'var(--color-neutral-100)', color: 'var(--color-primary-600)', fontWeight: 'bold' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Balik Urutan
          </button>
        </div>
      </div>

          {/* Room List */}
          <div className={styles.roomList}>
            {floorRooms.map((room, index) => {
              const isChecked = combinedCheckedSet.has(room.code);
              const isNext = nextRoom?.id === room.id;
              const check = sessionFloor?.patrolChecks?.find((c: any) => c.roomCodeSnapshot === room.code) ||
                            offlineChecks.find((c: any) => 
                              c.roomCode === room.code || 
                              c.roomId === room.id || 
                              c.roomId === room.code || 
                              (c.roomId && String(c.roomId).toLowerCase() === room.code.toLowerCase())
                            );

              return (
                <div
                  key={room.id}
                  className={`${styles.roomItem} ${isChecked ? styles.roomChecked : ''} ${isNext ? styles.roomNext : ''} animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                  id={`room-${room.code}`}
                >
                  <div className={styles.roomOrder} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', minWidth: '44px', flexShrink: 0 }}>
                    {isChecked ? (
                      <div className={styles.checkIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <span className={styles.orderNumber} style={{ fontWeight: 'bold', fontSize: '13px' }}>{index + 1}</span>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                          {index > 0 && (
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveRoom(index, 'up'); }} 
                              style={{
                                background: 'var(--color-neutral-100)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--color-neutral-700)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                              }} 
                              aria-label="Pindah urutan ke atas"
                              title="Naik"
                            >
                              ▲
                            </button>
                          )}
                          {index < floorRooms.length - 1 && (
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveRoom(index, 'down'); }} 
                              style={{
                                background: 'var(--color-neutral-100)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--color-neutral-700)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                              }} 
                              aria-label="Pindah urutan ke bawah"
                              title="Turun"
                            >
                              ▼
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.roomInfo} style={{ paddingLeft: '8px' }}>
                    <h4 className={styles.roomName}>{room.name}</h4>
                    <p className={styles.roomCode}>{room.code}</p>

                    {isChecked && check && (
                      <div className={styles.checkDetails}>
                        <span className={styles.checkTime} suppressHydrationWarning>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {mounted && check.checkedAt ? (() => {
                            try {
                              const d = new Date(check.checkedAt);
                              return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            } catch { return ''; }
                          })() : ''}
                        </span>
                        {room.hasAc && (
                          <span className={`${styles.checkTag} ${check.acStatus === 'on' ? styles.tagOn : styles.tagOff}`}>
                            AC {check.acStatus === 'on' ? 'ON' : 'OFF'}
                          </span>
                        )}
                        {room.hasLight && (
                          <span className={`${styles.checkTag} ${check.lightStatus === 'on' ? styles.tagOn : styles.tagOff}`}>
                            Lampu {check.lightStatus === 'on' ? 'ON' : 'OFF'}
                          </span>
                        )}
                        {(check.checklistValues?.['Music'] || check.checklistValues?.['music']) && (
                          <span className={`${styles.checkTag} ${(check.checklistValues?.['Music'] === 'on' || check.checklistValues?.['music'] === 'on') ? styles.tagOn : styles.tagOff}`}>
                            Music {(check.checklistValues?.['Music'] === 'on' || check.checklistValues?.['music'] === 'on') ? 'ON' : 'OFF'}
                          </span>
                        )}
                        {check.condition === 'finding' && (
                          <span className={`${styles.checkTag} ${styles.tagFinding}`}>
                            Ada Temuan
                          </span>
                        )}
                      </div>
                    )}

                    {isNext && (
                      <p className={styles.nextHint}>
                        <span className="status-dot status-dot-info" />
                        Ruangan berikutnya
                      </p>
                    )}
                  </div>

                  <div className={styles.roomAction}>
                    {isChecked ? (
                      <span className="badge badge-success">✓</span>
                    ) : (
                      <Link
                        href={`/security/patrol/room/${room.id}`}
                        className="btn btn-primary btn-sm"
                        id={`btn-check-${room.code}`}
                        onClick={(e) => handleGoToRoom(room.id, e)}
                      >
                        Periksa
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue CTA */}
          {percent < 100 && nextRoom && (
            <div className={styles.continueCta} style={{ marginTop: '1.5rem' }}>
              <Link
                href={`/security/patrol/room/${nextRoom.id}`}
                className="btn btn-primary btn-xl"
                id="btn-continue-patrol"
                onClick={(e) => handleGoToRoom(nextRoom.id, e)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Periksa {nextRoom.name}
              </Link>
            </div>
          )}

      {/* QR Validated or Scan CTA */}
      {(isFloorQrSatisfied && percent === 100) ? (
        <div className="card animate-scale-in" style={{ marginTop: '1.5rem', background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', textAlign: 'center', padding: '1.5rem 1.25rem', borderRadius: '12px' }}>
          <div style={{ color: 'var(--color-success-700)', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-success-600)', color: '#fff', fontSize: '15px' }}>✓</span>
            Lantai Selesai
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-600)', margin: '0 0 14px' }}>
            {hasThisFloorQr
              ? `Seluruh titik pemeriksaan di ${floor.name} telah selesai dan barcode fisik lantai ini telah tervalidasi.`
              : `Seluruh titik pemeriksaan di ${floor.name} telah selesai. Kehadiran fisik sesi patroli ini telah tervalidasi.`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '280px', margin: '0 auto' }}>
            {nextFloor ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  markCurrentFloorCompletedInCache();
                  const target = `/security/patrol/floor/${nextFloor.id}`;
                  if (typeof window !== 'undefined' && !navigator.onLine) {
                    window.location.href = target;
                  } else {
                    router.push(target);
                  }
                }}
              >
                Lanjut ke {nextFloor.name} →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  markCurrentFloorCompletedInCache();
                  const target = `/security/patrol/summary`;
                  if (typeof window !== 'undefined' && !navigator.onLine) {
                    window.location.href = target;
                  } else {
                    router.push(target);
                  }
                }}
              >
                Lihat Ringkasan Patroli 🎉
              </button>
            )}
            <Link href="/security/patrol" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }} onClick={handleGoToPatrol}>
              Lihat Rute Patroli
            </Link>
          </div>
        </div>
      ) : percent === 100 ? (
        <div className={`${styles.qrCta} animate-scale-in`} style={{ marginTop: '1.5rem' }}>
          <div className={styles.qrCtaContent}>
            <div className={styles.qrCtaIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3 className={styles.qrCtaTitle}>Semua Ruangan Selesai!</h3>
            <p className={styles.qrCtaText}>
              {qrScanMode === 'per_floor'
                ? 'Scan stiker barcode di lantai ini untuk memverifikasi dan menyelesaikan pemeriksaan lantai ini.'
                : 'Scan stiker barcode di lantai ini untuk verifikasi kehadiran fisik (cukup 1x scan per sesi patroli).'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
              <Link
                href={`/security/patrol/floor/${floor.id}/qr-scan`}
                className="btn btn-success btn-xl"
                id="btn-scan-qr"
                onClick={handleGoToQr}
                style={{ fontWeight: 700 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Scan Barcode {qrScanMode === 'per_floor' ? floor.name : 'Kehadiran'}
              </Link>
              {qrScanMode !== 'per_floor' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleSkipFloorQr}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary-700)',
                    borderColor: 'var(--color-primary-300)',
                    background: 'var(--color-primary-50)',
                  }}
                >
                  ⏩ Lewati & Scan di Lantai Lain Nanti
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
