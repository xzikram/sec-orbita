'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface ScheduleData {
  id: string;
  name: string;
  patrolNumber: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    patrolNumber: '',
    startTime: '07:00',
    endTime: '10:00',
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    patrolNumber: 1,
    startTime: '',
    endTime: '',
    isActive: true,
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules?all=true');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = (sc: ScheduleData) => {
    setEditingSchedule(sc);
    setEditForm({
      name: sc.name,
      patrolNumber: sc.patrolNumber,
      startTime: sc.startTime,
      endTime: sc.endTime,
      isActive: sc.isActive,
    });
  };

  // Submit Add Schedule
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const num = parseInt(addForm.patrolNumber) || schedules.length + 1;
      const schedName = addForm.name.trim() || `Patroli ${num}`;

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schedName,
          patrolNumber: num,
          startTime: addForm.startTime,
          endTime: addForm.endTime,
        }),
      });

      if (res.ok) {
        showToast('success', `Jadwal ${schedName} berhasil ditambahkan.`);
        setShowAddModal(false);
        setAddForm({ name: '', patrolNumber: '', startTime: '07:00', endTime: '10:00' });
        await fetchSchedules();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menambahkan jadwal.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat menambah jadwal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Schedule
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSchedule.id,
          name: editForm.name,
          patrolNumber: editForm.patrolNumber,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          isActive: editForm.isActive,
        }),
      });

      if (res.ok) {
        showToast('success', `Jadwal ${editForm.name} berhasil diperbarui.`);
        setEditingSchedule(null);
        await fetchSchedules();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal memperbarui jadwal.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat memperbarui jadwal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Deactivate Schedule
  const handleDeleteSchedule = async (sc: ScheduleData) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus/menonaktifkan jadwal ${sc.name} (${sc.startTime} - ${sc.endTime})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/schedules?id=${sc.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || 'Jadwal berhasil dihapus.');
        await fetchSchedules();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Gagal menghapus jadwal.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat menghapus jadwal.');
    }
  };

  const getShiftName = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 7 && hour < 19) {
      return 'Shift Pagi';
    }
    return 'Shift Malam';
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
          <h1 className={s.pageTitle}>Jadwal Patroli</h1>
          <p className={s.pageSub}>{loading ? 'Memuat...' : `${schedules.length} sesi patroli terkonfigurasi`}</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            const nextNum = schedules.length > 0 ? Math.max(...schedules.map(s => s.patrolNumber)) + 1 : 1;
            setAddForm({ name: `Patroli ${nextNum}`, patrolNumber: String(nextNum), startTime: '07:00', endTime: '10:00' });
            setShowAddModal(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Jadwal
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
                  <th className={s.th}>Patroli #</th>
                  <th className={s.th}>Nama Jadwal</th>
                  <th className={s.th}>Jam Mulai</th>
                  <th className={s.th}>Jam Selesai</th>
                  <th className={s.th}>Estimasi Shift</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th} style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(sc => (
                  <tr key={sc.id} className={s.tr}>
                    <td className={`${s.td} ${s.tdBold}`}>#{sc.patrolNumber}</td>
                    <td className={s.td}><strong>{sc.name}</strong></td>
                    <td className={s.td}><span className={s.tdCode}>{sc.startTime}</span></td>
                    <td className={s.td}><span className={s.tdCode}>{sc.endTime}</span></td>
                    <td className={s.td}>{getShiftName(sc.startTime)}</td>
                    <td className={s.td}>
                      <span className={`badge ${sc.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {sc.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <div className={s.actionBtns} style={{ justifyContent: 'center' }}>
                        <button 
                          className={s.actionBtn} 
                          title="Edit Jadwal"
                          onClick={() => handleOpenEdit(sc)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className={`${s.actionBtn} ${s.actionBtnDanger}`} 
                          title="Hapus / Nonaktifkan"
                          onClick={() => handleDeleteSchedule(sc)}
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

      {/* MODAL TAMBAH JADWAL */}
      {showAddModal && (
        <div className={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateSchedule}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>Tambah Jadwal Patroli</h3>
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
                    <label className={s.formLabel}>Patroli Ke- (Urutan)</label>
                    <input 
                      className={s.formInput} 
                      type="number" 
                      min="1"
                      required
                      value={addForm.patrolNumber}
                      onChange={e => setAddForm({ ...addForm, patrolNumber: e.target.value })}
                      placeholder="Contoh: 1" 
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Nama Sesi</label>
                    <input 
                      className={s.formInput} 
                      type="text" 
                      required
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="Contoh: Patroli 1" 
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
              </div>
              <div className={s.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT JADWAL */}
      {editingSchedule && (
        <div className={s.modalOverlay} onClick={() => setEditingSchedule(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleUpdateSchedule}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>Edit Jadwal: {editingSchedule.name}</h3>
                <button type="button" className={s.modalClose} onClick={() => setEditingSchedule(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className={s.modalBody}>
                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Patroli Ke- (Urutan)</label>
                    <input 
                      className={s.formInput} 
                      type="number" 
                      min="1"
                      required
                      value={editForm.patrolNumber}
                      onChange={e => setEditForm({ ...editForm, patrolNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Nama Sesi Jadwal</label>
                    <input 
                      className={s.formInput} 
                      type="text" 
                      required
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
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
                <div className={s.formGroup} style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    <input 
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-600)' }}
                    />
                    Status Jadwal Aktif
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 26px' }}>
                    Jika dinonaktifkan, sesi ini tidak akan muncul dalam target patroli harian sekuriti.
                  </p>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingSchedule(null)}>Batal</button>
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
