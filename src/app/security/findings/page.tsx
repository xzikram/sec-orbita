'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOfflineFindings } from '@/lib/db';
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
  isOffline?: boolean;
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [counts, setCounts] = useState({ all: 0, new: 0, in_progress: 0, resolved: 0 });
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    loadFindings('all');
  }, []);

  const loadFindings = async (status: string) => {
    setLoading(true);
    setActiveFilter(status);
    let serverItems: Finding[] = [];
    let offlineItems: Finding[] = [];

    // Load offline findings from IndexedDB
    try {
      const localFindings = await getOfflineFindings();
      offlineItems = localFindings.map(f => ({
        id: f.id,
        findingNumber: 'OFFLINE',
        category: f.category,
        description: f.description,
        status: 'offline_pending',
        roomNameSnapshot: f.roomNameSnapshot,
        floorNameSnapshot: f.floorNameSnapshot,
        createdAt: f.createdAt,
        isOffline: true,
      }));
    } catch {
      offlineItems = [];
    }

    try {
      const res = await fetch(`/api/findings?status=${status}&limit=50`);
      if (res.ok) {
        setIsOfflineMode(false);
        const data = await res.json();
        const items = data.data || data;
        serverItems = Array.isArray(items) ? items : [];
      } else {
        setIsOfflineMode(true);
      }
    } catch (err) {
      console.warn('Network unavailable, falling back to offline findings:', err);
      setIsOfflineMode(true);
    } finally {
      // Merge offline findings with server items
      const combined = [...offlineItems, ...serverItems];
      setFindings(combined);

      const allCombined = [...offlineItems, ...serverItems];
      setCounts({
        all: allCombined.length,
        new: allCombined.filter(f => f.status === 'new' || f.status === 'offline_pending').length,
        in_progress: allCombined.filter(f => f.status === 'in_progress').length,
        resolved: allCombined.filter(f => f.status === 'resolved').length,
      });

      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'offline_pending': return <span className="badge badge-warning">Belum Sinkron</span>;
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
    : activeFilter === 'new'
    ? findings.filter(f => f.status === 'new' || f.status === 'offline_pending')
    : findings.filter(f => f.status === activeFilter);

  return (
    <div className="page-content">
      <h1 className={styles.pageTitle}>Temuan</h1>
      <p className={styles.pageSubtitle}>Laporan temuan dari patroli Anda</p>

      {isOfflineMode && (
        <div
          style={{
            background: 'var(--color-warning-50)',
            border: '1px solid var(--color-warning-200)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-warning-700)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>
            <strong>Mode Offline:</strong> Menampilkan data temuan yang tersimpan di memori perangkat lokal.
          </span>
        </div>
      )}

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
              <Link
                key={finding.id}
                href={`/security/findings/${finding.id}`}
                className={`card card-interactive ${styles.findingCard} animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
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
              </Link>
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
