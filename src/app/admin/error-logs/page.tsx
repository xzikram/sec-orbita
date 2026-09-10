'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface ErrorLog {
  id: string;
  userId: string | null;
  userName: string | null;
  employeeId: string | null;
  role: string | null;
  url: string;
  message: string;
  stack: string | null;
  digest: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  status: 'unresolved' | 'investigated' | 'resolved';
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/system/error-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/system/error-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchLogs();
        if (selectedLog && selectedLog.id === id) {
          setSelectedLog(prev => prev ? { ...prev, status: status as any } : null);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus log error ini?')) return;
    try {
      const res = await fetch(`/api/system/error-logs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
        if (selectedLog && selectedLog.id === id) setSelectedLog(null);
      }
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  const copyStack = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unresolvedCount = logs.filter(l => l.status === 'unresolved').length;
  const investigatedCount = logs.filter(l => l.status === 'investigated').length;
  const resolvedCount = logs.filter(l => l.status === 'resolved').length;

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚨</span> Log Error Sistem (IT)
          </h1>
          <p className={s.pageSub}>
            Pencatatan otomatis seluruh error teknis dari aplikasi security agar Tim IT dapat meninjau kode error & stack trace
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Belum Ditangani</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{unresolvedCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Memerlukan perhatian IT</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sedang Diselidiki</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{investigatedCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Dalam proses investigasi</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Selesai / Ditangani</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{resolvedCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Kasus telah diselesaikan</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Error Log</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>{logs.length}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Keseluruhan rekaman</div>
        </div>
      </div>

      {/* Table Section */}
      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>{logs.length} Rekaman Error</span>
          
          <form onSubmit={handleSearch} className={s.tableActions}>
            <input
              type="text"
              className={s.searchInput}
              placeholder="Cari user, pesan, URL..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '220px' }}
            />
            <select
              className={s.searchInput}
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="unresolved">🚨 Belum Ditangani</option>
              <option value="investigated">⏳ Diselidiki</option>
              <option value="resolved">✅ Selesai</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Cari</button>
          </form>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Waktu</th>
                <th className={s.th}>User / Security</th>
                <th className={s.th}>Halaman / URL</th>
                <th className={s.th}>Pesan Error</th>
                <th className={s.th}>Status</th>
                <th className={s.th} style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={s.emptyRow}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <p className="text-sm text-muted">Memuat log error sistem...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={s.emptyRow}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ fontSize: '2rem' }}>🎉</span>
                      <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Tidak ada error sistem tercatat</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Aplikasi berjalan normal tanpa kendala</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={s.tr}>
                    <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '11px', fontWeight: 600 }}>
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.tdBold}>{log.userName || 'Anonim / Sistem'}</span><br />
                      <span className={s.tdMuted}>{log.employeeId || '-'} ({log.role || 'guest'})</span>
                    </td>
                    <td className={s.td} style={{ maxWidth: 220 }}>
                      <span className={s.tdCode} style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                    </td>
                    <td className={s.td} style={{ maxWidth: 300 }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#b91c1c',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {log.message}
                      </div>
                    </td>
                    <td className={s.td}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: log.status === 'resolved' ? '#dcfce7' : log.status === 'investigated' ? '#fef3c7' : '#fee2e2',
                        color: log.status === 'resolved' ? '#15803d' : log.status === 'investigated' ? '#b45309' : '#b91c1c',
                        whiteSpace: 'nowrap'
                      }}>
                        {log.status === 'resolved' ? '✓ Selesai' : log.status === 'investigated' ? '⏳ Diselidiki' : '🚨 Belum Ditangani'}
                      </span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, marginRight: '4px' }}
                      >
                        🔍 Detail
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                        title="Hapus log"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Error & Stack Trace */}
      {selectedLog && (
        <div className={s.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={s.modal} style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle} style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚨</span> Detail Kode Error & Stack Trace
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Waktu: {new Date(selectedLog.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <button className={s.modalClose} onClick={() => setSelectedLog(null)}>✕</button>
            </div>

            <div className={s.modalBody}>
              {/* Status Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Status: <span style={{ color: selectedLog.status === 'resolved' ? '#15803d' : selectedLog.status === 'investigated' ? '#b45309' : '#b91c1c' }}>
                    {selectedLog.status.toUpperCase()}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedLog.status !== 'investigated' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedLog.id, 'investigated')}
                      className="btn btn-warning btn-sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      disabled={actionLoading}
                    >
                      Mulai Investigasi
                    </button>
                  )}
                  {selectedLog.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedLog.id, 'resolved')}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      disabled={actionLoading}
                    >
                      Tandai Selesai ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Context Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>USER / SECURITY</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{selectedLog.userName || '-'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {selectedLog.employeeId || '-'} ({selectedLog.role || '-'})</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>HALAMAN / URL</span>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0369a1', marginTop: '2px', wordBreak: 'break-all' }}>
                    {selectedLog.url}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Pesan Error
                </span>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#b91c1c',
                  fontWeight: 600,
                  wordBreak: 'break-word'
                }}>
                  {selectedLog.message}
                </div>
              </div>

              {/* Stack Trace */}
              {selectedLog.stack && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Stack Trace (Kode Error)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyStack(selectedLog.stack || '')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#0284c7', fontWeight: 600 }}
                    >
                      {copied ? '✓ Tersalin!' : '📋 Salin Kode Error'}
                    </button>
                  </div>
                  <pre style={{
                    background: '#0f172a',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '11px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    overflowX: 'auto',
                    maxHeight: '260px',
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {/* Device & Client Info */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#64748b' }}>
                <div><strong>IP Address:</strong> {selectedLog.ipAddress || '-'}</div>
                <div style={{ marginTop: '2px', wordBreak: 'break-all' }}><strong>User Agent:</strong> {selectedLog.userAgent || '-'}</div>
                {selectedLog.digest && <div style={{ marginTop: '2px' }}><strong>Error Digest:</strong> {selectedLog.digest}</div>}
              </div>
            </div>

            <div className={s.modalFooter}>
              <button className="btn btn-outline" onClick={() => setSelectedLog(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
