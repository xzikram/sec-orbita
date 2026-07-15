'use client';

import { use, useState, useEffect } from 'react';
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

  const room = getRoomById(id);
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

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/patrol/sessions'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }

        if (sessionsRes.ok) {
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
        console.error('Room load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!room) {
    return <div className="page-content"><p>Ruangan tidak ditemukan</p></div>;
  }

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat data pemeriksaan...</p></div>;
  }

  const floor = getFloorById(room.floorId);
  const floorRooms = getRoomsByFloor(room.floorId);
  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => sf.floorId === room.floorId);
  
  // Combine online (DB) checks and offline checks for this floor
  const dbCheckedRoomIds = sessionFloor?.patrolChecks?.map((c: any) => c.roomId) || [];
  const offCheckedRoomIds = offlineChecks.filter((c: any) => c.sessionFloorId === sessionFloor?.id).map((c: any) => c.roomId);
  const combinedCheckedSet = new Set([...dbCheckedRoomIds, ...offCheckedRoomIds]);
  const checkedRoomIds = Array.from(combinedCheckedSet);

  const checked = checkedRoomIds.length;

  const startSpeechRecognition = (target: 'remarks' | 'finding') => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Perekaman suara tidak didukung di browser ini.');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

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
      const text = event.results[0][0].transcript;
      if (target === 'remarks') {
        setRemarks(prev => prev ? `${prev} ${text}` : text);
      } else {
        setFindingDescription(prev => prev ? `${prev} ${text}` : text);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSpeechError(`Gagal merekam: ${event.error}`);
      setTimeout(() => setSpeechError(null), 3000);
      setIsRecordingRemarks(false);
      setIsRecordingFinding(false);
    };

    recognition.onend = () => {
      setIsRecordingRemarks(false);
      setIsRecordingFinding(false);
    };

    recognition.start();
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
    if (!canSubmit() || !sessionFloor) return;

    // Call submitRoomCheck helper
    const result = await submitRoomCheck({
      sessionFloorId: sessionFloor.id,
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
        checkId: undefined, // Will link on backend/during sync
        sessionId: sessionFloor.sessionId,
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
        sessionId: sessionFloor.sessionId,
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

    setSyncMode(result.mode);
    setShowSuccess(true);

    // Find next unchecked room
    setTimeout(() => {
      const currentIndex = floorRooms.findIndex(r => r.id === id);
      const nextRoom = floorRooms.slice(currentIndex + 1).find(r => !checkedRoomIds.includes(r.id));

      if (nextRoom) {
        router.push(`/security/patrol/room/${nextRoom.id}`);
      } else {
        // All rooms done, go to floor page for QR scan
        router.push(`/security/patrol/floor/${room.floorId}`);
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
    <div className="page-content">
      {/* Back & Floor Info */}
      <div className={styles.header}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => router.push(`/security/patrol/floor/${room.floorId}`)}
          aria-label="Kembali"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.headerFloor}>{floor?.name}</span>
          <span className={styles.headerProgress}>{checked + 1} dari {floorRooms.length} ruangan</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-4">
        <div
          className="progress-bar-fill progress-fill-primary"
          style={{ width: `${Math.round(((checked + 1) / floorRooms.length) * 100)}%` }}
        />
      </div>

      {/* Room Name */}
      <div className={`${styles.roomHeader} animate-slide-up`}>
        <span className={styles.roomLabel}>RUANGAN SAAT INI</span>
        <h1 className={styles.roomName}>{room.name}</h1>
        <span className={styles.roomCode}>{room.code}</span>
      </div>

      {/* Photo Section */}
      <div className={`${styles.section} animate-slide-up stagger-1`}>
        <h3 className="form-label">FOTO BUKTI</h3>
        <p className={styles.photoGuide}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {room.photoGuide}
        </p>

        {isCapturing ? (
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
        ) : (
          <div
            className={`camera-area ${photo ? 'has-photo' : ''}`}
            onClick={() => setIsCapturing(true)}
            id="camera-area"
          >
            {photo ? (
              <img src={photo} alt="Foto ruangan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="camera-placeholder">
                <div className="camera-placeholder-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Ketuk untuk mengambil foto</span>
                <span className="text-xs text-muted">Kamera langsung • Wajib</span>
              </div>
            )}
          </div>
        )}

        {photo && !isCapturing && (
          <button
            className={`btn btn-ghost btn-sm ${styles.retakeBtn}`}
            onClick={() => setIsCapturing(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Ambil Ulang
          </button>
        )}
      </div>

      {/* Checklist */}
      <div className={`${styles.section} animate-slide-up stagger-2`}>
        <h3 className="form-label">CHECKLIST KONDISI</h3>

        {room.hasAc && (
          <div className={styles.checklistItem}>
            <span className={styles.checklistLabel}>AC</span>
            <div className="toggle-group">
              <button
                className={`toggle-btn toggle-btn-success ${acStatus === 'on' ? 'active' : ''}`}
                onClick={() => setAcStatus('on')}
                type="button"
              >
                ON
              </button>
              <button
                className={`toggle-btn toggle-btn-warning ${acStatus === 'off' ? 'active' : ''}`}
                onClick={() => setAcStatus('off')}
                type="button"
              >
                OFF
              </button>
              <button
                className={`toggle-btn ${acStatus === 'not_available' ? 'active' : ''}`}
                onClick={() => setAcStatus('not_available')}
                type="button"
              >
                TIDAK ADA
              </button>
            </div>
          </div>
        )}

        {room.hasLight && (
          <div className={styles.checklistItem}>
            <span className={styles.checklistLabel}>LAMPU</span>
            <div className="toggle-group">
              <button
                className={`toggle-btn toggle-btn-success ${lightStatus === 'on' ? 'active' : ''}`}
                onClick={() => setLightStatus('on')}
                type="button"
              >
                ON
              </button>
              <button
                className={`toggle-btn toggle-btn-warning ${lightStatus === 'off' ? 'active' : ''}`}
                onClick={() => setLightStatus('off')}
                type="button"
              >
                OFF
              </button>
              <button
                className={`toggle-btn ${lightStatus === 'not_available' ? 'active' : ''}`}
                onClick={() => setLightStatus('not_available')}
                type="button"
              >
                TIDAK ADA
              </button>
            </div>
          </div>
        )}

        <div className={styles.checklistItem}>
          <span className={styles.checklistLabel}>KONDISI RUANGAN</span>
          <div className="toggle-group">
            <button
              className={`toggle-btn toggle-btn-success ${condition === 'normal' ? 'active' : ''}`}
              onClick={() => { setCondition('normal'); setFindingCategory(null); setFindingDescription(''); }}
              type="button"
            >
              ✓ NORMAL
            </button>
            <button
              className={`toggle-btn toggle-btn-danger ${condition === 'finding' ? 'active' : ''}`}
              onClick={() => setCondition('finding')}
              type="button"
            >
              ⚠ ADA TEMUAN
            </button>
          </div>
        </div>

        {/* Optional remarks for normal */}
        {condition === 'normal' && (
          <div className={`${styles.remarksField} animate-slide-up`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className={styles.checklistLabel} style={{ margin: 0 }}>KETERANGAN (Opsional)</span>
              <button
                type="button"
                onClick={() => startSpeechRecognition('remarks')}
                className={`btn btn-sm ${isRecordingRemarks ? 'btn-danger' : 'btn-outline'}`}
                style={{ height: '28px', padding: '0 8px', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
              >
                🎙️ {isRecordingRemarks ? 'Merekam...' : 'Voice Note'}
              </button>
            </div>
            {speechError && <p style={{ fontSize: '11px', color: 'var(--color-danger-500)', margin: '0 0 6px' }}>{speechError}</p>}
            <textarea
              className="form-input form-textarea"
              placeholder="Tambahkan keterangan jika diperlukan..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              id="input-remarks"
            />
          </div>
        )}
      </div>

      {/* Finding Form */}
      {condition === 'finding' && (
        <div className={`${styles.findingSection} animate-slide-up`}>
          <h3 className="form-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            DETAIL TEMUAN
          </h3>

          <div className={styles.checklistItem}>
            <span className={styles.checklistLabel}>KATEGORI TEMUAN *</span>
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
          </div>

          <div className={styles.checklistItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className={styles.checklistLabel} style={{ margin: 0 }}>DESKRIPSI TEMUAN *</span>
              <button
                type="button"
                onClick={() => startSpeechRecognition('finding')}
                className={`btn btn-sm ${isRecordingFinding ? 'btn-danger' : 'btn-outline'}`}
                style={{ height: '28px', padding: '0 8px', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
              >
                🎙️ {isRecordingFinding ? 'Merekam...' : 'Voice Note'}
              </button>
            </div>
            {speechError && <p style={{ fontSize: '11px', color: 'var(--color-danger-500)', margin: '0 0 6px' }}>{speechError}</p>}
            <textarea
              className="form-input form-textarea"
              placeholder="Jelaskan temuan secara detail..."
              value={findingDescription}
              onChange={(e) => setFindingDescription(e.target.value)}
              rows={3}
              id="input-finding-description"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className={`${styles.submitSection} animate-slide-up stagger-3`}>
        <button
          className={`btn btn-primary btn-xl ${!canSubmit() ? styles.btnDisabled : ''}`}
          onClick={handleSubmit}
          disabled={!canSubmit()}
          id="btn-save-next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          SIMPAN & LANJUT
        </button>
        {!canSubmit() && (
          <p className={styles.submitHint}>
            {!photo ? 'Ambil foto terlebih dahulu' :
             (room.hasAc && !acStatus) ? 'Pilih status AC' :
             (room.hasLight && !lightStatus) ? 'Pilih status lampu' :
             !condition ? 'Pilih kondisi ruangan' :
             (condition === 'finding' && !findingCategory) ? 'Pilih kategori temuan' :
             (condition === 'finding' && !findingDescription.trim()) ? 'Isi deskripsi temuan' :
             ''}
          </p>
        )}
      </div>
    </div>
  );
}
