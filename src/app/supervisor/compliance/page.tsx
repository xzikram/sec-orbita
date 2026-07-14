'use client';

import { useState, useEffect } from 'react';
import styles from './compliance.module.css';

interface ComplianceData {
  patrols: {
    actual: number;
    target: number;
    rate: number;
  };
  findings: {
    total: number;
    resolved: number;
    resolvedWithinSla: number;
    slaRate: number;
    avgResponseMinutes: number;
    avgResolutionHours: number;
  };
  floors: {
    total: number;
    completed: number;
    rate: number;
  };
  accreditationStatus: 'PARIPURNA' | 'UTAMA' | 'MADYA';
}

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonthName, setCurrentMonthName] = useState('');

  useEffect(() => {
    async function loadCompliance() {
      try {
        const res = await fetch('/api/compliance');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load compliance:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCompliance();
    setCurrentMonthName(new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--color-neutral-200)', borderTop: '4px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat data kepatuhan KARS...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger-600)' }}>Gagal memuat data kepatuhan KARS.</p>
      </div>
    );
  }

  // Visual SVG Circle configurations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  const renderProgressRing = (percentage: number, strokeColor: string) => {
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="var(--color-neutral-100)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Kepatuhan Akreditasi KARS</h1>
          <p className={styles.pageSub}>Laporan pemenuhan standar mutu dan keselamatan pasien Rumah Sakit (Bulan: {currentMonthName})</p>
        </div>
        <button 
          onClick={handlePrint} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          🖨️ Cetak Laporan Akreditasi
        </button>
      </div>

      {/* Accreditation Status Card */}
      <div className={styles.statusBanner}>
        <div className={styles.statusInfo}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Estimasi Predikat Akreditasi KARS Mutu Keamanan:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span className={`${styles.statusBadge} ${
              data.accreditationStatus === 'PARIPURNA' ? styles.badgeParipurna :
              data.accreditationStatus === 'UTAMA' ? styles.badgeUtama :
              styles.badgeMadya
            }`}>
              🌟 {data.accreditationStatus}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {data.accreditationStatus === 'PARIPURNA' 
                ? 'Mutu patroli prima, waktu respons temuan sangat cepat.' 
                : 'Penuhi target kepatuhan patroli >95% untuk predikat Paripurna.'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Visual Gauges */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Patrol Sesi Rate */}
        <div className={`card ${styles.kpiCard}`}>
          <span className={styles.ringLabel}>Kepatuhan Sesi Patroli</span>
          <div className={styles.visualRing}>
            {renderProgressRing(data.patrols.rate, 'var(--color-primary-500)')}
            <span className={styles.ringValue}>{data.patrols.rate}%</span>
          </div>
          <span className={styles.ringSub}>{data.patrols.actual} dari {data.patrols.target} target patroli terlaksana</span>
        </div>

        {/* KPI 2: SLA Temuan */}
        <div className={`card ${styles.kpiCard}`}>
          <span className={styles.ringLabel}>Resolusi Temuan (&lt;24 Jam)</span>
          <div className={styles.visualRing}>
            {renderProgressRing(data.findings.slaRate, 'var(--color-success-600)')}
            <span className={styles.ringValue}>{data.findings.slaRate}%</span>
          </div>
          <span className={styles.ringSub}>{data.findings.resolvedWithinSla} dari {data.findings.resolved} temuan selesai dalam SLA</span>
        </div>

        {/* KPI 3: Floor Completion */}
        <div className={`card ${styles.kpiCard}`}>
          <span className={styles.ringLabel}>Kelengkapan Pemeriksaan Lantai</span>
          <div className={styles.visualRing}>
            {renderProgressRing(data.floors.rate, 'var(--color-warning-600)')}
            <span className={styles.ringValue}>{data.floors.rate}%</span>
          </div>
          <span className={styles.ringSub}>{data.floors.completed} dari {data.floors.total} lantai tuntas diperiksa</span>
        </div>
      </div>

      {/* Compliance Detailed Table Card */}
      <div className={`card ${styles.detailsCard}`}>
        <h3 className={styles.detailsTitle}>
          📋 Detail Penilaian Mutu Keselamatan Pasien (Standard MFK 4)
        </h3>
        <div className={styles.tableContainer}>
          <table className={styles.complianceTable}>
            <thead>
              <tr>
                <th>Parameter Mutu KARS</th>
                <th>Target Mutu</th>
                <th>Realisasi Aktual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: '600' }}>Frekuensi Kunjungan Patroli Area Berisiko</td>
                <td>100% Terlaksana</td>
                <td>{data.patrols.rate}% ({data.patrols.actual} Sesi)</td>
                <td>
                  <span style={{ 
                    color: data.patrols.rate >= 95 ? 'var(--color-success-700)' : 'var(--color-warning-700)',
                    fontWeight: 'bold' 
                  }}>
                    {data.patrols.rate >= 95 ? 'MEMENUHI' : 'PERLU PENINGKATAN'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Waktu Respons Respon Awal Temuan Bahaya</td>
                <td>&le; 15 Menit</td>
                <td>{data.findings.avgResponseMinutes} Menit</td>
                <td>
                  <span style={{ 
                    color: data.findings.avgResponseMinutes <= 15 ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                    fontWeight: 'bold' 
                  }}>
                    {data.findings.avgResponseMinutes <= 15 ? 'MEMENUHI' : 'MELEWATI SLA'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Penyelesaian Masalah Mutu Fasilitas (SLA 24 Jam)</td>
                <td>&ge; 90% Tuntas</td>
                <td>{data.findings.slaRate}% ({data.findings.avgResolutionHours} Jam Rata-rata)</td>
                <td>
                  <span style={{ 
                    color: data.findings.slaRate >= 90 ? 'var(--color-success-700)' : 'var(--color-warning-700)',
                    fontWeight: 'bold' 
                  }}>
                    {data.findings.slaRate >= 90 ? 'MEMENUHI' : 'PERLU PENINGKATAN'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Kelengkapan Verifikasi Tiket Patroli (QR Validasi)</td>
                <td>100% Lantai Terpindai</td>
                <td>{data.floors.rate}% ({data.floors.completed} Sesi Lantai)</td>
                <td>
                  <span style={{ 
                    color: data.floors.rate >= 95 ? 'var(--color-success-700)' : 'var(--color-warning-700)',
                    fontWeight: 'bold' 
                  }}>
                    {data.floors.rate >= 95 ? 'MEMENUHI' : 'PERLU PENINGKATAN'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
