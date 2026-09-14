'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface Building {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isActive: boolean;
  totalFloors?: number;
  totalRooms?: number;
  floors?: any[];
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBuildings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(Array.isArray(data) ? data : []);
      } else {
        setBuildings([]);
      }
    } catch {
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const openCreateModal = () => {
    setEditingBuilding(null);
    setName('');
    setCode('');
    setAddress('');
    setIsActive(true);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (b: Building) => {
    setEditingBuilding(b);
    setName(b.name);
    setCode(b.code);
    setAddress(b.address || '');
    setIsActive(b.isActive !== false);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Nama dan kode gedung wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEdit = Boolean(editingBuilding);
      const url = '/api/buildings';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { id: editingBuilding!.id, name: name.trim(), code: code.trim(), address: address.trim(), isActive }
        : { name: name.trim(), code: code.trim(), address: address.trim() };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingBuilding(null);
        setName('');
        setCode('');
        setAddress('');
        await loadBuildings();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan data gedung');
      }
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Building) => {
    if (!window.confirm(`Yakin ingin menonaktifkan atau menghapus gedung "${b.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/buildings?id=${b.id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadBuildings();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus gedung');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menghapus gedung');
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Master Gedung</h1>
          <p className={s.pageSub}>{buildings.length} gedung terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Gedung
        </button>
      </div>

      <div className={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Kode</th>
                <th className={s.th}>Nama Gedung</th>
                <th className={s.th}>Alamat</th>
                <th className={s.th}>Lantai</th>
                <th className={s.th}>Ruangan</th>
                <th className={s.th}>Status</th>
                <th className={s.th} style={{ textAlign: 'center', width: 90 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={s.emptyRow}>Memuat data gedung...</td>
                </tr>
              ) : buildings.length === 0 ? (
                <tr>
                  <td colSpan={7} className={s.emptyRow}>Belum ada gedung terdaftar.</td>
                </tr>
              ) : (
                buildings.map((b) => (
                  <tr key={b.id} className={s.tr}>
                    <td className={s.td}><span className={s.tdCode}>{b.code}</span></td>
                    <td className={`${s.td} ${s.tdBold}`}>{b.name}</td>
                    <td className={s.td}><span className={s.tdMuted}>{b.address || '-'}</span></td>
                    <td className={s.td}>{b.totalFloors ?? b.floors?.length ?? 0}</td>
                    <td className={s.td}>{b.totalRooms ?? 0}</td>
                    <td className={s.td}>
                      <span className={`badge ${b.isActive !== false ? 'badge-success' : 'badge-neutral'}`}>
                        {b.isActive !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <div className={s.actionBtns} style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className={s.actionBtn}
                          title="Edit Gedung"
                          onClick={() => openEditModal(b)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`${s.actionBtn} ${s.actionBtnDanger}`}
                          title="Hapus / Nonaktifkan"
                          onClick={() => handleDelete(b)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={s.tableFooter}>
          <span>{buildings.length} gedung terdaftar</span>
        </div>
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <form className={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{editingBuilding ? 'Edit Gedung' : 'Tambah Gedung'}</h3>
              <button type="button" className={s.modalClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={s.modalBody}>
              {error && (
                <div style={{ color: 'var(--color-danger-600)', marginBottom: '12px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Nama Gedung *</label>
                  <input
                    className={s.formInput}
                    placeholder="RS Mata JEC ORBITA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Kode Gedung *</label>
                  <input
                    className={s.formInput}
                    placeholder="JEC-ORB"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
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
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              {editingBuilding && (
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Status Gedung</label>
                  <div
                    className={s.formToggle}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIsActive(!isActive)}
                  >
                    <div className={`${s.toggleSwitch} ${isActive ? s.toggleSwitchOn : ''}`} />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className={s.modalFooter}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : editingBuilding ? 'Simpan Perubahan' : 'Tambah Gedung'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
