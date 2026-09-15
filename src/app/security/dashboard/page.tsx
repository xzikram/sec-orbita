'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRealtimeShift, getOppositeShift } from '@/lib/shifts';
import styles from './dashboard.module.css';

interface SessionFloor {
  id: string;
  floorId: string;
  floorNameSnapshot: string;
  floorCodeSnapshot: string;
  status: string;
  qrValidated?: boolean;
  completedAt?: string;
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

  // Active user & multi-officer state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherOfficers, setOtherOfficers] = useState<any[]>([]);

  // Router & Offline pre-caching state (Option A)
  const router = useRouter();
  const [isPreparingOffline, setIsPreparingOffline] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareStatusText, setPrepareStatusText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Stale date / cross-day session expiry detection helper
  const isSessionStaleOrPastDay = (session: any): boolean => {
    if (!session) return true;
    try {
      const todayMakassar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());

      // Check patrolDate
      if (session.patrolDate) {
        const sessDateStr = typeof session.patrolDate === 'string'
          ? session.patrolDate.split('T')[0]
          : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date(session.patrolDate));
        if (sessDateStr < todayMakassar) {
          const startedTime = session.startedAt ? new Date(session.startedAt).getTime() : 0;
          if (Date.now() - startedTime > 4 * 60 * 60 * 1000) {
            return true;
          }
        }
      }

      // Check startedAt > 4 hours ago without activity
      if (session.startedAt) {
        const startedTime = new Date(session.startedAt).getTime();
        if (Date.now() - startedTime > 4 * 60 * 60 * 1000) {
          return true;
        }
      }
    } catch {
      return false;
    }
    return false;
  };

  const handleNavigateToPatrolWithPreDownload = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsPreparingOffline(true);
    setPrepareProgress(20);
    setPrepareStatusText('Menyiapkan koneksi data...');

    try {
      setPrepareProgress(45);
      setPrepareStatusText('Mengunduh katalog 12 Lantai & 133 Ruangan...');
      const { downloadPatrolPackage } = await import('@/lib/offline-cache');
      const res = await downloadPatrolPackage();

      // Ensure an active session exists locally for full offline patrol round
      let cached = localStorage.getItem('cached-active-session');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (isSessionStaleOrPastDay(parsed) || (currentUser?.id && parsed.userId && parsed.userId !== currentUser.id)) {
            localStorage.removeItem('cached-active-session');
            localStorage.removeItem('lastPatrolState');
            cached = null;
          }
        } catch {
          cached = null;
        }
      }

      // If online and no active session for this user, start session on server
      if (!cached && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const sessRes = await fetch('/api/patrol/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (sessRes.ok) {
            const newSess = await sessRes.json();
            cached = JSON.stringify(newSess);
            localStorage.setItem('cached-active-session', cached);
          }
        } catch (postErr) {
          console.error('Online session start error:', postErr);
        }
      }

      if (!cached) {
        const { floors: fallbackFloors, getCurrentSchedule } = await import('@/lib/dummy-data');
        const sched = getCurrentSchedule();
        const offlineSession = {
          id: `offline-sess-${Date.now()}`,
          userId: currentUser?.id || undefined,
          patrolNumber: sched.patrolNumber || 1,
          status: 'in_progress',
          scheduleId: sched.id,
          schedule: sched,
          startedAt: new Date().toISOString(),
          sessionFloors: (fallbackFloors || []).map(f => ({
            id: `sf-${f.code.toLowerCase()}`,
            floorId: f.id,
            floorNameSnapshot: f.name,
            floorCodeSnapshot: f.code,
            status: 'pending',
            qrValidated: false,
            patrolChecks: [],
          })),
        };
        localStorage.setItem('cached-active-session', JSON.stringify(offlineSession));
      }

      setPrepareProgress(85);
      setPrepareStatusText(`Menyimpan ${res.roomsCount || 133} ruangan & token QR fisik di HP...`);
      await new Promise(r => setTimeout(r, 200));

      setPrepareProgress(100);
      setPrepareStatusText('Data offline siap! Masuk ke rute patroli...');
      await new Promise(r => setTimeout(r, 150));

      router.push('/security/patrol');
    } catch {
      router.push('/security/patrol');
    } finally {
      setIsPreparingOffline(false);
    }
  };

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
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
        const [meRes, sessionsRes, findingsRes, floorsRes, staffRes, shiftsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch(`/api/patrol/sessions?date=${today}`).catch(() => null),
          fetch('/api/findings?status=new&limit=100').catch(() => null),
          fetch('/api/floors').catch(() => null),
          fetch('/api/users?role=security').catch(() => null),
          fetch('/api/shifts').catch(() => null),
        ]);

        let loggedInUser: any = null;
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          loggedInUser = meData.user || null;
          setCurrentUser(loggedInUser);
        } else {
          try {
            const cachedUser = localStorage.getItem('cached-user');
            if (cachedUser) {
              loggedInUser = JSON.parse(cachedUser);
              setCurrentUser(loggedInUser);
            }
          } catch {}
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
            const currentShift = getRealtimeShift(activeShifts);
            const oppShift = getOppositeShift(currentShift, activeShifts) || activeShifts[0];
            setHandoverTargetShiftId(oppShift.id || '');
          }
        }

        const sessions: PatrolSession[] = sessionsRes && sessionsRes.ok ? await sessionsRes.json() : [];
        const findingsData = findingsRes && findingsRes.ok ? await findingsRes.json() : { data: [], total: 0 };
        let floors = floorsRes && floorsRes.ok ? await floorsRes.json() : [];

        if (!Array.isArray(floors) || floors.length === 0) {
          try {
            const { getCachedFloors } = await import('@/lib/db');
            floors = await getCachedFloors();
          } catch {}
        }
        if (!Array.isArray(floors) || floors.length === 0) {
          const { floors: fallbackFloors } = await import('@/lib/dummy-data');
          floors = fallbackFloors;
        }

        // Find active session for current user (online API -> localStorage offline cache)
        const currentUid = loggedInUser?.id;
        const myActiveSession = sessions.find(s => s.status === 'in_progress' && (s.userId === currentUid || !s.userId)) || null;
        const activeOtherSessions = sessions.filter(s => s.status === 'in_progress' && currentUid && s.userId && s.userId !== currentUid);
        setOtherOfficers(activeOtherSessions);

        let activeSession = myActiveSession;
        if (!activeSession) {
          try {
            const cachedSess = localStorage.getItem('cached-active-session');
            if (cachedSess) {
              const parsed = JSON.parse(cachedSess);
              if (isSessionStaleOrPastDay(parsed) || (currentUid && parsed.userId && parsed.userId !== currentUid)) {
                if (isSessionStaleOrPastDay(parsed)) {
                  localStorage.removeItem('cached-active-session');
                  localStorage.removeItem('lastPatrolState');
                }
              } else if (parsed.status === 'in_progress') {
                activeSession = parsed;
              }
            }
          } catch {}
        }

        // Count total rooms from floors
        const totalRooms = floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0) || 133;

        // Count checked rooms from session combining online and offline checks
        let checkedRooms = 0;
        let floorsCompleted = 0;
        if (activeSession && Array.isArray(activeSession.sessionFloors)) {
          let offlineChecks: any[] = [];
          try {
            const { getOfflineChecks } = await import('@/lib/db');
            offlineChecks = await getOfflineChecks();
          } catch {}

          for (const sf of activeSession.sessionFloors) {
            const dbCheckedRoomCodes = sf.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
            const sfCode = String(sf.floorCodeSnapshot || '').toLowerCase();
            const offCheckedRoomCodes = offlineChecks
              .filter((c: any) => c.sessionFloorId === sf.id || (sfCode && c.sessionFloorId === `sf-${sfCode}`))
              .map((c: any) => c.roomCode || c.roomId);
            const combinedFloorChecked = new Set([...dbCheckedRoomCodes, ...offCheckedRoomCodes]);
            checkedRooms += combinedFloorChecked.size;
            if (sf.status === 'completed' || sf.qrValidated) floorsCompleted++;
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
    setLastRefreshTime(new Date());

    // Background pre-download of offline patrol package
    import('@/lib/offline-cache').then(({ downloadPatrolPackage }) => {
      downloadPatrolPackage().catch(() => {});
    }).catch(() => {});

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const [meRes, sessionsRes, findingsRes, floorsRes] = await Promise.all([
        fetch('/api/auth/me').catch(() => null),
        fetch(`/api/patrol/sessions?date=${today}`).catch(() => null),
        fetch('/api/findings?status=new&limit=100').catch(() => null),
        fetch('/api/floors').catch(() => null),
      ]);

      let loggedInUser = currentUser;
      if (meRes && meRes.ok) {
        const meData = await meRes.json();
        loggedInUser = meData.user || loggedInUser;
        setCurrentUser(loggedInUser);
      }

      const sessions = sessionsRes && sessionsRes.ok ? await sessionsRes.json() : [];
      const findingsData = findingsRes && findingsRes.ok ? await findingsRes.json() : { data: [], total: 0 };
      let floors = floorsRes && floorsRes.ok ? await floorsRes.json() : [];

      if (!Array.isArray(floors) || floors.length === 0) {
        const { floors: fallbackFloors } = await import('@/lib/dummy-data');
        floors = fallbackFloors;
      }

      const currentUid = loggedInUser?.id;
      const myActiveSession = sessions.find((s: any) => s.status === 'in_progress' && (s.userId === currentUid || !s.userId)) || null;
      const activeOtherSessions = sessions.filter((s: any) => s.status === 'in_progress' && currentUid && s.userId && s.userId !== currentUid);
      setOtherOfficers(activeOtherSessions);

      let activeSession = myActiveSession;
      const totalRooms = floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0) || 133;

      let checkedRooms = 0;
      let floorsCompleted = 0;
      if (activeSession && Array.isArray(activeSession.sessionFloors)) {
        for (const sf of activeSession.sessionFloors) {
          const dbCheckedRoomCodes = sf.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
          checkedRooms += dbCheckedRoomCodes.length;
          if (sf.status === 'completed' || sf.qrValidated) floorsCompleted++;
        }
      }

      const findingsCount = typeof findingsData === 'object' && 'total' in findingsData
        ? findingsData.total
        : Array.isArray(findingsData) ? findingsData.length : 0;

      setData({ session: activeSession, totalRooms, checkedRooms, findingsCount, floorsCompleted });
      setLastRefreshTime(new Date());
      fetchHandover();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`${styles.dashboardContainer} ${showHandoverForm ? styles.dashboardScrollable : ''}`}>
      <div className={styles.topSection}>
        {/* Refresh Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {lastRefreshTime ? `Update: ${lastRefreshTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })} WITA` : ''}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline btn-xs"
          id="btn-refresh-dashboard"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isRefreshing ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

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

      {/* Other Officers On-Duty Notice */}
      {otherOfficers.length > 0 && (
        <div
          className="card animate-slide-up"
          style={{
            marginBottom: '8px',
            background: 'var(--color-primary-50, #eff6ff)',
            borderLeft: '4px solid var(--color-primary-500)',
            padding: '8px 12px',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🛡️</span>
            <div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                {otherOfficers.length} Rekan Security Sedang Berpatroli
              </p>
              <p style={{ margin: '1px 0 0', fontSize: '10.5px', color: 'var(--color-primary-700)' }}>
                {otherOfficers.map(o => `${o.user?.name || 'Petugas'} (Ronda #${o.patrolNumber})`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date */}
      {currentTime && (
        <p className={`text-sm text-secondary ${styles.dateText}`} style={{ margin: '0 0 6px', fontSize: '11px' }}>
          {formatDate(currentTime)}
        </p>
      )}

      {/* Motivating Leaderboard Widget */}
      <Link href="/security/leaderboard" style={{ textDecoration: 'none', display: 'block', marginBottom: '8px' }} id="widget-leaderboard">
        <div className="card animate-slide-up" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(30, 58, 138, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏆</span>
            <div>
              <p style={{ margin: 0, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, fontWeight: 700 }}>Papan Peringkat Security</p>
              <p style={{ margin: '1px 0 0', fontSize: '12px', fontWeight: 600 }}>
                {leaderboardInfo ? `Peringkat #${leaderboardInfo.myRank} • ${leaderboardInfo.score} Poin Disiplin` : 'Cek Klasemen Tim & Peringkat Anda →'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
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
                    Petugas: <strong>{data.session.user.name}</strong>
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
      </div>

      {/* Start Patrol CTA */}
      <div className={`${styles.bottomSection} animate-slide-up`}>
        {data?.session && data.session.status === 'in_progress' ? (
          <button
            type="button"
            onClick={handleNavigateToPatrolWithPreDownload}
            disabled={isPreparingOffline}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 16px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 3px 12px rgba(37, 99, 235, 0.25)' }}
            id="btn-start-patrol"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Lanjutkan Patroli (Ronda #{data.session.patrolNumber})
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNavigateToPatrolWithPreDownload}
            disabled={isPreparingOffline}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 16px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 3px 12px rgba(37, 99, 235, 0.25)' }}
            id="btn-start-patrol"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Mulai Patroli Baru
          </button>
        )}
      </div>

      {/* Offline Patrol Pre-Download Modal (Option A) */}
      {isPreparingOffline && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            className="card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '340px',
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '20px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
              border: '1px solid var(--border-light, rgba(255,255,255,0.2))',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 3s linear infinite' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Menyiapkan Patroli Offline
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Menyimpan 12 Lantai, 133 Ruangan, dan QR Code agar patroli tetap aktif walau tanpa Wi-Fi.
            </p>

            {/* Progress Bar */}
            <div style={{ width: '100%', background: 'var(--color-neutral-200, #e2e8f0)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  width: `${prepareProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--color-primary-600, #2563eb)', fontWeight: 600, margin: 0 }}>
              {prepareStatusText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
