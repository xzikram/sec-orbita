'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { allFindings, findingUpdates } from '@/lib/supervisor-data';
import { findingCategoryLabels } from '@/lib/dummy-data';
import styles from './finding-detail.module.css';

export default function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const finding = allFindings.find(f => f.id === id);
  const updates = findingUpdates.filter(u => u.findingId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const [comment, setComment] = useState('');

  if (!finding) {
    return <div style={{ padding: 32 }}>Temuan tidak ditemukan</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="badge badge-danger badge-lg">Baru</span>;
      case 'in_progress': return <span className="badge badge-warning badge-lg">Diproses</span>;
      case 'resolved': return <span className="badge badge-success badge-lg">Selesai</span>;
      default: return null;
    }
  };

  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = { keamanan: '🔒', fasilitas: '🔧', listrik: '⚡', ac: '❄️', kebersihan: '🧹', akses_pintu: '🚪', orang_mencurigakan: '👤', lainnya: '📋' };
    return map[cat] || '📋';
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'membuat temuan';
      case 'status_change': return 'mengubah status';
      case 'comment': return 'menambahkan komentar';
      case 'photo_added': return 'menambahkan foto';
      default: return action;
    }
  };

  const formatDateTime = (ts: string) => new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Back + Header */}
      <div className={styles.header}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.findingNo}>{finding.findingNumber}</span>
          {getStatusBadge(finding.status)}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Main content */}
        <div className={styles.mainCol}>
          {/* Description card */}
          <div className={`card ${styles.descCard}`}>
            <div className={styles.descHeader}>
              <span className={styles.catBadge}>
                {getCategoryEmoji(finding.category)} {findingCategoryLabels[finding.category]}
              </span>
            </div>
            <h2 className={styles.descTitle}>{finding.description}</h2>

            {/* Photo */}
            <div className={styles.photoArea}>
              <div className={styles.photoPlaceholder}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Foto bukti temuan</span>
              </div>
            </div>

            {/* Meta */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Lokasi</span>
                <span className={styles.metaValue}>{finding.roomNameSnapshot}, {finding.floorNameSnapshot}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Pelapor</span>
                <span className={styles.metaValue}>{finding.userName}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Waktu</span>
                <span className={styles.metaValue}>{formatDateTime(finding.createdAt)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Kategori</span>
                <span className={styles.metaValue}>{findingCategoryLabels[finding.category]}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {finding.status !== 'resolved' && (
            <div className={styles.actions}>
              {finding.status === 'new' && (
                <button className="btn btn-warning btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  Proses Temuan
                </button>
              )}
              {finding.status === 'in_progress' && (
                <button className="btn btn-success btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Tandai Selesai
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timeline sidebar */}
        <div className={styles.sideCol}>
          <div className={`card ${styles.timelineCard}`}>
            <h3 className={styles.timelineTitle}>Riwayat Aktivitas</h3>
            <div className={styles.timeline}>
              {updates.map((upd, i) => (
                <div key={upd.id} className={styles.timelineItem}>
                  <div className={`${styles.tlDot} ${upd.action === 'created' ? styles.tlDotCreate : upd.action === 'status_change' ? styles.tlDotStatus : styles.tlDotComment}`} />
                  {i < updates.length - 1 && <div className={styles.tlLine} />}
                  <div className={styles.tlContent}>
                    <span className={styles.tlUser}>{upd.userName}</span>
                    <span className={styles.tlAction}> {getActionLabel(upd.action)}</span>
                    {upd.action === 'status_change' && (
                      <div className={styles.tlStatusChange}>
                        <span className="badge badge-neutral">{upd.oldStatus}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        <span className={`badge ${upd.newStatus === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>{upd.newStatus}</span>
                      </div>
                    )}
                    {upd.comment && <p className={styles.tlComment}>{upd.comment}</p>}
                    <span className={styles.tlTime}>{formatDateTime(upd.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className={styles.addComment}>
              <textarea
                className="form-input form-textarea"
                placeholder="Tambahkan komentar..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
              />
              <button className="btn btn-primary btn-sm" disabled={!comment.trim()}>
                Kirim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
