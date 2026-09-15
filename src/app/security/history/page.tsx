'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './history.module.css';

interface PatrolSession {
  id: string;
  patrolNumber: number;
  status: string;
  patrolDate: string;
  startedAt: string | null;
  completedAt: string | null;
  schedule?: { name: string; startTime: string; endTime: string };
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<PatrolSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Fetch last 7 days of patrol sessions in parallel
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(d));
      }

      const responses = await Promise.all(
        dates.map(date => fetch(`/api/patrol/sessions?date=${date}&personal=true`).then(r => r.ok ? r.json() : []).catch(() => []))
      );
      const allSessions: PatrolSession[] = responses.flat();
      setSessions(allSessions);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();

    // Auto-refresh when user clicks the bottom navigation "Riwayat" item
    const handleNavRefresh = (e: any) => {
      if (!e.detail?.path || e.detail.path === '/security/history') {
        loadHistory(true);
      }
    };
    window.addEventListener('sec-nav-refresh', handleNavRefresh);

    return () => {
      window.removeEventListener('sec-nav-refresh', handleNavRefresh);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="badge badge-success">Selesai</span>;
      case 'in_progress': return <span className="badge badge-info">Berjalan</span>;
      case 'late': return <span className="badge badge-warning">Terlambat</span>;
      case 'incomplete': return <span className="badge badge-danger">Tidak Lengkap</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Group by date
  const grouped = sessions.reduce((acc, session) => {
    const date = typeof session.patrolDate === 'string'
      ? session.patrolDate.split('T')[0]
      : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date(session.patrolDate));
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, PatrolSession[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(yesterdayDate);

    if (dateStr === today) return 'Hari Ini';
    if (dateStr === yesterday) return 'Kemarin';

    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' });
  };

  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  };

  return (
    <div className={styles.historyContainer}>
      <div className={styles.historyTop}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Riwayat Patroli</h1>
          {isRefreshing && (
            <span style={{ fontSize: '11px', color: 'var(--color-primary-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="spinner" style={{ width: 12, height: 12, border: '2px solid var(--color-primary-200)', borderTop: '2px solid var(--color-primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Memperbarui...
            </span>
          )}
        </div>
        <p className={styles.pageSubtitle}>Catatan patroli Anda sebelumnya</p>
      </div>

      <div className={styles.historyScrollArea}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-sm text-muted">Memuat riwayat patroli...</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className={styles.emptyStateTitle}>Belum ada riwayat</h3>
            <p className={styles.emptyStateText}>Anda belum melakukan patroli dalam 7 hari terakhir</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateSessions]) => (
            <div key={date} className={styles.dateGroup}>
              <h3 className={styles.dateLabel}>{formatDate(date)}</h3>
              <div className={styles.sessionList}>
                {dateSessions.map((session, index) => (
                  <Link
                    key={session.id}
                    href={`/security/history/${session.id}`}
                    className={`card ${styles.sessionCard} animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block', cursor: 'pointer' }}
                  >
                    <div className="card-body">
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <h4 className={styles.sessionTitle}>
                            Patroli #{session.patrolNumber}
                          </h4>
                          <p className={styles.sessionPeriod}>
                            {session.schedule?.startTime} - {session.schedule?.endTime}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStatusBadge(session.status)}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ opacity: 0.5 }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>

                      <div className={styles.sessionDetails}>
                        <div className={styles.detailItem}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Mulai: {session.startedAt ? formatTime(session.startedAt) : '-'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Selesai: {session.completedAt ? formatTime(session.completedAt) : '-'}</span>
                        </div>
                        {session.startedAt && session.completedAt && (
                          <div className={styles.detailItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                            <span>Durasi: {getDuration(session.startedAt, session.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
