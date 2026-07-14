'use client';

import Link from 'next/link';
import { todaySessions, todayStats, session6Floors, allFindings } from '@/lib/supervisor-data';
import { patrolSchedules } from '@/lib/dummy-data';
import styles from './dashboard.module.css';

export default function SupervisorDashboard() {
  const activeSess = todaySessions.find(s => s.status === 'in_progress');
  const activeSchedule = activeSess ? patrolSchedules.find(s => s.id === activeSess.scheduleId) : null;

  return (
    <div>
      {/* Page title */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Control Room</h1>
          <p className={styles.pageSubtitle}>Monitoring patroli security real-time</p>
        </div>
        <div className={styles.liveIndicator}>
          <span className="status-dot status-dot-success" />
          <span>Live</span>
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
              <span className={styles.statNum}>{todayStats.totalSessions}</span>
              <span className={styles.statLabel}>Total Sesi</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>{todayStats.completedSessions} selesai</span>
            <span className={styles.metaInfo}>{todayStats.activeSessions} aktif</span>
            <span className={styles.metaNeutral}>{todayStats.pendingSessions} terjadwal</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconSuccess}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{todayStats.completedSessions}</span>
              <span className={styles.statLabel}>Sesi Selesai</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>100% tepat waktu</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconWarning}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{todayStats.lateSessions}</span>
              <span className={styles.statLabel}>Terlambat</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaSuccess}>Tidak ada keterlambatan</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statBody}>
            <div className={`${styles.statIconWrap} ${styles.iconDanger}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <span className={styles.statNum}>{todayStats.totalFindings}</span>
              <span className={styles.statLabel}>Temuan Aktif</span>
            </div>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.metaDanger}>{todayStats.newFindings} baru</span>
            <span className={styles.metaWarning}>{todayStats.activeFindings} diproses</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.mainGrid}>
        {/* Active Patrol Panel */}
        <div className={`card ${styles.activePanel}`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <span className="status-dot status-dot-info" />
              Patroli Aktif — #{activeSess?.patrolNumber}
            </h2>
            <span className="badge badge-info badge-lg">
              {activeSchedule?.startTime} - {activeSchedule?.endTime}
            </span>
          </div>

          {/* Floor progress */}
          <div className={styles.floorGrid}>
            {session6Floors.map(floor => {
              const pct = floor.totalRooms > 0 ? Math.round((floor.checkedRooms / floor.totalRooms) * 100) : 0;
              return (
                <Link
                  key={floor.id}
                  href={`/supervisor/patrol/${activeSess?.id}/floor/${floor.floorId}`}
                  className={`${styles.floorItem} ${floor.status === 'in_progress' ? styles.floorActive : ''}`}
                >
                  <div className={styles.floorHead}>
                    <span className={styles.floorName}>{floor.floorName}</span>
                    <span className={`badge ${pct === 100 ? 'badge-success' : pct > 0 ? 'badge-info' : 'badge-neutral'}`}>
                      {pct === 100 ? 'Selesai' : pct > 0 ? 'Berjalan' : 'Belum'}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: '8px' }}>
                    <div
                      className={`progress-bar-fill ${pct === 100 ? 'progress-fill-success' : 'progress-fill-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={styles.floorMeta}>
                    <span>{floor.checkedRooms}/{floor.totalRooms} ruangan</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  {floor.qrValidated && (
                    <span className={styles.qrTag}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      QR Validated
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Officer info */}
          <div className={styles.officerBar}>
            <div className={styles.officerAvatar}>AF</div>
            <div className={styles.officerInfo}>
              <span className={styles.officerName}>{activeSess?.userName}</span>
              <span className={styles.officerMeta}>Shift Pagi • SEC-001 • Mulai {activeSess?.startedAt ? new Date(activeSess.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
            <Link href={`/supervisor/monitoring`} className="btn btn-outline btn-sm">Detail</Link>
          </div>
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
              {allFindings.filter(f => f.status !== 'resolved').map(finding => (
                <Link key={finding.id} href={`/supervisor/findings/${finding.id}`} className={styles.findingRow}>
                  <div className={`${styles.findingDot} ${finding.status === 'new' ? styles.dotDanger : styles.dotWarning}`} />
                  <div className={styles.findingContent}>
                    <span className={styles.findingTitle}>{finding.description.substring(0, 60)}...</span>
                    <span className={styles.findingMeta}>{finding.roomNameSnapshot} • {finding.floorNameSnapshot} • {new Date(finding.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className={`badge ${finding.status === 'new' ? 'badge-danger' : 'badge-warning'}`}>
                    {finding.status === 'new' ? 'Baru' : 'Proses'}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Officers panel */}
          <div className={`card ${styles.officersPanel}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Petugas</h2>
            </div>
            <div className={styles.officerList}>
              {todayStats.officers.map(officer => (
                <div key={officer.id} className={styles.officerRow}>
                  <div className={styles.officerRowAvatar}>
                    {officer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className={styles.officerRowInfo}>
                    <span className={styles.officerRowName}>{officer.name}</span>
                    <span className={styles.officerRowMeta}>{officer.id} • Shift {officer.shift} • {officer.patrols} patroli</span>
                  </div>
                  <span className={`badge ${officer.status === 'active' ? 'badge-success' : officer.status === 'scheduled' ? 'badge-info' : 'badge-neutral'}`}>
                    {officer.status === 'active' ? 'Aktif' : officer.status === 'scheduled' ? 'Terjadwal' : 'Off Duty'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today schedule */}
          <div className={`card ${styles.schedulePanel}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Jadwal Hari Ini</h2>
            </div>
            <div className={styles.scheduleList}>
              {todaySessions.map(sess => {
                const sched = patrolSchedules.find(s => s.id === sess.scheduleId);
                return (
                  <div key={sess.id} className={styles.scheduleRow}>
                    <span className={styles.schedTime}>{sched?.startTime}-{sched?.endTime}</span>
                    <span className={styles.schedPatrol}>#{sess.patrolNumber}</span>
                    <span className={styles.schedOfficer}>{sess.userName}</span>
                    <span className={`badge ${sess.status === 'completed' ? 'badge-success' : sess.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                      {sess.status === 'completed' ? '✓' : sess.status === 'in_progress' ? '●' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
