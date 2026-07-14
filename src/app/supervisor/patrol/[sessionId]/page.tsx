'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { todaySessions, session6Floors, lantai1Checks, sbChecks } from '@/lib/supervisor-data';
import { patrolSchedules } from '@/lib/dummy-data';
import styles from './session-detail.module.css';

export default function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const session = todaySessions.find(s => s.id === sessionId);
  const sched = session ? patrolSchedules.find(s => s.id === session.scheduleId) : null;
  const floorData = session?.id === 'ts-6' ? session6Floors : [];
  const totalChecked = floorData.reduce((s, f) => s + f.checkedRooms, 0);
  const totalRooms = floorData.reduce((s, f) => s + f.totalRooms, 0);
  const pct = totalRooms > 0 ? Math.round((totalChecked / totalRooms) * 100) : 0;

  if (!session) {
    return <div style={{ padding: 32 }}>Sesi tidak ditemukan</div>;
  }

  return (
    <div>
      <div className={styles.header}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className={styles.title}>Patroli #{session.patrolNumber}</h1>
        <span className={`badge ${session.status === 'completed' ? 'badge-success' : session.status === 'in_progress' ? 'badge-info' : 'badge-neutral'} badge-lg`}>
          {session.status === 'completed' ? 'Selesai' : session.status === 'in_progress' ? 'Berjalan' : 'Terjadwal'}
        </span>
      </div>

      {/* Info card */}
      <div className={`card ${styles.infoCard}`}>
        <div className={styles.infoGrid}>
          <div><span className={styles.infoLabel}>Petugas</span><span className={styles.infoValue}>{session.userName}</span></div>
          <div><span className={styles.infoLabel}>Periode</span><span className={styles.infoValue}>{sched?.startTime} - {sched?.endTime}</span></div>
          <div><span className={styles.infoLabel}>Mulai</span><span className={styles.infoValue}>{session.startedAt ? new Date(session.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
          <div><span className={styles.infoLabel}>Selesai</span><span className={styles.infoValue}>{session.completedAt ? new Date(session.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
        </div>
        {session.status === 'in_progress' && (
          <>
            <div className="progress-bar progress-bar-lg" style={{ margin: '16px 0 8px' }}>
              <div className="progress-bar-fill progress-fill-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.pctText}>{totalChecked}/{totalRooms} ruangan ({pct}%)</div>
          </>
        )}
      </div>

      {/* Floor cards */}
      <h2 className={styles.sectionTitle}>Lantai</h2>
      <div className={styles.floorList}>
        {floorData.map(sf => {
          const floorPct = sf.totalRooms > 0 ? Math.round((sf.checkedRooms / sf.totalRooms) * 100) : 0;
          return (
            <Link key={sf.id} href={`/supervisor/patrol/${sessionId}/floor/${sf.floorId}`} className={`card card-interactive ${styles.floorCard}`}>
              <div className={styles.floorHead}>
                <h3 className={styles.floorName}>{sf.floorName}</h3>
                <span className={`badge ${floorPct === 100 ? 'badge-success' : floorPct > 0 ? 'badge-info' : 'badge-neutral'}`}>
                  {floorPct === 100 ? 'Selesai' : floorPct > 0 ? `${floorPct}%` : 'Belum'}
                </span>
              </div>
              <div className="progress-bar" style={{ margin: '8px 0' }}>
                <div className={`progress-bar-fill ${floorPct === 100 ? 'progress-fill-success' : 'progress-fill-primary'}`} style={{ width: `${floorPct}%` }} />
              </div>
              <div className={styles.floorMeta}>
                <span>{sf.checkedRooms}/{sf.totalRooms} ruangan</span>
                {sf.qrValidated && <span className={styles.qrTag}>QR ✓</span>}
              </div>
            </Link>
          );
        })}
        {floorData.length === 0 && <p style={{ color: 'var(--text-muted)', padding: 16 }}>Data lantai belum tersedia untuk sesi ini</p>}
      </div>
    </div>
  );
}
