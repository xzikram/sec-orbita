'use client';

import { useState } from 'react';
import { adminUsers } from '@/lib/admin-data';
import s from '../admin-crud.module.css';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const filtered = adminUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.employeeId.toLowerCase().includes(search.toLowerCase()));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'security': return <span className="badge badge-info">Security</span>;
      case 'supervisor': return <span className="badge badge-warning">Supervisor</span>;
      case 'admin': return <span className="badge badge-neutral">Admin</span>;
      default: return null;
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Manajemen User</h1><p className={s.pageSub}>{adminUsers.length} pengguna terdaftar</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                  <td className={s.td}><span className={s.tdMuted}>{user.shiftName}</span></td>
                  <td className={s.td}><span className={`badge ${user.isActive ? 'badge-success' : 'badge-neutral'}`}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className={s.td}>
                    <div className={s.actionBtns}>
                      <button className={s.actionBtn} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                      <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className={s.emptyRow}>Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
        <div className={s.tableFooter}><span>Menampilkan {filtered.length} dari {adminUsers.length} user</span></div>
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}><h3 className={s.modalTitle}>Tambah User Baru</h3><button className={s.modalClose} onClick={() => setShowModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className={s.modalBody}>
              <div className={s.formRow}><div className={s.formGroup}><label className={s.formLabel}>ID Karyawan</label><input className={s.formInput} placeholder="SEC-004" /></div><div className={s.formGroup}><label className={s.formLabel}>Role</label><select className={s.formSelect}><option>Security</option><option>Supervisor</option><option>Admin</option></select></div></div>
              <div className={s.formGroup}><label className={s.formLabel}>Nama Lengkap</label><input className={s.formInput} placeholder="Nama lengkap" /></div>
              <div className={s.formGroup}><label className={s.formLabel}>Email</label><input className={s.formInput} type="email" placeholder="email@jec.co.id" /></div>
              <div className={s.formRow}><div className={s.formGroup}><label className={s.formLabel}>Password</label><input className={s.formInput} type="password" placeholder="Min 8 karakter" /></div><div className={s.formGroup}><label className={s.formLabel}>Shift</label><select className={s.formSelect}><option>Shift Pagi</option><option>Shift Siang</option><option>Shift Malam</option></select></div></div>
              <div className={s.formGroup}><div className={s.formToggle}><div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} /><span className={s.formLabel} style={{ margin: 0 }}>Aktif</span></div></div>
            </div>
            <div className={s.modalFooter}><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button><button className="btn btn-primary">Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
