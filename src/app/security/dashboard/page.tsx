'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  patrolNumber: number;
  status: string;
  scheduleId: string;
  schedule?: { name: string; startTime: string; endTime: string };
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
    try {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: handoverNotes }),
      });
      if (res.ok) {
        setHandoverSuccess(true);
        setHandoverNotes('');
        setTimeout(() => {
          setHandoverSuccess(false);
          setShowHandoverForm(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting handover:', err);
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
        const [sessionsRes, findingsRes, floorsRes] = await Promise.all([
          fetch(`/api/patrol/sessions?date=${today}`),
          fetch('/api/findings?status=new&limit=100'),
          fetch('/api/floors'),
        ]);

        const sessions: PatrolSession[] = sessionsRes.ok ? await sessionsRes.json() : [];
        const findingsData = findingsRes.ok ? await findingsRes.json() : { data: [], total: 0 };
        const floors = floorsRes.ok ? await floorsRes.json() : [];

        // Find active or latest session
        const activeSession = sessions.find(s => s.status === 'in_progress') || sessions[sessions.length - 1] || null;

        // Count total rooms from floors
        const totalRooms = floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0);

        // Count checked rooms from session
        let checkedRooms = 0;
        let floorsCompleted = 0;
        if (activeSession) {
          for (const sf of activeSession.sessionFloors) {
            checkedRooms += sf.patrolChecks.length;
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

  return (
    <div className="page-content">
      {/* Pending Handover Banner */}
      {pendingHandover && (
        <div className="card animate-slide-up" style={{ marginBottom: '12px', borderLeft: '4px solid var(--color-warning-500)', background: 'var(--color-warning-50)', color: 'var(--color-neutral-900)' }}>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-warning-700)' }}>Serah Terima Shift Pending</h3>
            </div>
            <p style={{ fontSize: '13px', margin: '0 0 8px', lineHeight: '1.4' }}>
              Diterima dari <strong>{pendingHandover.fromUser?.name}</strong> ({pendingHandover.fromUser?.employeeId}):
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
                style={{ height: '32px', minHeight: 'auto', padding: '0 12px', fontSize: '12px' }}
              >
                Saya Sudah Baca ✓
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

      {/* Date */}
      <p className={`text-sm text-secondary mb-3 ${styles.dateText}`}>
        {currentTime ? formatDate(currentTime) : ''}
      </p>

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
        <div className="card animate-slide-up">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-400)" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h3 style={{ fontSize: '16px', color: 'var(--color-neutral-700)', margin: '0 0 4px' }}>Belum Ada Patroli</h3>
            <p className="text-sm text-muted">Tidak ada sesi patroli aktif hari ini</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={`${styles.statsGrid} animate-slide-up stagger-1`}>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className={styles.statValue}>{data?.floorsCompleted || 0}</span>
            <span className={styles.statLabel}>Lantai Selesai</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconDanger}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className={styles.statValue}>{data?.findingsCount || 0}</span>
            <span className={styles.statLabel}>Temuan</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="card-body">
            <span className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
            <span className={styles.statValue}>{data?.totalRooms || 0}</span>
            <span className={styles.statLabel}>Total Ruangan</span>
          </div>
        </div>
      </div>

      {/* Handover Submission Form */}
      <div className="card animate-slide-up" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤝 Serah Terima Akhir Shift
            </h3>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => setShowHandoverForm(!showHandoverForm)}
              style={{ height: '28px', padding: '0 10px', minHeight: 'auto', fontSize: '11px' }}
            >
              {showHandoverForm ? 'Batal' : 'Buat Serah Terima'}
            </button>
          </div>
          
          {showHandoverForm && (
            <form onSubmit={handleSubmitHandover} style={{ marginTop: '12px' }}>
              {handoverSuccess ? (
                <div style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)', border: '1px solid var(--color-success-200)', padding: '10px', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                  ✓ Catatan serah terima berhasil dikirim!
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Tuliskan catatan penting mengenai kondisi area atau temuan yang perlu dipantau oleh shift berikutnya.
                  </p>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Contoh: Kunci pintu parkir timur rusak, tolong dipantau..."
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    required
                    rows={3}
                    style={{ marginBottom: '10px', fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm w-full">
                    Kirim ke Shift Berikutnya →
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Start Patrol CTA */}
      <div className={`${styles.ctaSection} animate-slide-up`} style={{ marginTop: '16px' }}>
        <Link href="/security/patrol" className="btn btn-primary btn-xl" id="btn-start-patrol">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {data?.session ? 'Lanjutkan Patroli' : 'Mulai Patroli'}
        </Link>
      </div>
    </div>
  );
}
