'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface SupportFeedback {
  id: string;
  userId: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  adminNotes: string | null;
  createdAt: string;
  user?: {
    name: string;
    employeeId: string;
    role: string;
  };
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<SupportFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFb, setSelectedFb] = useState<SupportFeedback | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseStatus, setResponseStatus] = useState<'open' | 'in_review' | 'resolved'>('in_review');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/support/feedback?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [categoryFilter, statusFilter]);

  const openDetailModal = (fb: SupportFeedback) => {
    setSelectedFb(fb);
    setResponseNotes(fb.adminNotes || '');
    setResponseStatus(fb.status || 'in_review');
  };

  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFb) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFb.id,
          status: responseStatus,
          adminNotes: responseNotes.trim() || null,
        }),
      });
      if (res.ok) {
        fetchFeedbacks();
        setSelectedFb(null);
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const saranCount = feedbacks.filter(f => f.category === 'saran').length;
  const kendalaCount = feedbacks.filter(f => f.category === 'kendala').length;
  const openCount = feedbacks.filter(f => f.status === 'open').length;

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span> Bantuan, Saran & Masukan Security
          </h1>
          <p className={s.pageSub}>
            Tinjau usulan fitur pengembangan, laporan kendala operasional, dan pertanyaan dari personil security
          </p>
        </div>
        <button onClick={fetchFeedbacks} className="btn btn-outline btn-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Belum Ditanggapi</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>{openCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Menunggu respons tim IT/Admin</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Saran Fitur Baru</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{saranCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Usulan pengembangan sistem</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Laporan Kendala</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{kendalaCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Masalah di lapangan</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Masukan</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{feedbacks.length}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Semua kategori</div>
        </div>
      </div>

      {/* Table Section */}
      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>{feedbacks.length} Masukan dari Security</span>

          <div className={s.tableActions}>
            <select
              className={s.searchInput}
              style={{ width: '160px' }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              <option value="saran">💡 Saran Fitur</option>
              <option value="kendala">⚠️ Kendala / Eror</option>
              <option value="pertanyaan">❓ Pertanyaan</option>
              <option value="lainnya">📝 Lain-lain</option>
            </select>

            <select
              className={s.searchInput}
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="open">📩 Terkirim (Baru)</option>
              <option value="in_review">⏳ Ditinjau</option>
              <option value="resolved">✓ Selesai</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Waktu</th>
                <th className={s.th}>Kategori</th>
                <th className={s.th}>Pengirim (Security)</th>
                <th className={s.th}>Topik / Judul</th>
                <th className={s.th}>Pesan</th>
                <th className={s.th}>Status & Respon IT</th>
                <th className={s.th} style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={s.emptyRow}>
                    <p className="text-sm text-muted">Memuat masukan...</p>
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className={s.emptyRow}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ fontSize: '2rem' }}>📬</span>
                      <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Belum ada saran atau laporan kendala</p>
                    </div>
                  </td>
                </tr>
              ) : (
                feedbacks.map(fb => (
                  <tr key={fb.id} className={s.tr}>
                    <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {new Date(fb.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: fb.category === 'saran' ? '#dbeafe' : fb.category === 'kendala' ? '#fee2e2' : '#fef3c7',
                        color: fb.category === 'saran' ? '#1d4ed8' : fb.category === 'kendala' ? '#b91c1c' : '#b45309',
                        whiteSpace: 'nowrap'
                      }}>
                        {fb.category.toUpperCase()}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.tdBold}>{fb.user?.name || 'Security'}</span><br />
                      <span className={s.tdMuted}>{fb.user?.employeeId || '-'}</span>
                    </td>
                    <td className={s.td} style={{ fontWeight: 600, color: '#0f172a' }}>
                      {fb.subject}
                    </td>
                    <td className={s.td} style={{ maxWidth: 280 }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#475569',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {fb.message}
                      </div>
                    </td>
                    <td className={s.td}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: fb.status === 'resolved' ? '#dcfce7' : fb.status === 'in_review' ? '#ffedd5' : '#f1f5f9',
                        color: fb.status === 'resolved' ? '#15803d' : fb.status === 'in_review' ? '#c2410c' : '#475569'
                      }}>
                        {fb.status === 'resolved' ? '✓ Selesai' : fb.status === 'in_review' ? '⏳ Ditinjau' : '📩 Terkirim'}
                      </span>
                      {fb.adminNotes && (
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '4px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          💬 {fb.adminNotes}
                        </div>
                      )}
                    </td>
                    <td className={s.td} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => openDetailModal(fb)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                      >
                        Tanggapi 💬
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Respons IT */}
      {selectedFb && (
        <div className={s.modalOverlay} onClick={() => setSelectedFb(null)}>
          <div className={s.modal} style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💬</span> Tanggapan Bantuan / Saran
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Dari: {selectedFb.user?.name} ({selectedFb.user?.employeeId})
                </p>
              </div>
              <button className={s.modalClose} onClick={() => setSelectedFb(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveResponse}>
              <div className={s.modalBody}>
                {/* Info Card */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      Kategori: {selectedFb.category}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(selectedFb.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedFb.subject}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selectedFb.message}
                  </p>
                </div>

                {/* Status Selection */}
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Ubah Status</label>
                  <select
                    className={s.formSelect}
                    value={responseStatus}
                    onChange={e => setResponseStatus(e.target.value as any)}
                  >
                    <option value="open">📩 Terkirim (Belum Ditindaklanjuti)</option>
                    <option value="in_review">⏳ Sedang Ditinjau / Dalam Proses</option>
                    <option value="resolved">✓ Selesai / Fitur Telah Diterapkan</option>
                  </select>
                </div>

                {/* Response Notes */}
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Balasan / Catatan untuk Security</label>
                  <textarea
                    className={s.formInput}
                    rows={4}
                    placeholder="Tulis tanggapan untuk security (misal: 'Terima kasih, tombol scan telah disesuaikan' atau 'Akan kami tindaklanjuti pada update berikutnya')..."
                    value={responseNotes}
                    onChange={e => setResponseNotes(e.target.value)}
                    style={{ fontSize: '13px', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Catatan ini akan tampil di menu Profil security yang bersangkutan.
                  </span>
                </div>
              </div>

              <div className={s.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setSelectedFb(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Balasan ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
