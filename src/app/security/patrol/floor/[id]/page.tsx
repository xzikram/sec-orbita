'use client';

import { use, useState, useEffect } from 'react';
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

export default function FloorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [dbFloor, setDbFloor] = useState<any>(null);
  const [floorRooms, setFloorRooms] = useState<Room[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
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
            const isStale = (sessDate && sessDate < todayMakassar && Date.now() - startedTime > 4 * 60 * 60 * 1000) || (startedTime > 0 && Date.now() - startedTime > 4 * 60 * 60 * 1000);

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
        const dbMod = await import('@/lib/db').catch(() => null);
        if (dbMod && dbMod.getCachedFloors) {
          try {
            const cachedFloors = await dbMod.getCachedFloors();
            const cleanTargetId = String(id).trim().toLowerCase();
            const matchedFloor = cachedFloors.find((f: any) =>
              String(f.id).toLowerCase() === cleanTargetId ||
              String(f.code || '').toLowerCase() === cleanTargetId ||
              `floor-${String(f.code || '').toLowerCase()}` === cleanTargetId ||
              `sf-${String(f.code || '').toLowerCase()}` === cleanTargetId
            );
            if (matchedFloor) {
              setDbFloor(matchedFloor);
            }
          } catch {}
        }

        // 3. Resolve rooms from IndexedDB master_rooms
        const resolvedFloor = fallbackFloor;
        const { getResilientRoomsForFloor } = await import('@/lib/offline-cache');
        const defaultRooms = await getResilientRoomsForFloor(resolvedFloor ? resolvedFloor.id : id);

        const savedOrder = localStorage.getItem(`patrol-order-${empId}-${id}`);
        if (savedOrder) {
          try {
            const orderIds = JSON.parse(savedOrder) as string[];
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
          } catch {
            setFloorRooms(defaultRooms);
          }
        } else {
          setFloorRooms(defaultRooms);
        }

        // 3. Get offline checks from IndexedDB
        try {
          const { getOfflineChecks } = await import('@/lib/db');
          const offline = await getOfflineChecks();
          setOfflineChecks(offline);
        } catch (e) {
          console.error('IndexedDB load error:', e);
        }

        // 4. Set loading false immediately (< 25ms render)
        setLoading(false);
        setMounted(true);

        // 5. Background network update if online
        if (navigator.onLine) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);

          Promise.all([
            fetch('/api/auth/me', { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/patrol/sessions', { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          ]).then(([meData, sessions]) => {
            clearTimeout(timer);
            if (meData?.user) {
              setCurrentUser(meData.user);
              try { localStorage.setItem('cached-user', JSON.stringify(meData.user)); } catch {}
            }
            if (Array.isArray(sessions)) {
              const myId = meData?.user?.id || currentUser?.id;
              const active = sessions.find((s: any) => s.status === 'in_progress' && (s.userId === myId || !s.userId)) || null;
              if (active) {
                setSession(active);
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
    if (isRoomChecked(r, sessionFloor?.patrolChecks, offlineChecks)) {
      combinedCheckedSet.add(r.code);
    }
  });

  const checked = combinedCheckedSet.size;
  const total = floorRooms.length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  // Find next unchecked room by code snapshot
  const nextRoom = floorRooms.find(r => !combinedCheckedSet.has(r.code));

  const getProgressColor = () => {
    if (percent === 100) return 'progress-fill-success';
    return 'progress-fill-primary';
  };

  const saveCustomOrder = (newList: Room[]) => {
    const empId = currentUser?.employeeId || 'guest';
    const orderIds = newList.map(r => r.id);
    localStorage.setItem(`patrol-order-${empId}-${id}`, JSON.stringify(orderIds));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>Rute Pemeriksaan Ruangan</h3>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={reverseOrder} 
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
                  <div className={styles.roomOrder} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', minWidth: '36px' }}>
                    {isChecked ? (
                      <div className={styles.checkIcon}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <span className={styles.orderNumber} style={{ fontWeight: 'bold' }}>{index + 1}</span>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                          {index > 0 && (
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveRoom(index, 'up'); }} 
                              style={{ background: 'var(--color-neutral-100)', border: 'none', borderRadius: '3px', color: 'var(--color-neutral-600)', padding: '1px 4px', fontSize: '8px', cursor: 'pointer' }} 
                              title="Naik"
                            >
                              ▲
                            </button>
                          )}
                          {index < floorRooms.length - 1 && (
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveRoom(index, 'down'); }} 
                              style={{ background: 'var(--color-neutral-100)', border: 'none', borderRadius: '3px', color: 'var(--color-neutral-600)', padding: '1px 4px', fontSize: '8px', cursor: 'pointer' }} 
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
      {(sessionFloor?.qrValidated && percent === 100) ? (
        <div className="card animate-scale-in" style={{ marginTop: '1.5rem', background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', textAlign: 'center', padding: '1.5rem 1.25rem', borderRadius: '12px' }}>
          <div style={{ color: 'var(--color-success-700)', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-success-600)', color: '#fff', fontSize: '15px' }}>✓</span>
            Lantai Selesai & Tervalidasi QR
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-600)', margin: '0 0 14px' }}>
            Seluruh titik pemeriksaan di {floor.name} telah dicek dan validasi QR fisik berhasil.
          </p>
          <Link href="/security/patrol" className="btn btn-outline btn-sm" style={{ fontWeight: 600 }} onClick={handleGoToPatrol}>
            Kembali ke Rute Patroli →
          </Link>
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
              Langkah Terakhir: Scan QR fisik di dinding untuk menutup lantai ini
            </p>
            <Link
              href={`/security/patrol/floor/${floor.id}/qr-scan`}
              className="btn btn-success btn-xl"
              id="btn-scan-qr"
              onClick={handleGoToQr}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Scan QR Lantai
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
