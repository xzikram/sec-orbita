'use client';

import Link from 'next/link';
import { todaySessions, session6Floors, lantai1Checks, sbChecks } from '@/lib/supervisor-data';
import { patrolSchedules, floors, getRoomsByFloor } from '@/lib/dummy-data';
import styles from './monitoring.module.css';

export default function MonitoringPage() {
  const activeSess = todaySessions.find(s => s.status === 'in_progress');
  const sched = activeSess ? patrolSchedules.find(s => s.id === activeSess.scheduleId) : null;
  const totalRooms = floors.reduce((s, f) => s + getRoomsByFloor(f.id).length, 0);
  const checkedTotal = session6Floors.reduce((s, f) => s + f.checkedRooms, 0);
  const pctTotal = Math.round((checkedTotal / totalRooms) * 100);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Monitoring Real-Time</h1>
          <p className={styles.pageSub}>Patroli #{activeSess?.patrolNumber} • {sched?.startTime} - {sched?.endTime} • {activeSess?.userName}</p>
        </div>
        <span className="badge badge-info badge-lg">
          <span className="status-dot status-dot-info" style={{ marginRight: 4 }} />
          Sedang Berjalan
        </span>
      </div>

      {/* Overall progress */}
      <div className={`card ${styles.overallCard}`}>
        <div className={styles.overallBody}>
          <div className={styles.overallLeft}>
            <span className={styles.overallPct}>{pctTotal}%</span>
            <span className={styles.overallLabel}>Progress Keseluruhan</span>
          </div>
          <div className={styles.overallRight}>
            <div className={styles.overallStat}><span className={styles.oNum}>{checkedTotal}</span><span className={styles.oLabel}>Diperiksa</span></div>
            <div className={styles.overallStat}><span className={styles.oNum}>{totalRooms - checkedTotal}</span><span className={styles.oLabel}>Tersisa</span></div>
            <div className={styles.overallStat}><span className={styles.oNum}>{session6Floors.filter(f => f.status === 'completed').length}/{floors.length}</span><span className={styles.oLabel}>Lantai</span></div>
          </div>
        </div>
        <div className="progress-bar progress-bar-lg" style={{ margin: '0 20px 16px' }}>
          <div className="progress-bar-fill progress-fill-primary" style={{ width: `${pctTotal}%` }} />
        </div>
      </div>

      {/* Floor detail cards */}
      <h2 className={styles.sectionTitle}>Detail Per Lantai</h2>
      <div className={styles.floorCards}>
        {session6Floors.map(sf => {
          const pct = sf.totalRooms > 0 ? Math.round((sf.checkedRooms / sf.totalRooms) * 100) : 0;
          const floorRooms = getRoomsByFloor(sf.floorId);
          const checks = sf.floorId === 'floor-1' ? lantai1Checks : sf.floorId === 'floor-sb' ? sbChecks : [];
          const checkedIds = checks.map(c => c.roomId);
          const uncheckedRooms = floorRooms.filter(r => !checkedIds.includes(r.id));

          return (
            <div key={sf.id} className={`card ${styles.floorDetailCard}`}>
              <div className={styles.floorHeader}>
                <div>
                  <h3 className={styles.floorName}>{sf.floorName}</h3>
                  <span className={styles.floorMeta}>{sf.checkedRooms}/{sf.totalRooms} ruangan • {pct}%</span>
                </div>
                <span className={`badge ${pct === 100 ? 'badge-success' : pct > 0 ? 'badge-info' : 'badge-neutral'}`}>
                  {pct === 100 ? 'Selesai' : pct > 0 ? 'Berjalan' : 'Belum'}
                </span>
              </div>
              <div className="progress-bar" style={{ margin: '8px 0 12px' }}>
                <div className={`progress-bar-fill ${pct === 100 ? 'progress-fill-success' : 'progress-fill-primary'}`} style={{ width: `${pct}%` }} />
              </div>

              {/* Room list */}
              {checks.length > 0 && (
                <div className={styles.roomTable}>
                  <div className={styles.roomTableHeader}>
                    <span>Ruangan</span><span>Jam</span><span>AC</span><span>Lampu</span><span>Status</span>
                  </div>
                  {checks.slice(0, 5).map(chk => (
                    <div key={chk.id} className={styles.roomTableRow}>
                      <span className={styles.roomName}>{chk.roomNameSnapshot}</span>
                      <span className={styles.roomTime}>{new Date(chk.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`${styles.roomTag} ${chk.acStatus === 'on' ? styles.tagOn : chk.acStatus === 'off' ? styles.tagOff : styles.tagNa}`}>
                        {chk.acStatus === 'on' ? 'ON' : chk.acStatus === 'off' ? 'OFF' : '—'}
                      </span>
                      <span className={`${styles.roomTag} ${chk.lightStatus === 'on' ? styles.tagOn : styles.tagOff}`}>
                        {chk.lightStatus === 'on' ? 'ON' : 'OFF'}
                      </span>
                      <span className={`badge ${chk.condition === 'normal' ? 'badge-success' : 'badge-danger'}`}>
                        {chk.condition === 'normal' ? 'Normal' : 'Temuan'}
                      </span>
                    </div>
                  ))}
                  {checks.length > 5 && (
                    <div className={styles.moreLink}>+{checks.length - 5} ruangan lainnya</div>
                  )}
                </div>
              )}

              {/* Unchecked rooms */}
              {uncheckedRooms.length > 0 && sf.status !== 'pending' && (
                <div className={styles.unchecked}>
                  <span className={styles.uncheckedLabel}>Belum diperiksa:</span>
                  <div className={styles.uncheckedList}>
                    {uncheckedRooms.map(r => (
                      <span key={r.id} className={styles.uncheckedChip}>{r.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {sf.qrValidated && (
                <div className={styles.qrValidated}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  QR tervalidasi pada {sf.qrScannedAt ? new Date(sf.qrScannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
