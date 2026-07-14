'use client';

import { activeFindings, findingCategoryLabels } from '@/lib/dummy-data';
import styles from './findings.module.css';

export default function FindingsPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="badge badge-danger">Baru</span>;
      case 'in_progress': return <span className="badge badge-warning">Diproses</span>;
      case 'resolved': return <span className="badge badge-success">Selesai</span>;
      default: return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'keamanan': return '🔒';
      case 'fasilitas': return '🔧';
      case 'listrik': return '⚡';
      case 'ac': return '❄️';
      case 'kebersihan': return '🧹';
      case 'akses_pintu': return '🚪';
      case 'orang_mencurigakan': return '👤';
      default: return '📋';
    }
  };

  return (
    <div className="page-content">
      <h1 className={styles.pageTitle}>Temuan</h1>
      <p className={styles.pageSubtitle}>Laporan temuan dari patroli Anda</p>

      {/* Filter pills */}
      <div className={styles.filters}>
        <button className={`${styles.filterPill} ${styles.filterActive}`}>Semua ({activeFindings.length})</button>
        <button className={styles.filterPill}>Baru ({activeFindings.filter(f => f.status === 'new').length})</button>
        <button className={styles.filterPill}>Diproses ({activeFindings.filter(f => f.status === 'in_progress').length})</button>
        <button className={styles.filterPill}>Selesai (0)</button>
      </div>

      {/* Findings List */}
      <div className={styles.findingsList}>
        {activeFindings.map((finding, index) => (
          <div key={finding.id} className={`card ${styles.findingCard} animate-slide-up stagger-${index + 1}`}>
            <div className="card-body">
              <div className={styles.findingHeader}>
                <div className={styles.findingIcon}>
                  {getCategoryIcon(finding.category)}
                </div>
                <div className={styles.findingMeta}>
                  <span className={styles.findingNumber}>{finding.findingNumber}</span>
                  <span className={styles.findingTime}>
                    {new Date(finding.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {getStatusBadge(finding.status)}
              </div>

              <h4 className={styles.findingCategory}>
                {findingCategoryLabels[finding.category]}
              </h4>

              <p className={styles.findingDescription}>{finding.description}</p>

              <div className={styles.findingLocation}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{finding.roomNameSnapshot} — {finding.floorNameSnapshot}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeFindings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="empty-state-title">Tidak ada temuan</h3>
          <p className="empty-state-text">Semua ruangan dalam kondisi normal</p>
        </div>
      )}
    </div>
  );
}
