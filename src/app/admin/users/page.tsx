'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'security' | 'supervisor' | 'admin';
  shiftId: string | null;
  isActive: boolean;
  createdAt: string;
  shift?: { name: string } | null;
}

interface Shift {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    role: 'security' as string,
    shiftId: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, shiftsRes, meRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/shifts'),
        fetch('/api/auth/me'),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(Array.isArray(data) ? data : []);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      password: '',
      role: 'security',
      shiftId: '',
      isActive: true,
    });
    setError('');
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      password: '', // Kosongkan password saat edit, diisi hanya jika ingin direset
      role: user.role,
      shiftId: user.shiftId || '',
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        ...formData,
        shiftId: formData.shiftId || null,
      };

      // Jika sedang mengedit dan password dikosongkan, jangan dikirim (agar tidak ter-reset kosong)
      if (editingUser && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan user');
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri');
      return;
    }
    if (!confirm(`Hapus user "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus user');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'security': return <span className="badge badge-info">Security</span>;
      case 'supervisor': return <span className="badge badge-warning">Supervisor</span>;
      case 'admin': return <span className="badge badge-neutral">Admin</span>;
      default: return null;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    resetForm();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><p className="text-sm text-muted">Memuat data user...</p></div>;
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Manajemen User</h1><p className={s.pageSub}>{users.length} pengguna terdaftar</p></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah User
        </button>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>Data User</span>
          <div className={s.tableActions}>
            <input className={s.searchInput} placeholder="Cari nama atau ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead><tr><th className={s.th}>ID</th><th className={s.th}>Nama</th><th className={s.th}>Email</th><th className={s.th}>Role</th><th className={s.th}>Shift</th><th className={s.th}>Status</th><th className={s.th}>Aksi</th></tr></thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className={s.tr}>
                  <td className={s.td}><span className={s.tdCode}>{user.employeeId}</span></td>
                  <td className={`${s.td} ${s.tdBold}`}>{user.name}</td>
                  <td className={s.td}>{user.email}</td>
                  <td className={s.td}>{getRoleBadge(user.role)}</td>
                  <td className={s.td}><span className={s.tdMuted}>{user.shift?.name || '-'}</span></td>
                  <td className={s.td}><span className={`badge ${user.isActive ? 'badge-success' : 'badge-neutral'}`}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className={s.td}>
                    <div className={s.actionBtns}>
                      <button
                        className={`${s.actionBtn} ${s.actionBtnWarning}`}
                        title="Edit / Reset Password"
                        onClick={() => handleEditClick(user)}
                        style={{ marginRight: '6px', backgroundColor: 'var(--color-warning-50)', color: 'var(--color-warning-700)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button
                        className={`${s.actionBtn} ${s.actionBtnDanger}`}
                        title="Hapus"
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={user.id === currentUser?.id}
                        style={user.id === currentUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className={s.emptyRow}>Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
        <div className={s.tableFooter}><span>Menampilkan {filtered.length} dari {users.length} user</span></div>
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={handleCloseModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{editingUser ? 'Edit User & Reset Password' : 'Tambah User Baru'}</h3>
              <button className={s.modalClose} onClick={handleCloseModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={s.modalBody}>
              {error && <p style={{ color: 'var(--color-danger-600)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>ID Karyawan</label>
                  <input className={s.formInput} placeholder="SEC-004" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Role</label>
                  <select className={s.formSelect} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="security">Security</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className={s.formGroup}><label className={s.formLabel}>Nama Lengkap</label><input className={s.formInput} placeholder="Nama lengkap" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className={s.formGroup}><label className={s.formLabel}>Email</label><input className={s.formInput} type="email" placeholder="email@jec.co.id" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>{editingUser ? 'Reset Password (Baru)' : 'Password'}</label>
                  <input className={s.formInput} type="password" placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Min 6 karakter'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Shift</label>
                  <select className={s.formSelect} value={formData.shiftId} onChange={e => setFormData({...formData, shiftId: e.target.value})}>
                    <option value="">Pilih Shift</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {editingUser && (
                <div className={s.formGroup} style={{ marginTop: '12px' }}>
                  <label className={s.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                    <span>Status Pengguna Aktif</span>
                  </label>
                </div>
              )}
            </div>
            <div className={s.modalFooter}>
              <button className="btn btn-ghost" onClick={handleCloseModal}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
