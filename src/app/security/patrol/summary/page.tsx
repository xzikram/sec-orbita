'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { floors, getRoomsByFloor, activeFindings } from '@/lib/dummy-data';
import styles from './summary.module.css';

export default function PatrolSummaryPage() {
  const totalRooms = floors.reduce((s, f) => s + getRoomsByFloor(f.id).length, 0);
  const startTime = '15:12';
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    setEndTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      {/* Success animation */}
      <div className={styles.successArea}>
        <div className={styles.successCircle}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className={styles.successTitle}>Patroli Selesai!</h1>
        <p className={styles.successSub}>Patroli #6 • Periode 15:00 - 18:00</p>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{totalRooms}</span>
          <span className={styles.statLabel}>Ruangan Diperiksa</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{floors.length}</span>
          <span className={styles.statLabel}>Lantai Selesai</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{activeFindings.length}</span>
          <span className={styles.statLabel}>Temuan</span>
        </div>
      </div>

      {/* Time info */}
      <div className={`card ${styles.timeCard}`}>
        <div className={styles.timeRow}>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Mulai</span>
            <span className={styles.timeValue}>{startTime}</span>
          </div>
          <div className={styles.timeDivider}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Selesai</span>
            <span className={styles.timeValue}>{endTime}</span>
          </div>
          <div className={styles.timeDivider}>≈</div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Durasi</span>
            <span className={styles.timeValue}>2j 15m</span>
          </div>
        </div>
      </div>

      {/* Floor breakdown */}
      <div className={`card ${styles.breakdownCard}`}>
        <h3 className={styles.breakdownTitle}>Ringkasan Per Lantai</h3>
        {floors.map(floor => {
          const roomCount = getRoomsByFloor(floor.id).length;
          return (
            <div key={floor.id} className={styles.floorRow}>
              <div className={styles.floorInfo}>
                <span className={styles.floorName}>{floor.name}</span>
                <span className={styles.floorRooms}>{roomCount} ruangan</span>
              </div>
              <div className={styles.floorStatus}>
                <span className="badge badge-success">Selesai</span>
                <span className={styles.qrBadge}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  QR ✓
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Findings summary */}
      {activeFindings.length > 0 && (
        <div className={`card ${styles.findingsCard}`}>
          <h3 className={styles.breakdownTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger-500)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Temuan ({activeFindings.length})
          </h3>
          {activeFindings.map(finding => (
            <div key={finding.id} className={styles.findingItem}>
              <div className={styles.findingDot} />
              <div className={styles.findingContent}>
                <span className={styles.findingText}>{finding.description.substring(0, 80)}...</span>
                <span className={styles.findingLoc}>{finding.roomNameSnapshot} • {finding.floorNameSnapshot}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <Link href="/security/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
