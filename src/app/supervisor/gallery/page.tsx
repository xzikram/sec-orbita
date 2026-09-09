'use client';

import { useState, useEffect } from 'react';
import styles from './gallery.module.css';

interface PhotoItem {
  id: string;
  sessionId: string;
  patrolNumber: number;
  floorName: string;
  roomName: string;
  roomCode: string;
  officerName: string;
  takenAt: string;
  acStatus: string;
  lightStatus: string;
  condition: string;
  url: string;
  thumbnailUrl: string;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'finding'>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const res = await fetch('/api/patrol/photos');
        if (res.ok) {
          const data = await res.json();
          setPhotos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load gallery photos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPhotos();
  }, []);

  const uniqueFloors = [...new Set(photos.map(p => p.floorName).filter(Boolean))];

  const filtered = photos
    .filter(p => filter === 'all' || p.condition === 'Temuan')
    .filter(p => selectedFloor === 'all' || p.floorName === selectedFloor);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Galeri Foto Patroli</h1>
          <p className={styles.pageSub}>
            {loading ? 'Memuat dokumentasi...' : `Dokumentasi foto riil patroli • ${photos.length} foto tersimpan`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`} onClick={() => setFilter('all')}>
            Semua ({photos.length})
          </button>
          <button className={`${styles.filterBtn} ${filter === 'finding' ? styles.filterActive : ''}`} onClick={() => setFilter('finding')}>
            ⚠ Temuan ({photos.filter(p => p.condition === 'Temuan').length})
          </button>
        </div>
        <select className={styles.selectFloor} value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)}>
          <option value="all">Semua Lantai</option>
          {uniqueFloors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loading ? (
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
        /* Photo Grid */
        <div className={styles.grid}>
          {filtered.map(photo => (
            <div
              key={photo.id}
              className={`${styles.photoCard} ${photo.condition === 'Temuan' ? styles.photoFinding : ''}`}
              onClick={() => setLightboxPhoto(photo)}
            >
              <div className={styles.photoThumb}>
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.roomName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback if image path broken
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={styles.photoPlaceholder}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>{photo.roomCode}</span>
                  </div>
                )}
                {photo.condition === 'Temuan' && (
                  <span className={styles.findingBadge}>⚠ Temuan</span>
                )}
              </div>
              <div className={styles.photoInfo}>
                <span className={styles.photoRoom}>{photo.roomName}</span>
                <span className={styles.photoMeta}>{photo.floorName} • {formatTime(photo.takenAt)}</span>
                <div className={styles.photoTags}>
                  {photo.acStatus !== '-' && (
                    <span className={`${styles.miniTag} ${photo.acStatus === 'ON' ? styles.miniOn : styles.miniOff}`}>AC {photo.acStatus}</span>
                  )}
                  <span className={`${styles.miniTag} ${photo.lightStatus === 'ON' ? styles.miniOn : styles.miniOff}`}>💡 {photo.lightStatus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <p>Belum ada foto patroli yang tersimpan. Foto akan otomatis muncul saat security melakukan pemeriksaan ruangan.</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className={styles.lightbox} onClick={() => setLightboxPhoto(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className={styles.lightboxImage}>
              {lightboxPhoto.url ? (
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.roomName}
                  style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <div className={styles.lightboxPlaceholder}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Foto: {lightboxPhoto.roomName}</span>
                  <span className={styles.lbCode}>{lightboxPhoto.roomCode}</span>
                </div>
              )}
            </div>
            <div className={styles.lightboxInfo}>
              <h3>{lightboxPhoto.roomName}</h3>
              <p>{lightboxPhoto.floorName} • Patroli #{lightboxPhoto.patrolNumber}</p>
              <div className={styles.lightboxDetails}>
                <div className={styles.lbRow}><span className={styles.lbLabel}>Petugas</span><span>{lightboxPhoto.officerName}</span></div>
                <div className={styles.lbRow}><span className={styles.lbLabel}>Waktu</span><span>{new Date(lightboxPhoto.takenAt).toLocaleString('id-ID')}</span></div>
                <div className={styles.lbRow}><span className={styles.lbLabel}>AC</span><span>{lightboxPhoto.acStatus}</span></div>
                <div className={styles.lbRow}><span className={styles.lbLabel}>Lampu</span><span>{lightboxPhoto.lightStatus}</span></div>
                <div className={styles.lbRow}><span className={styles.lbLabel}>Kondisi</span>
                  <span className={`badge ${lightboxPhoto.condition === 'Normal' ? 'badge-success' : 'badge-danger'}`}>{lightboxPhoto.condition}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
