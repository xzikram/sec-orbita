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
    (session?.sessionFloors?.find((sf: any) => sf.floorId === id || sf.id === id)
      ? getFloorById(session.sessionFloors.find((sf: any) => sf.floorId === id || sf.id === id).floorCodeSnapshot)
      : undefined);

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
    if (!navigator.onLine) {
      setScanState('error');
      setErrorMsg('Verifikasi scan QR lantai membutuhkan jaringan internet. Silakan hubungkan HP ke Wi-Fi / Data Seluler.');
      return;
    }

    try {
      const sfId = sessionFloor?.id || (floor ? `sf-${floor.code.toLowerCase()}` : id);

      const res = await fetch('/api/patrol/qr-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionFloorId: sfId,
          qrToken: scannedText.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        // Trigger background sync for any remaining offline checks
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
      setScanState('error');
      setErrorMsg('Gagal memvalidasi ke server. Pastikan koneksi internet stabil.');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setSubmittingManual(true);
    await handleScanSuccess(manualToken.trim());
    setSubmittingManual(false);
  };

  // Offline barrier screen
  if (!isOnline && scanState !== 'success') {
    return (
      <div className="page-content">
        <div className={styles.header}>
          <button className="btn btn-ghost btn-icon" onClick={() => router.back()} aria-label="Kembali">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <h1 className={styles.title}>Verifikasi Lantai</h1>
            <p className={styles.subtitle}>{floor?.name}</p>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', marginTop: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '28px' }}>
            📶
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Koneksi Jaringan Diperlukan</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
            Seluruh pemeriksaan ruangan di <strong>{floor?.name}</strong> telah tersimpan aman di HP Anda secara lokal.
            Untuk menyelesaikan verifikasi QR lantai dan mengirim data ke server, hubungkan HP Anda ke Wi-Fi atau data seluler.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setIsOnline(navigator.onLine)}>
              🔄 Coba Sambungkan Kembali
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/security/patrol')}>
              Kembali ke Daftar Lantai
            </button>
          </div>
        </div>
      </div>
    );
  }

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
