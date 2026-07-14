'use client';

import { patrolHistory, patrolSchedules } from '@/lib/dummy-data';
import styles from './history.module.css';

export default function HistoryPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="badge badge-success">Selesai</span>;
      case 'late': return <span className="badge badge-warning">Terlambat</span>;
      case 'incomplete': return <span className="badge badge-danger">Tidak Lengkap</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Group by date
  const grouped = patrolHistory.reduce((acc, session) => {
    const date = session.patrolDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, typeof patrolHistory>);

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

  return (
    <div className="page-content">
      <h1 className={styles.pageTitle}>Riwayat Patroli</h1>
      <p className={styles.pageSubtitle}>Catatan patroli Anda sebelumnya</p>

      {Object.entries(grouped).map(([date, sessions]) => (
        <div key={date} className={styles.dateGroup}>
          <h3 className={styles.dateLabel}>{formatDate(date)}</h3>
          <div className={styles.sessionList}>
            {sessions.map((session, index) => {
              const schedule = patrolSchedules.find(s => s.id === session.scheduleId);
              return (
                <div
                  key={session.id}
                  className={`card ${styles.sessionCard} animate-slide-up stagger-${index + 1}`}
                >
                  <div className="card-body">
                    <div className={styles.sessionHeader}>
                      <div className={styles.sessionInfo}>
                        <h4 className={styles.sessionTitle}>
                          Patroli #{session.patrolNumber}
                        </h4>
                        <p className={styles.sessionPeriod}>
                          {schedule?.startTime} - {schedule?.endTime}
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
                            <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          <span>Durasi: {getDuration(session.startedAt, session.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
