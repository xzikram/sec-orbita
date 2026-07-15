'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { floors, getRoomsByFloor } from '@/lib/dummy-data';
import styles from './history-detail.module.css';

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/patrol/sessions?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setSession(data[0]);
          }
        }
      } catch (err) {
        console.error('History detail load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [id]);

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat detail riwayat...</p></div>;
  }

  if (!session) {
    return <div className="page-container" style={{ textAlign: 'center', padding: 48 }}>Riwayat tidak ditemukan</div>;
  }

  const totalRooms = floors.reduce((s, f) => s + getRoomsByFloor(f.id).length, 0);
  const startTime = session.startedAt ? new Date(session.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const endTime = session.completedAt ? new Date(session.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  // Count total checks and findings dynamically
  let totalChecked = 0;
  let totalFindings = 0;
  let qrValidCount = 0;
  let acOnCount = 0;
  let acOffCount = 0;
  let lightOnCount = 0;
  let normalCount = 0;

  session.sessionFloors?.forEach((sf: any) => {
    totalChecked += sf.patrolChecks?.length || 0;
    if (sf.qrValidated) qrValidCount++;
    sf.patrolChecks?.forEach((c: any) => {
      totalFindings += c.findings?.length || 0;
      if (c.acStatus === 'on') acOnCount++;
      if (c.acStatus === 'off') acOffCount++;
      if (c.lightStatus === 'on') lightOnCount++;
      if (c.condition === 'normal') normalCount++;
    });
  });

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.topTitle}>Detail Riwayat</span>
        <span className={`badge ${session.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
          {session.status === 'completed' ? 'Selesai' : 'Berjalan'}
        </span>
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
        <div className={styles.stat}><span className={styles.statNum}>{session.sessionFloors?.length || floors.length}</span><span className={styles.statLabel}>Lantai</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{qrValidCount}</span><span className={styles.statLabel}>QR Valid</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{totalFindings}</span><span className={styles.statLabel}>Temuan</span></div>
      </div>

      {/* Floor breakdown */}
      <div className={`card ${styles.breakdownCard}`}>
        <h3 className={styles.sectionTitle}>Detail Per Lantai</h3>
        {floors.map(floor => {
          const roomCount = getRoomsByFloor(floor.id).length;
          const sf = session.sessionFloors?.find((s: any) => s.floorCodeSnapshot === floor.code);
          const checkedCount = sf?.patrolChecks?.length || 0;
          const percent = roomCount > 0 ? Math.round((checkedCount / roomCount) * 100) : 0;
          const isCompleted = sf?.status === 'completed' || percent === 100;
          const isQrScanned = sf?.qrValidated;

          return (
            <div key={floor.id} className={styles.floorRow}>
              <div className={styles.floorLeft}>
                <span className={styles.floorName}>{floor.name}</span>
                <span className={styles.floorMeta}>{checkedCount} dari {roomCount} ruangan • {percent}%</span>
              </div>
              <div className={styles.floorRight}>
                {isCompleted ? (
                  <span className="badge badge-success">✓</span>
                ) : (
                  <span className="badge badge-neutral">-</span>
                )}
                {isQrScanned ? (
                  <span className={styles.qrChip}>QR ✓</span>
                ) : (
                  <span className={styles.qrChip} style={{ opacity: 0.5, textDecoration: 'line-through' }}>QR</span>
                )}
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
            <div><span className={styles.checkLabel}>AC ON</span><span className={styles.checkNum}>{acOnCount}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>🌡️</span>
            <div><span className={styles.checkLabel}>AC OFF</span><span className={styles.checkNum}>{acOffCount}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>💡</span>
            <div><span className={styles.checkLabel}>Lampu ON</span><span className={styles.checkNum}>{lightOnCount}</span></div>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkIcon}>✅</span>
            <div><span className={styles.checkLabel}>Normal</span><span className={styles.checkNum}>{normalCount}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
