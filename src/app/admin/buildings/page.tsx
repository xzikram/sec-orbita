'use client';

import { useState, useEffect } from 'react';
import { adminBuildings as mockBuildings } from '@/lib/admin-data';
import s from '../admin-crud.module.css';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBuildings = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data.length > 0 ? data : mockBuildings);
      } else {
        setBuildings(mockBuildings);
      }
    } catch {
      setBuildings(mockBuildings);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Nama dan kode gedung wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim(), address: address.trim() }),
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setCode('');
        setAddress('');
        await loadBuildings();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan gedung');
      }
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Master Gedung</h1><p className={s.pageSub}>{buildings.length} gedung terdaftar</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Gedung
        </button>
      </div>
      <div className={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead><tr><th className={s.th}>Kode</th><th className={s.th}>Nama Gedung</th><th className={s.th}>Alamat</th><th className={s.th}>Lantai</th><th className={s.th}>Ruangan</th><th className={s.th}>Status</th></tr></thead>
            <tbody>
              {buildings.map(b => (
                <tr key={b.id} className={s.tr}>
                  <td className={s.td}><span className={s.tdCode}>{b.code}</span></td>
                  <td className={`${s.td} ${s.tdBold}`}>{b.name}</td>
                  <td className={s.td}><span className={s.tdMuted}>{b.address || '-'}</span></td>
                  <td className={s.td}>{b.totalFloors || b.floors?.length || 0}</td>
                  <td className={s.td}>{b.totalRooms || 0}</td>
                  <td className={s.td}><span className="badge badge-success">Aktif</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <form className={s.modal} onClick={e => e.stopPropagation()} onSubmit={handleCreate}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Tambah Gedung</h3>
              <button type="button" className={s.modalClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={s.modalBody}>
              {error && <div style={{ color: 'var(--color-danger-600)', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Nama Gedung *</label>
                  <input
                    className={s.formInput}
                    placeholder="RS Mata JEC ORBITA"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Kode Gedung *</label>
                  <input
                    className={s.formInput}
                    placeholder="JEC-ORB"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Alamat</label>
                <input
                  className={s.formInput}
                  placeholder="Jl. A. P. Pettarani..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
