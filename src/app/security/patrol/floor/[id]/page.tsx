'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/dummy-data';
import {
  floors,
  activeSessionFloors,
  activeChecks,
  getRoomsByFloor,
} from '@/lib/dummy-data';
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

  useEffect(() => {
    setFloorRooms(getRoomsByFloor(id));
    setMounted(true);
  }, [id]);

  if (!floor) {
    return <div className="page-content"><p>Lantai tidak ditemukan</p></div>;
  }

  const sessionFloor = activeSessionFloors.find(sf => sf.floorId === id);
  const checkedRoomIds = activeChecks
    .filter(c => c.sessionFloorId === sessionFloor?.id)
    .map(c => c.roomId);

  const checked = checkedRoomIds.length;
  const total = floorRooms.length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  // Find next unchecked room
  const nextRoom = floorRooms.find(r => !checkedRoomIds.includes(r.id));

  const getProgressColor = () => {
    if (percent === 100) return 'progress-fill-success';
    return 'progress-fill-primary';
  };

  const reverseOrder = () => {
    setFloorRooms(prev => [...prev].reverse());
  };

  const moveRoom = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= floorRooms.length) return;
    const newList = [...floorRooms];
    const temp = newList[index];
    newList[index] = newList[newIndex];
    newList[newIndex] = temp;
    setFloorRooms(newList);
  };

  return (
    <div className="page-content">
      {/* Back button & header */}
      <div className={styles.header}>
        <button
          className={`btn btn-ghost btn-icon ${styles.backBtn}`}
          onClick={() => router.back()}
          aria-label="Kembali"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className={styles.floorTitle}>{floor.name}</h1>
          <p className={styles.floorSubtitle}>{checked} dari {total} ruangan diperiksa</p>
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
          const isChecked = checkedRoomIds.includes(room.id);
          const isNext = nextRoom?.id === room.id;
          const check = activeChecks.find(c => c.roomId === room.id);

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
                ) : isNext ? (
                  <Link
                    href={`/security/patrol/room/${room.id}`}
                    className="btn btn-primary btn-sm"
                    id={`btn-check-${room.code}`}
                  >
                    Periksa
                  </Link>
                ) : (
                  <span className="badge badge-neutral">Antri</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Scan CTA (only if all rooms checked) */}
      {percent === 100 && (
        <div className={`${styles.qrCta} animate-scale-in`}>
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

      {/* Continue CTA */}
      {percent < 100 && nextRoom && (
        <div className={styles.continueCta}>
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
    </div>
  );
}
