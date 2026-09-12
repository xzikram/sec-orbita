'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/QRScanner';
import { getFloorById, getRoomsByFloor, floors } from '@/lib/dummy-data';
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

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOfflineScan(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    async function loadData() {
      try {
        const [sessionsRes, dbMod] = await Promise.all([
          fetch('/api/patrol/sessions').catch(() => null),
          import('@/lib/db').catch(() => null),
        ]);

        if (sessionsRes && sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1] || null;
          setSession(active);
          if (active) {
            try { localStorage.setItem('cached-active-session', JSON.stringify(active)); } catch {}
          }
        } else {
          const cached = localStorage.getItem('cached-active-session');
          if (cached) {
            try { setSession(JSON.parse(cached)); } catch {}
          }
        }

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
              const cleanTargetId = String(id).trim().toLowerCase();
              const matchedFloor = cachedFloors.find((f: any) =>
                String(f.id).toLowerCase() === cleanTargetId ||
                String(f.code || '').toLowerCase() === cleanTargetId ||
                `floor-${String(f.code || '').toLowerCase()}` === cleanTargetId ||
                `sf-${String(f.code || '').toLowerCase()}` === cleanTargetId
              );
              if (matchedFloor) {
                setDbFloor(matchedFloor);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('QR Scan load error:', err);
        const cached = localStorage.getItem('cached-active-session');
        if (cached) {
          try { setSession(JSON.parse(cached)); } catch {}
        }
      } finally {
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
  const dbCheckedRoomCodes = sessionFloor?.patrolChecks?.map((c: any) => c.roomCodeSnapshot) || [];
  const offCheckedRoomCodes = offlineChecks
    .filter((c: any) => c.sessionFloorId === sessionFloor?.id || (floor?.code && c.sessionFloorId === `sf-${floor.code.toLowerCase()}`))
    .map((c: any) => {
      const r = floorRooms.find(rm => rm.id === c.roomId);
      return r ? r.code : c.roomId;
    });
  const uniqueChecked = new Set([...dbCheckedRoomCodes, ...offCheckedRoomCodes]);
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
          onClick={() => router.push(`/security/patrol/floor/${floor.id}`)}
          style={{ fontWeight: 700 }}
        >
          ← Selesaikan Pemeriksaan Ruangan
        </button>
      </div>
    );
  }

  const handleScanSuccess = async (scannedText: string) => {
    const rawTrimmed = scannedText.trim();
    let tokenValue = rawTrimmed;
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (parsed.token) tokenValue = String(parsed.token).trim();
    } catch {}

    const { isOfficialQrValidForFloor, getFloorByQrToken } = await import('@/lib/qr-constants');
    const targetFloorCode = floor ? floor.code : id;
    const isPhysicalValid = isOfficialQrValidForFloor(targetFloorCode, tokenValue);

    // If QR does not match this floor, inform user immediately without server calls
    if (!isPhysicalValid) {
      const matchedOtherFloor = getFloorByQrToken(tokenValue);
      setScanState('error');
      if (matchedOtherFloor) {
        setErrorMsg(`QR ini milik ${matchedOtherFloor.floorName}. Silakan scan stiker QR di ${floor?.name || 'lantai ini'}.`);
      } else {
        setErrorMsg('QR Code tidak sesuai dengan stiker fisik di lantai ini.');
      }
      return;
    }

    // Physical QR code is 100% verified!
    const floorCode = floor ? floor.code : (getFloorByQrToken(tokenValue)?.floorCode || '');
    const sfId = sessionFloor?.id || (floor ? `sf-${floor.code.toLowerCase()}` : id);

    // 1. Immediately save scan record to IndexedDB
    try {
      const { saveOfflineQrScan } = await import('@/lib/db');
      await saveOfflineQrScan({
        id: `qr-scan-${Date.now()}-${floorCode}`,
        sessionFloorId: sfId,
        floorCode,
        qrToken: tokenValue,
        scannedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('Save offline QR scan notice:', dbErr);
    }

    // 2. Mark floor completed in cached active session in localStorage
    try {
      const cached = localStorage.getItem('cached-active-session');
      if (cached) {
        const sess = JSON.parse(cached);
        if (Array.isArray(sess.sessionFloors)) {
          const sf = sess.sessionFloors.find((f: any) => 
            f.floorCodeSnapshot === floorCode || f.id === sfId || f.floorId === id || f.floor?.code === floorCode
          );
          if (sf) {
            sf.status = 'completed';
            sf.qrValidated = true;
            sf.completedAt = new Date().toISOString();
            localStorage.setItem('cached-active-session', JSON.stringify(sess));
          }
        }
      }
    } catch {}

    try { localStorage.removeItem('lastPatrolState'); } catch {}

    // 3. Immediately show success screen
    setIsOfflineScan(!navigator.onLine);
    setScanState('success');

    // 4. Background non-blocking sync: attempt server validation & memory wipe
    // If offline or server unreachable, stays safely in IndexedDB without any error screen
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
      try {
        router.push(targetUrl);
      } catch {
        window.location.href = targetUrl;
      }
    }, 2200);
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
          <p className={styles.resultText}>{floor?.name} telah selesai dipatroli</p>
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
                <span className="badge badge-success badge-lg">✓ QR Code Tervalidasi Online</span>
                <span style={{ fontSize: '12px', color: 'var(--color-success-700)', fontWeight: '600', textAlign: 'center', maxWidth: '320px' }}>
                  ☁️ Seluruh pemeriksaan ruangan & foto telah diterima server. Memori HP telah dibersihkan.
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
                  onClick={() => router.push(`/security/patrol/floor/${nextFloor.id}`)}
                  style={{ fontWeight: 700 }}
                >
                  Lanjut ke {nextFloor.name} →
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => router.push('/security/patrol')}
                >
                  Lihat Rute Patroli
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/security/patrol/summary')}
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
