'use client';

import { useState } from 'react';
import { adminBuildings } from '@/lib/admin-data';
import s from '../admin-crud.module.css';

export default function BuildingsPage() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Master Gedung</h1><p className={s.pageSub}>{adminBuildings.length} gedung terdaftar</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Gedung
        </button>
      </div>
      <div className={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead><tr><th className={s.th}>Kode</th><th className={s.th}>Nama Gedung</th><th className={s.th}>Alamat</th><th className={s.th}>Lantai</th><th className={s.th}>Ruangan</th><th className={s.th}>Status</th><th className={s.th}>Aksi</th></tr></thead>
            <tbody>
              {adminBuildings.map(b => (
                <tr key={b.id} className={s.tr}>
                  <td className={s.td}><span className={s.tdCode}>{b.code}</span></td>
                  <td className={`${s.td} ${s.tdBold}`}>{b.name}</td>
                  <td className={s.td}><span className={s.tdMuted}>{b.address}</span></td>
                  <td className={s.td}>{b.totalFloors}</td>
                  <td className={s.td}>{b.totalRooms}</td>
                  <td className={s.td}><span className="badge badge-success">Aktif</span></td>
                  <td className={s.td}><div className={s.actionBtns}><button className={s.actionBtn} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}><h3 className={s.modalTitle}>Tambah Gedung</h3><button className={s.modalClose} onClick={() => setShowModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className={s.modalBody}>
              <div className={s.formRow}><div className={s.formGroup}><label className={s.formLabel}>Nama Gedung</label><input className={s.formInput} placeholder="RS Mata JEC..." /></div><div className={s.formGroup}><label className={s.formLabel}>Kode</label><input className={s.formInput} placeholder="JEC-ORB" /></div></div>
              <div className={s.formGroup}><label className={s.formLabel}>Alamat</label><input className={s.formInput} placeholder="Jl. Raya..." /></div>
            </div>
            <div className={s.modalFooter}><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button><button className="btn btn-primary">Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
