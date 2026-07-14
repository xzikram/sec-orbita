'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function loadHistory() {
      try {
        // Fetch last 7 days of patrol sessions
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
        }

        const allSessions: PatrolSession[] = [];
        for (const date of dates) {
          const res = await fetch(`/api/patrol/sessions?date=${date}`);
          if (res.ok) {
            const data = await res.json();
            allSessions.push(...data);
          }
        }
        setSessions(allSessions);
      } catch (err) {
        console.error('History load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
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
      : new Date(session.patrolDate).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, PatrolSession[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
    return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="text-sm text-muted">Memuat riwayat patroli...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 className={styles.pageTitle}>Riwayat Patroli</h1>
      <p className={styles.pageSubtitle}>Catatan patroli Anda sebelumnya</p>

      {Object.keys(grouped).length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="empty-state-title">Belum ada riwayat</h3>
          <p className="empty-state-text">Anda belum melakukan patroli dalam 7 hari terakhir</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, dateSessions]) => (
        <div key={date} className={styles.dateGroup}>
          <h3 className={styles.dateLabel}>{formatDate(date)}</h3>
          <div className={styles.sessionList}>
            {dateSessions.map((session, index) => (
              <div
                key={session.id}
                className={`card ${styles.sessionCard} animate-slide-up stagger-${Math.min(index + 1, 6)}`}
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
                    {getStatusBadge(session.status)}
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
