'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  floors,
  activeSession,
  activeSessionFloors,
  activeChecks,
  patrolSchedules,
  getRoomsByFloor,
  getFloorById,
  rooms,
} from '@/lib/dummy-data';
import styles from './patrol.module.css';

// Canonical physical floor progression for RS Mata JEC ORBITA
const CANONICAL_FLOOR_ORDER: Record<string, number> = {
  'SB': 0,
  'L1': 1,
  '1': 1,
  'P2': 2,
  '2': 2,
  'P3': 3,
  '3': 3,
  'P4': 4,
  '4': 4,
  'L5': 5,
  '5': 5,
  'L6': 6,
  '6': 6,
  'L7': 7,
  '7': 7,
  'L8': 8,
  '8': 8,
  'L9': 9,
  '9': 9,
  'L10': 10,
  '10': 10,
  'L11': 11,
  '11': 11,
};

function getFloorSortOrder(floorObj: any): number {
  if (!floorObj) return 999;
  const code = String(floorObj.code || floorObj.floorCodeSnapshot || '').toUpperCase().trim();
  if (CANONICAL_FLOOR_ORDER[code] !== undefined) {
    return CANONICAL_FLOOR_ORDER[code];
  }
  const name = String(floorObj.name || floorObj.floorNameSnapshot || '').toUpperCase().trim();
  if (name.includes('BASEMENT') || name.includes('SEMI')) return 0;
  const match = code.match(/\d+/) || name.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return floorObj.sortOrder ?? 999;
}

export default function PatrolPage() {
  const [isReversed, setIsReversed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    // 1. Instantly read user's saved route direction preference
    try {
      const saved = localStorage.getItem('patrol-reversed');
      if (saved === 'true') {
        setIsReversed(true);
      }
    } catch {}

    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/patrol/sessions').catch(() => null),
        ]);

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          const empId = meData.user?.employeeId || 'guest';
          const saved = localStorage.getItem(`patrol-reversed-${empId}`) || localStorage.getItem('patrol-reversed');
          if (saved === 'true') {
            setIsReversed(true);
          }
        }

        if (sessionsRes && sessionsRes.ok) {
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
        console.error('Patrol load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSetReversed = (reversed: boolean) => {
    setIsReversed(reversed);
    try {
      localStorage.setItem('patrol-reversed', String(reversed));
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          const empId = data.user?.employeeId || 'guest';
          localStorage.setItem(`patrol-reversed-${empId}`, String(reversed));
        })
        .catch(() => {});
    } catch {}
  };

  const currentSession = session || activeSession;
  const schedule = currentSession.schedule || patrolSchedules.find(s => s.id === currentSession.scheduleId) || patrolSchedules[0];

  const totalRooms = floors.reduce((sum, f) => sum + getRoomsByFloor(f.id).length, 0);

  // Combine online (DB) and offline (IndexedDB) check room codes
  const onlineCheckRoomCodes = new Set<string>();
  currentSession.sessionFloors?.forEach((sf: any) => {
    sf.patrolChecks?.forEach((c: any) => onlineCheckRoomCodes.add(c.roomCodeSnapshot));
  });

  const offlineCheckRoomCodes = new Set<string>();
  offlineChecks.forEach((c: any) => {
    const isMatchingFloor = currentSession.sessionFloors?.some((sf: any) => {
      const floor = floors.find(f => f.id === sf.floorId || f.code === sf.floorCodeSnapshot);
      const dummySfId = floor ? `sf-${floor.code.toLowerCase()}` : '';
      return sf.id === c.sessionFloorId || (dummySfId && dummySfId === c.sessionFloorId);
    });
    if (isMatchingFloor) {
      const r = rooms.find(rm => rm.id === c.roomId);
      if (r) offlineCheckRoomCodes.add(r.code);
    }
  });

  const checkedRoomCodesSet = new Set([...onlineCheckRoomCodes, ...offlineCheckRoomCodes]);
  const checkedRooms = checkedRoomCodesSet.size;
  const overallProgress = totalRooms > 0 ? Math.round((checkedRooms / totalRooms) * 100) : 0;

  const rawFloorProgress = (currentSession.sessionFloors || activeSessionFloors).map((sf: any) => {
    const floor = floors.find(f => 
      f.id === sf.floorId || 
      f.code.toUpperCase() === String(sf.floorCodeSnapshot || '').toUpperCase() ||
      (sf.floor?.code && f.code.toUpperCase() === sf.floor.code.toUpperCase())
    ) || getFloorById(sf.floorCodeSnapshot) || getFloorById(sf.floorId) || getFloorById(sf.floorNameSnapshot) || floors[0];

    const floorRooms = getRoomsByFloor(floor.id);
    
    const dbCheckedCodes = sf.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
    const offCheckedCodes = offlineChecks
      .filter((c: any) => c.sessionFloorId === sf.id || (floor?.code && c.sessionFloorId === `sf-${floor.code.toLowerCase()}`))
      .map((c: any) => {
        const r = rooms.find(rm => rm.id === c.roomId);
        return r ? r.code : c.roomId;
      });
    const combinedFloorChecked = new Set([...dbCheckedCodes, ...offCheckedCodes]);
    
    const checked = combinedFloorChecked.size;
    return {
      ...sf,
      floor,
      sortOrder: getFloorSortOrder(floor),
      total: floorRooms.length,
      checked,
      percent: floorRooms.length > 0 ? Math.round((checked / floorRooms.length) * 100) : 0,
    };
  });

  // Strictly sort by canonical floor order ascending (SB -> 11) or descending (11 -> SB)
  const floorProgress = [...rawFloorProgress].sort((a, b) => {
    return isReversed ? b.sortOrder - a.sortOrder : a.sortOrder - b.sortOrder;
  });

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat progress patroli...</p></div>;
  }

  const getStatusIcon = (status: string, percent: number) => {
    if (status === 'completed' || percent === 100) {
      return (
        <div className={`${styles.statusCircle} ${styles.statusCompleted}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    if (status === 'in_progress') {
      return (
        <div className={`${styles.statusCircle} ${styles.statusActive}`}>
          <span className={styles.statusActiveInner} />
        </div>
      );
    }
    return (
      <div className={`${styles.statusCircle} ${styles.statusPending}`}>
        <span className={styles.statusNumber}>{floorProgress.findIndex((f: any) => f.floorId === status) + 1}</span>
      </div>
    );
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'progress-fill-success';
    if (percent > 0) return 'progress-fill-primary';
    return 'progress-fill-primary';
  };

  return (
    <div className="page-content">
      {/* Patrol Header */}
      <div className={`${styles.patrolInfo} animate-slide-up`}>
        <div className={styles.patrolInfoHeader}>
          <div>
            <h1 className={styles.patrolTitle}>Patroli #{currentSession.patrolNumber || activeSession.patrolNumber}</h1>
            <p className={styles.patrolPeriod}>
              {schedule?.startTime} - {schedule?.endTime}
            </p>
          </div>
          <span className="badge badge-info badge-lg">Sedang Berjalan</span>
        </div>

        <div className={styles.overallProgress}>
          <div className={styles.progressHeader}>
            <span className="text-sm text-secondary">Progress</span>
            <span className="font-bold text-lg">{overallProgress}%</span>
          </div>
          <div className="progress-bar progress-bar-lg">
            <div
              className={`progress-bar-fill ${getProgressColor(overallProgress)}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {checkedRooms} dari {totalRooms} ruangan • {floorProgress.filter((f: any) => f.status === 'completed').length} dari {floors.length} lantai
          </p>
        </div>
      </div>

      {/* Completed Patrol Summary Banner */}
      {(overallProgress === 100 || floorProgress.every((f: any) => f.status === 'completed' || f.percent === 100)) && (
        <div className="card animate-scale-in" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: 700 }}>🎉 Patroli Lengkap</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15px', color: '#fff', fontWeight: 800 }}>Semua Lantai Berhasil Diperiksa!</h3>
            </div>
            <Link
              href="/security/patrol/summary"
              className="btn"
              style={{ background: '#fff', color: '#059669', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}
              id="btn-view-summary"
            >
              Lihat Ringkasan →
            </Link>
          </div>
        </div>
      )}

      {/* Floor Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', marginBottom: '0.75rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>Rute Patroli</h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
            {isReversed ? 'Arah: Dari Atas ke Bawah (11 ➔ SB)' : 'Arah: Dari Bawah ke Atas (SB ➔ 11)'}
          </p>
        </div>
        
        {/* Sleek Segmented Switcher for Direction */}
        <div style={{ display: 'flex', background: 'var(--color-neutral-100)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleSetReversed(false)}
            id="btn-route-sb-11"
            style={{
              padding: '5px 9px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              background: !isReversed ? 'var(--color-primary-600)' : 'transparent',
              color: !isReversed ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ⬆️ SB ➔ 11
          </button>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleSetReversed(true)}
            id="btn-route-11-sb"
            style={{
              padding: '5px 9px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              background: isReversed ? 'var(--color-primary-600)' : 'transparent',
              color: isReversed ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ⬇️ 11 ➔ SB
          </button>
        </div>
      </div>

      <div className={styles.timeline}>
        {floorProgress.map((fp: any, index: number) => (
          <Link
            key={fp.id}
            href={`/security/patrol/floor/${fp.floor.id}`}
            className={`${styles.timelineItem} animate-slide-up stagger-${index + 1}`}
            id={`patrol-floor-${fp.floor.code}`}
          >
            {/* Timeline connector */}
            {index < floorProgress.length - 1 && (
              <div className={`${styles.timelineConnector} ${fp.status === 'completed' ? styles.connectorCompleted : ''}`} />
            )}

            {/* Status icon */}
            {fp.status === 'completed' ? (
              <div className={`${styles.statusCircle} ${styles.statusCompleted}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : fp.status === 'in_progress' ? (
              <div className={`${styles.statusCircle} ${styles.statusActive}`}>
                <span className={styles.statusActiveInner} />
              </div>
            ) : (
              <div className={`${styles.statusCircle} ${styles.statusPending}`}>
                <span className={styles.statusNumber}>{index + 1}</span>
              </div>
            )}

            {/* Floor card */}
            <div className={`card ${styles.timelineCard} ${fp.status === 'in_progress' ? styles.timelineCardActive : ''}`}>
              <div className="card-body">
                <div className={styles.floorCardHeader}>
                  <div>
                    <h4 className={styles.floorName}>{fp.floor.name}</h4>
                    <p className={styles.floorRoomCount}>
                      {fp.checked}/{fp.total} Ruangan
                    </p>
                  </div>
                  <div className={styles.floorPercent}>
                    <span className={`${styles.percentValue} ${fp.status === 'completed' ? 'text-success' : ''}`}>
                      {fp.percent}%
                    </span>
                  </div>
                </div>

                <div className="progress-bar mt-2">
                  <div
                    className={`progress-bar-fill ${getProgressColor(fp.percent)}`}
                    style={{ width: `${fp.percent}%` }}
                  />
                </div>

                {fp.status === 'completed' && fp.completedAt && (
                  <p className={styles.completedTime} suppressHydrationWarning>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Selesai {mounted && fp.completedAt ? (() => {
                      try {
                        const d = new Date(fp.completedAt);
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      } catch { return ''; }
                    })() : ''}
                    {fp.qrValidated && (
                      <span className={styles.qrBadge}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        QR
                      </span>
                    )}
                  </p>
                )}

                {fp.status === 'in_progress' && (
                  <div className={styles.activeHint}>
                    <span className="status-dot status-dot-info" />
                    <span>Sedang diperiksa — Tap untuk lanjut</span>
                  </div>
                )}

                {fp.status === 'pending' && (
                  <p className={styles.pendingHint}>Belum dimulai</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
