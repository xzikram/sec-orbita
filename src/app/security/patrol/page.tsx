'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  floors,
  activeSession,
  activeSessionFloors,
  activeChecks,
  patrolSchedules,
  getRoomsByFloor,
  getFloorById,
  rooms,
} from '@/lib/dummy-data';
import styles from './patrol.module.css';

// Canonical physical floor progression for RS Mata JEC ORBITA
const CANONICAL_FLOOR_ORDER: Record<string, number> = {
  'SB': 0,
  'L1': 1,
  '1': 1,
  'P2': 2,
  '2': 2,
  'P3': 3,
  '3': 3,
  'P4': 4,
  '4': 4,
  'L5': 5,
  '5': 5,
  'L6': 6,
  '6': 6,
  'L7': 7,
  '7': 7,
  'L8': 8,
  '8': 8,
  'L9': 9,
  '9': 9,
  'L10': 10,
  '10': 10,
  'L11': 11,
  '11': 11,
};

function getFloorSortOrder(floorObj: any): number {
  if (!floorObj) return 999;
  const code = String(floorObj.code || floorObj.floorCodeSnapshot || '').toUpperCase().trim();
  if (CANONICAL_FLOOR_ORDER[code] !== undefined) {
    return CANONICAL_FLOOR_ORDER[code];
  }
  const name = String(floorObj.name || floorObj.floorNameSnapshot || '').toUpperCase().trim();
  if (name.includes('BASEMENT') || name.includes('SEMI')) return 0;
  const match = code.match(/\d+/) || name.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return floorObj.sortOrder ?? 999;
}

export default function PatrolPage() {
  const [isReversed, setIsReversed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEarlyFinishModal, setShowEarlyFinishModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('Panggilan Darurat / Insiden IGD');
  const [earlyNotes, setEarlyNotes] = useState('');
  const [submittingEarly, setSubmittingEarly] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 1. Instantly read user's saved route direction preference
    try {
      const saved = localStorage.getItem('patrol-reversed');
      if (saved === 'true') {
        setIsReversed(true);
      }
    } catch {}

    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/patrol/sessions').catch(() => null),
        ]);

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          const empId = meData.user?.employeeId || 'guest';
          const saved = localStorage.getItem(`patrol-reversed-${empId}`) || localStorage.getItem('patrol-reversed');
          if (saved === 'true') {
            setIsReversed(true);
          }
        }

        if (sessionsRes && sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          setSession(active);
        }

        // Get offline checks
        try {
          const { getOfflineChecks } = await import('@/lib/db');
          const offline = await getOfflineChecks();
          setOfflineChecks(offline);
        } catch (e) {
          console.error('IndexedDB load error:', e);
        }

      } catch (err) {
        console.error('Patrol load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Pre-cache patrol package in background for zero-drop offline rounds
    import('@/lib/offline-cache').then(({ downloadPatrolPackage }) => {
      downloadPatrolPackage().catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSetReversed = (reversed: boolean) => {
    setIsReversed(reversed);
    try {
      localStorage.setItem('patrol-reversed', String(reversed));
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          const empId = data.user?.employeeId || 'guest';
          localStorage.setItem(`patrol-reversed-${empId}`, String(reversed));
        })
        .catch(() => {});
    } catch {}
  };

  const handleEarlyFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession?.id) return;
    setSubmittingEarly(true);
    try {
      const res = await fetch('/api/patrol/sessions/early-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          reason: earlyReason,
          notes: earlyNotes,
        }),
      });
      if (res.ok) {
        window.location.href = '/security/patrol/summary';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal mengakhiri patroli');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat mengakhiri patroli.');
    } finally {
      setSubmittingEarly(false);
    }
  };

  const currentSession = session || activeSession;
  const schedule = currentSession.schedule || patrolSchedules.find(s => s.id === currentSession.scheduleId) || patrolSchedules[0];

  const totalRooms = floors.reduce((sum, f) => sum + getRoomsByFloor(f.id).length, 0);

  // Combine online (DB) and offline (IndexedDB) check room codes
  const onlineCheckRoomCodes = new Set<string>();
  currentSession.sessionFloors?.forEach((sf: any) => {
    sf.patrolChecks?.forEach((c: any) => onlineCheckRoomCodes.add(c.roomCodeSnapshot));
  });

  const offlineCheckRoomCodes = new Set<string>();
  offlineChecks.forEach((c: any) => {
    const isMatchingFloor = currentSession.sessionFloors?.some((sf: any) => {
      const floor = floors.find(f => f.id === sf.floorId || f.code === sf.floorCodeSnapshot);
      const dummySfId = floor ? `sf-${floor.code.toLowerCase()}` : '';
      return sf.id === c.sessionFloorId || (dummySfId && dummySfId === c.sessionFloorId);
    });
    if (isMatchingFloor) {
      const r = rooms.find(rm => rm.id === c.roomId);
      if (r) offlineCheckRoomCodes.add(r.code);
    }
  });

  const checkedRoomCodesSet = new Set([...onlineCheckRoomCodes, ...offlineCheckRoomCodes]);
  const checkedRooms = checkedRoomCodesSet.size;
  const overallProgress = totalRooms > 0 ? Math.round((checkedRooms / totalRooms) * 100) : 0;

  const sessionFloorsSource = (currentSession.sessionFloors && currentSession.sessionFloors.length > 0)
    ? currentSession.sessionFloors
    : floors.map(f => ({
        id: `sf-${f.code.toLowerCase()}`,
        floorId: f.id,
        floorNameSnapshot: f.name,
        floorCodeSnapshot: f.code,
        status: 'pending',
        qrValidated: false,
        patrolChecks: [],
      }));

  const rawFloorProgress = sessionFloorsSource.map((sf: any) => {
    const floor = floors.find(f => 
      f.id === sf.floorId || 
      f.code.toUpperCase() === String(sf.floorCodeSnapshot || '').toUpperCase() ||
      (sf.floor?.code && f.code.toUpperCase() === sf.floor.code.toUpperCase())
    ) || getFloorById(sf.floorCodeSnapshot) || getFloorById(sf.floorId) || getFloorById(sf.floorNameSnapshot) || floors[0];

    const floorRooms = getRoomsByFloor(floor.id);
    
    const dbCheckedCodes = sf.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
    const offCheckedCodes = offlineChecks
      .filter((c: any) => c.sessionFloorId === sf.id || (floor?.code && c.sessionFloorId === `sf-${floor.code.toLowerCase()}`))
      .map((c: any) => {
        const r = rooms.find(rm => rm.id === c.roomId);
        return r ? r.code : c.roomId;
      });
    const combinedFloorChecked = new Set([...dbCheckedCodes, ...offCheckedCodes]);
    
    const checked = combinedFloorChecked.size;
    const total = floorRooms.length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    // Strict status: only completed if ALL rooms checked AND QR validated
    let computedStatus: 'completed' | 'waiting_qr' | 'in_progress' | 'pending' = 'pending';
    if (sf.qrValidated && percent === 100) {
      computedStatus = 'completed';
    } else if (percent === 100 && !sf.qrValidated) {
      computedStatus = 'waiting_qr';
    } else if (checked > 0 || sf.status === 'in_progress') {
      computedStatus = 'in_progress';
    } else {
      computedStatus = 'pending';
    }

    return {
      ...sf,
      floor,
      sortOrder: getFloorSortOrder(floor),
      total,
      checked,
      percent,
      computedStatus,
    };
  });

  // Strictly sort by canonical floor order ascending (SB -> 11) or descending (11 -> SB)
  const floorProgress = [...rawFloorProgress].sort((a, b) => {
    return isReversed ? b.sortOrder - a.sortOrder : a.sortOrder - b.sortOrder;
  });

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat progress patroli...</p></div>;
  }

  const getStatusIcon = (computedStatus: string, index: number) => {
    if (computedStatus === 'completed') {
      return (
        <div className={`${styles.statusCircle} ${styles.statusCompleted}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    if (computedStatus === 'waiting_qr') {
      return (
        <div className={`${styles.statusCircle}`} style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#d97706' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
      );
    }
    if (computedStatus === 'in_progress') {
      return (
        <div className={`${styles.statusCircle} ${styles.statusActive}`}>
          <span className={styles.statusActiveInner} />
        </div>
      );
    }
    return (
      <div className={`${styles.statusCircle} ${styles.statusPending}`}>
        <span className={styles.statusNumber}>{index + 1}</span>
      </div>
    );
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'progress-fill-success';
    if (percent > 0) return 'progress-fill-primary';
    return 'progress-fill-primary';
  };

  return (
    <div className="page-content" style={{ paddingBottom: '96px' }}>
      {/* Patrol Header */}
      <div className={`${styles.patrolInfo} animate-slide-up`}>
        <div className={styles.patrolInfoHeader}>
          <div>
            <h1 className={styles.patrolTitle}>Patroli #{currentSession.patrolNumber || activeSession.patrolNumber}</h1>
            <p className={styles.patrolPeriod}>
              {schedule?.startTime} - {schedule?.endTime}
            </p>
            {currentSession.user?.name && (
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                Petugas: <strong>{currentSession.user.name}</strong>
                {currentSession.notes?.includes('[BERGABUNG:') && (
                  <span style={{ marginLeft: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    🤝 Tim Kolaboratif
                  </span>
                )}
              </p>
            )}
          </div>
          <span className="badge badge-info badge-lg">Sedang Berjalan</span>
        </div>

        <div className={styles.overallProgress}>
          <div className={styles.progressHeader}>
            <span className="text-sm text-secondary">Progress</span>
            <span className="font-bold text-lg">{overallProgress}%</span>
          </div>
          <div className="progress-bar progress-bar-lg">
            <div
              className={`progress-bar-fill ${getProgressColor(overallProgress)}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {checkedRooms} dari {totalRooms} ruangan • {floorProgress.filter((f: any) => f.computedStatus === 'completed').length} dari {floors.length} lantai
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-light)' }}>
            {offlineChecks.length > 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📱 <strong>{offlineChecks.length} titik tersimpan lokal</strong> (auto-sync saat scan QR)
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Memori HP: 0 KB (Lega)
              </span>
            )}
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setShowEarlyFinishModal(true)}
              style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}
              id="btn-early-finish"
            >
              ⏹️ Selesaikan Sebagian
            </button>
          </div>
        </div>
      </div>

      {/* Completed Patrol Summary Banner */}
      {(overallProgress === 100 && floorProgress.every((f: any) => f.computedStatus === 'completed')) && (
        <div className="card animate-scale-in" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: 700 }}>🎉 Patroli Lengkap</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15px', color: '#fff', fontWeight: 800 }}>Semua Lantai Berhasil Diperiksa!</h3>
            </div>
            <Link
              href="/security/patrol/summary"
              className="btn"
              style={{ background: '#fff', color: '#059669', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}
              id="btn-view-summary"
            >
              Lihat Ringkasan →
            </Link>
          </div>
        </div>
      )}

      {/* Floor Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', marginBottom: '0.75rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>Rute Patroli</h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
            {isReversed ? 'Arah: Dari Atas ke Bawah (11 ➔ SB)' : 'Arah: Dari Bawah ke Atas (SB ➔ 11)'}
          </p>
        </div>
        
        {/* Sleek Segmented Switcher for Direction */}
        <div style={{ display: 'flex', background: 'var(--color-neutral-100)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleSetReversed(false)}
            id="btn-route-sb-11"
            style={{
              padding: '5px 9px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              background: !isReversed ? 'var(--color-primary-600)' : 'transparent',
              color: !isReversed ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ⬆️ SB ➔ 11
          </button>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleSetReversed(true)}
            id="btn-route-11-sb"
            style={{
              padding: '5px 9px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              background: isReversed ? 'var(--color-primary-600)' : 'transparent',
              color: isReversed ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ⬇️ 11 ➔ SB
          </button>
        </div>
      </div>

      <div className={styles.timeline}>
        {floorProgress.map((fp: any, index: number) => (
          <Link
            key={fp.id}
            href={`/security/patrol/floor/${fp.floor.id}`}
            className={`${styles.timelineItem} animate-slide-up stagger-${index + 1}`}
            id={`patrol-floor-${fp.floor.code}`}
          >
            {/* Timeline connector */}
            {index < floorProgress.length - 1 && (
              <div className={`${styles.timelineConnector} ${fp.computedStatus === 'completed' ? styles.connectorCompleted : ''}`} />
            )}

            {/* Status icon */}
            {getStatusIcon(fp.computedStatus, index)}

            {/* Floor card */}
            <div className={`card ${styles.timelineCard} ${fp.computedStatus === 'in_progress' ? styles.timelineCardActive : ''}`}>
              <div className="card-body">
                <div className={styles.floorCardHeader}>
                  <div>
                    <h4 className={styles.floorName}>{fp.floor.name}</h4>
                    <p className={styles.floorRoomCount}>
                      {fp.checked}/{fp.total} Ruangan
                    </p>
                  </div>
                  <div className={styles.floorPercent}>
                    <span className={`${styles.percentValue} ${fp.computedStatus === 'completed' ? 'text-success' : ''}`}>
                      {fp.percent}%
                    </span>
                  </div>
                </div>

                <div className="progress-bar mt-2">
                  <div
                    className={`progress-bar-fill ${getProgressColor(fp.percent)}`}
                    style={{ width: `${fp.percent}%` }}
                  />
                </div>

                {fp.computedStatus === 'completed' && fp.completedAt && (
                  <p className={styles.completedTime} suppressHydrationWarning>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Selesai {mounted && fp.completedAt ? (() => {
                      try {
                        const d = new Date(fp.completedAt);
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      } catch { return ''; }
                    })() : ''}
                    {fp.qrValidated && (
                      <span className={styles.qrBadge}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        QR
                      </span>
                    )}
                  </p>
                )}

                {fp.computedStatus === 'waiting_qr' && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '5px 9px', borderRadius: '6px', fontWeight: 600 }}>
                    <span>📱</span>
                    <span>Semua Ruangan Selesai — Wajib Scan QR Lantai</span>
                  </div>
                )}

                {fp.computedStatus === 'in_progress' && (
                  <div className={styles.activeHint}>
                    <span className="status-dot status-dot-info" />
                    <span>Sedang diperiksa ({fp.checked}/{fp.total}) — Tap untuk lanjut</span>
                  </div>
                )}

                {fp.computedStatus === 'pending' && (
                  <p className={styles.pendingHint}>Belum dimulai</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Modal Akhiri Patroli Lebih Awal */}
      {showEarlyFinishModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Akhiri Patroli Lebih Awal?</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Patroli ini belum selesai 100%. Pilih alasan resmi di bawah ini agar tercatat transparan di laporan supervisor:
            </p>

            <form onSubmit={handleEarlyFinish}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Alasan Berhenti:
                </label>
                <select
                  className="form-input"
                  style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                  value={earlyReason}
                  onChange={(e) => setEarlyReason(e.target.value)}
                  required
                >
                  <option value="Panggilan Darurat / Insiden IGD">🚨 Panggilan Darurat / Insiden IGD</option>
                  <option value="Lantai / Area Steril (Tindakan Pasien/Operasi)">🏥 Lantai / Area Steril (Tindakan Pasien/Operasi)</option>
                  <option value="Waktu Shift Berakhir / Apel & Serah Terima">⏰ Waktu Shift Berakhir / Apel & Serah Terima</option>
                  <option value="Pintu / Akses Area Terkunci">🚪 Pintu / Akses Area Terkunci</option>
                  <option value="Instruksi Komandan Regu (Danru)">👮 Instruksi Komandan Regu (Danru)</option>
                  <option value="Lainnya">📝 Lainnya (Isi catatan di bawah)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Catatan Tambahan (Opsional):
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ width: '100%', fontSize: '12px', resize: 'none' }}
                  placeholder="Contoh: Dipanggil penanganan pasien gaduh gelisah di lobi..."
                  value={earlyNotes}
                  onChange={(e) => setEarlyNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEarlyFinishModal(false)}
                  disabled={submittingEarly}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                  disabled={submittingEarly}
                >
                  {submittingEarly ? 'Menyimpan...' : 'Konfirmasi Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

