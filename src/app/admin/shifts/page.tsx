'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface ShiftData {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    code: '',
    startTime: '07:00',
    endTime: '15:00',
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    isActive: true,
  });

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts?all=true');
      if (res.ok) {
        const data = await res.json();
        setShifts(data);
      }
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Helper calculate duration in hours
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    try {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes <= 0) {
        diffMinutes += 24 * 60; // Crosses midnight
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (mins === 0) return `${hours} jam`;
      return `${hours} jam ${mins} mnt`;
    } catch {
      return '-';
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (sh: ShiftData) => {
    setEditingShift(sh);
    setEditForm({
      name: sh.name,
      code: sh.code,
      startTime: sh.startTime,
      endTime: sh.endTime,
      isActive: sh.isActive,
    });
  };

  // Submit Add Shift
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        showToast('success', `Shift ${addForm.name} berhasil ditambahkan.`);
        setShowAddModal(false);
        setAddForm({ name: '', code: '', startTime: '07:00', endTime: '15:00' });
        await fetchShifts();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menambahkan shift.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat menambah shift.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Shift
  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingShift.id,
          name: editForm.name,
          code: editForm.code,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          isActive: editForm.isActive,
        }),
      });

      if (res.ok) {
        showToast('success', `Shift ${editForm.name} berhasil diperbarui.`);
        setEditingShift(null);
        await fetchShifts();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal memperbarui shift.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat memperbarui shift.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Deactivate Shift
  const handleDeleteShift = async (sh: ShiftData) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus/menonaktifkan shift ${sh.name} (${sh.code})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/shifts?id=${sh.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || 'Shift berhasil dihapus.');
        await fetchShifts();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menghapus shift.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat menghapus shift.');
    }
  };

  return (
    <div>
      {/* Toast Feedback */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          color: '#fff',
          background: feedback.type === 'success' ? '#107c41' : '#dc2626',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          {feedback.type === 'success' ? '✓' : '⚠️'} {feedback.message}
        </div>
      )}

      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Pengaturan Shift</h1>
          <p className={s.pageSub}>{loading ? 'Memuat...' : `${shifts.length} shift jaga terdaftar`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Shift
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--color-neutral-200)',
            borderTop: '4px solid var(--color-primary-600)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Kode</th>
                  <th className={s.th}>Nama Shift</th>
                  <th className={s.th}>Mulai</th>
                  <th className={s.th}>Selesai</th>
                  <th className={s.th}>Durasi</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th} style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(sh => (
                  <tr key={sh.id} className={s.tr}>
                    <td className={s.td}><span className={s.tdCode}>{sh.code}</span></td>
                    <td className={`${s.td} ${s.tdBold}`}>{sh.name}</td>
                    <td className={s.td}><span className={s.tdCode}>{sh.startTime}</span></td>
                    <td className={s.td}><span className={s.tdCode}>{sh.endTime}</span></td>
                    <td className={s.td}>{calculateDuration(sh.startTime, sh.endTime)}</td>
                    <td className={s.td}>
                      <span className={`badge ${sh.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {sh.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <div className={s.actionBtns} style={{ justifyContent: 'center' }}>
                        <button 
                          className={s.actionBtn} 
                          title="Edit Shift"
                          onClick={() => handleOpenEdit(sh)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className={`${s.actionBtn} ${s.actionBtnDanger}`} 
                          title="Hapus / Nonaktifkan"
                          onClick={() => handleDeleteShift(sh)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SHIFT */}
      {showAddModal && (
        <div className={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateShift}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>Tambah Shift Baru</h3>
                <button type="button" className={s.modalClose} onClick={() => setShowAddModal(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className={s.modalBody}>
                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Nama Shift</label>
                    <input 
                      className={s.formInput} 
                      required
                      placeholder="Contoh: Shift Pagi" 
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Kode Shift</label>
                    <input 
                      className={s.formInput} 
                      required
                      placeholder="Contoh: PAGI" 
                      value={addForm.code}
                      onChange={e => setAddForm({ ...addForm, code: e.target.value })}
                    />
                  </div>
                </div>
                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Jam Mulai (WITA)</label>
                    <input 
                      className={s.formInput} 
                      type="time" 
                      required
                      value={addForm.startTime}
                      onChange={e => setAddForm({ ...addForm, startTime: e.target.value })}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Jam Selesai (WITA)</label>
                    <input 
                      className={s.formInput} 
                      type="time" 
                      required
                      value={addForm.endTime}
                      onChange={e => setAddForm({ ...addForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Estimasi durasi: <strong>{calculateDuration(addForm.startTime, addForm.endTime)}</strong>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT SHIFT */}
      {editingShift && (
        <div className={s.modalOverlay} onClick={() => setEditingShift(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleUpdateShift}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>Edit Shift: {editingShift.name}</h3>
                <button type="button" className={s.modalClose} onClick={() => setEditingShift(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className={s.modalBody}>
                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Nama Shift</label>
                    <input 
                      className={s.formInput} 
                      required
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Kode Shift</label>
                    <input 
                      className={s.formInput} 
                      required
                      value={editForm.code}
                      onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                    />
                  </div>
                </div>
                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Jam Mulai (WITA)</label>
                    <input 
                      className={s.formInput} 
                      type="time" 
                      required
                      value={editForm.startTime}
                      onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Jam Selesai (WITA)</label>
                    <input 
                      className={s.formInput} 
                      type="time" 
                      required
                      value={editForm.endTime}
                      onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Estimasi durasi: <strong>{calculateDuration(editForm.startTime, editForm.endTime)}</strong>
                </div>
                <div className={s.formGroup} style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    <input 
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-600)' }}
                    />
                    Status Shift Aktif
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 26px' }}>
                    Nonaktifkan jika shift ini sudah tidak digunakan lagi dalam rotasi petugas.
                  </p>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingShift(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
