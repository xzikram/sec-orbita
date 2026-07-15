'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './reports.module.css';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const type = period === 'today' ? 'daily' : period === 'week' ? 'weekly' : 'monthly';
        const res = await fetch(`/api/reports/generate?type=${type}&date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [period]);

  const summary = reportData?.summary || {
    totalSessions: 0,
    completedSessions: 0,
    completionRate: 100,
    totalFindings: 0,
    resolvedFindings: 0,
    openFindings: 0
  };

  const sessions = reportData?.sessions || [];
  const findings = reportData?.findings || [];

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
  const catSummary = findings.reduce((acc: any, f: any) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const catLabels: Record<string, string> = { keamanan: '🔒 Keamanan', fasilitas: '🔧 Fasilitas', listrik: '⚡ Listrik', ac: '❄️ AC', kebersihan: '🧹 Kebersihan', akses_pintu: '🚪 Akses Pintu', orang_mencurigakan: '👤 Orang Mencurigakan', lainnya: '📋 Lainnya' };

  // Officer performance summary
  const officerPerformanceMap: Record<string, { id: string; name: string; patrols: number; findings: number }> = {};
  
  sessions.forEach((s: any) => {
    const name = s.officer;
    if (!officerPerformanceMap[name]) {
      officerPerformanceMap[name] = { id: `SEC-${name.substring(0, 3).toUpperCase()}`, name, patrols: 0, findings: 0 };
    }
    officerPerformanceMap[name].patrols++;
  });

  findings.forEach((f: any) => {
    const name = f.officer;
    if (!officerPerformanceMap[name]) {
      officerPerformanceMap[name] = { id: `SEC-${name.substring(0, 3).toUpperCase()}`, name, patrols: 0, findings: 0 };
    }
    officerPerformanceMap[name].findings++;
  });

  const officers = Object.values(officerPerformanceMap);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Laporan</h1>
          <p className={styles.pageSub}>Ringkasan dan analisis kegiatan patroli</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/supervisor/reports/export" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            📄 Export PDF
          </Link>
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
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-sm text-muted">Memuat data laporan...</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className={styles.summaryGrid}>
            <div className={`card ${styles.summaryCard}`}>
              <div className={styles.summaryBody}>
                <span className={`${styles.summaryIcon} ${styles.sIconPrimary}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                <div>
                  <span className={styles.summaryNum}>{summary.totalSessions}</span>
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
                  <span className={styles.summaryNum}>{summary.completionRate}%</span>
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
                  <span className={styles.summaryNum}>{summary.totalSessions - summary.completedSessions}</span>
                  <span className={styles.summaryLabel}>Keterlambatan / Belum</span>
                </div>
              </div>
            </div>
            <div className={`card ${styles.summaryCard}`}>
              <div className={styles.summaryBody}>
                <span className={`${styles.summaryIcon} ${styles.sIconDanger}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                </span>
                <div>
                  <span className={styles.summaryNum}>{summary.totalFindings}</span>
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
              {findings.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '13px' }}>Tidak ada temuan pada periode ini</p>
              ) : (
                <div className={styles.catList}>
                  {Object.entries(catSummary).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                    <div key={cat} className={styles.catRow}>
                      <span className={styles.catLabel}>{catLabels[cat] || cat}</span>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${(count / findings.length) * 100}%` }} />
                      </div>
                      <span className={styles.catCount}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Officer performance */}
            <div className={`card ${styles.perfCard}`}>
              <h3 className={styles.chartTitle}>Performa Petugas</h3>
              {officers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '13px' }}>Belum ada data aktivitas petugas</p>
              ) : (
                <div className={styles.perfTable}>
                  <div className={styles.perfHeader}>
                    <span>Petugas</span>
                    <span>Patroli</span>
                    <span>On-Time</span>
                    <span>Temuan</span>
                  </div>
                  {officers.map(o => (
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
                      <span className={styles.perfNum}>{o.findings}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session log */}
            <div className={`card ${styles.logCard}`}>
              <h3 className={styles.chartTitle}>Log Sesi</h3>
              {sessions.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '13px' }}>Tidak ada sesi patroli pada periode ini</p>
              ) : (
                <div className={styles.logTable}>
                  {sessions.map((sess: any) => (
                    <div key={sess.id} className={styles.logRow} style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.logNum}>#{sess.patrolNumber}</span>
                      <span className={styles.logTime}>{sess.startTime}-{sess.endTime}</span>
                      <span className={styles.logOfficer}>{sess.officer}</span>
                      <span className={styles.logStart}>
                        {sess.startTime || '—'}
                      </span>
                      <span className={styles.logEnd}>
                        {sess.endTime || '—'}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
