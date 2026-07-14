'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/QRScanner';
import { getFloorById, activeSessionFloors } from '@/lib/dummy-data';
import styles from './qrscan.module.css';

export default function QRScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const floor = getFloorById(id);

  const [scanState, setScanState] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('Titik validasi tidak sesuai dengan lantai yang sedang diperiksa.');

  const handleScanSuccess = async (scannedText: string) => {
    // Attempt validation via API
    try {
      const sessionFloor = activeSessionFloors.find(sf => sf.floorId === id);
      if (!sessionFloor) {
        setScanState('error');
        setErrorMsg('Sesi patroli lantai tidak aktif.');
        return;
      }

      const res = await fetch('/api/patrol/qr-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionFloorId: sessionFloor.id,
          qrToken: scannedText,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setScanState('success');
        setTimeout(() => {
          router.push('/security/patrol');
        }, 2000);
      } else {
        setScanState('error');
        setErrorMsg(data.error || 'QR Code tidak valid untuk lantai ini.');
      }
    } catch {
      // Offline fallback / demo validation fallback
      if (scannedText.includes(id) || scannedText.includes(floor?.code || '')) {
        setScanState('success');
        setTimeout(() => {
          router.push('/security/patrol');
        }, 2000);
      } else {
        setScanState('error');
        setErrorMsg('Gagal memvalidasi QR Code lantai (Koneksi error).');
      }
    }
  };

  const handleSimulateScan = () => {
    setScanState('success');
    setTimeout(() => {
      router.push('/security/patrol');
    }, 2000);
  };

  const handleSimulateError = () => {
    setScanState('error');
    setErrorMsg('Titik validasi tidak sesuai dengan lantai yang sedang diperiksa.');
  };

  if (scanState === 'success') {
    return (
      <div className="page-content">
        <div className={styles.resultScreen}>
          <div className={`${styles.resultIcon} ${styles.resultSuccess}`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.resultTitle}>Validasi Berhasil!</h2>
          <p className={styles.resultText}>{floor?.name} telah selesai dipatroli</p>
          <div className={styles.resultMeta}>
            <span className="badge badge-success badge-lg">✓ QR Tervalidasi</span>
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
          <button className="btn btn-primary btn-lg mt-4" onClick={() => setScanState('scanning')}>
            Coba Lagi
          </button>
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
          />
        </div>
      </div>

      {/* Demo Buttons */}
      <div className={styles.demoButtons}>
        <button className="btn btn-success btn-xl" onClick={handleSimulateScan} id="btn-demo-scan-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Demo: Scan Berhasil
        </button>
        <button className="btn btn-outline btn-sm w-full" onClick={handleSimulateError}>
          Demo: Scan Gagal
        </button>
      </div>
    </div>
  );
}
