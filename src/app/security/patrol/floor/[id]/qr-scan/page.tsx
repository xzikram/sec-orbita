'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/QRScanner';
import { getFloorById, getRoomsByFloor, floors, isRoomChecked } from '@/lib/dummy-data';
import styles from './qrscan.module.css';

export default function QRScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [offlineChecks, setOfflineChecks] = useState<any[]>([]);
  const [dbFloor, setDbFloor] = useState<any>(null);

  const fallbackFloor = getFloorById(id) || 
    (() => {
      const match = session?.sessionFloors?.find((sf: any) => 
        sf.floorId === id || 
        sf.id === id || 
        String(sf.floorCodeSnapshot || '').toUpperCase() === String(id).toUpperCase() ||
        sf.floor?.id === id ||
        String(sf.floor?.code || '').toUpperCase() === String(id).toUpperCase()
      );
      return match ? (getFloorById(match.floorCodeSnapshot) || getFloorById(match.floorId) || getFloorById(match.floor?.code)) : undefined;
    })();

  const floor = dbFloor || fallbackFloor;

  const [scanState, setScanState] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('Titik validasi tidak sesuai dengan lantai yang sedang diperiksa.');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineScan, setIsOfflineScan] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [verifiedFloorInfo, setVerifiedFloorInfo] = useState<{ name: string; code: string } | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOfflineScan(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    async function loadData() {
      try {
        // 1. Read cached user and cached session from localStorage immediately
        let currentUserId: string | null = null;
        const cachedUser = localStorage.getItem('cached-user');
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            currentUserId = u.id || null;
          } catch {}
        }

        const cached = localStorage.getItem('cached-active-session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const todayMakassar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
            const sessDate = parsed.patrolDate ? (typeof parsed.patrolDate === 'string' ? parsed.patrolDate.split('T')[0] : '') : '';
            const startedTime = parsed.startedAt ? new Date(parsed.startedAt).getTime() : 0;
            const isStale = (sessDate && sessDate < todayMakassar && Date.now() - startedTime > 4 * 60 * 60 * 1000) || (startedTime > 0 && Date.now() - startedTime > 4 * 60 * 60 * 1000);

            if (isStale || (currentUserId && parsed.userId && parsed.userId !== currentUserId)) {
              if (isStale) {
                localStorage.removeItem('cached-active-session');
                localStorage.removeItem('lastPatrolState');
              }
            } else {
              setSession(parsed);
            }
          } catch {}
        }

        // 2. Read IndexedDB data
        const dbMod = await import('@/lib/db').catch(() => null);
        if (dbMod) {
          if (dbMod.getOfflineChecks) {
            try {
              const off = await dbMod.getOfflineChecks();
              setOfflineChecks(off);
            } catch {}
          }

          if (dbMod.getCachedFloors) {
            try {
              const cachedFloors = await dbMod.getCachedFloors();
              const matchedFloor = cachedFloors.find((f: any) =>
                dbMod.matchFloor ? dbMod.matchFloor(f, id) : (
                  String(f.id).toLowerCase() === String(id).toLowerCase() ||
                  String(f.code || '').toLowerCase() === String(id).toLowerCase()
                )
              );
              if (matchedFloor) {
                setDbFloor(matchedFloor);
              }
            } catch {}
          }
        }

        // 3. Render immediately (< 25ms)
        setLoading(false);

        // 4. Background network update if online
        if (navigator.onLine) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);

          Promise.all([
            fetch('/api/auth/me', { signal: controller.signal }).then(r => (r.ok ? r.json() : null)).catch(() => null),
            fetch('/api/patrol/sessions?personal=true', { signal: controller.signal }).then(r => (r.ok ? r.json() : null)).catch(() => null),
          ]).then(([meData, sessions]) => {
            clearTimeout(timer);
            if (Array.isArray(sessions)) {
              const myId = meData?.user?.id || currentUserId;
              const active = sessions.find((s: any) => s.status === 'in_progress' && (!myId || s.userId === myId)) || null;
              if (active) {
                setSession(active);
                try { localStorage.setItem('cached-active-session', JSON.stringify(active)); } catch {}
              }
            }
          }).catch(() => {
            clearTimeout(timer);
          });
        }
      } catch (err) {
        console.error('QR Scan load error:', err);
        setLoading(false);
      }
    }
    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [id]);

  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => 
    (floor && sf.floorCodeSnapshot === floor.code) || sf.id === id || sf.floorId === id
  );

  // Check if all rooms on this floor are checked before scanning QR
  const floorRooms = floor ? getRoomsByFloor(floor.id) : [];
  const uniqueChecked = new Set<string>();
  floorRooms.forEach(r => {
    if (isRoomChecked(r, sessionFloor?.patrolChecks, offlineChecks, currentSession?.id)) {
      uniqueChecked.add(r.code);
    }
  });
  const isAllRoomsChecked = floorRooms.length === 0 || uniqueChecked.size >= floorRooms.length;

  // Calculate next floor based on user route direction
  const isReversed = typeof window !== 'undefined' && localStorage.getItem('patrol-reversed') === 'true';
  const sortedFloors = [...floors].sort((a, b) => isReversed ? b.sortOrder - a.sortOrder : a.sortOrder - b.sortOrder);
  const currentIdx = sortedFloors.findIndex(f => f.id === floor?.id || f.code === floor?.code);
  const nextFloor = currentIdx !== -1 && currentIdx + 1 < sortedFloors.length ? sortedFloors[currentIdx + 1] : null;

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <p className="text-sm text-muted">Memuat data scanner...</p>
      </div>
    );
  }

  // Pre-scan guard: block scanner if rooms are incomplete
  if (!isAllRoomsChecked && floor) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem 1.25rem', paddingBottom: '96px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', border: '1px solid #fecaca' }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Pemeriksaan Ruangan Belum Lengkap</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          Anda baru memeriksa <strong>{uniqueChecked.size} dari {floorRooms.length} ruangan</strong> di {floor.name}. Selesaikan seluruh ceklist & foto ruangan terlebih dahulu sebelum melakukan scan QR lantai.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => {
            const targetUrl = `/security/patrol/floor/${floor.id}`;
            if (typeof window !== 'undefined' && !navigator.onLine) {
              window.location.href = targetUrl;
            } else {
              router.push(targetUrl);
            }
          }}
          style={{ fontWeight: 700 }}
        >
          ← Selesaikan Pemeriksaan Ruangan
        </button>
      </div>
    );
  }

  const handleSkipScan = () => {
    // Current floor's rooms are already 100% checked. Mark it completed locally and proceed to next floor!
    try {
      const cached = localStorage.getItem('cached-active-session');
      if (cached) {
        const sess = JSON.parse(cached);
        if (Array.isArray(sess.sessionFloors)) {
          const targetCode = floor ? floor.code : id;
          const sf = sess.sessionFloors.find((f: any) => 
            f.floorCodeSnapshot === targetCode || f.id === sessionFloor?.id || f.floorId === id || f.floor?.code === targetCode
          );
          if (sf) {
            sf.status = 'completed';
            sf.completedAt = new Date().toISOString();
            localStorage.setItem('cached-active-session', JSON.stringify(sess));
          }
        }
      }
    } catch {}

    const targetUrl = nextFloor ? `/security/patrol/floor/${nextFloor.id}` : '/security/patrol/summary';
    if (typeof window !== 'undefined' && !navigator.onLine) {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  };

  const handleScanSuccess = async (scannedText: string) => {
    const rawTrimmed = scannedText.trim();
    let tokenValue = rawTrimmed;
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (parsed.token) tokenValue = String(parsed.token).trim();
    } catch {}

    const { validateAnyOfficialFloorQr, isOfficialQrValidForFloor, getFloorByQrToken } = await import('@/lib/qr-constants');
    const targetFloorCode = floor ? floor.code : id;
    const anyOfficial = validateAnyOfficialFloorQr(tokenValue);
    const isFloorMatch = isOfficialQrValidForFloor(targetFloorCode, tokenValue);
    const matchedOfficial = anyOfficial || (isFloorMatch ? getFloorByQrToken(tokenValue) : undefined);

    // If QR does not match ANY official sticker in RS Mata JEC ORBITA
    if (!matchedOfficial && !isFloorMatch) {
      setScanState('error');
      setErrorMsg('QR Code tidak valid sebagai stiker fisik resmi RS Mata JEC ORBITA.');
      return;
    }

    const verifiedFloorCode = matchedOfficial ? matchedOfficial.floorCode : targetFloorCode;
    const verifiedFloorName = matchedOfficial ? matchedOfficial.floorName : (floor?.name || `Lantai ${targetFloorCode}`);
    setVerifiedFloorInfo({ name: verifiedFloorName, code: verifiedFloorCode });

    const currentFloorCode = floor ? floor.code : id;
    const sfId = sessionFloor?.id || (floor ? `sf-${floor.code.toLowerCase()}` : id);

    // 1. Immediately save scan record to IndexedDB
    try {
      const { saveOfflineQrScan } = await import('@/lib/db');
      await saveOfflineQrScan({
        id: `qr-scan-${Date.now()}-${verifiedFloorCode}`,
        sessionFloorId: sfId,
        floorCode: verifiedFloorCode,
        qrToken: tokenValue,
        scannedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('Save offline QR scan notice:', dbErr);
    }

    // 2. Mark floor completed & QR validated in cached active session in localStorage
    try {
      const cached = localStorage.getItem('cached-active-session');
      if (cached) {
        const sess = JSON.parse(cached);
        if (Array.isArray(sess.sessionFloors)) {
          // Mark current floor completed
          const curSf = sess.sessionFloors.find((f: any) => 
            f.floorCodeSnapshot === currentFloorCode || f.id === sfId || f.floorId === id || f.floor?.code === currentFloorCode
          );
          if (curSf) {
            curSf.status = 'completed';
            curSf.completedAt = new Date().toISOString();
          }

          // Mark verified floor with QR validated
          const verifiedSf = sess.sessionFloors.find((f: any) =>
            f.floorCodeSnapshot === verifiedFloorCode || f.floor?.code === verifiedFloorCode
          );
          if (verifiedSf) {
            verifiedSf.qrValidated = true;
            verifiedSf.qrScannedAt = new Date().toISOString();
            verifiedSf.qrTokenUsed = tokenValue;
            verifiedSf.status = 'completed';
          } else if (curSf) {
            curSf.qrValidated = true;
            curSf.qrScannedAt = new Date().toISOString();
            curSf.qrTokenUsed = tokenValue;
          }

          localStorage.setItem('cached-active-session', JSON.stringify(sess));
        }
      }
    } catch {}

    try { localStorage.removeItem('lastPatrolState'); } catch {}

    // 3. Immediately show success screen
    setIsOfflineScan(!navigator.onLine);
    setScanState('success');

    // 4. Background non-blocking sync: attempt server validation & memory wipe
    (async () => {
      try {
        const { syncOfflineData } = await import('@/lib/sync');
        const syncRes = await syncOfflineData();
        if (syncRes.qrScansSynced > 0 || syncRes.checksSynced > 0) {
          setIsOfflineScan(false);
        }
      } catch (syncErr) {
        console.warn('Background sync notice (offline mode active):', syncErr);
      }
    })();

    // 5. Transition to next floor or summary
    setTimeout(() => {
      const targetUrl = nextFloor ? `/security/patrol/floor/${nextFloor.id}` : '/security/patrol/summary';
      if (typeof window !== 'undefined' && !navigator.onLine) {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    }, 2400);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setSubmittingManual(true);
    await handleScanSuccess(manualToken.trim());
    setSubmittingManual(false);
  };

  if (scanState === 'success') {
    return (
      <div className="page-content" style={{ paddingBottom: '96px' }}>
        <div className={styles.resultScreen}>
          <div className={`${styles.resultIcon} ${styles.resultSuccess}`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.resultTitle}>Verifikasi Berhasil!</h2>
          <p className={styles.resultText} style={{ fontWeight: 800, color: 'var(--color-success-700)', fontSize: '15px', marginBottom: '4px' }}>
            📍 Terverifikasi di {verifiedFloorInfo?.name || floor?.name}
          </p>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '340px', margin: '0 auto 12px', lineHeight: 1.4 }}>
            Pemeriksaan {floor?.name} selesai. Kehadiran fisik sesi ini telah sah tervalidasi dan Anda tidak perlu lagi melakukan scan barcode di lantai lainnya.
          </p>
          <div className={styles.resultMeta} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {isOfflineScan ? (
              <>
                <span className="badge badge-warning badge-lg">⚡ QR Tervalidasi Fisik (Mode Offline)</span>
                <span style={{ fontSize: '12px', color: 'var(--color-warning-700)', fontWeight: '600', textAlign: 'center', maxWidth: '320px' }}>
                  Data tersimpan di HP • Otomatis diunggah ke server & memori dibersihkan saat ada sinyal
                </span>
              </>
            ) : (
              <>
                <span className="badge badge-success badge-lg">✓ Kehadiran Fisik Tervalidasi</span>
                <span style={{ fontSize: '12px', color: 'var(--color-success-700)', fontWeight: '600', textAlign: 'center', maxWidth: '320px' }}>
                  ☁️ Sesi patroli ini telah memenuhi SOP kehadiran fisik RS Mata JEC ORBITA.
                </span>
              </>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px', margin: '24px auto 0' }}>
            {nextFloor ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    const targetUrl = `/security/patrol/floor/${nextFloor.id}`;
                    if (typeof window !== 'undefined' && !navigator.onLine) {
                      window.location.href = targetUrl;
                    } else {
                      router.push(targetUrl);
                    }
                  }}
                  style={{ fontWeight: 700 }}
                >
                  Lanjut ke {nextFloor.name} →
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const targetUrl = '/security/patrol';
                    if (typeof window !== 'undefined' && !navigator.onLine) {
                      window.location.href = targetUrl;
                    } else {
                      router.push(targetUrl);
                    }
                  }}
                >
                  Lihat Rute Patroli
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => {
                  const targetUrl = '/security/patrol/summary';
                  if (typeof window !== 'undefined' && !navigator.onLine) {
                    window.location.href = targetUrl;
                  } else {
                    router.push(targetUrl);
                  }
                }}
                style={{ fontWeight: 700 }}
              >
                Lihat Ringkasan Patroli 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (scanState === 'error') {
    return (
      <div className="page-content">
        <div className={styles.resultScreen}>
          <div className={`${styles.resultIcon} ${styles.resultError}`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 className={styles.resultTitle}>Validasi Gagal</h2>
          <p className={styles.resultText}>{errorMsg}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px', margin: '16px auto 0 auto' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setScanState('scanning')}>
              Scan Ulang
            </button>
            <button className="btn btn-ghost" onClick={() => setShowManualInput(true)}>
              Ketik Kode Darurat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className={styles.header}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => router.back()}
          aria-label="Kembali"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className={styles.title}>Scan QR Lantai</h1>
          <p className={styles.subtitle}>{floor?.name}</p>
        </div>
      </div>

      <div className={styles.scanArea}>
        <div className={styles.scannerWrapper}>
          <QRScanner
            onScan={handleScanSuccess}
            floorName={floor?.name}
            hideHeader={true}
          />
        </div>
      </div>

      {/* Skip button for 1-barcode-per-session SOP */}
      <div style={{ marginTop: '14px', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleSkipScan}
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '10px',
            color: 'var(--color-primary-700)',
            borderColor: 'var(--color-primary-300)',
            background: 'var(--color-primary-50)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⏩ Lewati & Scan di Lantai Lain Nanti</span>
        </button>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          *Cukup 1x scan barcode di lantai manapun per sesi patroli
        </p>
      </div>

      {/* Manual Input Fallback (for damaged/unreadable printed stickers) */}
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        {!showManualInput ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowManualInput(true)}
            style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '4px 8px', height: 'auto' }}
          >
            Stiker QR rusak/sulit terbaca? Ketik kode manual
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="card" style={{ padding: '12px', textAlign: 'left', maxWidth: '320px', margin: '0 auto' }}>
            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Kode Token QR Lantai (di bawah stiker)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="form-input"
                placeholder="Contoh: ORB-L1-QR-..."
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 8px' }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={!manualToken.trim() || submittingManual}>
                {submittingManual ? '...' : 'Cek'}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-1"
              onClick={() => setShowManualInput(false)}
              style={{ padding: 0, fontSize: '11px', color: 'var(--text-muted)' }}
            >
              Tutup Form Manual
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
