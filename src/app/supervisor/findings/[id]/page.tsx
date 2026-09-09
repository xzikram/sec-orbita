'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { allFindings, findingUpdates as mockUpdates } from '@/lib/supervisor-data';
import { findingCategoryLabels } from '@/lib/dummy-data';
import styles from './finding-detail.module.css';

export default function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [finding, setFinding] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadFinding() {
      setLoading(true);
      try {
        const res = await fetch(`/api/findings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFinding({
            ...data,
            userName: data.user?.name || 'Petugas',
            roomNameSnapshot: data.roomNameSnapshot || data.room?.name || '-',
            floorNameSnapshot: data.floorNameSnapshot || data.floor?.name || '-',
            photoUrl: data.check?.photos?.[0]?.filePath || null,
          });
          setUpdates(
            (data.updates || []).map((u: any) => ({
              ...u,
              userName: u.user?.name || 'Supervisor',
            }))
          );
        } else {
          // Fallback to mock data if not in DB
          const mock = allFindings.find(f => f.id === id);
          if (mock) {
            setFinding(mock);
            const mockUpds = mockUpdates.filter(u => u.findingId === id);
            setUpdates(mockUpds);
          }
        }
      } catch {
        const mock = allFindings.find(f => f.id === id);
        if (mock) {
          setFinding(mock);
          const mockUpds = mockUpdates.filter(u => u.findingId === id);
          setUpdates(mockUpds);
        }
      } finally {
        setLoading(false);
      }
    }
    loadFinding();
  }, [id]);

  const handleStatusChange = async (newStatus: 'in_progress' | 'resolved') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/findings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status_change', newStatus }),
      });

      if (res.ok) {
        setFinding((prev: any) => ({ ...prev, status: newStatus }));
        setUpdates((prev: any) => [
          ...prev,
          {
            id: `upd-${Date.now()}`,
            action: 'status_change',
            oldStatus: finding?.status,
            newStatus,
            userName: 'Saya',
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        // Optimistic UI for mock IDs
        setFinding((prev: any) => ({ ...prev, status: newStatus }));
        setUpdates((prev: any) => [
          ...prev,
          {
            id: `upd-${Date.now()}`,
            action: 'status_change',
            oldStatus: finding?.status,
            newStatus,
            userName: 'Saya',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setFinding((prev: any) => ({ ...prev, status: newStatus }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/findings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', comment: comment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setUpdates((prev: any) => [
          ...prev,
          {
            id: data.update?.id || `upd-${Date.now()}`,
            action: 'comment',
            comment: comment.trim(),
            userName: data.update?.user?.name || 'Saya',
            createdAt: new Date().toISOString(),
          },
        ]);
        setComment('');
      } else {
        setUpdates((prev: any) => [
          ...prev,
          {
            id: `upd-${Date.now()}`,
            action: 'comment',
            comment: comment.trim(),
            userName: 'Saya',
            createdAt: new Date().toISOString(),
          },
        ]);
        setComment('');
      }
    } catch {
      setUpdates((prev: any) => [
        ...prev,
        {
          id: `upd-${Date.now()}`,
          action: 'comment',
          comment: comment.trim(),
          userName: 'Saya',
          createdAt: new Date().toISOString(),
        },
      ]);
      setComment('');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p className="text-muted">Memuat data temuan...</p>
      </div>
    );
  }

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

  const formatDateTime = (ts: string) => new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' });

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
                {getCategoryEmoji(finding.category)} {findingCategoryLabels[finding.category as keyof typeof findingCategoryLabels] || finding.category}
              </span>
            </div>
            <h2 className={styles.descTitle}>{finding.description}</h2>

            {/* Photo */}
            <div className={styles.photoArea}>
              {finding.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={finding.photoUrl}
                  alt="Foto bukti temuan"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                />
              ) : (
                <div className={styles.photoPlaceholder}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Foto bukti temuan</span>
                </div>
              )}
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
                <span className={styles.metaValue}>{findingCategoryLabels[finding.category as keyof typeof findingCategoryLabels] || finding.category}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {finding.status !== 'resolved' && (
            <div className={styles.actions}>
              {finding.status === 'new' && (
                <button
                  className="btn btn-warning btn-lg"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={actionLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  {actionLoading ? 'Memproses...' : 'Proses Temuan'}
                </button>
              )}
              {finding.status === 'in_progress' && (
                <button
                  className="btn btn-success btn-lg"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={actionLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {actionLoading ? 'Memproses...' : 'Tandai Selesai'}
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
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCommentSubmit}
                disabled={!comment.trim() || actionLoading}
              >
                {actionLoading ? '...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
