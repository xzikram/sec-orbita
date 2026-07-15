'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { findingCategoryLabels } from '@/lib/dummy-data';
import styles from './finding-detail.module.css';

export default function SecurityFindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [finding, setFinding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinding() {
      try {
        const res = await fetch(`/api/findings?id=${id}`);
        if (res.ok) {
          const resData = await res.json();
          const items = resData.data || resData;
          if (Array.isArray(items) && items.length > 0) {
            setFinding(items[0]);
          } else if (items && !Array.isArray(items)) {
            setFinding(items);
          }
        }
      } catch (err) {
        console.error('Finding detail load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinding();
  }, [id]);

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><p className="text-sm text-muted">Memuat detail temuan...</p></div>;
  }

  if (!finding) {
    return <div className="page-container" style={{ textAlign: 'center', padding: 48 }}>Temuan tidak ditemukan</div>;
  }

  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = { keamanan: '🔒', fasilitas: '🔧', listrik: '⚡', ac: '❄️', kebersihan: '🧹', akses_pintu: '🚪', orang_mencurigakan: '👤', lainnya: '📋' };
    return map[cat] || '📋';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="badge badge-danger badge-lg">Baru</span>;
      case 'in_progress': return <span className="badge badge-warning badge-lg">Diproses</span>;
      case 'resolved': return <span className="badge badge-success badge-lg">Selesai</span>;
      default: return null;
    }
  };

  const photoUrl = finding.check?.photos?.[0]?.filePath || null;

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      {/* Back */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.topTitle}>Detail Temuan</span>
        {getStatusBadge(finding.status)}
      </div>

      {/* Finding number */}
      <div className={styles.findingNo}>{finding.findingNumber}</div>

      {/* Photo */}
      <div className={`card ${styles.photoCard}`}>
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt="Bukti Temuan" 
            className={styles.photoImg} 
            style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px' }} 
          />
        ) : (
          <div className={styles.photoArea}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <span>Tidak ada foto bukti</span>
          </div>
        )}
      </div>

      {/* Category + Description */}
      <div className={`card ${styles.descCard}`}>
        <span className={styles.catBadge}>
          {getCategoryEmoji(finding.category)} {(findingCategoryLabels as any)[finding.category] || finding.category}
        </span>
        <p className={styles.descText}>{finding.description}</p>
      </div>

      {/* Meta info */}
      <div className={`card ${styles.metaCard}`}>
        <div className={styles.metaRow}><span className={styles.metaLabel}>📍 Lokasi</span><span className={styles.metaValue}>{finding.roomNameSnapshot}</span></div>
        <div className={styles.metaRow}><span className={styles.metaLabel}>🏢 Lantai</span><span className={styles.metaValue}>{finding.floorNameSnapshot}</span></div>
        <div className={styles.metaRow}><span className={styles.metaLabel}>🕐 Waktu</span><span className={styles.metaValue}>{new Date(finding.createdAt).toLocaleString('id-ID')}</span></div>
        <div className={styles.metaRow}><span className={styles.metaLabel}>📋 Status</span>{getStatusBadge(finding.status)}</div>
      </div>

      {/* Info */}
      <div className={styles.infoBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <span>Temuan ini telah dikirim ke supervisor untuk ditindaklanjuti. Status akan diperbarui setelah ada tindakan.</span>
      </div>
    </div>
  );
}
