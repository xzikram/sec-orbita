'use client';

import { useState, useEffect } from 'react';
import QRScanner from '@/components/QRScanner';
import { validateAnyOfficialFloorQr, isOfficialQrValidForFloor, getFloorByQrToken } from '@/lib/qr-constants';
import { saveOfflineQrScan } from '@/lib/db';
import { syncOfflineData } from '@/lib/sync';
import { getRoomsByFloor } from '@/lib/dummy-data';
import WhatsAppFloorShareModal from '@/components/WhatsAppFloorShareModal';
import styles from '@/app/security/patrol/floor/[id]/qr-scan/qrscan.module.css';

interface FloorQrScannerSheetProps {
  floor: any;
  session: any;
  sessionFloor?: any;
  settings?: any;
  isAllRoomsChecked: boolean;
  nextFloor?: any;
  rooms?: any[];
  checks?: any[];
  onClose: () => void;
  onScanSuccess: (verifiedFloorInfo: { name: string; code: string }) => void;
}

export default function FloorQrScannerSheet({
  floor,
  session,
  sessionFloor,
  settings = {},
  isAllRoomsChecked,
  nextFloor,
  rooms = [],
  checks = [],
  onClose,
  onScanSuccess,
}: FloorQrScannerSheetProps) {
  const [scanState, setScanState] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('Stiker barcode tidak sesuai.');
  const [isOfflineScan, setIsOfflineScan] = useState(false);
  const [verifiedFloorInfo, setVerifiedFloorInfo] = useState<{ name: string; code: string } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);

  // Handle hardware / browser Back button (PopState)
  useEffect(() => {
    window.history.pushState({ modal: 'qr-scanner' }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleScanSuccessInternal = async (scannedText: string) => {
    const rawTrimmed = scannedText.trim();
    let tokenValue = rawTrimmed;
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (parsed.token) tokenValue = String(parsed.token).trim();
    } catch {}

    const targetFloorCode = floor ? floor.code : '';
    const anyOfficial = validateAnyOfficialFloorQr(tokenValue);
    const isFloorMatch = isOfficialQrValidForFloor(targetFloorCode, tokenValue);
    const matchedOfficial = anyOfficial || (isFloorMatch ? getFloorByQrToken(tokenValue) : undefined);

    if (!matchedOfficial && !isFloorMatch) {
      setScanState('error');
      setErrorMsg('QR Code tidak valid sebagai stiker fisik resmi RS Mata JEC ORBITA.');
      return;
    }

    const qrScanMode = settings.qr_scan_mode || 'session';
    if (qrScanMode === 'per_floor' && !isFloorMatch) {
      setScanState('error');
      setErrorMsg(`Mode verifikasi tiap lantai aktif. Anda harus scan stiker barcode ${floor?.name || targetFloorCode} (QR yang di-scan milik ${matchedOfficial?.floorName || 'lantai lain'}).`);
      return;
    }

    const verifiedCode = matchedOfficial ? matchedOfficial.floorCode : targetFloorCode;
    const verifiedName = matchedOfficial ? matchedOfficial.floorName : (floor?.name || `Lantai ${targetFloorCode}`);
    const verifiedInfo = { name: verifiedName, code: verifiedCode };
    setVerifiedFloorInfo(verifiedInfo);

    const sfId = sessionFloor?.id || (floor ? `sf-${String(floor.code).toLowerCase()}` : 'sf-active');

    // 1. Immediately save scan record to IndexedDB (100% Offline Resilience)
    try {
      await saveOfflineQrScan({
        id: `qr-scan-${Date.now()}-${verifiedCode}`,
        sessionFloorId: sfId,
        floorCode: verifiedCode,
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
          const curSf = sess.sessionFloors.find((f: any) =>
            f.floorCodeSnapshot === targetFloorCode || f.id === sfId || f.floorId === floor?.id || f.floor?.code === targetFloorCode
          );
          if (curSf) {
            if (isAllRoomsChecked) {
              curSf.status = 'completed';
              curSf.completedAt = new Date().toISOString();
            } else if (curSf.status !== 'completed') {
              curSf.status = 'in_progress';
            }
            curSf.qrValidated = true;
            curSf.qrScannedAt = new Date().toISOString();
            curSf.qrTokenUsed = tokenValue;
          }

          const verifiedSf = sess.sessionFloors.find((f: any) =>
            f.floorCodeSnapshot === verifiedCode || f.floor?.code === verifiedCode
          );
          if (verifiedSf) {
            verifiedSf.qrValidated = true;
            verifiedSf.qrScannedAt = new Date().toISOString();
            verifiedSf.qrTokenUsed = tokenValue;
            if (isAllRoomsChecked) {
              verifiedSf.status = 'completed';
              verifiedSf.completedAt = verifiedSf.completedAt || new Date().toISOString();
            }
          }

          localStorage.setItem('cached-active-session', JSON.stringify(sess));
        }
      }
    } catch {}

    try { localStorage.removeItem('lastPatrolState'); } catch {}

    const isCurrentlyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    setIsOfflineScan(isCurrentlyOffline);
    setScanState('success');

    // Background sync
    (async () => {
      try {
        const syncRes = await syncOfflineData();
        if (syncRes.qrScansSynced > 0) {
          setIsOfflineScan(false);
        }
      } catch {}
    })();

    onScanSuccess(verifiedInfo);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setSubmittingManual(true);
    await handleScanSuccessInternal(manualToken.trim());
    setSubmittingManual(false);
  };

  // SUCCESS SCREEN
  if (scanState === 'success') {
    return (
      <div className="page-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px' }}>
        <div className={styles.resultScreen} style={{ width: '100%', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
          <div className={`${styles.resultIcon} ${styles.resultSuccess}`} style={{ margin: '0 auto 16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.resultTitle} style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Verifikasi Berhasil!</h2>
          <p className={styles.resultText} style={{ fontWeight: 800, color: 'var(--color-success-700)', fontSize: '15px', marginBottom: '4px' }}>
            📍 Terverifikasi di {verifiedFloorInfo?.name || floor?.name}
          </p>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '340px', margin: '0 auto 12px', lineHeight: 1.4 }}>
            {settings.qr_scan_mode === 'per_floor'
              ? `Pemeriksaan dan barcode ${verifiedFloorInfo?.name || floor?.name} berhasil diverifikasi.`
              : `Kehadiran fisik sesi ini telah sah tervalidasi di RS Mata JEC ORBITA.`}
          </p>

          <div className={styles.resultMeta} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
            {isOfflineScan ? (
              <span className="badge badge-warning badge-lg">⚡ QR Tervalidasi Fisik (Mode Offline)</span>
            ) : (
              <span className="badge badge-success badge-lg">✓ Kehadiran Fisik Tervalidasi</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowWaModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
              }}
            >
              <span>📲</span>
              <span>Bagikan Laporan ke WhatsApp</span>
            </button>

            {!isAllRoomsChecked ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
                onClick={onClose}
              >
                ← Lanjut Periksa Ruangan di {floor?.name}
              </button>
            ) : nextFloor ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
                onClick={() => {
                  window.location.href = `/security/patrol/floor/${nextFloor.id}`;
                }}
              >
                Lanjut ke {nextFloor.name} →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
                onClick={() => {
                  window.location.href = '/security/patrol/summary';
                }}
              >
                Lihat Ringkasan Patroli →
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-md"
              style={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
              onClick={onClose}
            >
              Tutup & Kembali ke Lantai
            </button>
          </div>
        </div>

        {showWaModal && (
          <WhatsAppFloorShareModal
            isOpen={showWaModal}
            onClose={() => setShowWaModal(false)}
            floor={floor}
            rooms={rooms && rooms.length > 0 ? rooms : (floor ? getRoomsByFloor(floor.id) : [])}
            checks={checks && checks.length > 0 ? checks : (sessionFloor?.patrolChecks || [])}
            officerName={session?.user?.name || ''}
          />
        )}
      </div>
    );
  }

  // ERROR SCREEN
  if (scanState === 'error') {
    return (
      <div className="page-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px' }}>
        <div className={styles.resultScreen} style={{ width: '100%', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
          <div className={`${styles.resultIcon} ${styles.resultError}`} style={{ margin: '0 auto 16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className={styles.resultTitle} style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Validasi Gagal</h2>
          <p className={styles.resultText} style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
            {errorMsg}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
              onClick={() => {
                setScanState('scanning');
                setErrorMsg('');
              }}
            >
              Coba Scan Ulang
            </button>

            <button
              type="button"
              className="btn btn-outline btn-md"
              style={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
              onClick={onClose}
            >
              Batal & Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCANNING SCREEN
  return (
    <div className="page-content" style={{ paddingBottom: '32px' }}>
      <div className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Kembali"
            style={{ width: '38px', height: '38px', borderRadius: '12px', border: '1.5px solid var(--border-light, #e2e8f0)', background: '#fff' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Scan Barcode Lantai
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              {floor?.name || 'Verifikasi Fisik Kehadiran'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}
        >
          ✕ Batal
        </button>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <QRScanner
          onScan={handleScanSuccessInternal}
          onError={(err) => {
            console.warn('QR Scanner notice:', err);
          }}
          onCancel={onClose}
          floorName={floor?.name}
          hideHeader={true}
        />

        {/* Manual Input Fallback */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {!showManualInput ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowManualInput(true)}
              style={{ color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'underline' }}
            >
              Stiker rusak / buram? Masukkan kode token manual
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Input Kode Barcode Fisik:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Contoh: QR-SB-2024 atau token"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingManual || !manualToken.trim()}
                  style={{ fontWeight: 700 }}
                >
                  {submittingManual ? '...' : 'Verifikasi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
