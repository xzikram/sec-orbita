'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/dummy-data';
import {
  floors,
  getRoomsByFloor,
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

  const floor = floors.find(f => f.id === id);
  const [floorRooms, setFloorRooms] = useState<Room[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const defaultRooms = getRoomsByFloor(id);
    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/patrol/sessions'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          const empId = meData.user.employeeId;
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
              setFloorRooms(sorted);
            } catch (e) {
              setFloorRooms(defaultRooms);
            }
          } else {
            setFloorRooms(defaultRooms);
          }
        } else {
          setFloorRooms(defaultRooms);
        }

        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          setSession(active);
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
      } finally {
        setLoading(false);
      }
    }
    loadData();
    setMounted(true);
  }, [id]);

  if (!floor) {
    return <div className="page-content"><p>Lantai tidak ditemukan</p></div>;
  }

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat progress lantai...</p></div>;
  }

  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => sf.floorId === id);
  
  // Combine online (DB) checks and offline checks for this floor
  const dbCheckedRoomIds = sessionFloor?.patrolChecks?.map((c: any) => c.roomId) || [];
  const offCheckedRoomIds = offlineChecks.filter((c: any) => c.sessionFloorId === sessionFloor?.id).map((c: any) => c.roomId);
  const combinedCheckedSet = new Set([...dbCheckedRoomIds, ...offCheckedRoomIds]);
  const checkedRoomIds = Array.from(combinedCheckedSet);

  const checked = checkedRoomIds.length;
  const total = floorRooms.length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  // Find next unchecked room
  const nextRoom = floorRooms.find(r => !checkedRoomIds.includes(r.id));

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
    if (!sessionFloor) return;
    try {
      await submitRoomCheck({
        sessionFloorId: sessionFloor.id,
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
        sessionFloorId: sessionFloor.id,
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
        sessionId: sessionFloor.sessionId,
        floorId: room.floorId,
        floorName: floor?.name || 'Lantai',
        roomId: room.id,
        roomName: room.name,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('lastPatrolState', JSON.stringify(lastPatrolState));

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
              const isChecked = checkedRoomIds.includes(room.id);
              const isNext = nextRoom?.id === room.id;
              const check = sessionFloor?.patrolChecks?.find((c: any) => c.roomId === room.id) ||
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

      {/* QR Scan CTA (only if all rooms checked) */}
      {percent === 100 && (
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
              href={`/security/patrol/floor/${id}/qr-scan`}
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
      )}
    </div>
  );
}
