'use client';

import { useState, useEffect } from 'react';
import { qrConfigs } from '@/lib/admin-data';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import s from '../admin-crud.module.css';
import styles from './qr.module.css';

interface ApiFloor {
  id: string;
  code: string;
  name: string;
  building: {
    name: string;
    code: string;
  };
  qrCode: {
    token: string;
    generatedAt: string;
  } | null;
}

export default function QRCodesPage() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFloors() {
      try {
        const res = await fetch('/api/floors');
        if (res.ok) {
          const data = await res.json();
          setFloors(data);
        }
      } catch (err) {
        console.error('Failed to fetch floors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFloors();
  }, []);

  const handleRegenerate = async (floorId: string) => {
    setRegenerating(floorId);
    // Simulate regeneration
    setTimeout(() => setRegenerating(null), 1500);
  };

  // Use API data if available, otherwise fallback to mock config data
  const hasApiData = floors.length > 0;
  const qrItems = hasApiData
    ? floors.map(f => ({
        id: f.id,
        floorName: f.name,
        floorCode: f.code,
        qrValue: f.qrCode?.token || `JEC-ORB-${f.code}-PENDING`,
        generatedAt: f.qrCode?.generatedAt || new Date().toISOString(),
        lastPrinted: null,
      }))
    : qrConfigs;

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Generate QR Code</h1>
          <p className={s.pageSub}>1 QR fisik per lantai — digunakan untuk validasi keberadaan</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Cetak Semua QR
        </button>
      </div>

      {loading && hasApiData === false ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--color-neutral-200)',
            borderTop: '4px solid var(--color-primary-600)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div className={styles.qrGrid}>
          {qrItems.map(qr => (
            <div key={qr.id} className={`card ${styles.qrCard}`}>
              <div className={styles.qrHeader}>
                <h3 className={styles.qrFloor}>{qr.floorName}</h3>
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
                  <span className={styles.qrMetaLabel}>Dibuat</span>
                  <span className={styles.qrMetaValue}>{new Date(qr.generatedAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div className={styles.qrMetaRow}>
                  <span className={styles.qrMetaLabel}>Terakhir cetak</span>
                  <span className={styles.qrMetaValue}>
                    {qr.lastPrinted ? new Date(qr.lastPrinted).toLocaleDateString('id-ID') : 'Belum pernah'}
                  </span>
                </div>
              </div>

              <div className={styles.qrActions}>
                <button
                  className={`btn btn-outline btn-sm ${regenerating === qr.id ? styles.btnLoading : ''}`}
                  onClick={() => handleRegenerate(qr.id)}
                  disabled={regenerating === qr.id}
                >
                  {regenerating === qr.id ? '⟳ Generating...' : '🔄 Regenerate'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Cetak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`card ${styles.infoCard}`}>
        <h3 className={styles.infoTitle}>ℹ️ Panduan QR Code</h3>
        <ul className={styles.infoList}>
          <li>Setiap lantai memiliki <strong>1 QR fisik</strong> yang dipasang di titik akhir rute patroli</li>
          <li>QR digunakan untuk <strong>memvalidasi keberadaan</strong> petugas di lantai tersebut</li>
          <li>Security wajib scan QR setelah semua ruangan di lantai tersebut selesai diperiksa</li>
          <li><strong>Regenerate</strong> QR hanya jika QR fisik rusak atau hilang — nilai QR akan berubah</li>
          <li>Cetak dengan ukuran minimal <strong>8×8 cm</strong> untuk memudahkan scanning</li>
        </ul>
      </div>
    </div>
  );
}

