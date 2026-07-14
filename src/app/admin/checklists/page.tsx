'use client';

import { useState } from 'react';
import s from '../admin-crud.module.css';

const checklistItems = [
  { id: 'ci1', name: 'Checklist Default', items: ['AC', 'Lampu', 'Kondisi Ruangan'], isDefault: true, isActive: true, roomCount: 42 },
  { id: 'ci2', name: 'Checklist Server Room', items: ['AC', 'Lampu', 'Suhu Server', 'UPS Status', 'Kondisi Kabel'], isDefault: false, isActive: true, roomCount: 1 },
  { id: 'ci3', name: 'Checklist Genset', items: ['Lampu', 'Level BBM', 'Suara Mesin', 'Oli Mesin'], isDefault: false, isActive: true, roomCount: 1 },
];

export default function ChecklistsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Kelola Checklist</h1><p className={s.pageSub}>Template checklist untuk pemeriksaan ruangan</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tambah Checklist
        </button>
      </div>

      <div className={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Nama Template</th>
                <th className={s.th}>Item Checklist</th>
                <th className={s.th}>Ruangan</th>
                <th className={s.th}>Default</th>
                <th className={s.th}>Status</th>
                <th className={s.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {checklistItems.map(cl => (
                <tr key={cl.id} className={s.tr}>
                  <td className={`${s.td} ${s.tdBold}`}>{cl.name}</td>
                  <td className={s.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {cl.items.map(item => (
                        <span key={item} className={s.tdCode}>{item}</span>
                      ))}
                    </div>
                  </td>
                  <td className={s.td}>{cl.roomCount} ruangan</td>
                  <td className={s.td}>{cl.isDefault ? <span className="badge badge-info">Default</span> : <span className="badge badge-neutral">—</span>}</td>
                  <td className={s.td}><span className="badge badge-success">Aktif</span></td>
                  <td className={s.td}>
                    <div className={s.actionBtns}>
                      <button className={s.actionBtn} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                      {!cl.isDefault && <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}><h3 className={s.modalTitle}>Tambah Checklist Template</h3><button className={s.modalClose} onClick={() => setShowModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
            <div className={s.modalBody}>
              <div className={s.formGroup}><label className={s.formLabel}>Nama Template</label><input className={s.formInput} placeholder="Checklist Laboratorium" /></div>
              <div className={s.formGroup}><label className={s.formLabel}>Item Checklist (pisahkan dengan enter)</label><textarea className={s.formInput} rows={4} placeholder={"AC\nLampu\nSuhu Ruangan\nKondisi Alat"} style={{ resize: 'vertical' }} /></div>
              <div className={s.formGroup}><div className={s.formToggle}><div className={s.toggleSwitch} /><span className={s.formLabel} style={{ margin: 0 }}>Jadikan Default</span></div></div>
            </div>
            <div className={s.modalFooter}><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button><button className="btn btn-primary">Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
