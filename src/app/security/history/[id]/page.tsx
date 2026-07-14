'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { patrolHistory, floors, getRoomsByFloor } from '@/lib/dummy-data';
import styles from './history-detail.module.css';

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const session = patrolHistory.find(h => h.id === id);

  if (!session) {
    return <div className="page-container" style={{ textAlign: 'center', padding: 48 }}>Riwayat tidak ditemukan</div>;
  }

  const totalRooms = floors.reduce((s, f) => s + getRoomsByFloor(f.id).length, 0);
  const startTime = session.startedAt ? new Date(session.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const endTime = session.completedAt ? new Date(session.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.topTitle}>Detail Riwayat</span>
        <span className="badge badge-success">Selesai</span>
      </div>

      {/* Session info */}
      <div className={`card ${styles.infoCard}`}>
        <h2 className={styles.patrolNum}>Patroli #{session.patrolNumber}</h2>
        <p className={styles.dateLine}>
          {new Date(session.patrolDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className={styles.timeRow}>
          <div className={styles.timeItem}><span className={styles.timeLabel}>Mulai</span><span className={styles.timeValue}>{startTime}</span></div>
          <div className={styles.timeSep}>→</div>
          <div className={styles.timeItem}><span className={styles.timeLabel}>Selesai</span><span className={styles.timeValue}>{endTime}</span></div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}><span className={styles.statNum}>{totalRooms}</span><span className={styles.statLabel}>Ruangan</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{floors.length}</span><span className={styles.statLabel}>Lantai</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{floors.length}</span><span className={styles.statLabel}>QR Valid</span></div>
        <div className={styles.stat}><span className={styles.statNum}>0</span><span className={styles.statLabel}>Temuan</span></div>
      </div>

      {/* Floor breakdown */}
      <div className={`card ${styles.breakdownCard}`}>
        <h3 className={styles.sectionTitle}>Detail Per Lantai</h3>
        {floors.map(floor => {
          const roomCount = getRoomsByFloor(floor.id).length;
          return (
            <div key={floor.id} className={styles.floorRow}>
              <div className={styles.floorLeft}>
                <span className={styles.floorName}>{floor.name}</span>
                <span className={styles.floorMeta}>{roomCount} ruangan • 100%</span>
              </div>
              <div className={styles.floorRight}>
                <span className="badge badge-success">✓</span>
                <span className={styles.qrChip}>QR ✓</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist summary */}
      <div className={`card ${styles.checkCard}`}>
        <h3 className={styles.sectionTitle}>Ringkasan Checklist</h3>
        <div className={styles.checkGrid}>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>❄️</span>
            <div><span className={styles.checkLabel}>AC ON</span><span className={styles.checkNum}>{Math.round(totalRooms * 0.7)}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>🌡️</span>
            <div><span className={styles.checkLabel}>AC OFF</span><span className={styles.checkNum}>{Math.round(totalRooms * 0.1)}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>💡</span>
            <div><span className={styles.checkLabel}>Lampu ON</span><span className={styles.checkNum}>{totalRooms}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>✅</span>
            <div><span className={styles.checkLabel}>Normal</span><span className={styles.checkNum}>{totalRooms}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
