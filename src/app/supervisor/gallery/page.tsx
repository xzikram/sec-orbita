'use client';

import { useState } from 'react';
import { galleryPhotos } from '@/lib/supervisor-data';
import styles from './gallery.module.css';

export default function GalleryPage() {
  const [filter, setFilter] = useState<'all' | 'finding'>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<typeof galleryPhotos[0] | null>(null);

  const uniqueFloors = [...new Set(galleryPhotos.map(p => p.floorName))];

  const filtered = galleryPhotos
    .filter(p => filter === 'all' || p.condition === 'Temuan')
    .filter(p => selectedFloor === 'all' || p.floorName === selectedFloor);

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Galeri Foto</h1>
          <p className={styles.pageSub}>Dokumentasi foto patroli #{galleryPhotos[0]?.patrolNumber || '-'} • {galleryPhotos.length} foto</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`} onClick={() => setFilter('all')}>
            Semua ({galleryPhotos.length})
          </button>
          <button className={`${styles.filterBtn} ${filter === 'finding' ? styles.filterActive : ''}`} onClick={() => setFilter('finding')}>
            ⚠ Temuan ({galleryPhotos.filter(p => p.condition === 'Temuan').length})
          </button>
        </div>
        <select className={styles.selectFloor} value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)}>
          <option value="all">Semua Lantai</option>
          {uniqueFloors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Photo Grid */}
      <div className={styles.grid}>
        {filtered.map(photo => (
          <div
            key={photo.id}
            className={`${styles.photoCard} ${photo.condition === 'Temuan' ? styles.photoFinding : ''}`}
            onClick={() => setLightboxPhoto(photo)}
          >
            <div className={styles.photoThumb}>
              <div className={styles.photoPlaceholder}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{photo.roomCode}</span>
              </div>
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

      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <p>Tidak ada foto yang sesuai filter</p>
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
              <div className={styles.lightboxPlaceholder}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Foto: {lightboxPhoto.roomName}</span>
                <span className={styles.lbCode}>{lightboxPhoto.roomCode}</span>
              </div>
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
