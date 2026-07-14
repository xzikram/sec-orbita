'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './qr-scanner.module.css';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  floorName?: string;
}

export default function QRScanner({ onScan, onError, onCancel, floorName }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedData, setScannedData] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted || !scannerRef.current) return;

        const scannerId = 'qr-scanner-' + Date.now();
        scannerRef.current.id = scannerId;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!mounted) return;
            setScannedData(decodedText);
            setStatus('success');

            // Vibrate on success
            if (navigator.vibrate) navigator.vibrate(200);

            // Stop scanner
            html5QrCode.stop().catch(() => {});

            // Callback after a short delay for visual feedback
            setTimeout(() => onScan(decodedText), 800);
          },
          () => {
            // QR scan error (frame without QR) — ignore
          }
        );

        if (mounted) setStatus('scanning');
      } catch (err) {
        console.error('QR Scanner init error:', err);
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Gagal membuka scanner';
          setStatus('error');
          setErrorMsg(msg.includes('NotAllowed') ? 'Izin kamera ditolak' : msg.includes('NotFound') ? 'Kamera tidak ditemukan' : msg);
          onError?.(msg);
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (html5QrRef.current) {
        const scanner = html5QrRef.current as { stop: () => Promise<void>; clear: () => void };
        scanner.stop().catch(() => {});
        try { scanner.clear(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {onCancel && (
          <button className={styles.backBtn} onClick={onCancel}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div className={styles.headerText}>
          <h3 className={styles.title}>Scan QR Lantai</h3>
          {floorName && <p className={styles.sub}>{floorName}</p>}
        </div>
      </div>

      {/* Scanner area */}
      <div className={styles.scannerWrap}>
        {status === 'loading' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Membuka kamera...</span>
          </div>
        )}

        {status === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successCircle}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 className={styles.successTitle}>QR Valid!</h3>
            <p className={styles.successSub}>{floorName || 'Lantai'} — Terverifikasi</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <p>{errorMsg}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Coba Lagi</button>
          </div>
        )}

        <div ref={scannerRef} className={`${styles.scannerEl} ${status === 'scanning' ? '' : styles.hidden}`} />

        {status === 'scanning' && (
          <div className={styles.scanOverlay}>
            <div className={styles.scanLine} />
          </div>
        )}
      </div>

      {/* Instructions */}
      {status === 'scanning' && (
        <div className={styles.instructions}>
          <p>Arahkan kamera ke QR Code yang ditempel di titik akhir rute lantai</p>
        </div>
      )}
    </div>
  );
}
