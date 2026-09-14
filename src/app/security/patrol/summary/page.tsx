'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { floors } from '@/lib/dummy-data';
import { syncOfflineData } from '@/lib/sync';
import { getOfflineCount } from '@/lib/db';
import styles from './summary.module.css';

export default function PatrolSummaryPage() {
  const [session, setSession] = useState<any>(null);
  const [startTime, setStartTime] = useState('-');
  const [endTime, setEndTime] = useState('-');
  const [durationStr, setDurationStr] = useState('-');
  const [patrolNumber, setPatrolNumber] = useState<number | string>(1);
  const [scheduleName, setScheduleName] = useState('Patroli Rutin');
  const [findingsCount, setFindingsCount] = useState(0);
  const [roomsCheckedCount, setRoomsCheckedCount] = useState(0);
  const [floorsCompletedCount, setFloorsCompletedCount] = useState(floors.length);
  const [sessionFindings, setSessionFindings] = useState<any[]>([]);

  // Sync state
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  const checkOffline = async () => {
    try {
      const counts = await getOfflineCount();
      const total = counts.checks + counts.findings + counts.qrScans;
      setOfflinePendingCount(total);
    } catch {}
  };

  useEffect(() => {
    checkOffline();

    async function loadSummary() {
      try {
        let currentUserId: string | null = null;
        const cachedUser = localStorage.getItem('cached-user');
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            currentUserId = u.id || null;
          } catch {}
        }

        let s = null;
        const cached = localStorage.getItem('cached-active-session');
        if (cached) try { s = JSON.parse(cached); } catch {}

        if (navigator.onLine) {
          const res = await fetch('/api/patrol/sessions?personal=true').catch(() => null);
          if (res && res.ok) {
            const sessions = await res.json();
            if (Array.isArray(sessions)) {
              const mySessions = currentUserId ? sessions.filter((item: any) => item.userId === currentUserId) : sessions;
              const found = mySessions.find((item: any) => item.status === 'completed') 
                || mySessions[mySessions.length - 1] 
                || sessions.find((item: any) => item.status === 'completed') 
                || sessions[sessions.length - 1];
              if (found) s = found;
            }
          }
        }

        const { getOfflineChecks, getOfflineFindings, getOfflineQrScans } = await import('@/lib/db');
        const [offChecks, offFindings, offQr] = await Promise.all([
          getOfflineChecks().catch(() => []),
          getOfflineFindings().catch(() => []),
          getOfflineQrScans().catch(() => []),
        ]);

        if (s) {
          setSession(s);
          setPatrolNumber(s.patrolNumber || 1);
          if (s.schedule?.name) setScheduleName(s.schedule.name);

          const start = s.startedAt ? new Date(s.startedAt) : new Date();
          const end = s.completedAt ? new Date(s.completedAt) : new Date();

          setStartTime(start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }));
          setEndTime(end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }));

          const diffMs = Math.max(0, end.getTime() - start.getTime());
          const diffMins = Math.floor(diffMs / 60000);
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          setDurationStr(hrs > 0 ? `${hrs}j ${mins}m` : `${mins} menit`);

          let totalChecked = 0;
          let totalFnd = 0;
          const extractedFindings: any[] = [];

          s.sessionFloors?.forEach((sf: any) => {
            if (sf.patrolChecks) {
              totalChecked += sf.patrolChecks.length;
              sf.patrolChecks.forEach((c: any) => {
                if (c.findings?.length) {
                  totalFnd += c.findings.length;
                  c.findings.forEach((f: any) => {
                    extractedFindings.push({
                      id: f.id,
                      description: f.description,
                      roomNameSnapshot: c.roomNameSnapshot,
                      floorNameSnapshot: c.floorNameSnapshot,
                    });
                  });
                }
              });
            } else if (sf.checkedRooms) {
              totalChecked += sf.checkedRooms;
            }
          });

          // Accurate checked count from server or offline
          const finalChecked = totalChecked > 0 ? totalChecked : offChecks.length;
          setRoomsCheckedCount(finalChecked);
          setFindingsCount(Math.max(totalFnd, offFindings.length));

          if (offFindings.length > 0) {
            offFindings.forEach(f => {
              extractedFindings.push({
                id: f.id,
                description: f.description,
                roomNameSnapshot: f.roomNameSnapshot,
                floorNameSnapshot: f.floorNameSnapshot,
              });
            });
          }
          setSessionFindings(extractedFindings);

          const compFloors = s.sessionFloors?.filter((sf: any) => sf.status === 'completed' || sf.qrValidated).length;
          setFloorsCompletedCount(compFloors !== undefined && compFloors > 0 ? compFloors : (offQr.length > 0 ? offQr.length : floors.length));
        } else {
          setEndTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }));
          setRoomsCheckedCount(offChecks.length);
          setFloorsCompletedCount(offQr.length > 0 ? offQr.length : 0);
        }
      } catch (err) {
        console.error('Summary load error:', err);
      }
    }
    loadSummary();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStatusText('Menghubungi server...');

    const result = await syncOfflineData((p) => {
      setSyncProgress(p.percent);
      setSyncStatusText(p.statusText);
    });

    setIsSyncing(false);
    if (result.success) {
      setSyncSuccessMsg('Semua data patroli berhasil terkirim ke server & penyimpanan lokal HP telah dibersihkan.');
      setOfflinePendingCount(0);
    } else {
      setSyncStatusText(result.error || 'Koneksi gagal. Pastikan terhubung ke Wi-Fi RS.');
    }
  };

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
        <p className={styles.successSub}>Patroli #{patrolNumber} • {scheduleName}</p>
      </div>

      {/* Sync Status Alert Box */}
      {offlinePendingCount > 0 && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📱</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                Ada {offlinePendingCount} Data Patroli Tersimpan di HP
              </h4>
              <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#b45309', lineHeight: 1.4 }}>
                Seluruh ruangan & scan QR aman tersimpan di HP. Saat sudah kembali ke pos atau terkoneksi Wi-Fi server, tekan tombol di bawah untuk sinkronisasi.
              </p>

              {isSyncing ? (
                <div>
                  <div style={{ height: '8px', background: '#fde68a', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${syncProgress}%`, background: '#d97706', transition: 'width 0.3s ease' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#92400e', fontWeight: 600 }}>{syncStatusText}</p>
                </div>
              ) : (
                <button
                  onClick={handleManualSync}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 700, width: '100%' }}
                >
                  🚀 Sinkronkan ke Server & Bersihkan HP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {syncSuccessMsg && (
        <div className="card" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#065f46', fontWeight: 700 }}>
            ✓ {syncSuccessMsg}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{roomsCheckedCount}</span>
          <span className={styles.statLabel}>Ruangan Diperiksa</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{floorsCompletedCount}</span>
          <span className={styles.statLabel}>Lantai Selesai</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{findingsCount}</span>
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
            <span className={styles.timeValue}>{durationStr}</span>
          </div>
        </div>
      </div>

      {/* Floor breakdown */}
      <div className={`card ${styles.breakdownCard}`}>
        <h3 className={styles.breakdownTitle}>Ringkasan Per Lantai</h3>
        {(session?.sessionFloors && session.sessionFloors.length > 0
          ? [...session.sessionFloors].sort((a: any, b: any) => {
              const getOrder = (sf: any) => {
                const code = String(sf.floorCodeSnapshot || sf.floor?.code || '').toUpperCase();
                if (code.includes('SB') || code.includes('SEMI')) return 0;
                const m = code.match(/\d+/);
                return m ? parseInt(m[0], 10) : 99;
              };
              return getOrder(a) - getOrder(b);
            })
          : floors.map(f => ({ floorNameSnapshot: f.name, floorCodeSnapshot: f.code, status: 'pending', qrValidated: false, patrolChecks: [] }))
        ).map((sf: any, idx: number) => {
          const checkedCount = sf.patrolChecks?.length || 0;
          const isCompleted = sf.status === 'completed' || sf.qrValidated;
          const isPartial = checkedCount > 0 && !isCompleted;
          return (
            <div key={sf.id || idx} className={styles.floorRow}>
              <div className={styles.floorInfo}>
                <span className={styles.floorName}>{sf.floorNameSnapshot || sf.floor?.name || `Lantai ${idx + 1}`}</span>
                <span className={styles.floorRooms}>{checkedCount} ruangan diperiksa</span>
              </div>
              <div className={styles.floorStatus}>
                {isCompleted ? (
                  <>
                    <span className="badge badge-success">Selesai</span>
                    {sf.qrValidated && (
                      <span className={styles.qrBadge}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        QR ✓
                      </span>
                    )}
                  </>
                ) : isPartial ? (
                  <span className="badge badge-warning">Sebagian</span>
                ) : (
                  <span className="badge badge-neutral">Belum</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Findings summary */}
      {sessionFindings.length > 0 && (
        <div className={`card ${styles.findingsCard}`}>
          <h3 className={styles.breakdownTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger-500)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Temuan ({sessionFindings.length})
          </h3>
          {sessionFindings.map((finding, idx) => (
            <div key={finding.id || idx} className={styles.findingItem}>
              <div className={styles.findingDot} />
              <div className={styles.findingContent}>
                <span className={styles.findingText}>{finding.description?.substring(0, 80)}...</span>
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
