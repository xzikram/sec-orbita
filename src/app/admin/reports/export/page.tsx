'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  rawDate: string;
  scheduleName: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  officer: string;
  officerEmployeeId: string;
  status: string;
  checkedRoomsCount: number;
  findingCount: number;
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

interface ReportCheck {
  id: string;
  sessionId: string;
  sessionNumber: number;
  date: string;
  rawDate: string;
  shiftName: string;
  officer: string;
  officerEmployeeId: string;
  floor: string;
  room: string;
  code: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
  condition: 'normal' | 'finding';
  remarks: string | null;
  time: string;
  checkedAt: string;
}

interface ScheduleMatrixItem {
  id: string;
  patrolNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  shiftName: string;
  shiftCode: string;
  isRun: boolean;
  status: string;
  officer: string;
  officerId: string;
  checkedCount: number;
  startedAt: string | null;
  notes: string | null;
}

interface MatrixRoomItem {
  id: string;
  code: string;
  name: string;
  p1?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p2?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p3?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p4?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p5?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p6?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p7?: { condition: string; remarks: string | null; time: string; officer: string } | null;
  p8?: { condition: string; remarks: string | null; time: string; officer: string } | null;
}

interface MatrixFloorItem {
  id: string;
  name: string;
  code: string;
  rooms: MatrixRoomItem[];
}

interface ReportData {
  summary: ReportSummary;
  sessions: ReportSession[];
  checks: ReportCheck[];
  findings: ReportFinding[];
  matrix?: {
    schedules: ScheduleMatrixItem[];
    floors: MatrixFloorItem[];
    totalSchedules: number;
    runCount: number;
    skippedCount: number;
  };
}

export default function ExportReportPage() {
  const [activeTab, setActiveTab] = useState<'checklist' | 'matrix' | 'summary'>('checklist');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'pagi' | 'siang' | 'malam'>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Default date to today
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

  const handleDownloadExcel = () => {
    const url = `/api/reports/excel?type=${type}&date=${date}&shift=${shiftFilter}`;
    window.open(url, '_blank');
  };

  // Filter checks and sessions by shift
  const filteredSessions = (data?.sessions || []).filter(s => {
    if (shiftFilter === 'all') return true;
    const shift = (s.shiftName || '').toLowerCase();
    const sched = (s.scheduleName || '').toLowerCase();
    if (shiftFilter === 'pagi') return shift.includes('pagi') || sched.includes('pagi') || (s.startTime >= '06:00' && s.startTime < '14:00');
    if (shiftFilter === 'siang') return shift.includes('siang') || sched.includes('siang') || (s.startTime >= '14:00' && s.startTime < '22:00');
    if (shiftFilter === 'malam') return shift.includes('malam') || sched.includes('malam') || s.startTime >= '22:00' || s.startTime < '06:00';
    return true;
  });

  const filteredChecks = (data?.checks || []).filter(c => {
    if (shiftFilter === 'all') return true;
    const shift = (c.shiftName || '').toLowerCase();
    if (shiftFilter === 'pagi') return shift.includes('pagi');
    if (shiftFilter === 'siang') return shift.includes('siang');
    if (shiftFilter === 'malam') return shift.includes('malam');
    return true;
  });

  const getPeriodLabel = () => {
    if (!data?.summary) return '';
    if (type === 'daily') return `Harian • ${data.summary.startDate}`;
    if (type === 'weekly') return `Mingguan • ${data.summary.startDate} s/d ${data.summary.endDate}`;
    return `Bulanan • Periode ${data.summary.startDate} s/d ${data.summary.endDate}`;
  };

  // Matrix schedules divided by shift
  const pagiSchedules = (data?.matrix?.schedules || []).filter(s => s.patrolNumber <= 4);
  const malamSchedules = (data?.matrix?.schedules || []).filter(s => s.patrolNumber > 4);

  // Filter matrix floors
  const filteredMatrixFloors = (data?.matrix?.floors || []).filter(fl => {
    if (floorFilter === 'all') return true;
    return fl.id === floorFilter || fl.code.toLowerCase() === floorFilter.toLowerCase();
  });

  return (
    <div className={styles.container}>
      {/* Top Bar with Back Navigation */}
      <div className={styles.topBar}>
        <Link href="/admin/reports" className={styles.backLink}>
          ← Kembali ke Dashboard Laporan
        </Link>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          RS Mata JEC ORBITA @ Makassar
        </span>
      </div>

      {/* Control Filter Panel */}
      <div className={styles.controls}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Tipe Periode</label>
          <select 
            className={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="daily">Harian (1 Hari)</option>
            <option value="weekly">Mingguan (7 Hari)</option>
            <option value="monthly">Bulanan (1 Bulan Penuh)</option>
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

        {activeTab !== 'matrix' ? (
          <div className={styles.formGroup}>
            <label className={styles.label}>Filter Shift</label>
            <select 
              className={styles.select}
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as any)}
            >
              <option value="all">Semua Shift</option>
              <option value="pagi">Shift Pagi (07:00 - 15:00)</option>
              <option value="siang">Shift Siang (15:00 - 23:00)</option>
              <option value="malam">Shift Malam (23:00 - 07:00)</option>
            </select>
          </div>
        ) : (
          <div className={styles.formGroup}>
            <label className={styles.label}>Filter Lantai</label>
            <select 
              className={styles.select}
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            >
              <option value="all">Semua Lantai (12 Lantai)</option>
              {data?.matrix?.floors?.map(fl => (
                <option key={fl.id} value={fl.id}>{fl.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.actionBtns}>
          <button 
            onClick={handleDownloadExcel}
            className="btn btn-secondary"
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, background: '#107c41', color: 'white', borderColor: '#0b592e' }}
            disabled={loading || !data}
            title="Download laporan lengkap dalam format Microsoft Excel (.xlsx)"
          >
            📊 Unduh Excel (.xlsx)
          </button>

          <button 
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            disabled={loading || !data}
            title="Cetak atau simpan sebagai dokumen PDF siap print"
          >
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Tab Switcher for Sheet View */}
      <div className={styles.tabSwitcher}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'checklist' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          📋 Lembar Ceklistan Ruangan
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'matrix' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          📅 Matriks Kontrol 8 Patroli (Shift Pagi & Malam)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'summary' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Ringkasan Eksekutif & Temuan
        </button>
      </div>

      {/* Printable Sheet */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--color-neutral-200)', borderTop: '3px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Mengompilasi data laporan patroli...</p>
          </div>
        </div>
      ) : data ? (
        <div className={styles.sheet}>
          {/* Hospital Header */}
          <div className={styles.header}>
            <h1 className={styles.hospitalTitle}>RS MATA JEC ORBITA @ MAKASSAR</h1>
            <h2 className={styles.reportTitle}>
              {activeTab === 'checklist' && 'LEMBAR BUKTI CEKLIST FISIK PEMERIKSAAN RUANGAN & FASILITAS'}
              {activeTab === 'matrix' && 'MATRIKS KONTROL 8 SESI PATROLI KEAMANAN RUANGAN (SHIFT PAGI & SHIFT MALAM)'}
              {activeTab === 'summary' && 'LAPORAN REKAPITULASI PATROLI SECURITY DIGITAL'}
            </h2>
            <p className={styles.reportMeta}>
              {getPeriodLabel()} 
              {activeTab === 'checklist' && shiftFilter !== 'all' && ` • Shift: ${shiftFilter.toUpperCase()}`}
              {activeTab === 'matrix' && floorFilter !== 'all' && ` • Filter: ${data.matrix?.floors?.find(f => f.id === floorFilter)?.name}`}
            </p>
          </div>

          {/* ==================================================== */}
          {/* TAB 1: LEMBAR CEKLISTAN FISIK RUANGAN                */}
          {/* ==================================================== */}
          {activeTab === 'checklist' && (
            <div>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span>Daftar Titik Pemeriksaan Ruangan</span>
                  <span className={styles.badgeTotal}>{filteredChecks.length} Ruangan Diperiksa</span>
                </div>

                {filteredChecks.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #cbd5e0', borderRadius: '8px', color: '#718096', fontStyle: 'italic', fontSize: '13px' }}>
                    Belum ada data pemeriksaan ruangan pada periode dan filter shift ini.
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '4%', textAlign: 'center' }}>No</th>
                        {type !== 'daily' && <th style={{ width: '12%' }}>Tanggal</th>}
                        <th style={{ width: '9%' }}>Waktu</th>
                        <th style={{ width: '12%' }}>Shift</th>
                        <th style={{ width: '11%' }}>Lantai</th>
                        <th style={{ width: '22%' }}>Nama Ruangan</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Status AC</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Lampu</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Kondisi</th>
                        <th style={{ width: '12%' }}>Petugas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChecks.map((chk, idx) => (
                        <tr key={chk.id}>
                          <td style={{ textAlign: 'center', color: '#718096' }}>{idx + 1}</td>
                          {type !== 'daily' && <td>{chk.date}</td>}
                          <td style={{ fontWeight: 600 }}>{chk.time}</td>
                          <td>{chk.shiftName}</td>
                          <td>{chk.floor}</td>
                          <td>
                            <strong>{chk.room}</strong>
                            {chk.remarks && (
                              <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px', fontStyle: 'italic' }}>
                                Catatan: {chk.remarks}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {chk.acStatus === 'on' ? (
                              <span className={styles.badgeOk}>❄️ ON</span>
                            ) : chk.acStatus === 'off' ? (
                              <span className={styles.badgeMuted}>⭕ OFF</span>
                            ) : (
                              <span className={styles.badgeMuted}>— T/A</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {chk.lightStatus === 'on' ? (
                              <span className={styles.badgeWarn}>💡 ON</span>
                            ) : (
                              <span className={styles.badgeMuted}>🌑 OFF</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {chk.condition === 'normal' ? (
                              <span className={styles.badgeOk}>✓ Normal</span>
                            ) : (
                              <span className={styles.badgeDanger}>⚠️ Temuan</span>
                            )}
                          </td>
                          <td>{chk.officer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Signature Block 3 Pihak */}
              <div className={styles.signatureSection}>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Petugas Patroli,</p>
                  <div className={styles.signatureLine}>Security Bertugas</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Diperiksa oleh,</p>
                  <div className={styles.signatureLine}>Komandan Regu (Danru)</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Mengetahui / Menyetujui,</p>
                  <div className={styles.signatureLine}>Supervisor Keamanan / GA</div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: MATRIKS KONTROL 8 PATROLI (SHIFT PAGI & MALAM)*/}
          {/* ==================================================== */}
          {activeTab === 'matrix' && data.matrix && (
            <div>
              {/* Overview 8 Patrol Cards */}
              <div className={styles.matrixOverview}>
                {/* Shift Pagi (P1 - P4) */}
                <div className={styles.shiftGroupHeader}>
                  <span>☀️ SHIFT PAGI (07:00 - 19:00 WITA)</span>
                  <span>{pagiSchedules.filter(s => s.isRun).length} dari 4 Sesi Terlaksana</span>
                </div>
                <div className={styles.cardsGrid}>
                  {pagiSchedules.map(sc => (
                    <div key={sc.id} className={`${styles.pCard} ${sc.isRun ? styles.pCardRun : styles.pCardSkipped}`}>
                      <div className={styles.pCardHeader}>
                        <span className={styles.pCardTitle}>P{sc.patrolNumber} ({sc.name})</span>
                        <span className={sc.isRun ? styles.pCardStatusRun : styles.pCardStatusSkipped}>
                          {sc.isRun ? '✓ JALAN' : '✗ TIDAK JALAN'}
                        </span>
                      </div>
                      <div className={styles.pCardTime}>{sc.startTime} - {sc.endTime} WITA</div>
                      <div className={styles.pCardMeta}>
                        {sc.isRun ? (
                          <>
                            <strong>{sc.checkedCount} Ruang</strong> • {sc.officer}
                          </>
                        ) : (
                          <span style={{ color: '#c53030' }}>Tidak ada patroli</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shift Malam (P5 - P8) */}
                <div className={styles.shiftGroupHeader}>
                  <span>🌙 SHIFT MALAM (19:00 - 07:00 WITA)</span>
                  <span>{malamSchedules.filter(s => s.isRun).length} dari 4 Sesi Terlaksana</span>
                </div>
                <div className={styles.cardsGrid}>
                  {malamSchedules.map(sc => (
                    <div key={sc.id} className={`${styles.pCard} ${sc.isRun ? styles.pCardRun : styles.pCardSkipped}`}>
                      <div className={styles.pCardHeader}>
                        <span className={styles.pCardTitle}>P{sc.patrolNumber} ({sc.name})</span>
                        <span className={sc.isRun ? styles.pCardStatusRun : styles.pCardStatusSkipped}>
                          {sc.isRun ? '✓ JALAN' : '✗ TIDAK JALAN'}
                        </span>
                      </div>
                      <div className={styles.pCardTime}>{sc.startTime} - {sc.endTime} WITA</div>
                      <div className={styles.pCardMeta}>
                        {sc.isRun ? (
                          <>
                            <strong>{sc.checkedCount} Ruang</strong> • {sc.officer}
                          </>
                        ) : (
                          <span style={{ color: '#c53030' }}>Tidak ada patroli</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matrix Table (CS Style) */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span>Matriks Detail Pemeriksaan Ruangan x 8 Patroli</span>
                  <span className={styles.badgeTotal}>
                    {data.matrix.runCount} / 8 Sesi Jalan ({Math.round((data.matrix.runCount / 8) * 100)}% Kepatuhan)
                  </span>
                </div>

                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: '4%', background: '#edf2f7' }}>No</th>
                      <th rowSpan={2} style={{ width: '12%', background: '#edf2f7' }}>Lantai</th>
                      <th rowSpan={2} style={{ width: '22%', background: '#edf2f7', textAlign: 'left' }}>Nama Ruangan</th>
                      <th colSpan={4} className={styles.thShiftPagi}>☀️ SHIFT PAGI (07:00 - 19:00 WITA)</th>
                      <th colSpan={4} className={styles.thShiftMalam}>🌙 SHIFT MALAM (19:00 - 07:00 WITA)</th>
                      <th rowSpan={2} style={{ width: '8%', background: '#edf2f7' }}>Total</th>
                    </tr>
                    <tr>
                      <th className={styles.thShiftPagi}>P1<br/>07-10</th>
                      <th className={styles.thShiftPagi}>P2<br/>10-13</th>
                      <th className={styles.thShiftPagi}>P3<br/>13-16</th>
                      <th className={styles.thShiftPagi}>P4<br/>16-19</th>
                      <th className={styles.thShiftMalam}>P5<br/>19-22</th>
                      <th className={styles.thShiftMalam}>P6<br/>22-01</th>
                      <th className={styles.thShiftMalam}>P7<br/>01-04</th>
                      <th className={styles.thShiftMalam}>P8<br/>04-07</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let counter = 1;
                      return filteredMatrixFloors.flatMap(fl =>
                        fl.rooms.map(rm => {
                          const pChecks = [rm.p1, rm.p2, rm.p3, rm.p4, rm.p5, rm.p6, rm.p7, rm.p8];
                          const checkedCount = pChecks.filter(Boolean).length;
                          return (
                            <tr key={rm.id}>
                              <td style={{ color: '#718096' }}>{counter++}</td>
                              <td style={{ fontWeight: 600, color: '#4a5568' }}>{fl.name}</td>
                              <td style={{ textAlign: 'left' }}>
                                <strong>{rm.name}</strong>
                                <span style={{ fontSize: '10px', color: '#a0aec0', marginLeft: '6px' }}>({rm.code})</span>
                              </td>
                              {pChecks.map((chk, pIdx) => {
                                const sc = data.matrix?.schedules?.[pIdx];
                                const isSessionRun = sc?.isRun;
                                if (chk) {
                                  return (
                                    <td 
                                      key={pIdx} 
                                      className={chk.condition === 'normal' ? styles.checkCellOk : styles.checkCellFinding}
                                      title={chk.remarks ? `Temuan: ${chk.remarks} (${chk.time})` : `Aman (${chk.time} - ${chk.officer})`}
                                    >
                                      {chk.condition === 'normal' ? '✓' : '!'}
                                    </td>
                                  );
                                }
                                return (
                                  <td 
                                    key={pIdx} 
                                    className={!isSessionRun ? styles.checkCellSkipped : styles.checkCellEmpty}
                                    title={!isSessionRun ? 'Patroli Tidak Jalan' : 'Ruangan Tidak Dicek'}
                                  >
                                    —
                                  </td>
                                );
                              })}
                              <td style={{ fontWeight: 700, color: checkedCount === 8 ? '#2f855a' : '#4a5568' }}>
                                {checkedCount}/8
                              </td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                  <tfoot>
                    {/* Summary Row for 8 Sessions */}
                    <tr style={{ background: '#edf2f7', fontWeight: 700 }}>
                      <td colSpan={3} style={{ textAlign: 'right', paddingRight: '12px' }}>
                        STATUS SESI PATROLI:
                      </td>
                      {data.matrix.schedules.map(sc => (
                        <td 
                          key={sc.id} 
                          style={{
                            fontSize: '9px',
                            color: sc.isRun ? '#22543d' : '#742a2a',
                            background: sc.isRun ? '#c6f6d5' : '#fed7d7',
                            padding: '6px 2px',
                          }}
                        >
                          {sc.isRun ? '✓ JALAN' : '✗ TIDAK'}
                        </td>
                      ))}
                      <td>{data.matrix.runCount} Sesi</td>
                    </tr>
                    <tr style={{ background: '#f7fafc', fontSize: '10px' }}>
                      <td colSpan={3} style={{ textAlign: 'right', paddingRight: '12px' }}>
                        PETUGAS SECURITY:
                      </td>
                      {data.matrix.schedules.map(sc => (
                        <td key={sc.id} style={{ fontSize: '9px', color: '#4a5568', padding: '4px 2px' }}>
                          {sc.isRun ? sc.officer.split(' ')[0] : '—'}
                        </td>
                      ))}
                      <td>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className={styles.signatureSection}>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Security Shift Pagi,</p>
                  <div className={styles.signatureLine}>Petugas Bertugas</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Security Shift Malam,</p>
                  <div className={styles.signatureLine}>Petugas Bertugas</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Diperiksa oleh,</p>
                  <div className={styles.signatureLine}>Komandan Regu (Danru)</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Menyetujui,</p>
                  <div className={styles.signatureLine}>Supervisor Keamanan / GA</div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: RINGKASAN EKSEKUTIF & TEMUAN                  */}
          {/* ==================================================== */}
          {activeTab === 'summary' && (
            <div>
              {/* Summary Metrics Grid */}
              <div className={styles.summaryGrid}>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryNum}>{data.summary.totalSessions}</span>
                  <span className={styles.summaryLabel}>Total Sesi Patroli</span>
                </div>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryNum}>{data.summary.completionRate}%</span>
                  <span className={styles.summaryLabel}>Kepatuhan Sesi</span>
                </div>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryNum} style={{ color: '#c53030' }}>
                    {data.summary.totalFindings}
                  </span>
                  <span className={styles.summaryLabel}>Temuan Kendala</span>
                </div>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryNum} style={{ color: '#2f855a' }}>
                    {data.summary.resolvedFindings}
                  </span>
                  <span className={styles.summaryLabel}>Temuan Selesai</span>
                </div>
              </div>

              {/* Sesi Patroli List */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span>Sesi Patroli Operasional</span>
                  <span className={styles.badgeTotal}>{filteredSessions.length} Sesi</span>
                </div>

                {filteredSessions.length === 0 ? (
                  <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#718096' }}>
                    Tidak ada sesi patroli tercatat dalam filter ini.
                  </p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '8%' }}>No Sesi</th>
                        <th style={{ width: '15%' }}>Tanggal</th>
                        <th style={{ width: '22%' }}>Jadwal / Shift</th>
                        <th style={{ width: '27%' }}>Petugas Security</th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Ruangan Cek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((sess) => (
                        <tr key={sess.id}>
                          <td><strong>#{sess.patrolNumber}</strong></td>
                          <td>{sess.date}</td>
                          <td>{sess.scheduleName} ({sess.startTime} - {sess.endTime})</td>
                          <td>{sess.officer}</td>
                          <td style={{ textAlign: 'center' }}>
                            {sess.status === 'completed' ? (
                              <span className={styles.badgeOk}>✓ SELESAI</span>
                            ) : (
                              <span className={styles.badgeWarn}>• {sess.status.toUpperCase()}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {sess.checkedRoomsCount} Ruangan
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Findings List */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span>Daftar Temuan Kendala / Bahaya Fasilitas</span>
                  <span className={styles.badgeTotal}>{data.findings.length} Temuan</span>
                </div>

                {data.findings.length === 0 ? (
                  <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#718096' }}>
                    Tidak ada temuan bahaya/kendala fasilitas dalam periode ini.
                  </p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '16%' }}>No Tiket</th>
                        <th style={{ width: '24%' }}>Lokasi Ruangan</th>
                        <th style={{ width: '14%' }}>Kategori</th>
                        <th style={{ width: '32%' }}>Deskripsi Masalah</th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.findings.map((f) => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 700 }}>{f.number}</td>
                          <td>{f.floor} — {f.room}</td>
                          <td style={{ textTransform: 'uppercase', fontSize: '11px' }}>{f.category}</td>
                          <td>{f.description}</td>
                          <td style={{ textAlign: 'center' }}>
                            {f.status === 'resolved' ? (
                              <span className={styles.badgeOk}>SELESAI</span>
                            ) : (
                              <span className={styles.badgeDanger}>PERLU TINDAK LANJUT</span>
                            )}
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
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Dibuat oleh,</p>
                  <div className={styles.signatureLine}>Komandan Shift Security</div>
                </div>
                <div className={styles.signatureBox}>
                  <p style={{ fontSize: '11px', color: '#4a5568', margin: 0 }}>Disetujui oleh,</p>
                  <div className={styles.signatureLine}>Supervisor Keamanan / KA. IPSRS</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
          <p>Gagal mengompilasi laporan.</p>
        </div>
      )}
    </div>
  );
}
