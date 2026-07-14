'use client';

import { useState, useEffect } from 'react';
import styles from './export.module.css';

interface ReportSummary {
  periodType: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  totalFindings: number;
  resolvedFindings: number;
  openFindings: number;
}

interface ReportSession {
  id: string;
  patrolNumber: number;
  date: string;
  scheduleName: string;
  startTime: string;
  endTime: string;
  officer: string;
  status: string;
  checkedRoomsCount: number;
}

interface ReportFinding {
  id: string;
  number: string;
  room: string;
  floor: string;
  category: string;
  description: string;
  status: string;
  officer: string;
  date: string;
}

interface ReportData {
  summary: ReportSummary;
  sessions: ReportSession[];
  findings: ReportFinding[];
}

export default function ExportReportPage() {
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Set default date today
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!date) return;

    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/generate?type=${type}&date=${date}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [type, date]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* Control Panel */}
      <div className={styles.controls}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Tipe Periode</label>
          <select 
            className={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="daily">Harian (Harian)</option>
            <option value="weekly">Mingguan (7 Hari)</option>
            <option value="monthly">Bulanan (Satu Bulan)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tanggal Target</label>
          <input 
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button 
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
          disabled={loading || !data}
        >
          🖨️ Download PDF / Cetak
        </button>
      </div>

      {/* Printable Sheet */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--color-neutral-200)', borderTop: '3px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Mengompilasi laporan...</p>
          </div>
        </div>
      ) : data ? (
        <div className={styles.sheet}>
          {/* Hospital Header */}
          <div className={styles.header}>
            <h1 className={styles.hospitalTitle}>RS MATA JEC ORBITA</h1>
            <h2 className={styles.reportTitle}>LAPORAN PATROLI SECURITY DIGITAL</h2>
            <p className={styles.reportMeta}>
              Periode Laporan: {data.summary.startDate} {type !== 'daily' && `s/d ${data.summary.endDate}`}
            </p>
          </div>

          {/* Summary Box Metrics */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryBox}>
              <span className={styles.summaryNum}>{data.summary.totalSessions}</span>
              <span className={styles.summaryLabel}>Total Patroli</span>
            </div>
            <div className={styles.summaryBox}>
              <span className={styles.summaryNum}>{data.summary.completionRate}%</span>
              <span className={styles.summaryLabel}>Kepatuhan Sesi</span>
            </div>
            <div className={styles.summaryBox}>
              <span className={styles.summaryNum} style={{ color: 'var(--color-danger-600)' }}>
                {data.summary.totalFindings}
              </span>
              <span className={styles.summaryLabel}>Temuan Masuk</span>
            </div>
            <div className={styles.summaryBox}>
              <span className={styles.summaryNum} style={{ color: 'var(--color-success-700)' }}>
                {data.summary.resolvedFindings}
              </span>
              <span className={styles.summaryLabel}>Temuan Selesai</span>
            </div>
          </div>

          {/* Sesi Patroli List */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Sesi Patroli Terlaksana</h3>
            {data.sessions.length === 0 ? (
              <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#666' }}>Tidak ada sesi patroli terlaksana dalam periode ini.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>No.</th>
                    <th style={{ width: '15%' }}>Tanggal</th>
                    <th style={{ width: '20%' }}>Jadwal</th>
                    <th style={{ width: '32%' }}>Petugas Security</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Cek</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((sess, idx) => (
                    <tr key={sess.id}>
                      <td>#{sess.patrolNumber}</td>
                      <td>{sess.date}</td>
                      <td>{sess.scheduleName} ({sess.startTime} - {sess.endTime})</td>
                      <td>{sess.officer}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {sess.status === 'completed' ? '✓ SELESAI' : '• AKTIF'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{sess.checkedRoomsCount} Rm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Findings List */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Temuan Bahaya / Masalah Keamanan</h3>
            {data.findings.length === 0 ? (
              <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#666' }}>Tidak ada temuan bahaya/fasilitas dalam periode ini.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>No Temuan</th>
                    <th style={{ width: '25%' }}>Lokasi (Lantai/Ruang)</th>
                    <th style={{ width: '15%' }}>Kategori</th>
                    <th style={{ width: '27%' }}>Deskripsi Masalah</th>
                    <th style={{ width: '15%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.findings.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 'bold' }}>{f.number}</td>
                      <td>{f.floor} — {f.room}</td>
                      <td style={{ fontSize: '11px', textTransform: 'uppercase' }}>{f.category}</td>
                      <td>{f.description}</td>
                      <td style={{ fontWeight: 'bold', color: f.status === 'resolved' ? 'green' : 'red' }}>
                        {f.status === 'resolved' ? 'RESOLVED' : 'NEW/PROGRESS'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Signature Block */}
          <div className={styles.signatureSection}>
            <div className={styles.signatureBox}>
              <p style={{ fontSize: '12px' }}>Dibuat oleh,</p>
              <div className={styles.signatureLine}>Komandan Shift Security</div>
            </div>
            <div className={styles.signatureBox}>
              <p style={{ fontSize: '12px' }}>Disetujui oleh,</p>
              <div className={styles.signatureLine}>Supervisor Keamanan / KA. IPSRS</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Gagal mengompilasi laporan.</p>
        </div>
      )}
    </div>
  );
}
