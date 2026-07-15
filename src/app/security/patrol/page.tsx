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
  rooms,
} from '@/lib/dummy-data';
import styles from './patrol.module.css';

export default function PatrolPage() {
  const [isReversed, setIsReversed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/patrol/sessions'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          const empId = meData.user?.employeeId || 'guest';
          const saved = localStorage.getItem(`patrol-reversed-${empId}`);
          if (saved === 'true') {
            setIsReversed(true);
          }
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
        console.error('Patrol load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleReversed = () => {
    const newValue = !isReversed;
    setIsReversed(newValue);
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const empId = data.user?.employeeId || 'guest';
        localStorage.setItem(`patrol-reversed-${empId}`, String(newValue));
      })
      .catch(() => {});
  };

  const currentSession = session || activeSession;
  const schedule = patrolSchedules.find(s => s.id === currentSession.scheduleId);

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
    const floor = floors.find(f => f.id === sf.floorId || f.code === sf.floorCodeSnapshot)!;
    const floorRooms = getRoomsByFloor(floor.id);
    
    const dbCheckedCodes = sf.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
    const offCheckedCodes = offlineChecks
      .filter((c: any) => c.sessionFloorId === sf.id || c.sessionFloorId === `sf-${floor.code.toLowerCase()}`)
      .map((c: any) => {
        const r = rooms.find(rm => rm.id === c.roomId);
        return r ? r.code : c.roomId;
      });
    const combinedFloorChecked = new Set([...dbCheckedCodes, ...offCheckedCodes]);
    
    const checked = combinedFloorChecked.size;
    return {
      ...sf,
      floor,
      total: floorRooms.length,
      checked,
      percent: floorRooms.length > 0 ? Math.round((checked / floorRooms.length) * 100) : 0,
    };
  });

  const floorProgress = isReversed ? [...rawFloorProgress].reverse() : rawFloorProgress;

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
            <h1 className={styles.patrolTitle}>Patroli #{activeSession.patrolNumber}</h1>
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

      {/* Floor Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
        <h3 className="section-title" style={{ margin: 0, fontSize: '16px' }}>Rute Patroli</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleToggleReversed}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 8px', height: 'auto', background: 'var(--color-neutral-100)', color: 'var(--color-primary-600)', fontWeight: 'bold' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {isReversed ? 'Urutan: 11 ➔ SB' : 'Urutan: SB ➔ 11'}
        </button>
      </div>

      <div className={styles.timeline}>
        {floorProgress.map((fp: any, index: number) => (
          <Link
            key={fp.id}
            href={`/security/patrol/floor/${fp.floorId}`}
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
                <span className={styles.statusNumber}>{isReversed ? floorProgress.length - index : index + 1}</span>
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
                    Selesai {mounted ? new Date(fp.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
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
