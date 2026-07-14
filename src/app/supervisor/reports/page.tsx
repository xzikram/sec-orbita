'use client';

import { useState, useEffect } from 'react';
import { todaySessions, todayStats, allFindings, session6Floors } from '@/lib/supervisor-data';
import { patrolSchedules, floors } from '@/lib/dummy-data';
import styles from './reports.module.css';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/patrol/sessions?date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (err) {
        console.error('Error fetching today sessions:', err);
      }
    }
    fetchSessions();
  }, []);

  const displaySessions = sessions.length > 0
    ? sessions.map((s: any) => ({
        id: s.id,
        patrolNumber: s.patrolNumber,
        userName: s.user?.name || 'Petugas',
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        status: s.status,
        scheduleId: s.scheduleId,
      }))
    : todaySessions;

  const completedOnTime = displaySessions.filter(s => s.status === 'completed').length;
  const lateCount = displaySessions.filter(s => s.status === 'late').length;
  const complianceRate = displaySessions.filter(s => ['completed', 'in_progress'].includes(s.status)).length;

  // Simulated weekly data for chart
  const weeklyData = [
    { day: 'Sen', patrols: 8, findings: 1, compliance: 100 },
    { day: 'Sel', patrols: 8, findings: 0, compliance: 100 },
    { day: 'Rab', patrols: 8, findings: 2, compliance: 100 },
    { day: 'Kam', patrols: 7, findings: 1, compliance: 87 },
    { day: 'Jum', patrols: 8, findings: 0, compliance: 100 },
    { day: 'Sab', patrols: 8, findings: 3, compliance: 100 },
    { day: 'Min', patrols: 6, findings: 2, compliance: 75 },
  ];

  // Finding categories summary
  const catSummary = allFindings.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const catLabels: Record<string, string> = { keamanan: '🔒 Keamanan', fasilitas: '🔧 Fasilitas', listrik: '⚡ Listrik', ac: '❄️ AC', kebersihan: '🧹 Kebersihan', akses_pintu: '🚪 Akses Pintu', orang_mencurigakan: '👤 Orang Mencurigakan', lainnya: '📋 Lainnya' };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Laporan</h1>
          <p className={styles.pageSub}>Ringkasan dan analisis kegiatan patroli</p>
        </div>
        <div className={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        <div className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryBody}>
            <span className={`${styles.summaryIcon} ${styles.sIconPrimary}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div>
              <span className={styles.summaryNum}>{todayStats.totalSessions}</span>
              <span className={styles.summaryLabel}>Total Sesi Patroli</span>
            </div>
          </div>
        </div>
        <div className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryBody}>
            <span className={`${styles.summaryIcon} ${styles.sIconSuccess}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <div>
              <span className={styles.summaryNum}>100%</span>
              <span className={styles.summaryLabel}>Tingkat Kepatuhan</span>
            </div>
          </div>
        </div>
        <div className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryBody}>
            <span className={`${styles.summaryIcon} ${styles.sIconWarning}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <div>
              <span className={styles.summaryNum}>{lateCount}</span>
              <span className={styles.summaryLabel}>Keterlambatan</span>
            </div>
          </div>
        </div>
        <div className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryBody}>
            <span className={`${styles.summaryIcon} ${styles.sIconDanger}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            </span>
            <div>
              <span className={styles.summaryNum}>{todayStats.totalFindings}</span>
              <span className={styles.summaryLabel}>Total Temuan</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.reportGrid}>
        {/* Weekly chart */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Tren Patroli Mingguan</h3>
          <div className={styles.barChart}>
            {weeklyData.map(d => (
              <div key={d.day} className={styles.barCol}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(d.patrols / 8) * 100}%` }}
                    title={`${d.patrols} patroli`}
                  />
                </div>
                <span className={styles.barLabel}>{d.day}</span>
                <span className={styles.barValue}>{d.patrols}</span>
              </div>
            ))}
          </div>
          <div className={styles.chartLegend}>
            <span><span className={styles.legendDot} style={{ background: 'var(--color-primary-500)' }} /> Jumlah Patroli (target: 8/hari)</span>
          </div>
        </div>

        {/* Finding category breakdown */}
        <div className={`card ${styles.catCard}`}>
          <h3 className={styles.chartTitle}>Temuan per Kategori</h3>
          <div className={styles.catList}>
            {Object.entries(catSummary).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className={styles.catRow}>
                <span className={styles.catLabel}>{catLabels[cat] || cat}</span>
                <div className={styles.catBar}>
                  <div className={styles.catBarFill} style={{ width: `${(count / allFindings.length) * 100}%` }} />
                </div>
                <span className={styles.catCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Officer performance */}
        <div className={`card ${styles.perfCard}`}>
          <h3 className={styles.chartTitle}>Performa Petugas</h3>
          <div className={styles.perfTable}>
            <div className={styles.perfHeader}>
              <span>Petugas</span>
              <span>Patroli</span>
              <span>On-Time</span>
              <span>Temuan</span>
            </div>
            {todayStats.officers.map(o => (
              <div key={o.id} className={styles.perfRow}>
                <span className={styles.perfName}>
                  <div className={styles.perfAvatar}>{o.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div>
                    <span className={styles.perfNameText}>{o.name}</span>
                    <span className={styles.perfId}>{o.id}</span>
                  </div>
                </span>
                <span className={styles.perfNum}>{o.patrols}</span>
                <span className={`${styles.perfNum} text-success`}>{o.patrols > 0 ? '100%' : '-'}</span>
                <span className={styles.perfNum}>{o.name === 'Ahmad Fadillah' ? 2 : 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session log */}
        <div className={`card ${styles.logCard}`}>
          <h3 className={styles.chartTitle}>Log Sesi Hari Ini</h3>
          <div className={styles.logTable}>
            {displaySessions.map(sess => {
              const sched = patrolSchedules.find(s => s.id === sess.scheduleId);
              return (
                <div key={sess.id} className={styles.logRow} style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.logNum}>#{sess.patrolNumber}</span>
                  <span className={styles.logTime}>{sched?.startTime}-{sched?.endTime}</span>
                  <span className={styles.logOfficer}>{sess.userName}</span>
                  <span className={styles.logStart}>
                    {sess.startedAt ? new Date(sess.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span className={styles.logEnd}>
                    {sess.completedAt ? new Date(sess.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span className={`badge ${sess.status === 'completed' ? 'badge-success' : sess.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`} style={{ marginRight: '1rem' }}>
                    {sess.status === 'completed' ? 'Selesai' : sess.status === 'in_progress' ? 'Aktif' : 'Terjadwal'}
                  </span>
                  <button
                    className="btn btn-outline btn-xs"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid var(--color-neutral-300)',
                      borderRadius: '4px',
                      background: 'white',
                    }}
                    onClick={() => window.open(`/supervisor/reports/print?sessionId=${sess.id}`, '_blank')}
                    title="Cetak Buku Patroli"
                  >
                    🖨️ Cetak
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
