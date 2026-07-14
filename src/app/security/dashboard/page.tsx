'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  floors,
  rooms,
  activeSession,
  activeSessionFloors,
  activeChecks,
  activeFindings,
  patrolSchedules,
  getRoomsByFloor,
} from '@/lib/dummy-data';
import styles from './dashboard.module.css';

export default function SecurityDashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get current schedule
  const schedule = patrolSchedules.find(s => s.id === activeSession.scheduleId);

  // Calculate overall progress
  const totalRooms = floors.reduce((sum, f) => sum + getRoomsByFloor(f.id).length, 0);
  const checkedRooms = activeChecks.length;
  const overallProgress = Math.round((checkedRooms / totalRooms) * 100);

  // Floor progress
  const floorProgress = activeSessionFloors.map(sf => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Selesai</span>;
      case 'in_progress':
        return <span className="badge badge-info">Sedang Diperiksa</span>;
      case 'pending':
        return <span className="badge badge-neutral">Belum Dimulai</span>;
      default:
        return null;
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed': return 'status-dot-success';
      case 'in_progress': return 'status-dot-info';
      case 'pending': return 'status-dot-neutral';
      default: return 'status-dot-neutral';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'progress-fill-success';
    if (percent > 0) return 'progress-fill-primary';
    return 'progress-fill-primary';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="page-content">
      {/* Date */}
      <p className={`text-sm text-secondary mb-3 ${styles.dateText}`}>
        {currentTime ? formatDate(currentTime) : ''}
      </p>

      {/* Active Patrol Card */}
      <div className={`card card-dark ${styles.patrolCard} animate-slide-up`}>
        <div className="card-body">
          <div className={styles.patrolHeader}>
            <div>
              <span className={styles.patrolLabel}>PATROLI AKTIF</span>
              <h2 className={styles.patrolTitle}>
                Patroli #{activeSession.patrolNumber}
              </h2>
              <p className={styles.patrolPeriod}>
                Periode {schedule?.startTime} - {schedule?.endTime}
              </p>
            </div>
            <div className={styles.patrolBadge}>
              <span className="status-dot status-dot-info" />
              <span>Berjalan</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Progress Keseluruhan</span>
              <span className={styles.progressValue}>{overallProgress}%</span>
            </div>
            <div className="progress-bar progress-bar-lg">
              <div
                className={`progress-bar-fill ${getProgressColor(overallProgress)}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className={styles.progressDetail}>
              {checkedRooms} dari {totalRooms} ruangan diperiksa
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`${styles.statsGrid} animate-slide-up stagger-1`}>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className={styles.statValue}>{floorProgress.filter(f => f.status === 'completed').length}</span>
            <span className={styles.statLabel}>Lantai Selesai</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconDanger}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className={styles.statValue}>{activeFindings.length}</span>
            <span className={styles.statLabel}>Temuan</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
            <span className={styles.statValue}>{totalRooms}</span>
            <span className={styles.statLabel}>Total Ruangan</span>
          </div>
        </div>
      </div>


      {/* Start Patrol CTA */}
      <div className={`${styles.ctaSection} animate-slide-up`}>
        <Link href="/security/patrol" className="btn btn-primary btn-xl" id="btn-start-patrol">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Lanjutkan Patroli
        </Link>
      </div>
    </div>
  );
}
