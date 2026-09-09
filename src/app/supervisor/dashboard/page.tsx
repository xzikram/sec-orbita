'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface DashboardStats {
  totalUsers: number;
  totalFloors: number;
  totalRooms: number;
  todaySessions: number;
  todayChecks: number;
  activeFindings: number;
  resolvedFindings: number;
}

interface PatrolSessionItem {
  id: string;
  patrolNumber: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  user?: { name: string; employeeId: string };
  schedule?: { name: string; startTime: string; endTime: string };
  sessionFloors?: {
    id: string;
    floorId: string;
    floorNameSnapshot: string;
    status: string;
    qrValidated: boolean;
    patrolChecks?: any[];
  }[];
}

interface FindingItem {
  id: string;
  findingNumber: string;
  category: string;
  description: string;
  status: string;
  roomNameSnapshot: string;
  floorNameSnapshot: string;
  createdAt: string;
}

export default function SupervisorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<PatrolSessionItem[]>([]);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, sessRes, findingsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/patrol/sessions'),
          fetch('/api/findings?limit=6'),
        ]);

        if (statsRes.ok) {
          const sData = await statsRes.json();
          setStats(sData);
        }

        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSessions(Array.isArray(sessData) ? sessData : []);
        }

        if (findingsRes.ok) {
          const fData = await findingsRes.json();
          const items = fData.data || fData;
          setFindings(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        console.error('Failed to load supervisor dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const activeSess = sessions.find(s => s.status === 'in_progress');
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const activeCount = activeSess ? 1 : 0;

  return (
    <div>
      {/* Page title */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Control Room</h1>
          <p className={styles.pageSubtitle}>Monitoring patroli security real-time RS Mata JEC ORBITA</p>
        </div>
        <div className={styles.liveIndicator}>
          <span className="status-dot status-dot-success" />
          <span>Live Monitoring</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconPrimary}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{stats?.todaySessions ?? sessions.length}</span>
              <span className={styles.statLabel}>Total Sesi Hari Ini</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>{completedCount} selesai</span>
            <span className={styles.metaInfo}>{activeCount} aktif</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconSuccess}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{stats?.todayChecks ?? 0}</span>
              <span className={styles.statLabel}>Ruangan Diperiksa</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>Dari {stats?.totalRooms ?? 24} total ruangan</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconWarning}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{stats?.totalFloors ?? 4}</span>
              <span className={styles.statLabel}>Lantai Aktif</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>100% tercover QR</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconDanger}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{stats?.activeFindings ?? findings.filter(f => f.status !== 'resolved').length}</span>
              <span className={styles.statLabel}>Temuan Aktif</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaDanger}>{findings.filter(f => f.status === 'new').length} baru</span>
            <span className={styles.metaWarning}>{findings.filter(f => f.status === 'in_progress').length} diproses</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.mainGrid}>
        {/* Active Patrol Panel */}
        <div className={`card ${styles.activePanel}`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <span className={`status-dot ${activeSess ? 'status-dot-info' : 'status-dot-neutral'}`} />
              {activeSess ? `Patroli Aktif — #${activeSess.patrolNumber}` : 'Status Patroli Terkini'}
            </h2>
            {activeSess && (
              <span className="badge badge-info badge-lg">
                {activeSess.schedule?.startTime} - {activeSess.schedule?.endTime}
              </span>
            )}
          </div>

          {activeSess ? (
            <>
              {/* Floor progress */}
              <div className={styles.floorGrid}>
                {(activeSess.sessionFloors || []).map(floor => {
                  const checkCount = floor.patrolChecks?.length || 0;
                  return (
                    <div
                      key={floor.id}
                      className={`${styles.floorItem} ${floor.status === 'in_progress' ? styles.floorActive : ''}`}
                    >
                      <div className={styles.floorHead}>
                        <span className={styles.floorName}>{floor.floorNameSnapshot}</span>
                        <span className={`badge ${floor.status === 'completed' ? 'badge-success' : floor.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                          {floor.status === 'completed' ? 'Selesai' : floor.status === 'in_progress' ? 'Berjalan' : 'Belum'}
                        </span>
                      </div>
                      <div className="progress-bar" style={{ marginTop: '8px' }}>
                        <div
                          className={`progress-bar-fill ${floor.status === 'completed' ? 'progress-fill-success' : 'progress-fill-primary'}`}
                          style={{ width: floor.status === 'completed' ? '100%' : floor.status === 'in_progress' ? '50%' : '0%' }}
                        />
                      </div>
                      <div className={styles.floorMeta}>
                        <span>{checkCount} ruangan tercatat</span>
                        {floor.qrValidated && (
                          <span className={styles.qrTag}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            QR Validated
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Officer info */}
              <div className={styles.officerBar}>
                <div className={styles.officerAvatar}>
                  {(activeSess.user?.name || 'SC').substring(0, 2).toUpperCase()}
                </div>
                <div className={styles.officerInfo}>
                  <span className={styles.officerName}>{activeSess.user?.name || 'Petugas Security'}</span>
                  <span className={styles.officerMeta}>
                    ID: {activeSess.user?.employeeId || '-'} • Mulai {activeSess.startedAt ? new Date(activeSess.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </span>
                </div>
                <Link href="/supervisor/monitoring" className="btn btn-outline btn-sm">Detail</Link>
              </div>
            </>
          ) : (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Tidak Ada Patroli yang Sedang Berjalan</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
                Saat ini belum ada sesi patroli aktif. Patroli berikutnya akan tercatat otomatis saat petugas security memulai patroli di lantai target.
              </p>
              <Link href="/supervisor/monitoring" className="btn btn-outline btn-sm">
                Lihat Riwayat & Jadwal
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Findings panel */}
          <div className={`card ${styles.findingsPanel}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger-500)" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Temuan Terbaru
              </h2>
              <Link href="/supervisor/findings" className="section-link">Semua →</Link>
            </div>
            <div className={styles.findingList}>
              {findings.map(finding => (
                <Link key={finding.id} href={`/supervisor/findings/${finding.id}`} className={styles.findingRow}>
                  <div className={`${styles.findingDot} ${finding.status === 'new' ? styles.dotDanger : styles.dotWarning}`} />
                  <div className={styles.findingContent}>
                    <span className={styles.findingTitle}>{finding.description.substring(0, 50)}...</span>
                    <span className={styles.findingMeta}>
                      {finding.roomNameSnapshot} • {finding.floorNameSnapshot} • {new Date(finding.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`badge ${finding.status === 'new' ? 'badge-danger' : finding.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>
                    {finding.status === 'new' ? 'Baru' : finding.status === 'in_progress' ? 'Proses' : 'Selesai'}
                  </span>
                </Link>
              ))}
              {findings.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Tidak ada temuan aktif
                </div>
              )}
            </div>
          </div>

          {/* Today schedule / sessions */}
          <div className={`card ${styles.schedulePanel}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Sesi Patroli Hari Ini</h2>
            </div>
            <div className={styles.scheduleList}>
              {sessions.map(sess => (
                <div key={sess.id} className={styles.scheduleRow}>
                  <span className={styles.schedTime}>
                    {sess.schedule?.startTime || '-'}-{sess.schedule?.endTime || '-'}
                  </span>
                  <span className={styles.schedPatrol}>#{sess.patrolNumber}</span>
                  <span className={styles.schedOfficer}>{sess.user?.name || 'Petugas'}</span>
                  <span className={`badge ${sess.status === 'completed' ? 'badge-success' : sess.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                    {sess.status === 'completed' ? '✓' : sess.status === 'in_progress' ? '●' : '—'}
                  </span>
                </div>
              ))}
              {sessions.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Belum ada sesi tercatat hari ini
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
