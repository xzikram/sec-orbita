'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { allFindings as mockFindings } from '@/lib/supervisor-data';
import { findingCategoryLabels } from '@/lib/dummy-data';
import styles from './findings.module.css';

export default function SupervisorFindingsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [findingsList, setFindingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFindings() {
      setLoading(true);
      try {
        const res = await fetch('/api/findings?limit=100');
        if (res.ok) {
          const json = await res.json();
          const dbList = (json.data || []).map((f: any) => ({
            id: f.id,
            findingNumber: f.findingNumber,
            category: f.category,
            roomNameSnapshot: f.roomNameSnapshot || '-',
            floorNameSnapshot: f.floorNameSnapshot || '-',
            userName: f.user?.name || 'Petugas',
            createdAt: f.createdAt,
            status: f.status,
          }));

          if (dbList.length > 0) {
            setFindingsList(dbList);
          } else {
            setFindingsList(mockFindings);
          }
        } else {
          setFindingsList(mockFindings);
        }
      } catch {
        setFindingsList(mockFindings);
      } finally {
        setLoading(false);
      }
    }
    loadFindings();
  }, []);

  const filtered = findingsList.filter(f => statusFilter === 'all' || f.status === statusFilter);

  const counts = {
    all: findingsList.length,
    new: findingsList.filter(f => f.status === 'new').length,
    in_progress: findingsList.filter(f => f.status === 'in_progress').length,
    resolved: findingsList.filter(f => f.status === 'resolved').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="badge badge-danger">Baru</span>;
      case 'in_progress': return <span className="badge badge-warning">Diproses</span>;
      case 'resolved': return <span className="badge badge-success">Selesai</span>;
      default: return null;
    }
  };

  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = { keamanan: '🔒', fasilitas: '🔧', listrik: '⚡', ac: '❄️', kebersihan: '🧹', akses_pintu: '🚪', orang_mencurigakan: '👤', lainnya: '📋' };
    return map[cat] || '📋';
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Daftar Temuan</h1>
          <p className={styles.pageSub}>{findingsList.length} temuan tercatat</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className={styles.tabs}>
        {([['all', 'Semua'], ['new', 'Baru'], ['in_progress', 'Diproses'], ['resolved', 'Selesai']] as const).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tab} ${statusFilter === key ? styles.tabActive : ''}`}
            onClick={() => setStatusFilter(key)}
          >
            {label}
            <span className={styles.tabCount}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Findings table */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <span>No</span>
          <span>Kategori</span>
          <span>Lokasi</span>
          <span>Petugas</span>
          <span>Tanggal</span>
          <span>Status</span>
        </div>
        {filtered.map(finding => (
          <Link key={finding.id} href={`/supervisor/findings/${finding.id}`} className={styles.tableRow}>
            <span className={styles.findingNo}>{finding.findingNumber}</span>
            <span className={styles.findingCat}>
              <span className={styles.catEmoji}>{getCategoryEmoji(finding.category)}</span>
              {findingCategoryLabels[finding.category as keyof typeof findingCategoryLabels] || finding.category}
            </span>
            <span className={styles.findingLoc}>
              <span className={styles.locRoom}>{finding.roomNameSnapshot}</span>
              <span className={styles.locFloor}>{finding.floorNameSnapshot}</span>
            </span>
            <span className={styles.findingOfficer}>{finding.userName}</span>
            <span className={styles.findingDate}>{formatDate(finding.createdAt)}</span>
            <span>{getStatusBadge(finding.status)}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className={styles.emptyRow}>Tidak ada temuan dengan status ini</div>
        )}
      </div>
    </div>
  );
}
