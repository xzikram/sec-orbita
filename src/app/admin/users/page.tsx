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
      const [usersRes, shiftsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/shifts'),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(Array.isArray(data) ? data : []);
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

  const handleSubmit = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          shiftId: formData.shiftId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menambahkan user');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><p className="text-sm text-muted">Memuat data user...</p></div>;
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Manajemen User</h1><p className={s.pageSub}>{users.length} pengguna terdaftar</p></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
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
                      <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Hapus" onClick={() => handleDelete(user.id, user.name)}>
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
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}><h3 className={s.modalTitle}>Tambah User Baru</h3><button className={s.modalClose} onClick={() => setShowModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
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
                <div className={s.formGroup}><label className={s.formLabel}>Password</label><input className={s.formInput} type="password" placeholder="Min 6 karakter" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Shift</label>
                  <select className={s.formSelect} value={formData.shiftId} onChange={e => setFormData({...formData, shiftId: e.target.value})}>
                    <option value="">Pilih Shift</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
