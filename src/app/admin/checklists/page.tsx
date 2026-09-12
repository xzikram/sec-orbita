'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';

interface ChecklistTemplate {
  id: string;
  name: string;
  items: string[];
  isDefault: boolean;
  isActive: boolean;
}

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchChecklists = async () => {
    try {
      const res = await fetch('/api/checklists');
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load checklists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Nama template wajib diisi');
      return;
    }
    const items = itemsText
      .split('\n')
      .map(i => i.trim())
      .filter(Boolean);

    if (items.length === 0) {
      setError('Minimal 1 item checklist wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), items, isDefault }),
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setItemsText('');
        setIsDefault(false);
        await fetchChecklists();
      } else {
        const json = await res.json();
        setError(json.error || 'Gagal menyimpan template');
      }
    } catch {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`Hapus template checklist "${templateName}"?`)) return;

    try {
      const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchChecklists();
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal menghapus template');
      }
    } catch {
      alert('Terjadi kesalahan koneksi');
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Kelola Checklist</h1>
          <p className={s.pageSub}>
            {loading ? 'Memuat...' : `${templates.length} template checklist pemeriksaan ruangan terdaftar di database`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setError('');
            setShowModal(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
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
                <th className={s.th}>Default</th>
                <th className={s.th}>Status</th>
                <th className={s.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        border: '3px solid rgba(0,0,0,0.1)',
                        borderTopColor: 'var(--color-primary-600)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Memuat template...</div>
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Belum ada template checklist
                  </td>
                </tr>
              ) : (
                templates.map(cl => (
                  <tr key={cl.id} className={s.tr}>
                    <td className={`${s.td} ${s.tdBold}`}>{cl.name}</td>
                    <td className={s.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cl.items.map(item => (
                          <span key={item} className={s.tdCode}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={s.td}>
                      {cl.isDefault ? (
                        <span className="badge badge-info">Default</span>
                      ) : (
                        <span className="badge badge-neutral">—</span>
                      )}
                    </td>
                    <td className={s.td}>
                      <span className="badge badge-success">Aktif</span>
                    </td>
                    <td className={s.td}>
                      <div className={s.actionBtns}>
                        {!cl.isDefault && (
                          <button
                            className={`${s.actionBtn} ${s.actionBtnDanger}`}
                            title="Hapus"
                            onClick={() => handleDelete(cl.id, cl.name)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Tambah Checklist Template</h3>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={s.modalBody}>
              {error && (
                <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}
              <div className={s.formGroup}>
                <label className={s.formLabel}>Nama Template</label>
                <input
                  className={s.formInput}
                  placeholder="Checklist Laboratorium"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Item Checklist (pisahkan dengan baris baru / enter)</label>
                <textarea
                  className={s.formInput}
                  rows={4}
                  placeholder={'AC\nLampu\nSuhu Ruangan\nKondisi Alat'}
                  style={{ resize: 'vertical' }}
                  value={itemsText}
                  onChange={e => setItemsText(e.target.value)}
                />
              </div>
              <div className={s.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                  />
                  <span className={s.formLabel} style={{ margin: 0 }}>
                    Jadikan Default
                  </span>
                </label>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
