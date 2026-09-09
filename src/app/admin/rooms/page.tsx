'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface FloorData {
  id: string;
  code: string;
  name: string;
  rooms: {
    id: string;
    code: string;
    name: string;
    patrolOrder: number;
    hasAc: boolean;
    hasLight: boolean;
    photoGuide: string | null;
    isActive: boolean;
  }[];
}

export default function RoomsPage() {
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    floorId: '',
    name: '',
    code: '',
    patrolOrder: 1,
    photoGuide: '',
    hasAc: true,
    hasLight: true,
  });

  const fetchFloors = async () => {
    try {
      const res = await fetch('/api/floors');
      if (res.ok) {
        const data = await res.json();
        setFloors(data);
        if (data.length > 0 && !formData.floorId) {
          setFormData(prev => ({ ...prev, floorId: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch floors for rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  const handleOpenModal = () => {
    setError('');
    setFormData({
      floorId: floors[0]?.id || '',
      name: '',
      code: '',
      patrolOrder: (floorsRooms.length || 0) + 1,
      photoGuide: '',
      hasAc: true,
      hasLight: true,
    });
    setShowModal(true);
  };

  const handleSaveRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim() || !formData.floorId) {
      setError('Lantai, nama ruangan, dan kode wajib diisi');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan ruangan');
      }

      setShowModal(false);
      await fetchFloors();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`Yakin ingin menonaktifkan/menghapus ruangan "${roomName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms?id=${roomId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchFloors();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus ruangan');
      }
    } catch (err) {
      console.error('Delete room error:', err);
      alert('Gagal menghapus ruangan');
    }
  };

  const floorsRooms = floors.flatMap(f => (f.rooms || []).map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    floorId: f.id,
    floorName: f.name,
    floorCode: f.code,
    patrolOrder: r.patrolOrder,
    hasAc: r.hasAc,
    hasLight: r.hasLight,
    photoGuide: r.photoGuide,
    isActive: r.isActive,
  })));

  const uniqueFloors = [...new Set(floorsRooms.map(r => r.floorName))];
  const filtered = floorsRooms
    .filter(r => floorFilter === 'all' || r.floorName === floorFilter)
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Master Ruangan</h1>
          <p className={s.pageSub}>{loading ? 'Memuat...' : `${floorsRooms.length} ruangan terdaftar`}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Ruangan
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
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Data Ruangan</span>
            <div className={s.tableActions}>
              <select className={s.searchInput} style={{ width: 160 }} value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
                <option value="all">Semua Lantai</option>
                {uniqueFloors.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input className={s.searchInput} style={{ width: 180 }} placeholder="Cari ruangan..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Kode</th>
                  <th className={s.th}>Nama Ruangan</th>
                  <th className={s.th}>Lantai</th>
                  <th className={s.th}>Urutan</th>
                  <th className={s.th}>AC</th>
                  <th className={s.th}>Lampu</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={s.tr}>
                    <td className={s.td}><span className={s.tdCode}>{r.code}</span></td>
                    <td className={`${s.td} ${s.tdBold}`}>{r.name}</td>
                    <td className={s.td}><span className={s.tdMuted}>{r.floorName}</span></td>
                    <td className={s.td}>{r.patrolOrder}</td>
                    <td className={s.td}>{r.hasAc ? <span className="badge badge-success">Ya</span> : <span className="badge badge-neutral">Tidak</span>}</td>
                    <td className={s.td}>{r.hasLight ? <span className="badge badge-success">Ya</span> : <span className="badge badge-neutral">Tidak</span>}</td>
                    <td className={s.td}>
                      <span className={`badge ${r.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {r.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td}>
                      <div className={s.actionBtns}>
                        <button
                          className={`${s.actionBtn} ${s.actionBtnDanger}`}
                          title="Hapus"
                          onClick={() => handleDeleteRoom(r.id, r.name)}
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
                {filtered.length === 0 && <tr><td colSpan={8} className={s.emptyRow}>Tidak ada data ruangan ditemukan</td></tr>}
              </tbody>
            </table>
          </div>
          <div className={s.tableFooter}><span>Menampilkan {filtered.length} dari {floorsRooms.length} ruangan</span></div>
        </div>
      )}

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Tambah Ruangan</h3>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className={s.modalBody}>
              {error && (
                <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <div className={s.formGroup}>
                <label className={s.formLabel}>Lantai Target *</label>
                <select
                  className={s.formSelect}
                  value={formData.floorId}
                  onChange={e => setFormData({ ...formData, floorId: e.target.value })}
                >
                  {floors.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>

              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Nama Ruangan *</label>
                  <input
                    className={s.formInput}
                    placeholder="Contoh: Poli Mata 1"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Kode Ruangan *</label>
                  <input
                    className={s.formInput}
                    placeholder="Contoh: L1-05"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
              </div>

              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Urutan Patroli</label>
                  <input
                    className={s.formInput}
                    type="number"
                    min="1"
                    value={formData.patrolOrder}
                    onChange={e => setFormData({ ...formData, patrolOrder: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Panduan Foto (Opsional)</label>
                  <input
                    className={s.formInput}
                    placeholder="Contoh: Foto pintu dan saklar"
                    value={formData.photoGuide}
                    onChange={e => setFormData({ ...formData, photoGuide: e.target.value })}
                  />
                </div>
              </div>

              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label
                    className={s.formToggle}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setFormData({ ...formData, hasAc: !formData.hasAc })}
                  >
                    <div className={`${s.toggleSwitch} ${formData.hasAc ? s.toggleSwitchOn : ''}`} />
                    <span className={s.formLabel} style={{ margin: 0 }}>Ada AC</span>
                  </label>
                </div>
                <div className={s.formGroup}>
                  <label
                    className={s.formToggle}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setFormData({ ...formData, hasLight: !formData.hasLight })}
                  >
                    <div className={`${s.toggleSwitch} ${formData.hasLight ? s.toggleSwitchOn : ''}`} />
                    <span className={s.formLabel} style={{ margin: 0 }}>Ada Lampu</span>
                  </label>
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveRoom} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Ruangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
