'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './admin-dash.module.css';

interface DashboardStats {
  totalUsers: number;
  totalSecurityOfficers: number;
  totalFloors: number;
  totalRooms: number;
  totalSchedules: number;
  totalShifts: number;
  todaySessions: number;
  totalSessions: number;
  todayChecks: number;
  totalChecks: number;
  activeFindings: number;
  resolvedFindings: number;
  recentSessions: {
    id: string;
    patrolNumber: number;
    officerName: string;
    officerId: string;
    shiftName: string;
    status: string;
    patrolDate: string;
    startedAt: string | null;
    completedAt: string | null;
    totalFloors: number;
    completedFloors: number;
    findingsCount: number;
  }[];
  recentFindings: {
    id: string;
    findingNumber: string;
    category: string;
    roomName: string;
    floorName: string;
    officerName: string;
    status: string;
    description: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds for live security feed
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const menuCards = [
    { href: '/admin/users', icon: '👥', label: 'User Management', count: stats?.totalUsers ?? '-', desc: 'Kelola akun petugas' },
    { href: '/admin/buildings', icon: '🏢', label: 'Master Gedung', count: 1, desc: 'Data gedung RS' },
    { href: '/admin/floors', icon: '🏗️', label: 'Master Lantai', count: stats?.totalFloors ?? '-', desc: 'Data lantai & zona' },
    { href: '/admin/rooms', icon: '🚪', label: 'Master Ruangan', count: stats?.totalRooms ?? '-', desc: 'Data ruangan & checklist' },
    { href: '/admin/schedules', icon: '📅', label: 'Jadwal Patroli', count: stats?.totalSchedules ?? '-', desc: `${stats?.totalSchedules ?? 8} sesi patroli per hari` },
    { href: '/admin/shifts', icon: '⏰', label: 'Shift', count: stats?.totalShifts ?? '-', desc: 'Pengaturan shift security' },
    { href: '/admin/checklists', icon: '📋', label: 'Kelola Checklist', count: null, desc: 'Template cek ruangan' },
    { href: '/admin/qr-codes', icon: '📱', label: 'Generate QR', count: stats?.totalFloors ?? '-', desc: 'QR code resmi per lantai' },
    { href: '/admin/reports', icon: '📊', label: 'Laporan Patroli', count: null, desc: 'Buku & rekap patroli' },
    { href: '/admin/findings', icon: '⚠️', label: 'Temuan Kendala', count: stats?.activeFindings ?? '-', desc: 'Daftar kendala lapangan' },
    { href: '/admin/audit-logs', icon: '📜', label: 'Log Aktivitas', count: null, desc: 'Audit trail real-time' },
    { href: '/admin/settings', icon: '⚙️', label: 'Pengaturan', count: null, desc: 'Konfigurasi sistem' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Selesai</span>;
      case 'in_progress':
        return <span className="badge badge-warning">Berjalan</span>;
      case 'late':
        return <span className="badge badge-danger">Terlambat</span>;
      case 'incomplete':
        return <span className="badge badge-neutral">Lebih Awal</span>;
      default:
        return <span className="badge badge-neutral">Menunggu</span>;
    }
  };

  const getFindingStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="badge badge-danger">Baru</span>;
      case 'in_progress':
        return <span className="badge badge-warning">Diproses</span>;
      case 'resolved':
        return <span className="badge badge-success">Selesai</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <div className={styles.welcomeIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Selamat Datang, Admin</h1>
            <p className={styles.subtitle}>Dashboard Pemantauan & Manajemen Sistem Patroli RS Mata JEC ORBITA</p>
          </div>
        </div>
        <div>
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Terkoneksi ke App Security (Live)
          </div>
        </div>
      </div>

      {/* Security Operational Highlights */}
      <div className={styles.opsSection}>
        <div className={styles.opsGrid}>
          {/* Card 1: Patroli */}
          <div className={styles.opsCard}>
            <div className={styles.opsIcon} style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              🛡️
            </div>
            <div>
              <div className={styles.opsLabel}>Sesi Patroli</div>
              <div className={styles.opsVal}>{loading ? '-' : `${stats?.todaySessions ?? 0} Hari Ini`}</div>
              <div className={styles.opsSub}>{loading ? 'Memuat...' : `${stats?.totalSessions ?? 0} total sesi tercatat`}</div>
            </div>
          </div>

          {/* Card 2: Checks */}
          <div className={styles.opsCard}>
            <div className={styles.opsIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              🚪
            </div>
            <div>
              <div className={styles.opsLabel}>Pemeriksaan Ruangan</div>
              <div className={styles.opsVal}>{loading ? '-' : `${stats?.todayChecks ?? 0} Ruangan`}</div>
              <div className={styles.opsSub}>{loading ? 'Memuat...' : `${stats?.totalChecks ?? 0} total checklist selesai`}</div>
            </div>
          </div>

          {/* Card 3: Findings */}
          <div className={styles.opsCard}>
            <div className={styles.opsIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              ⚠️
            </div>
            <div>
              <div className={styles.opsLabel}>Temuan Kendala Lapangan</div>
              <div className={styles.opsVal} style={{ color: (stats?.activeFindings ?? 0) > 0 ? '#b45309' : 'inherit' }}>
                {loading ? '-' : `${stats?.activeFindings ?? 0} Aktif`}
              </div>
              <div className={styles.opsSub}>{loading ? 'Memuat...' : `${stats?.resolvedFindings ?? 0} temuan diselesaikan`}</div>
            </div>
          </div>

          {/* Card 4: Officers */}
          <div className={styles.opsCard}>
            <div className={styles.opsIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              👮
            </div>
            <div>
              <div className={styles.opsLabel}>Petugas Security</div>
              <div className={styles.opsVal}>{loading ? '-' : `${stats?.totalSecurityOfficers ?? 0} Petugas`}</div>
              <div className={styles.opsSub}>
                <Link href="/security/leaderboard" style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                  Lihat Leaderboard Tim →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Two Columns: Live Sessions & Live Findings */}
        <div className={styles.twoColGrid}>
          {/* Left: Recent Patrol Sessions */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>
                <span>🛡️</span> Aktivitas Patroli Terkini (Security App)
              </span>
              <Link href="/admin/reports" className={styles.panelLink}>
                Lihat Laporan Lengkap →
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.tableMini}>
                <thead>
                  <tr>
                    <th className={styles.thMini}>Petugas</th>
                    <th className={styles.thMini}>Sesi</th>
                    <th className={styles.thMini}>Lantai</th>
                    <th className={styles.thMini}>Mulai</th>
                    <th className={styles.thMini}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Memuat data patroli security...
                      </td>
                    </tr>
                  ) : (stats?.recentSessions.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Belum ada sesi patroli tercatat hari ini.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentSessions.map(session => (
                      <tr key={session.id} className={styles.trMini}>
                        <td className={styles.tdMini}>
                          <strong style={{ color: 'var(--text-primary)' }}>{session.officerName}</strong>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{session.officerId} • {session.shiftName}</div>
                        </td>
                        <td className={styles.tdMini}>
                          <span style={{ fontWeight: 600 }}>Patroli #{session.patrolNumber}</span>
                        </td>
                        <td className={styles.tdMini}>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {session.completedFloors} / {session.totalFloors}
                          </span>
                        </td>
                        <td className={styles.tdMini}>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(session.startedAt)} WITA</span>
                        </td>
                        <td className={styles.tdMini}>
                          {getStatusBadge(session.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Recent Findings */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>
                <span>⚠️</span> Temuan Terkini dari Lapangan
              </span>
              <Link href="/admin/findings" className={styles.panelLink}>
                Lihat Semua Temuan →
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.tableMini}>
                <thead>
                  <tr>
                    <th className={styles.thMini}>Temuan & Lokasi</th>
                    <th className={styles.thMini}>Pelapor</th>
                    <th className={styles.thMini}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Memuat temuan kendala...
                      </td>
                    </tr>
                  ) : (stats?.recentFindings.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>✅</div>
                        Kondisi aman, tidak ada kendala terbuka.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentFindings.map(f => (
                      <tr key={f.id} className={styles.trMini}>
                        <td className={styles.tdMini}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.findingNumber}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            {f.roomName} • {f.floorName}
                          </div>
                        </td>
                        <td className={styles.tdMini}>
                          <span style={{ fontSize: '12px' }}>{f.officerName}</span>
                        </td>
                        <td className={styles.tdMini}>
                          {getFindingStatusBadge(f.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats summary row */}
      <h2 className={styles.sectionTitle}>
        <span>Master Data & Ringkasan Entitas</span>
      </h2>
      <div className={styles.statsRow}>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalUsers ?? 0}</span><span className={styles.statLabel}>Total User</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalFloors ?? 0}</span><span className={styles.statLabel}>Lantai</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalRooms ?? 0}</span><span className={styles.statLabel}>Ruangan</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalSchedules ?? 0}</span><span className={styles.statLabel}>Jadwal</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalShifts ?? 0}</span><span className={styles.statLabel}>Shift</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : stats?.totalFloors ?? 0}</span><span className={styles.statLabel}>QR Lantai</span></div>
      </div>

      {/* Menu grid */}
      <h2 className={styles.sectionTitle}>
        <span>Menu Manajemen Sistem</span>
      </h2>
      <div className={styles.menuGrid}>
        {menuCards.map(card => (
          <Link key={card.href} href={card.href} className={`card card-interactive ${styles.menuCard}`}>
            <div className={styles.menuCardBody}>
              <span className={styles.menuIcon}>{card.icon}</span>
              <div className={styles.menuInfo}>
                <h3 className={styles.menuLabel}>{card.label}</h3>
                <p className={styles.menuDesc}>{card.desc}</p>
              </div>
              {card.count !== null && <span className={styles.menuCount}>{card.count}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

