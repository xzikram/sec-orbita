'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './monitoring.module.css';

interface Room {
  id: string;
  name: string;
  code: string;
}

interface FloorWithRooms {
  id: string;
  name: string;
  code: string;
  rooms: Room[];
}

export default function MonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [floors, setFloors] = useState<FloorWithRooms[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const [sessRes, floorRes] = await Promise.all([
        fetch('/api/patrol/sessions'),
        fetch('/api/floors'),
      ]);

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(Array.isArray(sessData) ? sessData : []);
      }

      if (floorRes.ok) {
        const floorData = await floorRes.json();
        setFloors(Array.isArray(floorData) ? floorData : []);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);

    // Auto-refresh every 20 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Find active session
  const activeSessions = sessions.filter((s) => s.status === 'in_progress');
  const activeSess = activeSessions.find((s) => s.id === selectedSessionId) || activeSessions[0] || null;
  const lastSession = !activeSess
    ? [...sessions].reverse().find((s) => s.status === 'completed' || s.status === 'incomplete')
    : null;

  // Calculate totals
  const sessionFloors: any[] = activeSess?.sessionFloors || [];
  const totalRooms = floors.reduce((sum, f) => sum + (f.rooms?.length || 0), 0);
  const checkedTotal = sessionFloors.reduce((sum, sf) => sum + (sf.checkedRooms || 0), 0);
  const activeSessionRoomsTotal = sessionFloors.reduce((sum, sf) => sum + (sf.totalRooms || 0), 0) || totalRooms;
  const pctTotal = activeSessionRoomsTotal > 0 ? Math.round((checkedTotal / activeSessionRoomsTotal) * 100) : 0;
  const completedFloorsCount = sessionFloors.filter((sf) => sf.status === 'completed').length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Monitoring Real-Time</h1>
          {activeSess ? (
            <p className={styles.pageSub}>
              Patroli #{activeSess.patrolNumber} • {activeSess.schedule ? `${activeSess.schedule.startTime} - ${activeSess.schedule.endTime}` : 'Jadwal'} • {activeSess.user?.name || 'Petugas'}
            </p>
          ) : (
            <p className={styles.pageSub}>Pantau aktivitas patroli petugas keamanan rumah sakit secara langsung</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => loadData(true)}
            className="btn btn-outline btn-sm"
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: refreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.4s ease',
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {refreshing ? 'Memperbarui...' : 'Segarkan'}
          </button>
          {activeSess ? (
            <span className="badge badge-info badge-lg">
              <span className="status-dot status-dot-info" style={{ marginRight: 6 }} />
              Sedang Berjalan
            </span>
          ) : (
            <span className="badge badge-neutral badge-lg">
              <span className="status-dot status-dot-neutral" style={{ marginRight: 6 }} />
              Standby / Tidak Ada Patroli
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 12 }} />
        </div>
      ) : !activeSess ? (
        <div>
          <div className={`card ${styles.overallCard}`} style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 6 }}>
              Tidak Ada Sesi Patroli yang Sedang Berjalan
            </h3>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto 16px', fontSize: 'var(--font-size-sm)' }}>
              Petugas keamanan belum memulai putaran patroli baru saat ini. Halaman ini akan otomatis terbarui begitu sesi patroli aktif dimulai.
            </p>
            {lastSession && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'var(--color-neutral-100)',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                Sesi terakhir: <strong>Patroli #{lastSession.patrolNumber}</strong> oleh{' '}
                <strong>{lastSession.user?.name || 'Petugas'}</strong> (
                {lastSession.status === 'completed' ? 'Selesai' : 'Tidak Lengkap'}) pada{' '}
                {lastSession.completedAt ? new Date(lastSession.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WITA
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Active Officers Pills Selector if multiple officers are running sessions */}
          {activeSessions.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Pilih Petugas ({activeSessions.length}):
              </span>
              {activeSessions.map((s) => {
                const isSelected = activeSess?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                    style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    🛡️ {s.user?.name || 'Petugas'} (Ronda #{s.patrolNumber})
                  </button>
                );
              })}
            </div>
          )}

          {/* Overall progress */}
          <div className={`card ${styles.overallCard}`}>
            <div className={styles.overallBody}>
              <div className={styles.overallLeft}>
                <span className={styles.overallPct}>{pctTotal}%</span>
                <span className={styles.overallLabel}>Progress Keseluruhan</span>
              </div>
              <div className={styles.overallRight}>
                <div className={styles.overallStat}>
                  <span className={styles.oNum}>{checkedTotal}</span>
                  <span className={styles.oLabel}>Diperiksa</span>
                </div>
                <div className={styles.overallStat}>
                  <span className={styles.oNum}>{Math.max(0, activeSessionRoomsTotal - checkedTotal)}</span>
                  <span className={styles.oLabel}>Tersisa</span>
                </div>
                <div className={styles.overallStat}>
                  <span className={styles.oNum}>
                    {completedFloorsCount}/{sessionFloors.length}
                  </span>
                  <span className={styles.oLabel}>Lantai Selesai</span>
                </div>
              </div>
            </div>
            <div className="progress-bar progress-bar-lg" style={{ margin: '0 20px 16px' }}>
              <div className="progress-bar-fill progress-fill-primary" style={{ width: `${pctTotal}%` }} />
            </div>
          </div>

          {/* Floor detail cards */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Detail Per Lantai</h2>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              Pembaruan terakhir: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WITA
            </span>
          </div>

          <div className={styles.floorCards}>
            {sessionFloors.map((sf) => {
              const pct = sf.totalRooms > 0 ? Math.round((sf.checkedRooms / sf.totalRooms) * 100) : 0;
              const floorDef = floors.find((f) => f.id === sf.floorId);
              const floorRooms = floorDef?.rooms || [];
              const checks: any[] = sf.patrolChecks || [];
              const checkedRoomIds = checks.map((c) => c.roomId);
              const uncheckedRooms = floorRooms.filter((r) => !checkedRoomIds.includes(r.id));

              return (
                <div key={sf.id} className={`card ${styles.floorDetailCard}`}>
                  <div className={styles.floorHeader}>
                    <div>
                      <h3 className={styles.floorName}>{sf.floor?.name || floorDef?.name || `Lantai ${sf.floorId}`}</h3>
                      <span className={styles.floorMeta}>
                        {sf.checkedRooms}/{sf.totalRooms} ruangan • {pct}%
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        sf.status === 'completed' || pct === 100
                          ? 'badge-success'
                          : sf.status === 'in_progress' || pct > 0
                          ? 'badge-info'
                          : 'badge-neutral'
                      }`}
                    >
                      {sf.status === 'completed' || pct === 100 ? 'Selesai' : pct > 0 ? 'Berjalan' : 'Belum'}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ margin: '8px 0 12px' }}>
                    <div
                      className={`progress-bar-fill ${
                        pct === 100 ? 'progress-fill-success' : 'progress-fill-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Room list */}
                  {checks.length > 0 && (
                    <div className={styles.roomTable}>
                      <div className={styles.roomTableHeader}>
                        <span>Ruangan</span>
                        <span>Jam</span>
                        <span>AC</span>
                        <span>Lampu</span>
                        <span>Status</span>
                      </div>
                      {checks.slice(0, 10).map((chk) => (
                        <div key={chk.id} className={styles.roomTableRow}>
                          <span className={styles.roomName}>{chk.roomNameSnapshot}</span>
                          <span className={styles.roomTime}>
                            {chk.checkedAt
                              ? new Date(chk.checkedAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Asia/Makassar',
                                })
                              : '-'}
                          </span>
                          <span
                            className={`${styles.roomTag} ${
                              chk.acStatus === 'on'
                                ? styles.tagOn
                                : chk.acStatus === 'off'
                                ? styles.tagOff
                                : styles.tagNa
                            }`}
                          >
                            {chk.acStatus === 'on' ? 'ON' : chk.acStatus === 'off' ? 'OFF' : '—'}
                          </span>
                          <span
                            className={`${styles.roomTag} ${
                              chk.lightStatus === 'on' ? styles.tagOn : styles.tagOff
                            }`}
                          >
                            {chk.lightStatus === 'on' ? 'ON' : 'OFF'}
                          </span>
                          <span
                            className={`badge ${chk.condition === 'normal' ? 'badge-success' : 'badge-danger'}`}
                          >
                            {chk.condition === 'normal' ? 'Normal' : 'Temuan'}
                          </span>
                        </div>
                      ))}
                      {checks.length > 10 && (
                        <div className={styles.moreLink}>+{checks.length - 10} ruangan lainnya</div>
                      )}
                    </div>
                  )}

                  {/* Unchecked rooms */}
                  {uncheckedRooms.length > 0 && sf.status !== 'pending' && (
                    <div className={styles.unchecked}>
                      <span className={styles.uncheckedLabel}>Belum diperiksa ({uncheckedRooms.length}):</span>
                      <div className={styles.uncheckedList}>
                        {uncheckedRooms.slice(0, 8).map((r) => (
                          <span key={r.id} className={styles.uncheckedChip}>
                            {r.name}
                          </span>
                        ))}
                        {uncheckedRooms.length > 8 && (
                          <span className={styles.uncheckedChip} style={{ opacity: 0.8 }}>
                            +{uncheckedRooms.length - 8} lainnya
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {sf.qrValidated && (
                    <div className={styles.qrValidated}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      QR tervalidasi pada{' '}
                      {sf.qrScannedAt
                        ? new Date(sf.qrScannedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Makassar',
                          })
                        : '-'}{' '}
                      WITA
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
