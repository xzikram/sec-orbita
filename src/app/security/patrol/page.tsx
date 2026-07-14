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
} from '@/lib/dummy-data';
import styles from './patrol.module.css';

export default function PatrolPage() {
  const [isReversed, setIsReversed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const empId = data.user?.employeeId || 'guest';
        const saved = localStorage.getItem(`patrol-reversed-${empId}`);
        if (saved === 'true') {
          setIsReversed(true);
        }
      })
      .catch(() => {});
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

  const schedule = patrolSchedules.find(s => s.id === activeSession.scheduleId);

  const totalRooms = floors.reduce((sum, f) => sum + getRoomsByFloor(f.id).length, 0);
  const checkedRooms = activeChecks.length;
  const overallProgress = Math.round((checkedRooms / totalRooms) * 100);

  const rawFloorProgress = activeSessionFloors.map(sf => {
    const floor = floors.find(f => f.id === sf.floorId)!;
    const floorRooms = getRoomsByFloor(sf.floorId);
    const checked = activeChecks.filter(c => c.sessionFloorId === sf.id).length;
    return {
      ...sf,
      floor,
      total: floorRooms.length,
      checked,
      percent: Math.round((checked / floorRooms.length) * 100),
    };
  });

  const floorProgress = isReversed ? [...rawFloorProgress].reverse() : rawFloorProgress;

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
        <span className={styles.statusNumber}>{floorProgress.findIndex(f => f.floorId === status) + 1}</span>
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
            {checkedRooms} dari {totalRooms} ruangan • {floorProgress.filter(f => f.status === 'completed').length} dari {floors.length} lantai
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
        {floorProgress.map((fp, index) => (
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
