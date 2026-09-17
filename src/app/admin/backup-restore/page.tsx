'use client';

import { useState, useEffect } from 'react';
import styles from './backup-restore.module.css';
import crudStyles from '../admin-crud.module.css';

interface BackupItem {
  name: string;
  createdAt: string;
  sizeFormatted: string;
  sizeBytes: number;
  photosCount: number;
  databaseName: string;
  timestamp: string;
}

export default function AdminBackupRestorePage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupModalError, setBackupModalError] = useState('');

  // Restore Modal State
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restoreModalError, setRestoreModalError] = useState('');

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<BackupItem | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteModalError, setDeleteModalError] = useState('');

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await fetch('/api/system/backups');
      const data = await res.json();
      if (res.ok && data.backups) {
        setBackups(data.backups);
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal memuat daftar backup' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: 'Terjadi kesalahan jaringan saat memuat data cadangan' });
    } finally {
      setLoading(false);
    }
  }

  // 1. BACKUP HANDLER
  function handleOpenBackupModal() {
    setBackupPassword('');
    setBackupModalError('');
    setShowBackupModal(true);
  }

  function handleCloseBackupModal() {
    if (backupInProgress) return;
    setShowBackupModal(false);
    setBackupPassword('');
    setBackupModalError('');
  }

  async function handleExecuteBackup() {
    if (!backupPassword) {
      setBackupModalError('Masukkan password otorisasi backup.');
      return;
    }

    setBackupInProgress(true);
    setBackupModalError('');
    setToast(null);

    try {
      const res = await fetch('/api/system/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityPassword: backupPassword }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (res.status === 504 || text.includes('504') || text.includes('Time-out')) {
          handleCloseBackupModal();
          setToast({
            type: 'success',
            message: '⏳ Proses backup sedang berjalan di latar belakang server (karena ukuran foto besar). Silakan tunggu sebentar lalu klik tombol refresh (🔄).',
          });
          setTimeout(fetchBackups, 3000);
          return;
        }
        setBackupModalError('Respon server: ' + text.slice(0, 100));
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        handleCloseBackupModal();
        setToast({ type: 'success', message: `✅ ${data.message} (${data.backup?.sizeFormatted})` });
        fetchBackups();
      } else {
        setBackupModalError(data.error || 'Gagal membuat cadangan sistem');
      }
    } catch (err: any) {
      setBackupModalError('Gagal membuat backup: ' + err.message);
    } finally {
      setBackupInProgress(false);
    }
  }

  // 2. RESTORE HANDLER
  function handleOpenRestoreModal(item: BackupItem) {
    setSelectedBackup(item);
    setAdminPassword('');
    setConfirmKeyword('');
    setRestoreModalError('');
  }

  function handleCloseRestoreModal() {
    if (restoring) return;
    setSelectedBackup(null);
    setAdminPassword('');
    setConfirmKeyword('');
    setRestoreModalError('');
  }

  async function handleExecuteRestore() {
    if (!selectedBackup) return;

    if (confirmKeyword !== 'RESTORE') {
      setRestoreModalError('Kata kunci salah! Anda harus mengetik kata "RESTORE" dengan huruf besar.');
      return;
    }

    if (!adminPassword) {
      setRestoreModalError('Masukkan kata sandi otorisasi untuk pemulihan.');
      return;
    }

    setRestoreModalError('');
    setRestoring(true);

    try {
      const res = await fetch('/api/system/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupName: selectedBackup.name,
          adminPassword,
          confirmKeyword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        handleCloseRestoreModal();
        setToast({
          type: 'success',
          message: `🎉 ${data.message}`,
        });
        fetchBackups();
      } else {
        setRestoreModalError(data.error || 'Gagal memulihkan sistem');
      }
    } catch (err: any) {
      setRestoreModalError('Terjadi kesalahan saat memulihkan sistem: ' + err.message);
    } finally {
      setRestoring(false);
    }
  }

  // 3. DELETE HANDLER
  function handleOpenDeleteModal(item: BackupItem) {
    setItemToDelete(item);
    setDeletePassword('');
    setDeleteModalError('');
  }

  function handleCloseDeleteModal() {
    if (deleting) return;
    setItemToDelete(null);
    setDeletePassword('');
    setDeleteModalError('');
  }

  async function handleExecuteDelete() {
    if (!itemToDelete) return;

    if (!deletePassword) {
      setDeleteModalError('Masukkan password otorisasi untuk menghapus backup.');
      return;
    }

    setDeleting(true);
    setDeleteModalError('');

    try {
      const res = await fetch('/api/system/backups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupName: itemToDelete.name,
          securityPassword: deletePassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        handleCloseDeleteModal();
        setToast({ type: 'success', message: `🗑️ ${data.message}` });
        fetchBackups();
      } else {
        setDeleteModalError(data.error || 'Gagal menghapus berkas cadangan');
      }
    } catch (err: any) {
      setDeleteModalError('Gagal menghapus: ' + err.message);
    } finally {
      setDeleting(false);
    }
  }

  function getBadge(name: string) {
    if (name.includes('pre_restore')) {
      return <span className={`${styles.badge} ${styles.badgeSafety}`}>🛡️ Pre-Restore Safety</span>;
    }
    if (name.includes('manual') || name.startsWith('backup_2')) {
      return <span className={`${styles.badge} ${styles.badgeManual}`}>👤 Manual / Snapshot</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeAuto}`}>⏱️ Otomatis Jam 00:00</span>;
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={crudStyles.pageHeader}>
        <div>
          <h1 className={crudStyles.pageTitle}>Pencadangan & Pemulihan Sistem (Backup & Restore)</h1>
          <p className={crudStyles.pageSub}>
            Kelola cadangan menyeluruh (database, foto inspeksi patroli, dan konfigurasi) untuk menjamin kelangsungan operasional RS Mata JEC ORBITA Makassar.
          </p>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={toast.type === 'success' ? styles.toastSuccess : styles.toastError}>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* STATS & INFO CARDS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>⏱️</div>
          <div>
            <h4 className={styles.statValue}>Setiap Jam 00:00 WITA</h4>
            <p className={styles.statLabel}>Jadwal Pencadangan Otomatis Harian</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>🧹</div>
          <div>
            <h4 className={styles.statValue}>Maksimal 7 Cadangan</h4>
            <p className={styles.statLabel}>Auto-Rotasi 7 Cadangan (Hemat Disk)</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>🛡️</div>
          <div>
            <h4 className={styles.statValue}>Password Protected</h4>
            <p className={styles.statLabel}>Backup, Restore & Hapus Dilindungi Sandi</p>
          </div>
        </div>
      </div>

      {/* ACTION BAR: MANUAL BACKUP */}
      <div className={styles.actionBar}>
        <div className={styles.actionInfo}>
          <h3>Buat Cadangan Baru (On-Demand)</h3>
          <p>
            Mencadangkan seluruh database MySQL saat ini, seluruh foto di folder uploads, dan file konfigurasi ke dalam folder arsip baru.
          </p>
        </div>
        <button
          className={styles.btnBackup}
          onClick={handleOpenBackupModal}
          disabled={backupInProgress || restoring || deleting}
        >
          📦 Buat Cadangan Sekarang
        </button>
      </div>

      {/* BACKUP TABLE */}
      <div className={crudStyles.tableWrap}>
        <div className={crudStyles.tableHeader}>
          <span className={crudStyles.tableTitle}>Riwayat Berkas Cadangan ({backups.length})</span>
          <button
            className={crudStyles.actionBtn}
            onClick={fetchBackups}
            title="Refresh Data"
            disabled={loading}
          >
            🔄
          </button>
        </div>

        <table className={crudStyles.table}>
          <thead>
            <tr>
              <th className={crudStyles.th}>Nama Cadangan</th>
              <th className={crudStyles.th}>Tipe</th>
              <th className={crudStyles.th}>Waktu Pembuatan</th>
              <th className={crudStyles.th}>Ukuran File</th>
              <th className={crudStyles.th}>Foto Tersimpan</th>
              <th className={crudStyles.th} style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={crudStyles.emptyRow}>
                  Memuat data cadangan...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={6} className={crudStyles.emptyRow}>
                  Belum ada berkas cadangan di sistem. Klik tombol "Buat Cadangan Sekarang" untuk membuat cadangan pertama.
                </td>
              </tr>
            ) : (
              backups.map((item) => (
                <tr key={item.name} className={crudStyles.tr}>
                  <td className={`${crudStyles.td} ${crudStyles.tdBold}`}>
                    <code>{item.name}</code>
                  </td>
                  <td className={crudStyles.td}>{getBadge(item.name)}</td>
                  <td className={crudStyles.td}>
                    {new Date(item.createdAt).toLocaleString('id-ID', {
                      timeZone: 'Asia/Makassar',
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}{' '}
                    WITA
                  </td>
                  <td className={crudStyles.td}>
                    <span className={crudStyles.tdCode}>{item.sizeFormatted}</span>
                  </td>
                  <td className={crudStyles.td}>
                    {item.photosCount > 0 ? (
                      `📸 ${item.photosCount} Foto`
                    ) : item.sizeBytes > 5 * 1024 * 1024 ? (
                      `📸 Arsip Foto Lengkap (${item.sizeFormatted})`
                    ) : (
                      '📁 0 Foto'
                    )}
                  </td>
                  <td className={crudStyles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.btnRestore}
                        onClick={() => handleOpenRestoreModal(item)}
                        disabled={backupInProgress || restoring || deleting}
                        title="Pulihkan seluruh sistem ke kondisi cadangan ini"
                      >
                        🔄 Pulihkan
                      </button>
                      <button
                        className={styles.btnDelete}
                        onClick={() => handleOpenDeleteModal(item)}
                        disabled={backupInProgress || restoring || deleting}
                        title="Hapus berkas cadangan ini"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: BACKUP AUTHORIZATION MODAL */}
      {showBackupModal && (
        <div className={crudStyles.modalOverlay}>
          <div className={crudStyles.modal} style={{ maxWidth: '480px' }}>
            <div className={crudStyles.modalHeader}>
              <h2 className={crudStyles.modalTitle} style={{ color: '#0284c7' }}>
                🔒 Otorisasi Pembuatan Cadangan
              </h2>
              <button
                className={crudStyles.modalClose}
                onClick={handleCloseBackupModal}
                disabled={backupInProgress}
              >
                ✕
              </button>
            </div>

            <div className={crudStyles.modalBody}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Untuk memastikan keamanan data rumah sakit, pembuatan cadangan membutuhkan password otorisasi khusus.
              </p>

              {backupModalError && (
                <div className={styles.toastError} style={{ marginBottom: '16px' }}>
                  <span>{backupModalError}</span>
                </div>
              )}

              <div className={crudStyles.formGroup}>
                <label className={crudStyles.formLabel}>
                  Masukkan Password Otorisasi Keamanan:
                </label>
                <input
                  type="password"
                  className={crudStyles.formInput}
                  placeholder="Ketik password otorisasi..."
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  disabled={backupInProgress}
                  autoFocus
                />
              </div>
            </div>

            <div className={crudStyles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={handleCloseBackupModal}
                disabled={backupInProgress}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btnBackup}
                onClick={handleExecuteBackup}
                disabled={!backupPassword || backupInProgress}
              >
                {backupInProgress ? '⏳ Sedang Mencadangkan...' : '📦 Mulai Backup Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTORE SECURITY MODAL */}
      {selectedBackup && (
        <div className={crudStyles.modalOverlay}>
          <div className={crudStyles.modal} style={{ maxWidth: '560px' }}>
            <div className={crudStyles.modalHeader}>
              <h2 className={crudStyles.modalTitle} style={{ color: '#b91c1c' }}>
                ⚠️ Konfirmasi Pemulihan Sistem (Restore)
              </h2>
              <button
                className={crudStyles.modalClose}
                onClick={handleCloseRestoreModal}
                disabled={restoring}
              >
                ✕
              </button>
            </div>

            <div className={crudStyles.modalBody}>
              <div className={styles.alertSecurityBox}>
                <div className={styles.alertSecurityTitle}>
                  🚨 PERINGATAN KERAS KEAMANAN DATA
                </div>
                <p className={styles.alertSecurityText}>
                  Tindakan ini akan <strong>MENIMPA SELURUH DATABASE</strong> dan <strong>MENGGANTI SELURUH FOTO PATROLI</strong> yang ada saat ini dengan isi arsip cadangan ini.
                  <br /><br />
                  <em>Tenang: Sistem secara otomatis akan membuat snapshot keselamatan (safety backup) sesaat sebelum restore dijalankan.</em>
                </p>
              </div>

              <div className={styles.selectedBackupBox}>
                <table>
                  <tbody>
                    <tr>
                      <td>Arsip Terpilih</td>
                      <td><code>{selectedBackup.name}</code></td>
                    </tr>
                    <tr>
                      <td>Waktu Dibuat</td>
                      <td>
                        {new Date(selectedBackup.createdAt).toLocaleString('id-ID', {
                          timeZone: 'Asia/Makassar',
                          dateStyle: 'long',
                          timeStyle: 'medium',
                        })}{' '}
                        WITA
                      </td>
                    </tr>
                    <tr>
                      <td>Ukuran & Isi</td>
                      <td>{selectedBackup.sizeFormatted}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {restoreModalError && (
                <div className={styles.toastError} style={{ marginBottom: '16px' }}>
                  <span>{restoreModalError}</span>
                </div>
              )}

              <div className={crudStyles.formGroup}>
                <label className={crudStyles.formLabel}>
                  1. Masukkan Password Otorisasi Keamanan:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={crudStyles.formInput}
                    placeholder="Ketik password otorisasi..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={restoring}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className={crudStyles.formGroup}>
                <label className={crudStyles.formLabel}>
                  2. Ketik kata <strong>RESTORE</strong> di bawah ini untuk konfirmasi:
                </label>
                <input
                  type="text"
                  className={crudStyles.formInput}
                  placeholder="Ketik 'RESTORE' persis (huruf besar)"
                  value={confirmKeyword}
                  onChange={(e) => setConfirmKeyword(e.target.value)}
                  disabled={restoring}
                  style={{
                    letterSpacing: '1px',
                    fontWeight: 'bold',
                    borderColor: confirmKeyword === 'RESTORE' ? '#16a34a' : undefined,
                  }}
                />
              </div>
            </div>

            <div className={crudStyles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={handleCloseRestoreModal}
                disabled={restoring}
              >
                Batalkan
              </button>
              <button
                type="button"
                className={styles.btnConfirmRestore}
                onClick={handleExecuteRestore}
                disabled={confirmKeyword !== 'RESTORE' || !adminPassword || restoring}
              >
                {restoring ? '⏳ Sedang Memulihkan...' : '🔥 Konfirmasi & Pulihkan Sistem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className={crudStyles.modalOverlay}>
          <div className={crudStyles.modal} style={{ maxWidth: '480px' }}>
            <div className={crudStyles.modalHeader}>
              <h2 className={crudStyles.modalTitle} style={{ color: '#b91c1c' }}>
                🗑️ Konfirmasi Hapus Cadangan
              </h2>
              <button
                className={crudStyles.modalClose}
                onClick={handleCloseDeleteModal}
                disabled={deleting}
              >
                ✕
              </button>
            </div>

            <div className={crudStyles.modalBody}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Apakah Anda yakin ingin menghapus berkas cadangan berikut secara permanen dari server?
              </p>

              <div className={styles.selectedBackupBox} style={{ borderLeft: '4px solid #ef4444' }}>
                <code>{itemToDelete.name}</code> ({itemToDelete.sizeFormatted})
              </div>

              {deleteModalError && (
                <div className={styles.toastError} style={{ marginBottom: '16px' }}>
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className={crudStyles.formGroup}>
                <label className={crudStyles.formLabel}>
                  Masukkan Password Otorisasi Keamanan:
                </label>
                <input
                  type="password"
                  className={crudStyles.formInput}
                  placeholder="Ketik password untuk konfirmasi hapus..."
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={deleting}
                  autoFocus
                />
              </div>
            </div>

            <div className={crudStyles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={handleCloseDeleteModal}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btnConfirmRestore}
                onClick={handleExecuteDelete}
                disabled={!deletePassword || deleting}
              >
                {deleting ? '⏳ Sedang Menghapus...' : '🗑️ Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN BLOCKING RESTORE OVERLAY */}
      {restoring && (
        <div className={styles.restoringOverlay}>
          <div className={styles.spinner} />
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Sedang Memulihkan Sistem...</h2>
          <p style={{ maxWidth: '480px', margin: '0 0 16px 0', opacity: 0.9, fontSize: '14px' }}>
            Memulihkan seluruh tabel database, mengembalikan seluruh berkas foto patroli, dan menyinkronkan sistem.
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>
            ⚠️ Mohon JANGAN me-refresh, menutup peramban, atau menekan tombol Back!
          </div>
        </div>
      )}
    </div>
  );
}
