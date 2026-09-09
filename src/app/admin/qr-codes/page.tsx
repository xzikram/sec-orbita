'use client';

import { useState, useEffect } from 'react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { OFFICIAL_FLOOR_QRS, OFFICIAL_QR_MAP } from '@/lib/qr-constants';
import s from '../admin-crud.module.css';
import styles from './qr.module.css';

interface ApiFloor {
  id: string;
  code: string;
  name: string;
  building?: {
    name: string;
    code: string;
  };
  qrCode?: {
    token: string;
    generatedAt: string;
  } | null;
}

export default function QRCodesPage() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFloors() {
      try {
        const res = await fetch('/api/floors');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setFloors(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch floors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFloors();
  }, []);

  // Build the list of 12 official floors with guaranteed exact tokens
  const qrItems = OFFICIAL_FLOOR_QRS.map((official) => {
    const matchedFloor = floors.find(
      (f) => f.code.toUpperCase() === official.floorCode.toUpperCase()
    );

    return {
      id: matchedFloor?.id || `floor-${official.floorCode.toLowerCase()}`,
      floorName: official.floorName,
      floorCode: official.floorCode,
      qrValue: official.token, // 100% locked to official physical sticker
      generatedAt: matchedFloor?.qrCode?.generatedAt || '2026-07-29T01:58:29.550Z',
      lastPrinted: '2026-07-29T02:00:00.000Z',
      isOfficialLocked: true,
    };
  });

  const handlePrintSingle = (floorName: string) => {
    window.print();
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Master QR Code Fisik</h1>
          <p className={s.pageSub}>
            12 QR fisik permanen untuk validasi keberadaan patroli di RS Mata JEC ORBITA
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Cetak Semua QR (12 Lantai)
        </button>
      </div>

      {/* Lock Protection Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <span style={{ fontSize: '24px', lineHeight: 1 }}>🔒</span>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#166534' }}>
            QR Code Resmi Terkunci Permanen (Anti-Perubahan)
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#15803d', lineHeight: 1.5 }}>
            Seluruh 12 kode barcode di bawah ini telah <strong>disamakan persis 100%</strong> dengan
            stiker fisik yang telah dipasang di dinding setiap lantai RS Mata JEC ORBITA. Fitur acak/regenerate
            telah dikunci permanen agar hasil scan security saat bertugas di lapangan selalu valid dan tidak
            pernah tertolak.
          </p>
        </div>
      </div>

      {loading && floors.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div
            className="spinner"
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--color-neutral-200)',
              borderTop: '4px solid var(--color-primary-600)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style jsx global>{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      ) : (
        <div className={styles.qrGrid}>
          {qrItems.map((qr) => (
            <div key={qr.id} className={`card ${styles.qrCard}`}>
              <div className={styles.qrHeader}>
                <div>
                  <h3 className={styles.qrFloor}>{qr.floorName}</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#166534',
                      background: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      display: 'inline-block',
                      marginTop: '4px',
                    }}
                  >
                    🔒 Terkunci Permanen
                  </span>
                </div>
                <span className={s.tdCode}>{qr.floorCode}</span>
              </div>

              <div className={styles.qrPreview}>
                <div className={styles.qrContainer}>
                  <QRCodeDisplay value={qr.qrValue} size={150} />
                  <span className={styles.qrValue}>{qr.qrValue}</span>
                </div>
              </div>

              <div className={styles.qrMeta}>
                <div className={styles.qrMetaRow}>
                  <span className={styles.qrMetaLabel}>Status Stiker</span>
                  <span className={styles.qrMetaValue} style={{ color: '#16a34a', fontWeight: 700 }}>
                    Terpasang di Lantai
                  </span>
                </div>
                <div className={styles.qrMetaRow}>
                  <span className={styles.qrMetaLabel}>Format Nilai</span>
                  <span className={styles.qrMetaValue}>Resmi RS Mata JEC ORBITA</span>
                </div>
              </div>

              <div className={styles.qrActions}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{
                    background: '#f8fafc',
                    color: '#64748b',
                    borderColor: '#cbd5e1',
                    cursor: 'not-allowed',
                  }}
                  disabled
                  title="Kode ini telah dikunci permanen sesuai stiker fisik"
                >
                  🔒 Terkunci
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handlePrintSingle(qr.floorName)}
                  title={`Cetak ulang stiker ${qr.floorName}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak Stiker
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`card ${styles.infoCard}`}>
        <h3 className={styles.infoTitle}>ℹ️ Panduan Barcode Resmi RS Mata JEC ORBITA</h3>
        <ul className={styles.infoList}>
          <li>
            <strong>12 Barcode Fisik:</strong> Telah dicocokkan 100% dengan stiker yang telah dipasang
            pada Semi Basement (SB), Lantai 1 (L1), Lantai P2–P4 (P2, P3, P4), dan Lantai 5–11 (L5, L6, L7, L8, L9, L10, L11).
          </li>
          <li>
            <strong>Proteksi Kunci Permanen:</strong> Nilai barcode dijamin <strong>tidak akan pernah berubah</strong> meskipun ada pembaruan sistem atau restart server.
          </li>
          <li>
            <strong>Validasi Scanner Mobile:</strong> Saat security scan barcode di dinding lantai menggunakan kamera HP, sistem otomatis mencocokkan kode fisik ini dan memvalidasi penyelesaian patroli lantai secara akurat.
          </li>
          <li>
            <strong>Penggantian Stiker Rusak:</strong> Jika stiker di dinding sobek atau kotor, gunakan tombol <strong>"Cetak Stiker"</strong> untuk mencetak ulang barcode yang bernilai sama persis tanpa perlu konfigurasi ulang.
          </li>
        </ul>
      </div>
    </div>
  );
}
