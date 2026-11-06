'use client';

import { useState, useEffect, useRef } from 'react';
import CameraCapture from '@/components/CameraCapture';
import { submitRoomCheck, submitFinding } from '@/lib/data-client';
import { reportClientError } from '@/lib/error-reporter';
import { getDefaultChecklistItems } from '@/lib/offline-cache';
import {
  Room,
  findingCategoryLabels,
  type FindingCategory,
  type ACStatus,
  type LightStatus,
  isRoomChecked,
} from '@/lib/dummy-data';
import styles from '@/app/security/patrol/room/[id]/room.module.css';

interface RoomInspectionSheetProps {
  room: Room;
  floor: any;
  session: any;
  activeFloorRooms: Room[];
  offlineChecks: any[];
  currentUser?: any;
  settings?: any;
  onClose: () => void;
  onSaveSuccess: (
    checkResult: any,
    checkedRoom: Room,
    nextRoom: Room | null,
    isFloorCompleted: boolean
  ) => void;
  onStartFloorQrScan?: () => void;
}

function getItemIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ac')) return '❄️';
  if (n.includes('lampu') || n.includes('light')) return '💡';
  if (n.includes('music') || n.includes('musik') || n.includes('audio') || n.includes('sound')) return '🎵';
  if (n.includes('suhu') || n.includes('temp')) return '🌡️';
  if (n.includes('ups') || n.includes('baterai') || n.includes('battery')) return '🔋';
  if (n.includes('kabel') || n.includes('cable')) return '🔌';
  if (n.includes('pintu') || n.includes('door') || n.includes('jendela') || n.includes('window')) return '🚪';
  if (n.includes('kebersihan') || n.includes('clean')) return '🧹';
  return '📋';
}

function isConditionItem(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('kondisi') ||
    n.includes('kabel') ||
    n.includes('kebersihan') ||
    n.includes('keamanan') ||
    n.includes('suhu')
  );
}

export default function RoomInspectionSheet({
  room: initialRoom,
  floor,
  session,
  activeFloorRooms,
  offlineChecks,
  currentUser,
  settings = {},
  onClose,
  onSaveSuccess,
  onStartFloorQrScan,
}: RoomInspectionSheetProps) {
  const [currentRoom, setCurrentRoom] = useState<Room>(initialRoom);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [acStatus, setAcStatus] = useState<ACStatus | null>(() => {
    return !initialRoom.hasAc ? 'not_available' : null;
  });
  const [lightStatus, setLightStatus] = useState<LightStatus | null>(null);
  const [musicStatus, setMusicStatus] = useState<'on' | 'off' | 'not_available' | null>(() => {
    return !initialRoom.hasMusic ? 'not_available' : null;
  });
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<'normal' | 'finding' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [findingCategory, setFindingCategory] = useState<FindingCategory | null>(null);
  const [findingDescription, setFindingDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncMode, setSyncMode] = useState<'online' | 'offline'>('online');
  const [lastSavedNextRoom, setLastSavedNextRoom] = useState<Room | null>(null);
  const [isFloorNowFullyChecked, setIsFloorNowFullyChecked] = useState(false);

  // Speech recognition states
  const [isRecordingRemarks, setIsRecordingRemarks] = useState(false);
  const [isRecordingFinding, setIsRecordingFinding] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Synchronize when parent passes a different room
  useEffect(() => {
    if (initialRoom && initialRoom.id !== currentRoom.id) {
      resetForRoom(initialRoom);
    }
  }, [initialRoom.id]);

  // Handle hardware / browser Back button (PopState)
  useEffect(() => {
    window.history.pushState({ modal: 'room-inspect' }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [onClose]);

  const resetForRoom = (targetRoom: Room) => {
    setCurrentRoom(targetRoom);
    setShowSuccess(false);
    setPhoto(null);
    setPhotoFile(null);
    setRemarks('');
    setFindingCategory(null);
    setFindingDescription('');
    setCondition(null);
    setAcStatus(!targetRoom.hasAc ? 'not_available' : null);
    setLightStatus(null);
    setMusicStatus(!targetRoom.hasMusic ? 'not_available' : null);
    setChecklistValues({});
  };

  const checklistItems: string[] = (
    (currentRoom as any)?.checklistTemplate?.items &&
    Array.isArray((currentRoom as any).checklistTemplate.items) &&
    (currentRoom as any).checklistTemplate.items.length > 0
  )
    ? (currentRoom as any).checklistTemplate.items
    : getDefaultChecklistItems();

  const gridItems: string[] = (() => {
    const items = checklistItems.filter(item => {
      const n = item.toLowerCase().trim();
      return n !== 'kondisi ruangan' && n !== 'status ruangan' && n !== 'kondisi';
    });
    if (currentRoom?.hasMusic && !items.some(i => i.toLowerCase().includes('music') || i.toLowerCase().includes('musik'))) {
      items.push('Music');
    }
    if (items.length === 0) {
      const fallback = ['Lampu'];
      if (currentRoom?.hasAc !== false) fallback.unshift('AC');
      if (currentRoom?.hasMusic) fallback.push('Music');
      return fallback;
    }
    return items;
  })();

  const missingItem = gridItems.find(item => {
    const lower = item.toLowerCase();
    if (lower.includes('ac')) {
      return currentRoom?.hasAc && !acStatus;
    }
    if (lower.includes('lampu') || lower.includes('light')) {
      return currentRoom?.hasLight && !lightStatus;
    }
    if (lower.includes('music') || lower.includes('musik')) {
      return currentRoom?.hasMusic && (!musicStatus || musicStatus === 'not_available');
    }
    return !checklistValues[item];
  });

  const sessionFloor = session?.sessionFloors?.find((sf: any) => {
    if (!floor) return false;
    const sfCode = String(sf.floorCodeSnapshot || sf.floor?.code || '').toUpperCase().trim();
    const fCode = String(floor.code || '').toUpperCase().trim();
    const sfName = String(sf.floorNameSnapshot || sf.floor?.name || '').toUpperCase().trim();
    const fName = String(floor.name || '').toUpperCase().trim();
    return (
      sfCode === fCode ||
      sf.floorId === floor.id ||
      sfName === fName ||
      (fCode && sfCode.includes(fCode))
    );
  });

  // Calculate checked count
  const checkedCodes = new Set<string>();
  activeFloorRooms.forEach(r => {
    if (isRoomChecked(r, sessionFloor?.patrolChecks, offlineChecks, session?.id)) {
      checkedCodes.add(r.code);
    }
  });
  if (Array.isArray(sessionFloor?.patrolChecks)) {
    sessionFloor.patrolChecks.forEach((c: any) => {
      if (c.roomCodeSnapshot) checkedCodes.add(c.roomCodeSnapshot);
    });
  }

  const currentRoomIndex = activeFloorRooms.findIndex(
    r => String(r.id).toLowerCase() === String(currentRoom?.id || '').toLowerCase() ||
         String(r.code).toUpperCase() === String(currentRoom?.code || '').toUpperCase()
  );
  const totalRoomsCount = Math.max(1, activeFloorRooms.length);
  const displayRoomOrder = currentRoomIndex !== -1 ? currentRoomIndex + 1 : 1;
  const isCurrentRoomAlreadyChecked = checkedCodes.has(currentRoom.code);

  const toggleSpeechRecognition = (target: 'remarks' | 'finding') => {
    setSpeechError(null);

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
        if (event.error === 'aborted' || event.error === 'no-speech') {
          setIsRecordingRemarks(false);
          setIsRecordingFinding(false);
          recognitionRef.current = null;
          return;
        }
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
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsRecordingRemarks(false);
      setIsRecordingFinding(false);
      recognitionRef.current = null;
    }
  };

  const canSubmit = () => {
    const photoRequired = settings?.require_photo !== 'false';
    if (photoRequired && !photo) return false;
    if (currentRoom.hasAc && !acStatus) return false;
    if (currentRoom.hasLight && !lightStatus) return false;
    if (currentRoom.hasMusic && (!musicStatus || musicStatus === 'not_available')) return false;
    if (missingItem) return false;
    if (!condition) return false;
    if (condition === 'finding' && (!findingCategory || !findingDescription.trim())) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const activeSessionId = sessionFloor?.sessionId || session?.id || 'session-active';
      const sessionFloorId = sessionFloor?.id || `sf-${(floor?.code || 'sb').toLowerCase()}`;

      const finalChecklistValues: Record<string, string> = {
        ...checklistValues,
      };
      if (acStatus) finalChecklistValues['AC'] = acStatus;
      if (lightStatus) finalChecklistValues['Lampu'] = lightStatus;
      if (musicStatus && musicStatus !== 'not_available') finalChecklistValues['Music'] = musicStatus;
      if (condition) finalChecklistValues['Kondisi Ruangan'] = condition;

      const result = await submitRoomCheck({
        sessionId: activeSessionId,
        sessionFloorId,
        roomId: currentRoom.id,
        roomCode: currentRoom.code,
        floorId: currentRoom.floorId || floor?.id,
        floorCode: floor?.code || '',
        acStatus: acStatus || 'not_available',
        lightStatus: lightStatus === 'not_available' ? 'off' : (lightStatus || 'off'),
        checklistValues: finalChecklistValues,
        condition: condition || 'normal',
        remarks: remarks || undefined,
        photoBase64: photo || '',
      });

      if (condition === 'finding' && findingCategory && findingDescription) {
        await submitFinding({
          checkId: result.checkId || undefined,
          sessionId: activeSessionId,
          floorId: currentRoom.floorId || floor?.id,
          roomId: currentRoom.id,
          floorNameSnapshot: floor?.name || 'Unknown',
          roomNameSnapshot: currentRoom.name,
          category: findingCategory,
          description: findingDescription,
        });
      }

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 100]);
      }

      // Update local cached active session in localStorage
      try {
        const cachedRaw = localStorage.getItem('cached-active-session');
        if (cachedRaw) {
          const sess = JSON.parse(cachedRaw);
          if (Array.isArray(sess.sessionFloors)) {
            const sf = sess.sessionFloors.find((f: any) =>
              f.id === sessionFloorId || f.floorId === currentRoom.floorId || (floor && f.floorCodeSnapshot === floor.code)
            );
            if (sf) {
              if (!Array.isArray(sf.patrolChecks)) sf.patrolChecks = [];
              const existingIdx = sf.patrolChecks.findIndex((c: any) => c.roomId === currentRoom.id || c.roomCodeSnapshot === currentRoom.code);
              const checkData = {
                id: result.checkId || `check-${currentRoom.id}-${Date.now()}`,
                roomId: currentRoom.id,
                roomCodeSnapshot: currentRoom.code,
                acStatus: acStatus || 'not_available',
                lightStatus: lightStatus === 'not_available' ? 'off' : (lightStatus || 'off'),
                condition: condition || 'normal',
                checkedAt: new Date().toISOString(),
              };
              if (existingIdx !== -1) {
                sf.patrolChecks[existingIdx] = { ...sf.patrolChecks[existingIdx], ...checkData };
              } else {
                sf.patrolChecks.push(checkData);
              }
              localStorage.setItem('cached-active-session', JSON.stringify(sess));
            }
          }
        }
      } catch (cacheErr) {
        console.warn('Local session state update notice:', cacheErr);
      }

      // Calculate next room
      const updatedCheckedSet = new Set(checkedCodes);
      updatedCheckedSet.add(currentRoom.code);

      const curIdx = activeFloorRooms.findIndex(
        r => r.id === currentRoom.id || r.code === currentRoom.code
      );
      const nextUnchecked =
        (curIdx !== -1 ? activeFloorRooms.slice(curIdx + 1).find(r => !updatedCheckedSet.has(r.code) && r.id !== currentRoom.id) : null) ||
        activeFloorRooms.find(r => !updatedCheckedSet.has(r.code) && r.id !== currentRoom.id) ||
        null;

      const isCompleted = activeFloorRooms.length > 0 && updatedCheckedSet.size >= activeFloorRooms.length;
      setIsFloorNowFullyChecked(isCompleted);
      setLastSavedNextRoom(nextUnchecked);
      setSyncMode(result.mode);
      setShowSuccess(true);

      // Notify parent
      onSaveSuccess(result, currentRoom, nextUnchecked, isCompleted);
    } catch (err: any) {
      console.error('Submit room check error:', err);
      reportClientError({
        message: err?.message || 'Gagal menyimpan pemeriksaan ruangan',
        stack: err?.stack || null,
        url: typeof window !== 'undefined' ? window.location.href : '',
        details: { roomId: currentRoom.id, roomCode: currentRoom.code },
      });
      alert('Terjadi kendala saat menyimpan pemeriksaan. Data akan dicoba disimpan secara offline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (showSuccess) {
    return (
      <div className="page-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px' }}>
        <div className={styles.successScreen} style={{ width: '100%', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
          <div className={styles.successIcon} style={{ margin: '0 auto 16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.successTitle} style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Tersimpan!</h2>
          <p className={styles.successText} style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            <strong>{currentRoom.name}</strong> berhasil diperiksa.
          </p>

          <div className={styles.successMeta} style={{ marginBottom: '24px' }}>
            {syncMode === 'online' ? (
              <span className="sync-indicator sync-synced">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Tersinkronisasi ke Server
              </span>
            ) : (
              <span className="sync-indicator sync-pending" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', borderColor: 'var(--color-warning-200)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 'bold' }}>
                📱 Tersimpan Lokal (100% Offline)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {lastSavedNextRoom ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, borderRadius: '12px' }}
                onClick={() => resetForRoom(lastSavedNextRoom)}
              >
                Lanjut ke: {lastSavedNextRoom.name} →
              </button>
            ) : isFloorNowFullyChecked ? (
              <button
                type="button"
                className="btn btn-success btn-lg"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => {
                  if (onStartFloorQrScan) {
                    onStartFloorQrScan();
                  } else {
                    onClose();
                  }
                }}
              >
                <span>📱</span>
                <span>Scan Barcode Lantai Sekarang →</span>
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-outline btn-md"
              style={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
              onClick={onClose}
            >
              Kembali ke Daftar Ruangan ({floor?.name})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingBottom: '32px' }}>
      <div className={styles.inspectionContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onClose}
              aria-label="Kembali ke Daftar Ruangan"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className={styles.headerInfo}>
              <div className={styles.roomTitleRow}>
                <h1 className={styles.roomName}>{currentRoom.name}</h1>
                <span className={styles.roomCodeBadge}>{currentRoom.code}</span>
              </div>
              <span className={styles.headerFloor}>{floor?.name}</span>
            </div>
          </div>
          <span className={styles.stepBadge}>
            {displayRoomOrder}/{totalRoomsCount}
          </span>
        </div>

        {/* Slim progress bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.round((checkedCodes.size / totalRoomsCount) * 100))}%` }}
          />
        </div>

        {/* Already Checked Notice */}
        {isCurrentRoomAlreadyChecked && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', color: '#059669', lineHeight: 1 }}>✓</span>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46' }}>
                  Ruangan Ini Sudah Diperiksa
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>
                  Data tersimpan di HP. Anda dapat memperbarui jika ada temuan baru.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Card */}
        <div className={styles.photoCard}>
          <div className={styles.photoCardContent}>
            <div
              className={`${styles.photoTrigger} ${photo ? styles.hasPhoto : ''}`}
              onClick={() => setIsCapturing(true)}
              title="Ambil Foto"
              role="button"
            >
              {photo ? (
                <img src={photo} alt="Foto Bukti" />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span style={{ fontSize: '10px', fontWeight: '800' }}>FOTO</span>
                </>
              )}
            </div>
            <div className={styles.photoGuideBox}>
              <div className={styles.photoGuideTitle}>Foto Bukti Pemeriksaan</div>
              <p className={styles.photoGuideText}>{currentRoom.photoGuide || `Foto area ${currentRoom.name}`}</p>
              <div className={styles.photoActionRow}>
                {photo ? (
                  <>
                    <span className={styles.photoStatusBadge}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Foto Tersimpan
                    </span>
                    <button
                      type="button"
                      className={styles.photoRetakeBtn}
                      onClick={() => setIsCapturing(true)}
                    >
                      Ulang Foto
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.photoRequiredBadge}
                    onClick={() => setIsCapturing(true)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Wajib Ambil Foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Camera Modal */}
        {isCapturing && (
          <CameraCapture
            onCapture={(file, preview) => {
              setPhoto(preview);
              setPhotoFile(file);
              setIsCapturing(false);
            }}
            onCancel={() => setIsCapturing(false)}
            roomName={currentRoom.name}
            officerName={currentUser?.name || 'Petugas Security'}
          />
        )}

        {/* Dynamic Utilities Grid (AC, Lampu, Music, & custom checklist items) */}
        <div className={styles.utilitiesGrid}>
          {gridItems.map(item => {
            const lower = item.toLowerCase();
            if (lower.includes('ac')) {
              return (
                <div key={item} className={styles.utilityCard}>
                  <div className={styles.utilityLabel}>
                    <span>❄️ {item}</span>
                    {!currentRoom.hasAc && <span className={styles.noAcBadge}>TIDAK ADA</span>}
                  </div>
                  {!currentRoom.hasAc ? (
                    <div className={styles.noAcNotice}>
                      <span>Area ini tanpa AC</span>
                    </div>
                  ) : (
                    <div className={styles.btnGroupCompact}>
                      <button
                        type="button"
                        className={`${styles.btnCompact} ${acStatus === 'on' ? styles.activeOn : ''}`}
                        onClick={() => {
                          setAcStatus('on');
                          setChecklistValues(prev => ({ ...prev, [item]: 'on', AC: 'on' }));
                        }}
                      >
                        ON
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnCompact} ${acStatus === 'off' ? styles.activeOff : ''}`}
                        onClick={() => {
                          setAcStatus('off');
                          setChecklistValues(prev => ({ ...prev, [item]: 'off', AC: 'off' }));
                        }}
                      >
                        OFF
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            if (lower.includes('lampu') || lower.includes('light')) {
              return (
                <div key={item} className={styles.utilityCard}>
                  <div className={styles.utilityLabel}>
                    <span>💡 {item}</span>
                    {!currentRoom.hasLight && <span className={styles.noAcBadge}>TIDAK ADA</span>}
                  </div>
                  <div className={styles.btnGroupCompact}>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${lightStatus === 'on' ? styles.activeOn : ''}`}
                      onClick={() => {
                        setLightStatus('on');
                        setChecklistValues(prev => ({ ...prev, [item]: 'on', Lampu: 'on' }));
                      }}
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${lightStatus === 'off' ? styles.activeOff : ''}`}
                      onClick={() => {
                        setLightStatus('off');
                        setChecklistValues(prev => ({ ...prev, [item]: 'off', Lampu: 'off' }));
                      }}
                    >
                      OFF
                    </button>
                  </div>
                </div>
              );
            }

            if (lower.includes('music') || lower.includes('musik')) {
              return (
                <div key={item} className={styles.utilityCard}>
                  <div className={styles.utilityLabel}>
                    <span>🎵 {item}</span>
                    {!currentRoom.hasMusic && <span className={styles.noAcBadge}>TIDAK ADA</span>}
                  </div>
                  {!currentRoom.hasMusic ? (
                    <div className={styles.noAcNotice}>
                      <span>Area ini tanpa Music Gedung</span>
                    </div>
                  ) : (
                    <div className={styles.btnGroupCompact}>
                      <button
                        type="button"
                        className={`${styles.btnCompact} ${musicStatus === 'on' ? styles.activeOn : ''}`}
                        onClick={() => {
                          setMusicStatus('on');
                          setChecklistValues(prev => ({ ...prev, [item]: 'on', Music: 'on', music: 'on' }));
                        }}
                      >
                        ON
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnCompact} ${musicStatus === 'off' ? styles.activeOff : ''}`}
                        onClick={() => {
                          setMusicStatus('off');
                          setChecklistValues(prev => ({ ...prev, [item]: 'off', Music: 'off', music: 'off' }));
                        }}
                      >
                        OFF
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            const isCond = isConditionItem(item);
            const val = checklistValues[item];
            return (
              <div key={item} className={styles.utilityCard}>
                <div className={styles.utilityLabel}>
                  <span>{getItemIcon(item)} {item}</span>
                </div>
                {isCond ? (
                  <div className={styles.btnGroupCompact}>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${val === 'normal' ? styles.activeOn : ''}`}
                      onClick={() => setChecklistValues(prev => ({ ...prev, [item]: 'normal' }))}
                    >
                      NORMAL
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${val === 'kendala' ? styles.activeOff : ''}`}
                      onClick={() => setChecklistValues(prev => ({ ...prev, [item]: 'kendala' }))}
                    >
                      KENDALA
                    </button>
                  </div>
                ) : (
                  <div className={styles.btnGroupCompact}>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${val === 'on' ? styles.activeOn : ''}`}
                      onClick={() => setChecklistValues(prev => ({ ...prev, [item]: 'on' }))}
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnCompact} ${val === 'off' ? styles.activeOff : ''}`}
                      onClick={() => setChecklistValues(prev => ({ ...prev, [item]: 'off' }))}
                    >
                      OFF
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Condition Card */}
        <div className={styles.conditionCard}>
          <div className={styles.conditionLabel}>🛡️ Status Keamanan & Fasilitas</div>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              AMAN / NORMAL
            </button>
            <button
              type="button"
              className={`${styles.conditionBtn} ${condition === 'finding' ? styles.activeFinding : ''}`}
              onClick={() => setCondition('finding')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              ADA TEMUAN
            </button>
          </div>

          {condition === 'normal' && (
            <div className={styles.remarksBox}>
              <div className={styles.remarksHeader}>
                <span className={styles.remarksLabel}>Catatan Tambahan (Opsional)</span>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('remarks')}
                  className={`${styles.voiceBtn} ${isRecordingRemarks ? styles.voiceBtnActive : styles.voiceBtnNormal}`}
                  title={isRecordingRemarks ? 'Klik untuk berhenti merekam' : 'Klik untuk rekam suara'}
                >
                  🎙️ {isRecordingRemarks ? 'Berhenti' : 'Suara'}
                </button>
              </div>
              {speechError && <p style={{ fontSize: '11px', color: 'var(--color-danger-600)', margin: '0 0 6px' }}>{speechError}</p>}
              <input
                className={styles.remarksInput}
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
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span> KATEGORI TEMUAN *
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 6px 0' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c' }}>DESKRIPSI TEMUAN *</span>
              <button
                type="button"
                onClick={() => toggleSpeechRecognition('finding')}
                className={`${styles.voiceBtn} ${isRecordingFinding ? styles.voiceBtnActive : styles.voiceBtnNormal}`}
                title={isRecordingFinding ? 'Klik untuk berhenti merekam' : 'Klik untuk rekam suara'}
              >
                🎙️ {isRecordingFinding ? 'Berhenti' : 'Suara'}
              </button>
            </div>
            {speechError && <p style={{ fontSize: '11px', color: 'var(--color-danger-600)', margin: '0 0 6px' }}>{speechError}</p>}
            <textarea
              className={styles.findingTextarea}
              placeholder="Jelaskan detail kondisi temuan yang ditemukan..."
              value={findingDescription}
              onChange={(e) => setFindingDescription(e.target.value)}
              rows={3}
              id="input-finding-description"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className={styles.submitSection}>
          <button
            type="button"
            className={`${styles.submitBtn} ${!canSubmit() || isSubmitting ? styles.btnDisabled : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            id="btn-save-next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN PEMERIKSAAN'}
          </button>
          {!canSubmit() && (
            <div className={styles.submitHint}>
              <span className={styles.submitHintWarn}>
                {!photo ? '⚠️ Ambil foto bukti terlebih dahulu' :
                 (currentRoom.hasAc && !acStatus) ? '⚠️ Pilih status AC (ON / OFF)' :
                 (currentRoom.hasLight && !lightStatus) ? '⚠️ Pilih status lampu (ON / OFF)' :
                 (currentRoom.hasMusic && (!musicStatus || musicStatus === 'not_available')) ? '⚠️ Pilih status Music Gedung (ON / OFF)' :
                 missingItem ? `⚠️ Pilih status ${missingItem} (${isConditionItem(missingItem) ? 'NORMAL / KENDALA' : 'ON / OFF'})` :
                 !condition ? '⚠️ Pilih status (Aman / Ada Temuan)' :
                 (condition === 'finding' && !findingCategory) ? '⚠️ Pilih kategori temuan' :
                 (condition === 'finding' && !findingDescription.trim()) ? '⚠️ Tulis deskripsi temuan' :
                 ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
