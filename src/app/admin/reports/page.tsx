'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './reports.module.css';

interface SessionItem {
  id: string;
  patrolNumber: number;
  date: string;
  rawDate: string;
  scheduleName: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  startedAt: string | null;
  completedAt: string | null;
  officer: string;
  officerEmployeeId: string;
  status: string;
  floorCount: number;
  checkedRoomsCount: number;
  findingCount: number;
}

interface FindingItem {
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

interface FloorDetail {
  id: string;
  name: string;
  code: string;
  qrValidated: boolean;
  qrScannedAt: string | null;
  rooms: {
    id: string;
    code: string;
    name: string;
    hasAc: boolean;
    hasLight: boolean;
    check: {
      id: string;
      acStatus: 'on' | 'off' | 'not_available';
      lightStatus: 'on' | 'off';
      condition: 'normal' | 'finding';
      remarks: string | null;
      checkedAt: string;
      photos?: { id: string; filePath: string }[];
    } | null;
  }[];
}

export default function AdminReportsPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'pagi' | 'siang' | 'malam'>('all');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion details cache
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, FloorDetail[]>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch report data whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/generate?type=daily&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary || null);
          setSessions(data.sessions || []);
          setFindings(data.findings || []);
        }
      } catch (err) {
        console.error('Error loading report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [selectedDate]);

  // Quick date selector
  const handleQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Toggle detail accordion
  const handleToggleDetail = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }

    setExpandedSessionId(sessionId);

    // If details not loaded yet, fetch from API
    if (!sessionDetails[sessionId]) {
      setLoadingDetailId(sessionId);
      try {
        const res = await fetch(`/api/reports/patrol-book?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSessionDetails(prev => ({
            ...prev,
            [sessionId]: data.floors || []
          }));
        }
      } catch (err) {
        console.error('Error fetching session details:', err);
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  // Filter sessions by shift
  const filteredSessions = sessions.filter(s => {
    if (shiftFilter === 'all') return true;
    const shift = (s.shiftName || '').toLowerCase();
    const sched = (s.scheduleName || '').toLowerCase();
    if (shiftFilter === 'pagi') return shift.includes('pagi') || sched.includes('pagi') || (s.startTime >= '06:00' && s.startTime < '14:00');
    if (shiftFilter === 'siang') return shift.includes('siang') || sched.includes('siang') || (s.startTime >= '14:00' && s.startTime < '22:00');
    if (shiftFilter === 'malam') return shift.includes('malam') || sched.includes('malam') || s.startTime >= '22:00' || s.startTime < '06:00';
    return true;
  });

  const totalCheckedRooms = sessions.reduce((sum, s) => sum + s.checkedRoomsCount, 0);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isYesterday = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return selectedDate === y.toISOString().split('T')[0];
  })();

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Laporan Patroli Keamanan</h1>
          <p className={styles.pageSub}>
            RS Mata JEC ORBITA @ Makassar • {formatDisplayDate(selectedDate)}
          </p>
        </div>

        <div className={styles.controlsBar}>
          {/* Quick Date Filters */}
          <div className={styles.filterGroup}>
            <button
              className={`${styles.dateQuickBtn} ${isToday ? styles.dateQuickActive : ''}`}
              onClick={() => handleQuickDate('today')}
            >
              Hari Ini
            </button>
            <button
              className={`${styles.dateQuickBtn} ${isYesterday ? styles.dateQuickActive : ''}`}
              onClick={() => handleQuickDate('yesterday')}
            >
              Kemarin
            </button>
            <input
              type="date"
              className={styles.dateInput}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              title="Pilih tanggal patroli"
            />
          </div>

          {/* Shift Filter */}
          <select
            className={styles.selectShift}
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value as any)}
          >
            <option value="all">Semua Shift</option>
            <option value="pagi">Shift Pagi (07:00 - 15:00)</option>
            <option value="siang">Shift Siang (15:00 - 23:00)</option>
            <option value="malam">Shift Malam (23:00 - 07:00)</option>
          </select>

          {/* Export PDF Button */}
          <Link
            href="/admin/reports/export"
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            📄 Rekap PDF
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid var(--color-primary-600, #0056b3)',
            borderRadius: '50%',
            margin: '0 auto 12px auto',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: '14px' }}>Memuat laporan patroli...</p>
          <style jsx global>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiPrimary}`}>🛡️</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiNum}>
                  {summary?.completedSessions ?? 0}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    /{summary?.totalSessions ?? 0} Sesi
                  </span>
                </span>
                <span className={styles.kpiLabel}>Sesi Selesai</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiSuccess}`}>🏢</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiNum}>{totalCheckedRooms}</span>
                <span className={styles.kpiLabel}>Ruangan Diperiksa</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${(summary?.totalFindings ?? 0) > 0 ? styles.kpiDanger : styles.kpiSuccess}`}>
                {(summary?.totalFindings ?? 0) > 0 ? '⚠️' : '✅'}
              </div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiNum} style={{ color: (summary?.totalFindings ?? 0) > 0 ? '#b91c1c' : '#15803d' }}>
                  {summary?.totalFindings ?? 0} Temuan
                </span>
                <span className={styles.kpiLabel}>
                  {(summary?.totalFindings ?? 0) > 0 ? `${summary?.openFindings ?? 0} Perlu Tindak Lanjut` : 'Kondisi Aman / Nihil'}
                </span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiPrimary}`}>⏱️</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiNum}>{summary?.completionRate ?? 100}%</span>
                <span className={styles.kpiLabel}>Kepatuhan Jadwal</span>
              </div>
            </div>
          </div>

          {/* Sesi Patroli List */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>Buku Mutasi Sesi Patroli</span>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                {filteredSessions.length} sesi
              </span>
            </h2>
          </div>

          {filteredSessions.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>📋</div>
              <h3 className={styles.emptyTitle}>Belum Ada Sesi Patroli Tercatat</h3>
              <p className={styles.emptyDesc}>
                Tidak ada riwayat patroli pada {formatDisplayDate(selectedDate)}
                {shiftFilter !== 'all' ? ` untuk ${shiftFilter}` : ''}. Silakan pilih tanggal lain melalui filter di atas.
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => handleQuickDate('today')}>
                Lihat Hari Ini
              </button>
            </div>
          ) : (
            <div className={styles.sessionList}>
              {filteredSessions.map(sess => {
                const isExpanded = expandedSessionId === sess.id;
                const floors = sessionDetails[sess.id] || [];

                return (
                  <div key={sess.id} className={styles.sessionCard}>
                    {/* Card Header */}
                    <div className={styles.sessionCardHeader}>
                      <div className={styles.sessionHeaderLeft}>
                        <span className={styles.patrolBadge}>Patroli #{sess.patrolNumber}</span>
                        <span className={styles.sessionTimeText}>
                          {sess.startTime} - {sess.endTime}
                        </span>
                        <span className={styles.shiftTag}>{sess.shiftName}</span>
                      </div>

                      <div className={styles.sessionHeaderRight}>
                        <span className={`badge ${sess.status === 'completed' ? 'badge-success' : sess.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                          {sess.status === 'completed' ? '✅ Selesai' : sess.status === 'in_progress' ? '⏳ Sedang Berjalan' : 'Terjadwal'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className={styles.sessionCardBody}>
                      {/* Officer */}
                      <div className={styles.bodyCol}>
                        <span className={styles.colLabel}>Petugas Security</span>
                        <span className={styles.colValue}>{sess.officer}</span>
                        <span className={styles.colSub}>ID: {sess.officerEmployeeId}</span>
                      </div>

                      {/* Real Time */}
                      <div className={styles.bodyCol}>
                        <span className={styles.colLabel}>Waktu Pelaksanaan</span>
                        <span className={styles.colValue}>
                          {sess.startedAt ? new Date(sess.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' s/d '}
                          {sess.completedAt ? new Date(sess.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : (sess.status === 'in_progress' ? 'Sekarang' : '—')}
                        </span>
                        <span className={styles.colSub}>
                          {sess.status === 'completed' ? 'Tepat Waktu' : sess.status === 'in_progress' ? 'Aktif Berjalan' : 'Menunggu Jadwal'}
                        </span>
                      </div>

                      {/* Coverage */}
                      <div className={styles.bodyCol}>
                        <span className={styles.colLabel}>Cakupan Pemeriksaan</span>
                        <span className={styles.colValue}>{sess.checkedRoomsCount} Ruangan</span>
                        <span className={styles.colSub}>{sess.floorCount} Lantai Tercatat</span>
                      </div>

                      {/* Condition / Findings */}
                      <div className={styles.bodyCol}>
                        <span className={styles.colLabel}>Kondisi & Temuan</span>
                        {sess.findingCount > 0 ? (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                            ⚠️ {sess.findingCount} Temuan Kendala
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                            ✅ Aman / Nihil
                          </span>
                        )}
                        <span className={styles.colSub}>Listrik & AC Sesuai SOP</span>
                      </div>

                      {/* Actions */}
                      <div className={styles.sessionActions}>
                        <button
                          className={styles.detailBtn}
                          onClick={() => handleToggleDetail(sess.id)}
                        >
                          {isExpanded ? '▲ Tutup Rincian' : '▼ Rincian Pemeriksaan'}
                        </button>

                        <button
                          className={styles.printBtn}
                          onClick={() => window.open(`/admin/reports/print?sessionId=${sess.id}`, '_blank')}
                          title="Cetak format buku laporan patroli resmi"
                        >
                          🖨️ Cetak Buku
                        </button>
                      </div>
                    </div>

                    {/* Expandable Checklist Details */}
                    {isExpanded && (
                      <div className={styles.expandedArea}>
                        {loadingDetailId === sess.id ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                            <p style={{ fontSize: '13px' }}>Memuat rincian ruangan...</p>
                          </div>
                        ) : floors.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '13px' }}>Belum ada data rincian ruangan untuk sesi ini.</p>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                Hasil Pemeriksaan per Lantai & Ruangan
                              </span>
                              <Link
                                href={`/supervisor/patrol/${sess.id}`}
                                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-600, #0056b3)', textDecoration: 'none' }}
                              >
                                Buka Halaman Penuh →
                              </Link>
                            </div>

                            {floors.map(fl => {
                              const checkedCount = fl.rooms.filter(r => r.check !== null).length;
                              return (
                                <div key={fl.id} className={styles.floorItemCard}>
                                  <div className={styles.floorItemHeader}>
                                    <div>
                                      <span>{fl.name}</span>
                                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px', fontWeight: 'normal' }}>
                                        ({checkedCount}/{fl.rooms.length} diperiksa)
                                      </span>
                                    </div>
                                    <div>
                                      {fl.qrValidated ? (
                                        <span style={{ color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                                          ✓ Barcode Terverifikasi {fl.qrScannedAt ? `(${new Date(fl.qrScannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>Barcode Belum Discan</span>
                                      )}
                                    </div>
                                  </div>

                                  <table className={styles.checkTable}>
                                    <thead>
                                      <tr>
                                        <th style={{ width: '35%' }}>Ruangan</th>
                                        <th style={{ width: '15%' }}>Jam Cek</th>
                                        <th style={{ width: '12%' }}>Lampu</th>
                                        <th style={{ width: '12%' }}>AC</th>
                                        <th style={{ width: '12%' }}>Kondisi</th>
                                        <th style={{ width: '14%' }}>Catatan</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {fl.rooms.map(rm => {
                                        const chk = rm.check;
                                        return (
                                          <tr key={rm.id} style={{ background: chk?.condition === 'finding' ? '#fff5f5' : 'transparent' }}>
                                            <td>
                                              <span style={{ fontWeight: 600, display: 'block' }}>{rm.name}</span>
                                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{rm.code}</span>
                                            </td>
                                            <td style={{ color: '#64748b' }}>
                                              {chk?.checkedAt ? new Date(chk.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td>
                                              {chk ? (
                                                <span className={`${styles.statusPill} ${chk.lightStatus === 'on' ? styles.pillOn : styles.pillOff}`}>
                                                  {chk.lightStatus === 'on' ? 'ON 💡' : 'OFF'}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {chk ? (
                                                <span className={`${styles.statusPill} ${chk.acStatus === 'on' ? styles.pillAcOn : styles.pillAcOff}`}>
                                                  {chk.acStatus === 'on' ? 'ON ❄️' : chk.acStatus === 'off' ? 'OFF' : '—'}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {chk ? (
                                                <span className={`badge ${chk.condition === 'normal' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                                  {chk.condition === 'normal' ? 'Aman' : 'Temuan'}
                                                </span>
                                              ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Belum</span>
                                              )}
                                            </td>
                                            <td>
                                              <span style={{ fontSize: '11px', color: chk?.condition === 'finding' ? '#b91c1c' : '#64748b' }}>
                                                {chk?.remarks || (chk?.condition === 'normal' ? 'Aman' : '—')}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Daftar Temuan Tanggal Ini (Jika Ada) */}
          {findings.length > 0 && (
            <div className={styles.findingsCard}>
              <h3 className={styles.findingsTitle}>
                <span>⚠️ Temuan Kendala Dilaporkan ({findings.length})</span>
              </h3>
              <div className={styles.findingsList}>
                {findings.map(f => (
                  <div key={f.id} className={styles.findingRow}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{f.room} ({f.floor})</span>
                      <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                      <span style={{ color: '#475569' }}>{f.description}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${f.status === 'new' ? 'badge-danger' : f.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '11px' }}>
                        {f.status === 'new' ? 'Baru' : f.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                      </span>
                      <Link
                        href={`/admin/findings/${f.id}`}
                        className="btn btn-outline btn-xs"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                      >
                        Tindak Lanjut →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
