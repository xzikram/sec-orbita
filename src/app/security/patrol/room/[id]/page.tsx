'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import { submitRoomCheck, submitFinding } from '@/lib/data-client';
import {
  getRoomById,
  getFloorById,
  getRoomsByFloor,
  findingCategoryLabels,
  type FindingCategory,
  type ACStatus,
  type LightStatus,
} from '@/lib/dummy-data';
import styles from './room.module.css';

export default function RoomCheckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<any>(() => getRoomById(id));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [acStatus, setAcStatus] = useState<ACStatus | null>(null);
  const [lightStatus, setLightStatus] = useState<LightStatus | null>(null);
  const [condition, setCondition] = useState<'normal' | 'finding' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [findingCategory, setFindingCategory] = useState<FindingCategory | null>(null);
  const [findingDescription, setFindingDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncMode, setSyncMode] = useState<'online' | 'offline'>('online');

  const [isRecordingRemarks, setIsRecordingRemarks] = useState(false);
  const [isRecordingFinding, setIsRecordingFinding] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount (must be declared before any conditional returns)
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Read pre-selected condition if passed via query param (e.g. ?condition=finding)
    if (typeof window !== 'undefined') {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('condition') === 'finding') {
          setCondition('finding');
        }
      } catch {}
    }

    async function loadData() {
      try {
        // If room not found in static catalog, attempt lookup
        let resolvedRoom = room;
        if (!resolvedRoom) {
          resolvedRoom = getRoomById(id);
          if (resolvedRoom) {
            setRoom(resolvedRoom);
          } else {
            // Try fetching from rooms API by id or code
            try {
              const res = await fetch(`/api/rooms?id=${encodeURIComponent(id)}`).catch(() => null);
              if (res && res.ok) {
                const dbRooms = await res.json();
                const found = Array.isArray(dbRooms) 
                  ? dbRooms.find((r: any) => r.id === id || r.code.toUpperCase() === id.toUpperCase())
                  : dbRooms;
                if (found) {
                  const mapped: any = {
                    id: found.id,
                    floorId: found.floorId || (found.floor ? `floor-${found.floor.code.toLowerCase()}` : 'floor-1'),
                    code: found.code,
                    name: found.name,
                    patrolOrder: found.patrolOrder || 1,
                    hasAc: found.hasAc ?? true,
                    hasLight: found.hasLight ?? true,
                    photoGuide: found.photoGuide || `Foto area ${found.name}`,
                    isActive: found.isActive ?? true,
                  };
                  setRoom(mapped);
                  resolvedRoom = mapped;
                }
              }
            } catch (err) {
              console.warn('API room fallback failed:', err);
            }
          }
        }

        // Try network fetch
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/patrol/sessions').catch(() => null),
        ]);

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          try { localStorage.setItem('cached-user', JSON.stringify(meData.user)); } catch {}
        } else {
          // Fallback to cached user
          const cachedUser = localStorage.getItem('cached-user');
          if (cachedUser) {
            try { setCurrentUser(JSON.parse(cachedUser)); } catch {}
          }
        }

        if (sessionsRes && sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          setSession(active);
          if (active) {
            try { localStorage.setItem('cached-active-session', JSON.stringify(active)); } catch {}
          }
        } else {
          // Fallback to cached session
          const cachedSess = localStorage.getItem('cached-active-session');
          if (cachedSess) {
            try { setSession(JSON.parse(cachedSess)); } catch {}
          }
        }

        // Get offline checks from IndexedDB
        try {
          const { getOfflineChecks } = await import('@/lib/db');
          const offline = await getOfflineChecks();
          setOfflineChecks(offline);
        } catch (e) {
          console.error('IndexedDB load error:', e);
        }

      } catch (err) {
        console.error('Room load error:', err);
        const cachedUser = localStorage.getItem('cached-user');
        if (cachedUser) try { setCurrentUser(JSON.parse(cachedUser)); } catch {}
        const cachedSess = localStorage.getItem('cached-active-session');
        if (cachedSess) try { setSession(JSON.parse(cachedSess)); } catch {}
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat data pemeriksaan...</p></div>;
  }

  if (!room) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ruangan tidak ditemukan</p>
        <button className="btn btn-outline btn-sm" onClick={() => router.push('/security/patrol')}>
          Kembali ke Rute Patroli
        </button>
      </div>
    );
  }

  const floor = getFloorById(room.floorId) || (room.code ? getFloorById(room.code.split('-')[0]) : undefined);
  const floorRooms = floor ? getRoomsByFloor(floor.id) : getRoomsByFloor(room.floorId);
  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => {
    if (!floor) return false;
    const sfCode = String(sf.floorCodeSnapshot || sf.floor?.code || '').toUpperCase().trim();
    const fCode = String(floor.code || '').toUpperCase().trim();
    const sfName = String(sf.floorNameSnapshot || sf.floor?.name || '').toUpperCase().trim();
    const fName = String(floor.name || '').toUpperCase().trim();
    return (
      sfCode === fCode ||
      sf.floorId === floor.id ||
      sf.floorId === room.floorId ||
      sfName === fName ||
      (fCode && sfCode.includes(fCode))
    );
  });
  
  // Combine online (DB) checks and offline checks for this floor (by code snapshot)
  const dbCheckedRoomCodes = sessionFloor?.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
  let offCheckedRoomCodes: string[] = [];
  try {
    offCheckedRoomCodes = offlineChecks
      .filter((c: any) => c.sessionFloorId === sessionFloor?.id || (floor?.code && c.sessionFloorId === `sf-${floor.code.toLowerCase()}`))
      .map((c: any) => {
        const r = getRoomById(c.roomId);
        return r ? r.code : c.roomId;
      });
  } catch (e) {
    console.error('Error processing offline checks in room page:', e);
  }
  const combinedCheckedSet = new Set([...dbCheckedRoomCodes, ...offCheckedRoomCodes]);
  const checked = combinedCheckedSet.size;


  const toggleSpeechRecognition = (target: 'remarks' | 'finding') => {
    setSpeechError(null);

    // If already recording this target, clicking the button cleanly stops it
    if ((target === 'remarks' && isRecordingRemarks) || (target === 'finding' && isRecordingFinding)) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setIsRecordingRemarks(false);
      setIsRecordingFinding(false);
      return;
    }

    // If recording another target, cancel it first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecordingRemarks(false);
    setIsRecordingFinding(false);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError('Perekaman suara tidak didukung di browser ini.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (target === 'remarks') {
        setIsRecordingRemarks(true);
      } else {
        setIsRecordingFinding(true);
      }

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const cleanText = transcript.trim();
        if (cleanText) {
          if (target === 'remarks') {
            setRemarks(prev => (prev ? `${prev} ${cleanText}` : cleanText));
          } else {
            setFindingDescription(prev => (prev ? `${prev} ${cleanText}` : cleanText));
          }
        }
      };

      recognition.onerror = (event: any) => {
        // Do NOT treat aborted or no-speech as an error message
        if (event.error === 'aborted' || event.error === 'no-speech') {
          setIsRecordingRemarks(false);
          setIsRecordingFinding(false);
          recognitionRef.current = null;
          return;
        }

        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Izin mikrofon diperlukan. Mohon izinkan mikrofon di browser.');
        } else if (event.error === 'network') {
          setSpeechError('Koneksi internet diperlukan untuk pengenalan suara.');
        } else {
          setSpeechError(`Selesai merekam (${event.error})`);
        }
        setTimeout(() => setSpeechError(null), 3500);

        setIsRecordingRemarks(false);
        setIsRecordingFinding(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsRecordingRemarks(false);
        setIsRecordingFinding(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setIsRecordingRemarks(false);
      setIsRecordingFinding(false);
      recognitionRef.current = null;
    }
  };

  const canSubmit = () => {
    if (!photo) return false;
    if (room.hasAc && !acStatus) return false;
    if (room.hasLight && !lightStatus) return false;
    if (!condition) return false;
    if (condition === 'finding' && (!findingCategory || !findingDescription.trim())) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    const sessionFloorId = sessionFloor?.id || `sf-${(floor?.code || 'dummy').toLowerCase()}`;

    // Call submitRoomCheck helper
    const result = await submitRoomCheck({
      sessionFloorId,
      roomId: room.id,
      acStatus: acStatus || 'not_available',
      lightStatus: lightStatus === 'not_available' ? 'off' : (lightStatus || 'off'),
      condition: condition || 'normal',
      remarks: remarks || undefined,
      photoBase64: photo || '',
    });

    // If there is a finding, submit it as well
    if (condition === 'finding' && findingCategory && findingDescription) {
      await submitFinding({
        checkId: result.checkId || undefined,
        sessionId: sessionFloor?.sessionId || 'session-dummy',
        floorId: room.floorId,
        roomId: room.id,
        floorNameSnapshot: floor?.name || 'Unknown',
        roomNameSnapshot: room.name,
        category: findingCategory,
        description: findingDescription,
      });
    }

    // Save patrol checkpoint state
    try {
      const lastPatrolState = {
        sessionId: sessionFloor?.sessionId || 'session-dummy',
        floorId: room.floorId,
        floorName: floor?.name || 'Lantai',
        roomId: room.id,
        roomName: room.name,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('lastPatrolState', JSON.stringify(lastPatrolState));
    } catch (e) {
      console.error('Failed to save lastPatrolState:', e);
    }

    // Show success screen immediately
    setSyncMode(result.mode);
    setShowSuccess(true);

    // Refresh cached session data in background during success animation
    fetch('/api/patrol/sessions')
      .then(res => (res && res.ok ? res.json() : null))
      .then(sessions => {
        if (sessions) {
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          if (active) {
            localStorage.setItem('cached-active-session', JSON.stringify(active));
          }
        }
      })
      .catch(() => {});

    // Build an up-to-date checked set that includes the current room
    const updatedCheckedSet = new Set(combinedCheckedSet);
    updatedCheckedSet.add(room.code);

    // Find next unchecked room
    setTimeout(() => {
      try {
        const currentIndex = floorRooms.findIndex(r => r.id === room.id || r.code === room.code);
        const nextRoom = 
          (currentIndex !== -1 ? floorRooms.slice(currentIndex + 1).find(r => !updatedCheckedSet.has(r.code) && r.id !== room.id && r.code !== room.code) : null) ||
          floorRooms.find(r => !updatedCheckedSet.has(r.code) && r.id !== room.id && r.code !== room.code);

        if (nextRoom) {
          // Use window.location for reliable navigation that fully re-initializes the page
          window.location.href = `/security/patrol/room/${nextRoom.id}`;
        } else {
          // All rooms done, go to floor page for QR scan — use window.location to avoid stale state
          const floorTarget = floor ? floor.id : room.floorId;
          window.location.href = `/security/patrol/floor/${floorTarget}`;
        }
      } catch (navErr) {
        console.error('Navigation error after submit:', navErr);
        // Fallback: go to patrol route
        window.location.href = '/security/patrol';
      }
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="page-content">
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Tersimpan!</h2>
          <p className={styles.successText}>{room.name} berhasil diperiksa</p>
          <div className={styles.successMeta}>
            {syncMode === 'online' ? (
              <span className="sync-indicator sync-synced">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Tersinkronisasi
              </span>
            ) : (
              <span className="sync-indicator sync-pending" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', borderColor: 'var(--color-warning-200)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 'bold' }}>
                📱 Tersimpan Lokal (Offline)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingBottom: '8px' }}>
      {/* Compact Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => router.push(`/security/patrol/floor/${room.floorId}`)}
            aria-label="Kembali"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className={styles.headerInfo}>
            <div className={styles.roomTitleRow}>
              <h1 className={styles.roomName}>{room.name}</h1>
              <span className={styles.roomCodeBadge}>{room.code}</span>
            </div>
            <span className={styles.headerFloor}>{floor?.name}</span>
          </div>
        </div>
        <span className={styles.stepBadge}>
          {checked + 1}/{floorRooms.length}
        </span>
      </div>

      {/* Slim progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${floorRooms.length > 0 ? Math.round(((checked + 1) / floorRooms.length) * 100) : 0}%` }}
        />
      </div>

      {/* Compact Photo Card */}
      <div className={styles.compactPhotoCard}>
        <div
          className={`${styles.photoThumb} ${photo ? styles.hasPhoto : ''}`}
          onClick={() => setIsCapturing(true)}
          title="Ambil Foto"
        >
          {photo ? (
            <img src={photo} alt="Foto" />
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span style={{ fontSize: '9px', fontWeight: 'bold' }}>FOTO</span>
            </>
          )}
        </div>
        <div className={styles.photoGuideBox}>
          <div className={styles.photoGuideTitle}>FOTO BUKTI PEMERIKSAAN</div>
          <p className={styles.photoGuideText}>{room.photoGuide}</p>
          {photo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-success-600)', fontWeight: 'bold' }}>
                ✓ Foto Tersimpan
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsCapturing(true)}
                style={{ padding: '0 6px', height: '22px', minHeight: 'auto', fontSize: '11px' }}
              >
                Ulang Foto
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--color-danger-600)', fontWeight: '600' }}>
              * Wajib ambil foto ruangan
            </span>
          )}
        </div>
      </div>

      {isCapturing && (
        <CameraCapture
          onCapture={(file, preview) => {
            setPhoto(preview);
            setPhotoFile(file);
            setIsCapturing(false);
          }}
          onCancel={() => setIsCapturing(false)}
          roomName={room.name}
          officerName="Petugas Security"
        />
      )}

      {/* 2-Column Utilities Grid (AC & Lampu side-by-side) */}
      <div className={styles.utilitiesGrid}>
        <div className={styles.utilityCard}>
          <div className={styles.utilityLabel}>
            <span>Kondisi AC</span>
            {!room.hasAc && <span style={{ opacity: 0.6 }}>(TIDAK ADA)</span>}
          </div>
          <div className={styles.btnGroupCompact}>
            <button
              type="button"
              className={`${styles.btnCompact} ${acStatus === 'on' ? styles.activeOn : ''}`}
              onClick={() => setAcStatus('on')}
            >
              ON
            </button>
            <button
              type="button"
              className={`${styles.btnCompact} ${acStatus === 'off' ? styles.activeOff : ''}`}
              onClick={() => setAcStatus('off')}
            >
              OFF
            </button>
            {!room.hasAc && (
              <button
                type="button"
                className={`${styles.btnCompact} ${acStatus === 'not_available' ? styles.activeNA : ''}`}
                onClick={() => setAcStatus('not_available')}
              >
                N/A
              </button>
            )}
          </div>
        </div>

        <div className={styles.utilityCard}>
          <div className={styles.utilityLabel}>
            <span>Kondisi Lampu</span>
            {!room.hasLight && <span style={{ opacity: 0.6 }}>(TIDAK ADA)</span>}
          </div>
          <div className={styles.btnGroupCompact}>
            <button
              type="button"
              className={`${styles.btnCompact} ${lightStatus === 'on' ? styles.activeOn : ''}`}
              onClick={() => setLightStatus('on')}
            >
              ON
            </button>
            <button
              type="button"
              className={`${styles.btnCompact} ${lightStatus === 'off' ? styles.activeOff : ''}`}
              onClick={() => setLightStatus('off')}
            >
              OFF
            </button>
            {!room.hasLight && (
              <button
                type="button"
                className={`${styles.btnCompact} ${lightStatus === 'not_available' ? styles.activeNA : ''}`}
                onClick={() => setLightStatus('not_available')}
              >
                N/A
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Condition Card */}
      <div className={styles.conditionCard}>
        <div className={styles.conditionLabel}>STATUS KEAMANAN & FASILITAS</div>
        <div className={styles.conditionToggle}>
          <button
            type="button"
            className={`${styles.conditionBtn} ${condition === 'normal' ? styles.activeNormal : ''}`}
            onClick={() => {
              setCondition('normal');
              setFindingCategory(null);
              setFindingDescription('');
            }}
          >
            ✓ AMAN / NORMAL
          </button>
          <button
            type="button"
            className={`${styles.conditionBtn} ${condition === 'finding' ? styles.activeFinding : ''}`}
            onClick={() => setCondition('finding')}
          >
            ⚠️ ADA TEMUAN
          </button>
        </div>

        {/* Optional remarks for normal */}
        {condition === 'normal' && (
          <div className={styles.remarksBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>CATATAN (OPSIONAL)</span>
              <button
                type="button"
                onClick={() => toggleSpeechRecognition('remarks')}
                className={`btn btn-sm ${isRecordingRemarks ? 'btn-danger' : 'btn-ghost'}`}
                style={{ height: '22px', padding: '0 6px', minHeight: 'auto', fontSize: '10px' }}
                title={isRecordingRemarks ? 'Klik untuk berhenti merekam' : 'Klik untuk rekam suara'}
              >
                🎙️ {isRecordingRemarks ? 'Berhenti' : 'Suara'}
              </button>
            </div>
            {speechError && <p style={{ fontSize: '10px', color: 'var(--color-danger-500)', margin: '0 0 4px' }}>{speechError}</p>}
            <input
              className="form-input"
              style={{ padding: '6px 8px', fontSize: '12px' }}
              placeholder="Keterangan tambahan jika ada..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              id="input-remarks"
            />
          </div>
        )}
      </div>

      {/* Finding Form */}
      {condition === 'finding' && (
        <div className={styles.findingSection}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-danger-700)', marginBottom: '6px' }}>
            KATEGORI TEMUAN *
          </div>
          <div className={styles.categoryGrid}>
            {(Object.entries(findingCategoryLabels) as [FindingCategory, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`${styles.categoryBtn} ${findingCategory === key ? styles.categoryActive : ''}`}
                onClick={() => setFindingCategory(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 4px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-danger-700)' }}>DESKRIPSI TEMUAN *</span>
            <button
              type="button"
              onClick={() => toggleSpeechRecognition('finding')}
              className={`btn btn-sm ${isRecordingFinding ? 'btn-danger' : 'btn-outline'}`}
              style={{ height: '22px', padding: '0 6px', minHeight: 'auto', fontSize: '10px' }}
              title={isRecordingFinding ? 'Klik untuk berhenti merekam' : 'Klik untuk rekam suara'}
            >
              🎙️ {isRecordingFinding ? 'Berhenti' : 'Suara'}
            </button>
          </div>
          {speechError && <p style={{ fontSize: '10px', color: 'var(--color-danger-500)', margin: '0 0 4px' }}>{speechError}</p>}
          <textarea
            className="form-input form-textarea"
            style={{ padding: '6px 8px', fontSize: '12px' }}
            placeholder="Jelaskan kondisi temuan..."
            value={findingDescription}
            onChange={(e) => setFindingDescription(e.target.value)}
            rows={2}
            id="input-finding-description"
          />
        </div>
      )}

      {/* Submit Button */}
      <div className={styles.submitSection}>
        <button
          className={`btn btn-primary ${styles.submitBtn} ${!canSubmit() ? styles.btnDisabled : ''}`}
          onClick={handleSubmit}
          disabled={!canSubmit()}
          id="btn-save-next"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          SIMPAN & LANJUT
        </button>
        {!canSubmit() && (
          <p className={styles.submitHint}>
            {!photo ? '⚠️ Ambil foto bukti terlebih dahulu' :
             (room.hasAc && !acStatus) ? 'Pilih status AC' :
             (room.hasLight && !lightStatus) ? 'Pilih status lampu' :
             !condition ? 'Pilih status kondisi ruangan' :
             (condition === 'finding' && !findingCategory) ? 'Pilih kategori temuan' :
             (condition === 'finding' && !findingDescription.trim()) ? 'Isi deskripsi temuan' :
             ''}
          </p>
        )}
      </div>
    </div>
  );
}
