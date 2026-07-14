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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchShifts() {
      try {
        const res = await fetch('/api/shifts');
        if (res.ok) {
          const data = await res.json();
          setShifts(data);
        }
      } catch (err) {
        console.error('Failed to fetch shifts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchShifts();
  }, []);

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Pengaturan Shift</h1>
          <p className={s.pageSub}>{loading ? 'Memuat...' : `${shifts.length} shift terdaftar`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                  <th className={s.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(sh => (
                  <tr key={sh.id} className={s.tr}>
                    <td className={s.td}><span className={s.tdCode}>{sh.code}</span></td>
                    <td className={`${s.td} ${s.tdBold}`}>{sh.name}</td>
                    <td className={s.td}><span className={s.tdCode}>{sh.startTime}</span></td>
                    <td className={s.td}><span className={s.tdCode}>{sh.endTime}</span></td>
                    <td className={s.td}>12 jam</td>
                    <td className={s.td}>
                      <span className={`badge ${sh.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {sh.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td}>
                      <div className={s.actionBtns}>
                        <button className={s.actionBtn} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Hapus">
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

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Tambah Shift</h3>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formRow}>
                <div className={s.formGroup}><label className={s.formLabel}>Nama Shift</label><input className={s.formInput} placeholder="Shift Extra" /></div>
                <div className={s.formGroup}><label className={s.formLabel}>Kode</label><input className={s.formInput} placeholder="EXTRA" /></div>
              </div>
              <div className={s.formRow}>
                <div className={s.formGroup}><label className={s.formLabel}>Jam Mulai</label><input className={s.formInput} type="time" /></div>
                <div className={s.formGroup}><label className={s.formLabel}>Jam Selesai</label><input className={s.formInput} type="time" /></div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
