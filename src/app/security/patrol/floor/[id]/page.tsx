'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/dummy-data';
import {
  floors,
  getRoomsByFloor,
  getFloorById,
} from '@/lib/dummy-data';
import { submitRoomCheck } from '@/lib/data-client';
import QuickCheckCard from './QuickCheckCard';
import styles from './floor.module.css';

export default function FloorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [floorRooms, setFloorRooms] = useState<Room[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const floor = getFloorById(id) || 
    (() => {
      const match = session?.sessionFloors?.find((sf: any) => 
        sf.floorId === id || 
        sf.id === id || 
        String(sf.floorCodeSnapshot || '').toUpperCase() === String(id).toUpperCase() ||
        sf.floor?.id === id ||
        String(sf.floor?.code || '').toUpperCase() === String(id).toUpperCase()
      );
      return match ? (getFloorById(match.floorCodeSnapshot) || getFloorById(match.floorId) || getFloorById(match.floor?.code)) : undefined;
    })();

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/patrol/sessions').catch(() => null),
        ]);

        let empId = 'guest';
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          empId = meData.user.employeeId;
          try { localStorage.setItem('cached-user', JSON.stringify(meData.user)); } catch {}
        } else {
          const cachedUser = localStorage.getItem('cached-user');
          if (cachedUser) {
            try {
              const u = JSON.parse(cachedUser);
              setCurrentUser(u);
              empId = u.employeeId || 'guest';
            } catch {}
          }
        }

        let activeSess: any = null;
        if (sessionsRes && sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          activeSess = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          setSession(activeSess);
          if (activeSess) {
            try { localStorage.setItem('cached-active-session', JSON.stringify(activeSess)); } catch {}
          }
        } else {
          const cachedSess = localStorage.getItem('cached-active-session');
          if (cachedSess) {
            try {
              activeSess = JSON.parse(cachedSess);
              setSession(activeSess);
            } catch {}
          }
        }

        const resolvedFloor = getFloorById(id) || 
          (() => {
            const match = activeSess?.sessionFloors?.find((sf: any) => 
              sf.floorId === id || 
              sf.id === id || 
              String(sf.floorCodeSnapshot || '').toUpperCase() === String(id).toUpperCase() ||
              sf.floor?.id === id ||
              String(sf.floor?.code || '').toUpperCase() === String(id).toUpperCase()
            );
            return match ? (getFloorById(match.floorCodeSnapshot) || getFloorById(match.floorId) || getFloorById(match.floor?.code)) : undefined;
          })();

        const defaultRooms = getRoomsByFloor(resolvedFloor ? resolvedFloor.id : id);

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
            // Ensure no rooms were dropped if catalog changed
            const sortedIds = new Set(sorted.map(r => r.id));
            const missing = defaultRooms.filter(r => !sortedIds.has(r.id));
            setFloorRooms([...sorted, ...missing]);
          } catch {
            setFloorRooms(defaultRooms);
          }
        } else {
          setFloorRooms(defaultRooms);
        }

        // Get offline checks
        try {
          const { getOfflineChecks } = await import('@/lib/db');
          const offline = await getOfflineChecks();
          setOfflineChecks(offline);
        } catch (e) {
          console.error('IndexedDB load error:', e);
        }

      } catch (err) {
        console.error('Floor load error:', err);
        const cachedSess = localStorage.getItem('cached-active-session');
        if (cachedSess) try { setSession(JSON.parse(cachedSess)); } catch {}
      } finally {
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
  const dbCheckedRoomCodes = sessionFloor?.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
  let offCheckedRoomCodes: string[] = [];
  try {
    offCheckedRoomCodes = offlineChecks
      .filter((c: any) => c.sessionFloorId === sessionFloor?.id || (floor?.code && c.sessionFloorId === `sf-${floor.code.toLowerCase()}`))
      .map((c: any) => {
        // Look up room code in any floor rooms list
        const r = floors.reduce((found: any, f) => found || getRoomsByFloor(f.id).find(rm => rm.id === c.roomId), null as any);
        return r ? r.code : c.roomId;
      });
  } catch (e) {
    console.error('Error processing offline checks:', e);
  }
  const combinedCheckedSet = new Set([...dbCheckedRoomCodes, ...offCheckedRoomCodes]);

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

  const handleSwipeLeft = (room: Room) => {
    router.push(`/security/patrol/room/${room.id}?condition=finding`);
  };

  const handleSwipeRight = async (room: Room) => {
    const sessionFloorId = sessionFloor?.id || `sf-${floor.code.toLowerCase()}`;
    try {
      await submitRoomCheck({
        sessionFloorId,
        roomId: room.id,
        acStatus: room.hasAc ? 'on' : 'not_available',
        lightStatus: room.hasLight ? 'on' : 'off',
        condition: 'normal',
        remarks: 'Pemeriksaan Cepat (Swipe)',
        photoBase64: 'DUMMY_SWIPE',
      });

      // Update local state so UI updates immediately
      const newCheck = {
        id: `check-${Date.now()}`,
        sessionFloorId,
        roomId: room.id,
        userId: currentUser?.id || 'guest',
        roomNameSnapshot: room.name,
        roomCodeSnapshot: room.code,
        floorNameSnapshot: floor?.name || '',
        roomOrderSnapshot: room.patrolOrder,
        acStatus: room.hasAc ? 'on' : 'not_available' as any,
        lightStatus: room.hasLight ? 'on' : 'off' as any,
        condition: 'normal' as any,
        remarks: 'Pemeriksaan Cepat (Swipe)',
        checkedAt: new Date().toISOString(),
      };
      setOfflineChecks(prev => [...prev, newCheck]);

      // Save resume state
      const lastPatrolState = {
        sessionId: sessionFloor?.sessionId || 'session-dummy',
        floorId: room.floorId,
        floorName: floor?.name || 'Lantai',
        roomId: room.id,
        roomName: room.name,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('lastPatrolState', JSON.stringify(lastPatrolState));

      // Refresh cached session data asynchronously for next page
      fetch('/api/patrol/sessions').then(res => {
        if (res.ok) return res.json();
        return null;
      }).then(sessions => {
        if (sessions) {
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          if (active) localStorage.setItem('cached-active-session', JSON.stringify(active));
        }
      }).catch(() => {});

      // Re-trigger layout render
      setFloorRooms([...floorRooms]);
    } catch (e) {
      console.error('Failed to swipe check room:', e);
    }
  };

  return (
    <div className="page-content">
      {/* Back button & header */}
      <div className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <button
            className={`btn btn-ghost btn-icon ${styles.backBtn}`}
            onClick={() => router.back()}
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
        {percent < 100 && (
          <button
            onClick={() => setIsQuickMode(!isQuickMode)}
            className={`btn btn-sm ${isQuickMode ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 10px', fontSize: '12px', height: '32px', minHeight: 'auto', fontWeight: 'bold' }}
            id="btn-toggle-quick-mode"
          >
            ⚡ {isQuickMode ? 'Mode Biasa' : 'Mode Cepat'}
          </button>
        )}
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

      {/* Quick Check Mode Stack vs Normal List */}
      {isQuickMode && percent < 100 && nextRoom ? (
        <div style={{ margin: '2rem 0', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold' }}>
            GESER KANAN JIKA NORMAL • GESER KIRI JIKA ADA TEMUAN
          </p>
          <QuickCheckCard
            room={nextRoom}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={(r) => router.push(`/security/patrol/room/${r.id}`)}
          />
        </div>
      ) : (
        <>
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
                            offlineChecks.find((c: any) => c.roomId === room.id && c.sessionFloorId === sessionFloor?.id);

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
                          {mounted ? new Date(check.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
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
        </>
      )}

      {/* QR Validated or Scan CTA */}
      {(sessionFloor?.qrValidated || sessionFloor?.status === 'completed') ? (
        <div className="card animate-scale-in" style={{ marginTop: '1.5rem', background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', textAlign: 'center', padding: '1.5rem 1.25rem', borderRadius: '12px' }}>
          <div style={{ color: 'var(--color-success-700)', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-success-600)', color: '#fff', fontSize: '15px' }}>✓</span>
            Lantai Selesai & Tervalidasi QR
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-600)', margin: '0 0 14px' }}>
            Seluruh titik pemeriksaan di {floor.name} telah dicek dan validasi QR fisik berhasil.
          </p>
          <Link href="/security/patrol" className="btn btn-outline btn-sm" style={{ fontWeight: 600 }}>
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
              Menuju titik validasi QR untuk menyelesaikan lantai ini
            </p>
            <Link
              href={`/security/patrol/floor/${floor.id}/qr-scan`}
              className="btn btn-success btn-xl"
              id="btn-scan-qr"
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
