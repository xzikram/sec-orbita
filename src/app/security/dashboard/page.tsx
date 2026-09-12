'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { rooms } from '@/lib/dummy-data';
import styles from './dashboard.module.css';

interface SessionFloor {
  id: string;
  floorId: string;
  floorNameSnapshot: string;
  floorCodeSnapshot: string;
  status: string;
  patrolChecks: { id: string; condition: string }[];
}

interface PatrolSession {
  id: string;
  userId?: string;
  user?: { id?: string; name: string; employeeId?: string };
  patrolNumber: number;
  status: string;
  scheduleId: string;
  schedule?: { name: string; startTime: string; endTime: string };
  notes?: string;
  sessionFloors: SessionFloor[];
}

interface DashboardData {
  session: PatrolSession | null;
  totalRooms: number;
  checkedRooms: number;
  findingsCount: number;
  floorsCompleted: number;
}

export default function SecurityDashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeState, setResumeState] = useState<{ floorId: string; floorName: string; roomName: string; sessionId: string } | null>(null);
  const [pendingHandover, setPendingHandover] = useState<any | null>(null);
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverSuccess, setHandoverSuccess] = useState(false);
  const [leaderboardInfo, setLeaderboardInfo] = useState<{ myRank: number; score: number } | null>(null);

  // Handover Pilihan 1 states (Semua Shift vs Tunjuk Tertentu)
  const [handoverRecipientType, setHandoverRecipientType] = useState<'all' | 'specific'>('all');
  const [handoverToUserId, setHandoverToUserId] = useState('');
  const [handoverTargetShiftId, setHandoverTargetShiftId] = useState('');
  const [securityStaff, setSecurityStaff] = useState<any[]>([]);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Collaborative & Override state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [joiningRound, setJoiningRound] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedNextScheduleId, setSelectedNextScheduleId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Petugas sebelumnya lupa checkout / pergantian giliran');
  const [overrideCustomNotes, setOverrideCustomNotes] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchHandover = async () => {
    try {
      const res = await fetch('/api/handover');
      if (res.ok) {
        const data = await res.json();
        setPendingHandover(data.handover || null);
      }
    } catch (err) {
      console.error('Error fetching handover:', err);
    }
  };

  const handleAcknowledgeHandover = async () => {
    if (!pendingHandover) return;
    try {
      const res = await fetch('/api/handover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingHandover.id }),
      });
      if (res.ok) {
        setPendingHandover(null);
      }
    } catch (err) {
      console.error('Error acknowledging handover:', err);
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverRecipientType === 'specific' && !handoverToUserId) {
      alert('Silakan pilih petugas security penerima serah terima');
      return;
    }
    setSubmittingHandover(true);
    try {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: handoverNotes,
          shiftId: handoverTargetShiftId || undefined,
          toUserId: handoverRecipientType === 'specific' ? handoverToUserId : null,
        }),
      });
      if (res.ok) {
        setHandoverSuccess(true);
        setHandoverNotes('');
        setHandoverToUserId('');
        setHandoverRecipientType('all');
        setTimeout(() => {
          setHandoverSuccess(false);
          setShowHandoverForm(false);
        }, 2200);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal mengirim serah terima');
      }
    } catch (err) {
      console.error('Error submitting handover:', err);
      alert('Terjadi kesalahan jaringan saat mengirim serah terima.');
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Join active collaborative round
  const handleJoinActiveRound = async () => {
    if (!data?.session) return;
    setJoiningRound(true);
    try {
      const res = await fetch('/api/patrol/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.session.id }),
      });
      if (res.ok) {
        window.location.href = '/security/patrol';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal bergabung ke sesi patroli');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat bergabung ke sesi.');
    } finally {
      setJoiningRound(false);
    }
  };

  // Force close previous round and start the new round
  const handleConfirmOverride = async () => {
    if (!selectedNextScheduleId) {
      alert('Silakan pilih jadwal ronda yang ingin dimulai');
      return;
    }
    setSubmittingOverride(true);
    try {
      const res = await fetch('/api/patrol/sessions/override-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: selectedNextScheduleId,
          previousSessionId: data?.session?.id,
          reason: overrideReason,
          notes: overrideCustomNotes,
        }),
      });
      if (res.ok) {
        window.location.href = '/security/patrol';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal memulai ronda baru');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menutup ronda sebelumnya.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);

    // Check resume state
    try {
      const saved = localStorage.getItem('lastPatrolState');
      if (saved) {
        const state = JSON.parse(saved);
        // Only show if less than 8 hours old
        if (Date.now() - new Date(state.timestamp).getTime() < 8 * 3600000) {
          setResumeState(state);
        } else {
          localStorage.removeItem('lastPatrolState');
        }
      }
    } catch { /* ignore */ }

    // Fetch real data from APIs
    async function loadDashboard() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [meRes, sessionsRes, findingsRes, floorsRes, schedRes, staffRes, shiftsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch(`/api/patrol/sessions?date=${today}`).catch(() => null),
          fetch('/api/findings?status=new&limit=100').catch(() => null),
          fetch('/api/floors').catch(() => null),
          fetch('/api/schedules').catch(() => null),
          fetch('/api/users?role=security').catch(() => null),
          fetch('/api/shifts').catch(() => null),
        ]);

        let loggedInUser: any = null;
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          loggedInUser = meData.user || null;
          setCurrentUser(loggedInUser);
        }

        if (staffRes && staffRes.ok) {
          const staff = await staffRes.json();
          setSecurityStaff(Array.isArray(staff) ? staff : []);
        }

        if (shiftsRes && shiftsRes.ok) {
          const shifts = await shiftsRes.json();
          const activeShifts = Array.isArray(shifts) ? shifts : [];
          setShiftsList(activeShifts);
          if (activeShifts.length > 0) {
            const oppShift = activeShifts.find((s: any) => loggedInUser?.shiftId && s.id !== loggedInUser.shiftId) || activeShifts[0];
            setHandoverTargetShiftId(oppShift.id);
          }
        }

        const schedList = schedRes && schedRes.ok ? await schedRes.json() : [];
        setSchedules(schedList);
        if (schedList.length > 0) {
          setSelectedNextScheduleId(schedList[0].id);
        }

        const sessions: PatrolSession[] = sessionsRes && sessionsRes.ok ? await sessionsRes.json() : [];
        const findingsData = findingsRes && findingsRes.ok ? await findingsRes.json() : { data: [], total: 0 };
        const floors = floorsRes && floorsRes.ok ? await floorsRes.json() : [];

        // Find active or latest session
        const activeSession = sessions.find(s => s.status === 'in_progress') || sessions[sessions.length - 1] || null;

        // Count total rooms from floors
        const totalRooms = floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0);

        // Count checked rooms from session combining online and offline checks
        let checkedRooms = 0;
        let floorsCompleted = 0;
        if (activeSession) {
          let offlineChecks: any[] = [];
          try {
            const { getOfflineChecks } = await import('@/lib/db');
            offlineChecks = await getOfflineChecks();
          } catch {}

          for (const sf of activeSession.sessionFloors) {
            const dbCheckedRoomCodes = sf.patrolChecks.map((c: any) => c.roomCodeSnapshot);
            const offCheckedRoomCodes = offlineChecks
              .filter((c: any) => c.sessionFloorId === sf.id)
              .map((c: any) => {
                const r = rooms.find(rm => rm.id === c.roomId);
                return r ? r.code : c.roomId;
              });
            const combinedFloorChecked = new Set([...dbCheckedRoomCodes, ...offCheckedRoomCodes]);
            checkedRooms += combinedFloorChecked.size;
            if (sf.status === 'completed') floorsCompleted++;
          }
        }

        const findingsCount = typeof findingsData === 'object' && 'total' in findingsData
          ? findingsData.total
          : Array.isArray(findingsData) ? findingsData.length : 0;

        setData({
          session: activeSession,
          totalRooms,
          checkedRooms,
          findingsCount,
          floorsCompleted,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    fetchHandover();

    // Fetch leaderboard stats
    fetch('/api/leaderboard')
      .then(res => (res.ok ? res.json() : null))
      .then(lb => {
        if (lb && lb.myRank) {
          const myUser = lb.leaderboard?.[lb.myRank - 1];
          setLeaderboardInfo({ myRank: lb.myRank, score: myUser?.score || 0 });
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const overallProgress = data && data.totalRooms > 0
    ? Math.round((data.checkedRooms / data.totalRooms) * 100)
    : 0;

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'progress-fill-success';
    return 'progress-fill-primary';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--color-neutral-200)', borderTop: '3px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p className="text-sm text-muted">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const isCurrentUserOwner = Boolean(
    currentUser && data?.session?.userId && data.session.userId === currentUser.id
  );
  const isCurrentUserJoined = Boolean(
    currentUser &&
    data?.session?.notes &&
    data.session.notes.includes(`[BERGABUNG: ${currentUser.name}`)
  );
  const isParticipating = isCurrentUserOwner || isCurrentUserJoined;

  return (
    <div className="page-content">
      {/* Pending Handover Banner */}
      {pendingHandover && (
        <div className="card animate-slide-up" style={{ marginBottom: '14px', borderLeft: '4px solid var(--color-warning-500)', background: 'var(--color-warning-50)', color: 'var(--color-neutral-900)' }}>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-warning-700)' }}>
                  {pendingHandover.toUser ? '🎯 Serah Terima Ditujukan Khusus Untuk Anda' : '📢 Serah Terima Shift (Seluruh Tim)'}
                </h3>
              </div>
              <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                {pendingHandover.shift?.name || 'Shift'}
              </span>
            </div>
            <p style={{ fontSize: '13px', margin: '0 0 8px', lineHeight: '1.4' }}>
              Diserahkan oleh: <strong>{pendingHandover.fromUser?.name}</strong> ({pendingHandover.fromUser?.employeeId})
              {pendingHandover.toUser && (
                <span style={{ color: 'var(--color-primary-700)', marginLeft: '6px' }}>
                  → Penerima: <strong>{pendingHandover.toUser.name}</strong>
                </span>
              )}
            </p>
            <div style={{ background: 'white', border: '1px solid var(--color-neutral-200)', borderRadius: '6px', padding: '10px', fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '12px', fontStyle: 'italic' }}>
              "{pendingHandover.notes || 'Tidak ada catatan khusus.'}"
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                🚨 <strong>{pendingHandover.openFindings} temuan open</strong> belum selesai
              </span>
              <button 
                onClick={handleAcknowledgeHandover} 
                className="btn btn-warning btn-sm"
                style={{ height: '32px', minHeight: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
              >
                Saya Sudah Baca & Terima ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Patrol Banner */}
      {resumeState && (
        <div className={`card animate-slide-up`} style={{ marginBottom: '12px', borderLeft: '3px solid var(--color-primary-500)' }}>
          <div className="card-body" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-primary-500)', fontWeight: 600, margin: 0 }}>Lanjutkan Patroli</p>
              <p style={{ fontSize: '13px', margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                {resumeState.roomName} — {resumeState.floorName}
              </p>
            </div>
            <Link
              href={`/security/patrol/floor/${resumeState.floorId}`}
              className="btn btn-primary btn-sm"
              onClick={() => localStorage.removeItem('lastPatrolState')}
            >
              Lanjutkan →
            </Link>
          </div>
        </div>
      )}

      {/* Collaborative Join Round Banner: If someone else is running the round */}
      {data?.session && data.session.status === 'in_progress' && !isParticipating && (
        <div
          className="card animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#fff',
            padding: '16px',
            borderRadius: '14px',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(4, 120, 87, 0.25)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                📢 Ronda #{data.session.patrolNumber} Sedang Berjalan
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 4px', color: '#fff' }}>
                {data.session.schedule?.name || `Putaran Ronda #${data.session.patrolNumber}`}
              </h3>
              <p style={{ fontSize: '12px', opacity: 0.95, margin: '0 0 10px' }}>
                Dimulai oleh: <strong>{data.session.user?.name || 'Rekan Security'}</strong> • Progress: <strong>{data.checkedRooms}/{data.totalRooms} Ruangan ({overallProgress}%)</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={handleJoinActiveRound}
              disabled={joiningRound}
              className="btn btn-sm"
              style={{
                background: '#fff',
                color: '#065f46',
                fontWeight: 'bold',
                border: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                padding: '8px 14px',
              }}
              id="btn-join-round"
            >
              {joiningRound ? 'Bergabung...' : `🤝 Ikut Bergabung (Join Ronda #${data.session.patrolNumber})`}
            </button>
            <button
              type="button"
              onClick={() => setShowOverrideModal(true)}
              className="btn btn-sm"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 12px',
              }}
              id="btn-override-open"
            >
              ⚡ Tutup & Mulai Ronda Baru
            </button>
          </div>
        </div>
      )}

      {/* Date */}
      <p className={`text-sm text-secondary mb-3 ${styles.dateText}`}>
        {currentTime ? formatDate(currentTime) : ''}
      </p>

      {/* Motivating Leaderboard Widget */}
      <Link href="/security/leaderboard" style={{ textDecoration: 'none', display: 'block', marginBottom: '14px' }} id="widget-leaderboard">
        <div className="card animate-slide-up" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 700 }}>Papan Peringkat Security</p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>
                {leaderboardInfo ? `Peringkat #${leaderboardInfo.myRank} • ${leaderboardInfo.score} Poin Disiplin` : 'Cek Klasemen Tim & Peringkat Anda →'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Lihat Ranking →
          </span>
        </div>
      </Link>

      {/* Active Patrol Card */}
      {data?.session ? (
        <div className={`card card-dark ${styles.patrolCard} animate-slide-up`}>
          <div className="card-body">
            <div className={styles.patrolHeader}>
              <div>
                <span className={styles.patrolLabel}>PATROLI AKTIF</span>
                <h2 className={styles.patrolTitle}>
                  Patroli #{data.session.patrolNumber}
                </h2>
                <p className={styles.patrolPeriod}>
                  Periode {data.session.schedule?.startTime} - {data.session.schedule?.endTime}
                </p>
                {data.session.user?.name && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                    Petugas: <strong>{data.session.user.name}</strong> {isCurrentUserJoined && '(Anda bergabung)'}
                  </p>
                )}
              </div>
              <div className={styles.patrolBadge}>
                <span className="status-dot status-dot-info" />
                <span>{data.session.status === 'completed' ? 'Selesai' : 'Berjalan'}</span>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Progress Keseluruhan</span>
                <span className={styles.progressValue}>{overallProgress}%</span>
              </div>
              <div className="progress-bar progress-bar-lg">
                <div
                  className={`progress-bar-fill ${getProgressColor(overallProgress)}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className={styles.progressDetail}>
                {data.checkedRooms} dari {data.totalRooms} ruangan diperiksa
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`card animate-slide-up ${styles.emptyPatrolCard}`}>
          <div className={`card-body ${styles.emptyPatrolBody}`}>
            <div className={styles.emptyPatrolIconCircle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className={styles.emptyPatrolTitle}>Belum Ada Patroli Aktif</h3>
            <p className={styles.emptyPatrolDesc}>Tidak ada sesi patroli aktif saat ini</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={`${styles.statsGrid} animate-slide-up stagger-1`}>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 6px' }}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className={styles.statValue}>{data?.floorsCompleted || 0}</div>
            <div className={styles.statLabel}>Lantai Selesai</div>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 6px' }}>
            <div className={`${styles.statIcon} ${styles.statIconDanger}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.statValue}>{data?.findingsCount || 0}</div>
            <div className={styles.statLabel}>Temuan</div>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 6px' }}>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className={styles.statValue}>{data?.totalRooms || 0}</div>
            <div className={styles.statLabel}>Total Ruangan</div>
          </div>
        </div>
      </div>

      {/* Handover Submission Form */}
      <div className={`card animate-slide-up ${styles.handoverCard}`}>
        <div className="card-body" style={{ padding: '14px 16px' }}>
          <div className={styles.handoverHeader}>
            <div className={styles.handoverInfo}>
              <div className={styles.handoverIconBadge}>🤝</div>
              <div className={styles.handoverTitles}>
                <h3 className={styles.handoverTitle}>Serah Terima Shift</h3>
                <p className={styles.handoverSubtitle}>Oper laporan & inventaris ke shift berikutnya</p>
              </div>
            </div>
            <button 
              type="button"
              className={`btn btn-sm ${showHandoverForm ? 'btn-outline' : 'btn-primary'} ${styles.handoverActionBtn}`} 
              onClick={() => setShowHandoverForm(!showHandoverForm)}
            >
              {showHandoverForm ? '✕ Batal' : '+ Buat Laporan'}
            </button>
          </div>
          
          {showHandoverForm && (
            <form onSubmit={handleSubmitHandover} style={{ marginTop: '14px' }}>
              {handoverSuccess ? (
                <div style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)', border: '1px solid var(--color-success-200)', padding: '12px', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                  ✓ Catatan serah terima berhasil dikirim!
                </div>
              ) : (
                <>
                  {/* Mode Penerima (Pilihan 1: Semua Shift vs Tunjuk Tertentu) */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                      Tujuan Penerima Serah Terima:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setHandoverRecipientType('all')}
                        className={`btn btn-sm ${handoverRecipientType === 'all' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '8px 6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        📢 Semua Petugas Shift
                      </button>
                      <button
                        type="button"
                        onClick={() => setHandoverRecipientType('specific')}
                        className={`btn btn-sm ${handoverRecipientType === 'specific' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '8px 6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        👤 Tunjuk Petugas Tertentu
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Petugas Tertentu */}
                  {handoverRecipientType === 'specific' && (
                    <div style={{ marginBottom: '12px', background: 'var(--color-neutral-50, #f9fafb)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        Pilih Rekan Security / Danru Penerima: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="form-input form-select"
                        value={handoverToUserId}
                        onChange={(e) => setHandoverToUserId(e.target.value)}
                        required={handoverRecipientType === 'specific'}
                        style={{ fontSize: '12px', width: '100%' }}
                      >
                        <option value="">-- Pilih Petugas Security --</option>
                        {securityStaff.filter((u: any) => u.id !== currentUser?.id).map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.employeeId}) {u.shift?.name ? `• ${u.shift.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Shift Tujuan */}
                  {shiftsList.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        Shift Tujuan:
                      </label>
                      <select
                        className="form-input form-select"
                        value={handoverTargetShiftId}
                        onChange={(e) => setHandoverTargetShiftId(e.target.value)}
                        style={{ fontSize: '12px', width: '100%' }}
                      >
                        {shiftsList.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.startTime} - {s.endTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Catatan / Isi Pesan */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Catatan Serah Terima: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Contoh: Posko timur aman, HT 4 unit lengkap di pos induk, kunci gembok genset dititip di meja Danru, ada titipan paket dari manajemen..."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      required
                      rows={3}
                      style={{ fontSize: '12px', width: '100%', marginBottom: '10px' }}
                    />
                  </div>

                  {/* Auto-attached findings info */}
                  <div style={{ background: 'var(--color-neutral-100, #f3f4f6)', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🚨</span>
                    <span><strong>{data?.findingsCount || 0} temuan open</strong> otomatis dilampirkan dalam serah terima ini.</span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingHandover}
                    className="btn btn-primary btn-sm w-full"
                    style={{ fontWeight: 700, padding: '10px' }}
                  >
                    {submittingHandover ? 'Mengirim...' : handoverRecipientType === 'specific' ? 'Kirim ke Petugas Tertentu →' : 'Kirim ke Seluruh Tim Shift →'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Start Patrol CTA */}
      <div className={`${styles.ctaSection} animate-slide-up`} style={{ marginTop: '16px' }}>
        {data?.session && data.session.status === 'in_progress' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {isParticipating ? (
              <Link href="/security/patrol" className="btn btn-primary btn-xl" id="btn-start-patrol">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Lanjutkan Patroli (Ronda #{data.session.patrolNumber})
              </Link>
            ) : (
              <button
                onClick={handleJoinActiveRound}
                disabled={joiningRound}
                className="btn btn-primary btn-xl"
                style={{ background: '#059669', borderColor: '#059669' }}
                id="btn-start-patrol"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {joiningRound ? 'Bergabung...' : `Ikut Bergabung Ronda #${data.session.patrolNumber}`}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowOverrideModal(true)}
              className="btn btn-outline btn-sm"
              style={{
                color: '#b91c1c',
                borderColor: 'rgba(185, 28, 28, 0.3)',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                width: '100%',
              }}
              id="btn-open-override-modal"
            >
              ⚡ Tutup Ronda Ini & Mulai Putaran Baru
            </button>
          </div>
        ) : (
          <Link href="/security/patrol" className="btn btn-primary btn-xl" id="btn-start-patrol">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Mulai Patroli
          </Link>
        )}
      </div>

      {/* Override Next Round Modal */}
      {showOverrideModal && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="modal-card card"
            style={{
              maxWidth: '430px',
              width: '100%',
              borderRadius: '16px',
              padding: '20px',
              background: 'var(--color-surface, #fff)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '26px' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ronda #{data?.session?.patrolNumber} Belum Ditutup
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Dimulai oleh: <strong>{data?.session?.user?.name || 'Petugas'}</strong>
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-neutral-100, #f3f4f6)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginBottom: '14px',
              }}
            >
              <p style={{ margin: 0 }}>
                Progress tersimpan: <strong>{data?.checkedRooms} dari {data?.totalRooms} ruangan</strong> ({overallProgress}%) telah selesai diperiksa.
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                *Hasil scan ruangan sebelumnya tetap aman dan tercatat di matriks laporan.
              </p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Pilih Jadwal Ronda Baru yang Ingin Dimulai:
              </label>
              <select
                className="form-input form-select"
                value={selectedNextScheduleId}
                onChange={(e) => setSelectedNextScheduleId(e.target.value)}
                style={{ fontSize: '13px', width: '100%' }}
              >
                {schedules.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Alasan Penutupan Ronda Sebelumnya:
              </label>
              <select
                className="form-input form-select"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                style={{ fontSize: '13px', marginBottom: '8px', width: '100%' }}
              >
                <option value="Petugas sebelumnya lupa checkout / pergantian giliran">Petugas sebelumnya lupa checkout / pergantian giliran</option>
                <option value="Terkendala panggilan darurat / insiden di IGD">Terkendala panggilan darurat / insiden di IGD</option>
                <option value="Waktu putaran telah habis / masuk jam ronda berikutnya">Waktu putaran telah habis / masuk jam ronda berikutnya</option>
                <option value="Lainnya">Lainnya (Tulis catatan)</option>
              </select>
              {overrideReason === 'Lainnya' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tuliskan catatan alasan..."
                  value={overrideCustomNotes}
                  onChange={(e) => setOverrideCustomNotes(e.target.value)}
                  style={{ fontSize: '12px', width: '100%' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                disabled={submittingOverride}
                onClick={handleConfirmOverride}
                className="btn btn-primary"
                style={{ width: '100%', background: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
                id="btn-confirm-override"
              >
                {submittingOverride ? 'Memproses...' : `⚡ Tutup Ronda #${data?.session?.patrolNumber} & Mulai Ronda Baru`}
              </button>
              {data?.session && (
                <button
                  type="button"
                  onClick={handleJoinActiveRound}
                  className="btn btn-outline"
                  style={{ width: '100%', fontSize: '12px' }}
                >
                  🤝 Ikut Bergabung di Ronda #{data.session.patrolNumber} Saja
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '12px' }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
