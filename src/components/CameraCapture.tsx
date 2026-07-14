'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import styles from './camera-capture.module.css';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onCancel?: () => void;
  watermarkText?: string;
  roomName?: string;
  officerName?: string;
}

export default function CameraCapture({ onCapture, onCancel, watermarkText, roomName, officerName }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isStarting, setIsStarting] = useState(true);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setIsStarting(true);
    setError('');
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Izin kamera ditolak. Buka pengaturan browser untuk mengizinkan akses kamera.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setError('Gagal mengakses kamera. Pastikan browser mendukung akses kamera.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const addWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const now = new Date();
    const timestamp = now.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Makassar',
    });

    // Semi-transparent bar at bottom
    const barHeight = 56;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.textBaseline = 'middle';

    const leftText = roomName || watermarkText || 'Security Patrol';
    const rightText = timestamp;
    const bottomText = officerName ? `📷 ${officerName}` : 'JEC ORBITA';

    ctx.fillText(leftText, 12, height - barHeight + 18);

    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillText(bottomText, 12, height - barHeight + 38);

    ctx.font = 'bold 13px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(rightText, width - 12, height - barHeight + 18);

    ctx.font = '11px Inter, Arial, sans-serif';
    ctx.fillText('RS Mata JEC ORBITA', width - 12, height - barHeight + 38);
    ctx.textAlign = 'left';

    // Small logo-like shield top-right
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px Inter, Arial, sans-serif';
    ctx.fillText('🛡️ PATROL VERIFIED', 12, 20);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Add watermark
    addWatermark(ctx, canvas.width, canvas.height);

    // Compress
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.80);
    });

    // Further compress if too large (> 700KB)
    let finalBlob = blob;
    if (blob.size > 700 * 1024) {
      const { default: imageCompression } = await import('browser-image-compression');
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      finalBlob = compressed;
    }

    const preview = canvas.toDataURL('image/jpeg', 0.8);
    setCaptured(preview);

    const file = new File([finalBlob], `patrol-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file, preview);
  };

  const retake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          <p className={styles.errorText}>{error}</p>
          <button className="btn btn-primary" onClick={() => startCamera(facingMode)}>Coba Lagi</button>
          {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Batal</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {captured ? (
        <div className={styles.previewArea}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={captured} alt="Foto diambil" className={styles.preview} />
          <div className={styles.previewActions}>
            <button className="btn btn-outline" onClick={retake}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              Ulangi
            </button>
            <span className={styles.checkMark}>✓ Foto diambil</span>
          </div>
        </div>
      ) : (
        <div className={styles.cameraArea}>
          {isStarting && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Membuka kamera...</span>
            </div>
          )}
          <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
          <div className={styles.viewfinder}>
            <div className={styles.cornerTL} /><div className={styles.cornerTR} />
            <div className={styles.cornerBL} /><div className={styles.cornerBR} />
          </div>
          <div className={styles.controls}>
            {onCancel && (
              <button className={styles.ctrlBtn} onClick={onCancel}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
            <button className={styles.captureBtn} onClick={takePhoto} aria-label="Ambil foto">
              <div className={styles.captureBtnInner} />
            </button>
            <button className={styles.ctrlBtn} onClick={switchCamera}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className={styles.hiddenCanvas} />
    </div>
  );
}
