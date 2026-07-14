'use client';

import { useState, useEffect } from 'react';
import styles from './findings.module.css';

const categoryLabels: Record<string, string> = {
  keamanan: 'Keamanan',
  fasilitas: 'Fasilitas',
  listrik: 'Listrik',
  ac: 'AC / Pendingin',
  kebersihan: 'Kebersihan',
  akses_pintu: 'Akses Pintu',
  orang_mencurigakan: 'Orang Mencurigakan',
  lainnya: 'Lainnya',
};

interface Finding {
  id: string;
  findingNumber: string;
  category: string;
  description: string;
  status: string;
  roomNameSnapshot: string;
  floorNameSnapshot: string;
  createdAt: string;
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [counts, setCounts] = useState({ all: 0, new: 0, in_progress: 0, resolved: 0 });

  useEffect(() => {
    loadFindings('all');
  }, []);

  const loadFindings = async (status: string) => {
    setLoading(true);
    setActiveFilter(status);
    try {
      const res = await fetch(`/api/findings?status=${status}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data;
        setFindings(Array.isArray(items) ? items : []);
        if (status === 'all') {
          const allItems = Array.isArray(items) ? items : [];
          setCounts({
            all: allItems.length,
            new: allItems.filter((f: Finding) => f.status === 'new').length,
            in_progress: allItems.filter((f: Finding) => f.status === 'in_progress').length,
            resolved: allItems.filter((f: Finding) => f.status === 'resolved').length,
          });
        }
      }
    } catch (err) {
      console.error('Load findings error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredFindings = activeFilter === 'all'
    ? findings
    : findings.filter(f => f.status === activeFilter);

  return (
    <div className="page-content">
      <h1 className={styles.pageTitle}>Temuan</h1>
      <p className={styles.pageSubtitle}>Laporan temuan dari patroli Anda</p>

      {/* Filter pills */}
      <div className={styles.filters}>
        <button className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterActive : ''}`} onClick={() => loadFindings('all')}>Semua ({counts.all})</button>
        <button className={`${styles.filterPill} ${activeFilter === 'new' ? styles.filterActive : ''}`} onClick={() => setActiveFilter('new')}>Baru ({counts.new})</button>
        <button className={`${styles.filterPill} ${activeFilter === 'in_progress' ? styles.filterActive : ''}`} onClick={() => setActiveFilter('in_progress')}>Diproses ({counts.in_progress})</button>
        <button className={`${styles.filterPill} ${activeFilter === 'resolved' ? styles.filterActive : ''}`} onClick={() => setActiveFilter('resolved')}>Selesai ({counts.resolved})</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="text-sm text-muted">Memuat temuan...</p>
        </div>
      ) : (
        <>
          {/* Findings List */}
          <div className={styles.findingsList}>
            {filteredFindings.map((finding, index) => (
              <div key={finding.id} className={`card ${styles.findingCard} animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
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
                    {categoryLabels[finding.category] || finding.category}
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

          {filteredFindings.length === 0 && (
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
        </>
      )}
    </div>
  );
}
