'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface SessionFloor {
  id: string;
  floorId: string;
  floorNameSnapshot: string;
  floorCodeSnapshot: string;
  status: string;
  patrolChecks: { id: string; condition: string }[];
}

interface PatrolSession {
  id: string;
  patrolNumber: number;
  status: string;
  scheduleId: string;
  schedule?: { name: string; startTime: string; endTime: string };
  sessionFloors: SessionFloor[];
}

interface DashboardData {
  session: PatrolSession | null;
  totalRooms: number;
  checkedRooms: number;
  findingsCount: number;
  floorsCompleted: number;
}

export default function SecurityDashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);

    // Fetch real data from APIs
    async function loadDashboard() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [sessionsRes, findingsRes, floorsRes] = await Promise.all([
          fetch(`/api/patrol/sessions?date=${today}`),
          fetch('/api/findings?status=new&limit=100'),
          fetch('/api/floors'),
        ]);

        const sessions: PatrolSession[] = sessionsRes.ok ? await sessionsRes.json() : [];
        const findingsData = findingsRes.ok ? await findingsRes.json() : { data: [], total: 0 };
        const floors = floorsRes.ok ? await floorsRes.json() : [];

        // Find active or latest session
        const activeSession = sessions.find(s => s.status === 'in_progress') || sessions[sessions.length - 1] || null;

        // Count total rooms from floors
        const totalRooms = floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0);

        // Count checked rooms from session
        let checkedRooms = 0;
        let floorsCompleted = 0;
        if (activeSession) {
          for (const sf of activeSession.sessionFloors) {
            checkedRooms += sf.patrolChecks.length;
            if (sf.status === 'completed') floorsCompleted++;
          }
        }

        const findingsCount = typeof findingsData === 'object' && 'total' in findingsData
          ? findingsData.total
          : Array.isArray(findingsData) ? findingsData.length : 0;

        setData({
          session: activeSession,
          totalRooms,
          checkedRooms,
          findingsCount,
          floorsCompleted,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    return () => clearInterval(interval);
  }, []);

  const overallProgress = data && data.totalRooms > 0
    ? Math.round((data.checkedRooms / data.totalRooms) * 100)
    : 0;

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'progress-fill-success';
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

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--color-neutral-200)', borderTop: '3px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p className="text-sm text-muted">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Date */}
      <p className={`text-sm text-secondary mb-3 ${styles.dateText}`}>
        {currentTime ? formatDate(currentTime) : ''}
      </p>

      {/* Active Patrol Card */}
      {data?.session ? (
        <div className={`card card-dark ${styles.patrolCard} animate-slide-up`}>
          <div className="card-body">
            <div className={styles.patrolHeader}>
              <div>
                <span className={styles.patrolLabel}>PATROLI AKTIF</span>
                <h2 className={styles.patrolTitle}>
                  Patroli #{data.session.patrolNumber}
                </h2>
                <p className={styles.patrolPeriod}>
                  Periode {data.session.schedule?.startTime} - {data.session.schedule?.endTime}
                </p>
              </div>
              <div className={styles.patrolBadge}>
                <span className="status-dot status-dot-info" />
                <span>{data.session.status === 'completed' ? 'Selesai' : 'Berjalan'}</span>
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
                {data.checkedRooms} dari {data.totalRooms} ruangan diperiksa
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card animate-slide-up">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-400)" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h3 style={{ fontSize: '16px', color: 'var(--color-neutral-700)', margin: '0 0 4px' }}>Belum Ada Patroli</h3>
            <p className="text-sm text-muted">Tidak ada sesi patroli aktif hari ini</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={`${styles.statsGrid} animate-slide-up stagger-1`}>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className={styles.statValue}>{data?.floorsCompleted || 0}</span>
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
            <span className={styles.statValue}>{data?.findingsCount || 0}</span>
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
            <span className={styles.statValue}>{data?.totalRooms || 0}</span>
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
          {data?.session ? 'Lanjutkan Patroli' : 'Mulai Patroli'}
        </Link>
      </div>
    </div>
  );
}
