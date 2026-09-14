'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface FloorData {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  buildingId?: string;
  building: {
    id?: string;
    name: string;
    code?: string;
  };
  rooms: any[];
  qrCode: {
    token: string;
  } | null;
  isActive: boolean;
}

export default function FloorsPage() {
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState<FloorData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sortOrder: 0,
    buildingId: '',
    isActive: true,
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFloors = async () => {
    try {
      const [resFloors, resBuildings] = await Promise.all([
        fetch('/api/floors'),
        fetch('/api/buildings').catch(() => null),
      ]);

      if (resFloors.ok) {
        const data = await resFloors.json();
        setFloors(data);
      }
      if (resBuildings && resBuildings.ok) {
        const bData = await resBuildings.json();
        setBuildings(bData);
      }
    } catch (err) {
      console.error('Failed to fetch floors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  const openCreateModal = () => {
    setEditingFloor(null);
    setFormData({
      name: '',
      code: '',
      sortOrder: floors.length + 1,
      buildingId: buildings[0]?.id || '',
      isActive: true,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (f: FloorData) => {
    setEditingFloor(f);
    setFormData({
      name: f.name,
      code: f.code,
      sortOrder: f.sortOrder,
      buildingId: f.buildingId || f.building?.id || buildings[0]?.id || '',
      isActive: f.isActive,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMsg('Nama lantai dan kode wajib diisi');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const isEdit = !!editingFloor;
      const url = '/api/floors';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit
        ? { id: editingFloor.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan lantai');
        return;
      }

      setShowModal(false);
      await fetchFloors();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kendala saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (floor: FloorData) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan lantai "${floor.name}" (${floor.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/floors?id=${floor.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menonaktifkan lantai');
        return;
      }
      await fetchFloors();
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus lantai');
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Master Lantai</h1>
          <p className={s.pageSub}>{loading ? 'Memuat...' : `${floors.length} lantai terdaftar di database`}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Lantai
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
                  <th className={s.th}>Nama Lantai</th>
                  <th className={s.th}>Gedung</th>
                  <th className={s.th}>Level (Sort)</th>
                  <th className={s.th}>Ruangan</th>
                  <th className={s.th}>QR Code Token</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {floors.map(f => (
                  <tr key={f.id} className={s.tr}>
                    <td className={s.td}><span className={s.tdCode}>{f.code}</span></td>
                    <td className={`${s.td} ${s.tdBold}`}>{f.name}</td>
                    <td className={s.td}><span className={s.tdMuted}>{f.building?.name || '-'}</span></td>
                    <td className={s.td}>{f.sortOrder}</td>
                    <td className={s.td}>{f.rooms?.length || 0}</td>
                    <td className={s.td}>
                      <span className={s.tdCode} style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {f.qrCode ? f.qrCode.token : 'Belum dibuat'}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={`badge ${f.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {f.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td}>
                      <div className={s.actionBtns}>
                        <button
                          className={s.actionBtn}
                          title="Edit Lantai"
                          onClick={() => openEditModal(f)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className={`${s.actionBtn} ${s.actionBtnDanger}`}
                          title="Hapus / Nonaktifkan"
                          onClick={() => handleDelete(f)}
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
          <div className={s.tableFooter}><span>Total: {floors.length} lantai</span></div>
        </div>
      )}

      {showModal && (
        <div className={s.modalOverlay} onClick={() => !saving && setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{editingFloor ? 'Edit Lantai' : 'Tambah Lantai'}</h3>
              <button className={s.modalClose} onClick={() => setShowModal(false)} disabled={saving}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={s.modalBody}>
                {errorMsg && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Gedung</label>
                  <select
                    className={s.formSelect}
                    value={formData.buildingId}
                    onChange={e => setFormData({ ...formData, buildingId: e.target.value })}
                  >
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                    {buildings.length === 0 && <option value="">RS Mata JEC ORBITA</option>}
                  </select>
                </div>

                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Nama Lantai *</label>
                    <input
                      className={s.formInput}
                      placeholder="Contoh: Lantai 4"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Kode Lantai *</label>
                    <input
                      className={s.formInput}
                      placeholder="Contoh: L4"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Urutan / Level Sort</label>
                    <input
                      className={s.formInput}
                      type="number"
                      placeholder="Contoh: 4"
                      value={formData.sortOrder}
                      onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  {editingFloor && (
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Status</label>
                      <select
                        className={s.formSelect}
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                      >
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className={s.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : (editingFloor ? 'Simpan Perubahan' : 'Tambah Lantai')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
