'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './qr-scanner.module.css';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  floorName?: string;
  hideHeader?: boolean;
}

export default function QRScanner({ onScan, onError, onCancel, floorName, hideHeader = false }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCamIndex, setActiveCamIndex] = useState(0);

  const startScanner = useCallback(async (selectedCameraId?: string) => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!scannerRef.current) return;

      // Clean up previous instance if running
      if (html5QrRef.current) {
        try {
          if (html5QrRef.current.isScanning) {
            await html5QrRef.current.stop();
          }
          html5QrRef.current.clear();
        } catch (e) {
          console.warn('Cleanup previous scanner warning:', e);
        }
      }

      // Generate unique element ID
      const elementId = 'qr-box-' + Date.now();
      scannerRef.current.id = elementId;

      const qrInstance = new Html5Qrcode(elementId, { 
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      html5QrRef.current = qrInstance;

      // Determine camera configuration
      let cameraConfig: any = selectedCameraId;
      if (!cameraConfig) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Search for primary rear camera label
            const rearCam = devices.find(d => 
              /back|rear|belakang/i.test(d.label) && !/wide|tele|macro|depth/i.test(d.label)
            ) || devices.find(d => /back|rear|belakang/i.test(d.label));

            if (rearCam) {
              cameraConfig = rearCam.id;
            } else {
              cameraConfig = { facingMode: 'environment' };
            }
          } else {
            cameraConfig = { facingMode: 'environment' };
          }
        } catch {
          cameraConfig = { facingMode: 'environment' };
        }
      }

      // Start scanner with standard rear camera configuration
      await qrInstance.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(160, Math.floor(minEdge * 0.8));
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setStatus('success');
          if (navigator.vibrate) navigator.vibrate(200);
          try {
            qrInstance.stop().catch(() => {});
          } catch (e) {}
          setTimeout(() => onScan(decodedText), 500);
        },
        () => {
          // Normal frame scan tick
        }
      );

      // Ensure video element plays and is not paused/black
      if (scannerRef.current) {
        const videoEl = scannerRef.current.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('webkit-playsinline', 'true');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.play().catch(() => {});
        }
      }

      setStatus('scanning');
    } catch (err: any) {
      console.error('QR Scanner start error:', err);
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Kamera tidak dapat dibuka';
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setErrorMsg('Izin kamera ditolak browser. Buka Pengaturan Situs browser dan berikan izin Kamera.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
        setErrorMsg('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setErrorMsg('Kamera video tidak terbuka. Silakan gunakan tombol "Foto Stiker QR" di bawah.');
      }
      onError?.(msg);
    }
  }, [onScan, onError]);

  useEffect(() => {
    startScanner();

    return () => {
      if (html5QrRef.current) {
        try {
          if (html5QrRef.current.isScanning) {
            html5QrRef.current.stop().catch(() => {});
          }
          html5QrRef.current.clear();
        } catch (e) {}
      }
    };
  }, [startScanner]);

  const handleSwitchCamera = () => {
    if (cameras.length > 1) {
      const nextIndex = (activeCamIndex + 1) % cameras.length;
      setActiveCamIndex(nextIndex);
      startScanner(cameras[nextIndex].id);
    } else {
      startScanner();
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('loading');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempId = 'temp-scan-file-' + Date.now();
      const div = document.createElement('div');
      div.id = tempId;
      div.style.display = 'none';
      document.body.appendChild(div);

      const fileScanner = new Html5Qrcode(tempId, { verbose: false });
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      document.body.removeChild(div);

      setStatus('success');
      if (navigator.vibrate) navigator.vibrate(200);
      setTimeout(() => onScan(decodedText), 500);
    } catch (err) {
      setStatus('error');
      setErrorMsg('Stiker QR tidak terdeteksi pada foto. Pastikan stiker berada di pencahayaan yang cukup.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Optional Header (Hidden if caller provides its own header) */}
      {!hideHeader && (
        <div className={styles.header}>
          {onCancel && (
            <button type="button" className={styles.backBtn} onClick={onCancel}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          <div>
            <h3 className={styles.title}>Scan QR Lantai</h3>
            {floorName && <p className={styles.sub}>{floorName}</p>}
          </div>
        </div>
      )}

      {/* Scanner Viewport Box */}
      <div className={styles.scannerWrap}>
        {status === 'loading' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span style={{ fontSize: '12px' }}>Membuka sensor kamera...</span>
          </div>
        )}

        {status === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 className={styles.successTitle}>QR Terverifikasi!</h3>
            <p className={styles.successSub}>{floorName || 'Lantai Selesai'}</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorState}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <p>{errorMsg}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => startScanner()}>
              🔄 Coba Buka Ulang Kamera
            </button>
          </div>
        )}

        <div 
          ref={scannerRef} 
          className={styles.scannerEl} 
          style={{ opacity: status === 'scanning' ? 1 : 0.01 }} 
        />

        {status === 'scanning' && (
          <div className={styles.scanOverlay}>
            <div className={styles.viewfinderCorners} />
            <div className={styles.scanLine} />
          </div>
        )}
      </div>

      {/* Camera Controls & Photo Fallback */}
      <div className={styles.scannerControls}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileScan}
        />
        <button
          type="button"
          className={styles.controlBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          📷 Foto Stiker QR
        </button>
        {cameras.length > 1 && (
          <button
            type="button"
            className={styles.controlBtn}
            onClick={handleSwitchCamera}
          >
            🔄 Ganti Lensa
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <p>Arahkan kamera ke stiker QR fisik lantai atau ketuk Foto Stiker QR.</p>
      </div>
    </div>
  );
}
