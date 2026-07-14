'use client';

import { useState, useEffect } from 'react';
import styles from './executive.module.css';

interface PatrolPeriod {
  actual: number;
  target: number;
}

interface ExecutiveData {
  patrols: {
    today: PatrolPeriod;
    week: PatrolPeriod;
    month: PatrolPeriod;
  };
  compliance: {
    name: string;
    employeeId: string;
    total: number;
    completed: number;
    rate: number;
  }[];
  topRooms: {
    count: number;
    name: string;
    floor: string;
  }[];
  avgResolutionTimeHours: number;
  openFindings: number;
  trend: {
    date: string;
    count: number;
  }[];
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/executive');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load executive stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--color-neutral-200)', borderTop: '4px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat analitik eksekutif...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger-600)' }}>Gagal memuat data dashboard eksekutif.</p>
      </div>
    );
  }

  // Get active patrol stats for the selected period
  const activePatrols = data.patrols[period];
  const patrolCompletionRate = activePatrols.target > 0 
    ? Math.min(100, Math.round((activePatrols.actual / activePatrols.target) * 100)) 
    : 100;

  // Calculate overall compliance rate
  const avgComplianceRate = data.compliance.length > 0
    ? Math.round(data.compliance.reduce((sum, c) => sum + c.rate, 0) / data.compliance.length)
    : 100;

  // Max count for scaling the chart
  const maxTrendCount = Math.max(...data.trend.map(t => t.count), 1);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Eksekutif</h1>
          <p className={styles.pageSub}>Analisis kepatuhan, tren temuan, dan performa patroli RS Mata JEC ORBITA</p>
        </div>

        {/* Filter Dropdown */}
        <div className={styles.filterSection}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>PERIODE MONITORING:</span>
          <select 
            className={styles.filterSelect}
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
          </select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Patrol Completion */}
        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiBody}>
            <div className={`${styles.kpiIcon} ${styles.iconBlue}`}>🛡️</div>
            <div>
              <span className={styles.kpiNum}>
                {activePatrols.actual} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ {activePatrols.target} Sesi</span>
              </span>
              <span className={styles.kpiLabel}>Realisasi Patroli ({patrolCompletionRate}%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Compliance Rate */}
        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiBody}>
            <div className={`${styles.kpiIcon} ${styles.iconGreen}`}>📈</div>
            <div>
              <span className={styles.kpiNum}>{avgComplianceRate}%</span>
              <span className={styles.kpiLabel}>Kepatuhan On-Time Rata-rata</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Findings */}
        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiBody}>
            <div className={`${styles.kpiIcon} ${styles.iconYellow}`}>⚠️</div>
            <div>
              <span className={styles.kpiNum}>{data.openFindings}</span>
              <span className={styles.kpiLabel}>Temuan Aktif (Belum Selesai)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Resolution Time */}
        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiBody}>
            <div className={`${styles.kpiIcon} ${styles.iconRed}`}>⏱️</div>
            <div>
              <span className={styles.kpiNum}>{data.avgResolutionTimeHours} Jam</span>
              <span className={styles.kpiLabel}>Rata-rata Waktu Resolusi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left Column: CSS Bar Chart & Trend */}
        <div className={`card ${styles.sectionCard}`}>
          <h3 className={styles.sectionTitle}>
            📉 Tren Temuan 30 Hari Terakhir
          </h3>
          <div className={styles.chartContainer}>
            <div className={styles.barChart}>
              {data.trend.map((t, idx) => {
                const heightPercent = Math.max(5, Math.round((t.count / maxTrendCount) * 100));
                // Only show labels for every 5th item to keep mobile layout clean
                const showLabel = idx % 5 === 0 || idx === data.trend.length - 1;
                return (
                  <div key={t.date} className={styles.barCol}>
                    <span className={styles.barValue}>{t.count > 0 ? t.count : ''}</span>
                    <div className={styles.barTrack}>
                      <div 
                        className={styles.bar} 
                        style={{ 
                          height: `${heightPercent}%`, 
                          background: t.count > 3 ? 'var(--color-danger-500)' : 'var(--color-primary-500)' 
                        }} 
                        title={`${t.date}: ${t.count} temuan`}
                      />
                    </div>
                    {showLabel ? <span className={styles.barLabel}>{t.date}</span> : <span className={styles.barLabel}>.</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Top Issue-prone Rooms */}
        <div className={`card ${styles.sectionCard}`}>
          <h3 className={styles.sectionTitle}>
            🔥 Top 5 Ruangan Bermasalah
          </h3>
          <div className={styles.tableContainer}>
            {data.topRooms.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Tidak ada temuan terdeteksi di ruangan mana pun.
              </p>
            ) : (
              <table className={styles.dashboardTable}>
                <thead>
                  <tr>
                    <th>Ruangan</th>
                    <th>Lantai</th>
                    <th style={{ textAlign: 'center' }}>Total Temuan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topRooms.map((room, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{room.name}</td>
                      <td>{room.floor}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-danger-600)' }}>
                        {room.count}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Ranking Table */}
      <div className={`card ${styles.sectionCard}`} style={{ marginTop: '20px' }}>
        <h3 className={styles.sectionTitle}>
          🏆 Kepatuhan & Performa Petugas Security
        </h3>
        <div className={styles.tableContainer}>
          <table className={styles.dashboardTable}>
            <thead>
              <tr>
                <th>Peringkat</th>
                <th>Nama Petugas</th>
                <th>ID Karyawan</th>
                <th style={{ textAlign: 'center' }}>Total Patroli</th>
                <th style={{ textAlign: 'center' }}>Patroli Selesai</th>
                <th style={{ textAlign: 'center' }}>Tingkat Kepatuhan</th>
              </tr>
            </thead>
            <tbody>
              {data.compliance.map((officer, idx) => (
                <tr key={officer.employeeId}>
                  <td style={{ fontWeight: 'bold', color: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ fontWeight: '600' }}>{officer.name}</td>
                  <td>{officer.employeeId}</td>
                  <td style={{ textAlign: 'center' }}>{officer.total}</td>
                  <td style={{ textAlign: 'center' }}>{officer.completed}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span 
                      style={{ 
                        background: officer.rate >= 90 ? 'var(--color-success-50)' : officer.rate >= 75 ? 'var(--color-warning-50)' : 'var(--color-danger-50)',
                        color: officer.rate >= 90 ? 'var(--color-success-700)' : officer.rate >= 75 ? 'var(--color-warning-700)' : 'var(--color-danger-700)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      {officer.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
