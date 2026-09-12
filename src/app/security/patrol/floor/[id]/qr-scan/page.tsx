'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/QRScanner';
import { getFloorById } from '@/lib/dummy-data';
import styles from './qrscan.module.css';

export default function QRScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const floor = getFloorById(id) || 
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

  const [scanState, setScanState] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('Titik validasi tidak sesuai dengan lantai yang sedang diperiksa.');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    async function loadData() {
      try {
        const res = await fetch('/api/patrol/sessions').catch(() => null);
        if (res && res.ok) {
          const sessions = await res.json();
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
  }, []);

  const currentSession = session || { sessionFloors: [] };
  const sessionFloor = currentSession.sessionFloors?.find((sf: any) => 
    (floor && sf.floorCodeSnapshot === floor.code) || sf.id === id || sf.floorId === id
  );

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <p className="text-sm text-muted">Memuat data scanner...</p>
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

    const { isOfficialQrValidForFloor } = await import('@/lib/qr-constants');
    const floorCode = floor ? floor.code : '';
    const isPhysicalValid = isOfficialQrValidForFloor(floorCode, tokenValue);

    // If device is offline, allow offline verification using official wall token
    if (!navigator.onLine) {
      if (!isPhysicalValid) {
        setScanState('error');
        setErrorMsg('QR Code tidak sesuai dengan stiker fisik di lantai ini.');
        return;
      }

      try {
        // Save pending floor validation locally
        const pendingKey = `pending_qr_${sessionFloor?.id || id}`;
        localStorage.setItem(pendingKey, JSON.stringify({
          token: tokenValue,
          floorCode,
          scannedAt: new Date().toISOString()
        }));
      } catch {}

      setScanState('success');
      try { localStorage.removeItem('lastPatrolState'); } catch {}

      setTimeout(() => {
        router.push('/security/patrol');
      }, 2200);
      return;
    }

    // Online verification
    try {
      const sfId = sessionFloor?.id || (floor ? `sf-${floor.code.toLowerCase()}` : id);

      const res = await fetch('/api/patrol/qr-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionFloorId: sfId,
          qrToken: tokenValue,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        // Trigger background sync for any remaining offline checks + flush IndexedDB
        try {
          const { syncOfflineData } = await import('@/lib/sync');
          const syncRes = await syncOfflineData();
          if (syncRes.checksSynced > 0) {
            setSyncedCount(syncRes.checksSynced);
          }
        } catch (syncErr) {
          console.warn('Post-validation sync notice:', syncErr);
        }

        setScanState('success');
        try { localStorage.removeItem('lastPatrolState'); } catch {}

        // Check if all floors are completed
        const otherFloors = currentSession.sessionFloors?.filter((sf: any) => sf.id !== (sessionFloor?.id || sfId)) || [];
        const isAllDone = otherFloors.length > 0 && otherFloors.every((sf: any) => sf.status === 'completed' || sf.qrValidated);

        setTimeout(() => {
          if (isAllDone) {
            router.push('/security/patrol/summary');
          } else {
            router.push('/security/patrol');
          }
        }, 2200);
      } else {
        setScanState('error');
        setErrorMsg(data.error || 'QR Code tidak cocok untuk lantai ini.');
      }
    } catch {
      // If server unreachable despite navigator.onLine, fallback to physical token check
      if (isPhysicalValid) {
        try {
          const pendingKey = `pending_qr_${sessionFloor?.id || id}`;
          localStorage.setItem(pendingKey, JSON.stringify({
            token: tokenValue,
            floorCode,
            scannedAt: new Date().toISOString()
          }));
        } catch {}
        setScanState('success');
        setTimeout(() => router.push('/security/patrol'), 2200);
      } else {
        setScanState('error');
        setErrorMsg('Gagal memvalidasi ke server. Pastikan koneksi internet stabil.');
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setSubmittingManual(true);
    await handleScanSuccess(manualToken.trim());
    setSubmittingManual(false);
  };

  // Note: Offline scanning is allowed and validated against official stickers


  if (scanState === 'success') {
    return (
      <div className="page-content">
        <div className={styles.resultScreen}>
          <div className={`${styles.resultIcon} ${styles.resultSuccess}`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.resultTitle}>Verifikasi Berhasil!</h2>
          <p className={styles.resultText}>{floor?.name} telah selesai dipatroli</p>
          <div className={styles.resultMeta} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-success badge-lg">✓ QR Code Tervalidasi Fisik</span>
            {syncedCount !== null && (
              <span style={{ fontSize: '12px', color: 'var(--color-success-700)', fontWeight: '600' }}>
                ☁️ {syncedCount} pemeriksaan ruangan berhasil disinkronkan ke server
              </span>
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
            onError={(msg) => {
              setScanState('error');
              setErrorMsg(msg);
            }}
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
