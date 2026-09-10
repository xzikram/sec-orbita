'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';

interface ProfileUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  shiftId: string | null;
  shift?: { name: string; startTime: string; endTime: string } | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  // States for change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States for Help & Feedback
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showFeedbackList, setShowFeedbackList] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'saran' | 'kendala' | 'pertanyaan' | 'lainnya'>('saran');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);

  const fetchMyFeedbacks = () => {
    fetch('/api/support/feedback')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.feedbacks) setMyFeedbacks(data.feedbacks);
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Check if PWA is already installed or running standalone
    const checkInstalled = () => {
      if (typeof window === 'undefined') return;
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('pwa_installed') === 'true';
      setIsInstalled(Boolean(standalone));
    };

    checkInstalled();

    try {
      const mql = window.matchMedia('(display-mode: standalone)');
      const mqlHandler = (e: MediaQueryListEvent) => {
        if (e.matches) setIsInstalled(true);
      };
      mql.addEventListener('change', mqlHandler);
    } catch {}

    const handleAppInstalled = () => {
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Error fetching profile user:', err))
      .finally(() => setLoading(false));

    fetchMyFeedbacks();

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);


  const user = currentUser;
  const shift = currentUser?.shift;

  if (loading || !user) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="text-sm text-muted">Memuat profil...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    try {
      localStorage.removeItem('cached-user');
      localStorage.removeItem('lastPatrolState');
    } catch {}
    router.push('/login');
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal harus 6 karakter.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah password.');
      }

      setSuccessMsg('Password berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      setFeedbackError('Topik dan pesan wajib diisi.');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const res = await fetch('/api/support/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: feedbackCategory,
          subject: feedbackSubject.trim(),
          message: feedbackMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim saran/laporan.');
      }

      setFeedbackSuccess('✓ Berhasil dikirim! Tim IT akan segera meninjau masukan Anda.');
      setFeedbackSubject('');
      setFeedbackMessage('');
      fetchMyFeedbacks();
      setShowFeedbackList(true);
      setShowFeedbackForm(false);
      setTimeout(() => setFeedbackSuccess(''), 5000);
    } catch (err: any) {
      setFeedbackError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (

    <div className="page-content">
      {/* Profile Header */}
      <div className={`${styles.profileHeader} animate-slide-up`}>
        <div className={styles.avatar}>
          <span className={styles.avatarText}>
            {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </span>
        </div>
        <h1 className={styles.userName}>{user.name}</h1>
        <p className={styles.userRole}>Security Officer</p>
        <div className={styles.userMeta}>
          <span className="badge badge-info badge-lg">{user.employeeId}</span>
          {shift && <span className="badge badge-neutral badge-lg">{shift.name}</span>}
        </div>
      </div>

      {/* Info */}
      <div className={`card animate-slide-up stagger-2`}>
        <div className="card-body">
          <h3 className={styles.sectionTitle}>Informasi Akun</h3>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nama</span>
              <span className={styles.infoValue}>{user.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ID Karyawan</span>
              <span className={styles.infoValue}>{user.employeeId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Shift</span>
              <span className={styles.infoValue}>{shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Status</span>
              <span className="badge badge-success">Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ubah Password */}
      <div className="card animate-slide-up stagger-2" style={{ marginTop: '1rem' }}>
        <div className="card-body">
          <h3 className={styles.sectionTitle}>Ubah Password</h3>
          <form onSubmit={handleChangePassword}>
            {errorMsg && <p className={`${styles.messageText} ${styles.errorText}`}>{errorMsg}</p>}
            {successMsg && <p className={`${styles.messageText} ${styles.successText}`}>{successMsg}</p>}
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password Saat Ini</label>
              <input
                type="password"
                className={styles.formInput}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password Baru</label>
              <input
                type="password"
                className={styles.formInput}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Konfirmasi Password Baru</label>
              <input
                type="password"
                className={styles.formInput}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-md mt-2"
              disabled={pwLoading}
              style={{ width: '100%' }}
            >
              {pwLoading ? 'Memproses...' : 'Simpan Password Baru'}
            </button>
          </form>
        </div>
      </div>

      {/* PWA Install Section - Hanya tampil jika belum diinstall */}
      {!isInstalled && (
        <div className="card animate-slide-up stagger-3" style={{ border: '1px solid var(--color-primary-200)', background: 'var(--color-primary-50)', marginBottom: '1rem' }}>
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📲 Pasang Aplikasi di HP
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-primary-700)', lineHeight: '1.4' }}>
                  Pasang di Layar Utama HP Android atau iPhone agar cepat diakses layaknya aplikasi toko aplikasi.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  try {
                    localStorage.removeItem('pwa_prompt_dismissed_at');
                  } catch {}
                  window.location.reload();
                }}
                style={{ flexShrink: 0, fontWeight: 700 }}
              >
                Pasang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buku Panduan Security PDF */}
      <div className="card animate-slide-up stagger-3" style={{ border: '1.5px solid #bae6fd', background: '#f0f9ff', marginBottom: '1rem', borderRadius: '14px' }}>
        <div className="card-body" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📘 Buku Panduan Security (PDF)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#0284c7', lineHeight: '1.4' }}>
                Panduan resmi seluruh fitur patroli 12 lantai, rekam suara, scan barcode & mode offline.
              </p>
            </div>
            <a
              href="/panduan-security.pdf"
              download="Panduan-Patroli-Security-JEC-ORBITA.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, fontWeight: 700, textDecoration: 'none' }}
            >
              📥 Unduh PDF
            </a>
          </div>
        </div>
      </div>

      {/* Pusat Bantuan & Saran Security */}

      <div className="card animate-slide-up stagger-3" style={{ border: '1.5px solid #fed7aa', background: '#fffaf0', marginBottom: '1rem', borderRadius: '14px' }}>
        <div className="card-body" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>💡</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Bantuan & Saran Pengembangan
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c2410c', lineHeight: '1.4' }}>
                Ada ide fitur baru, saran perbaikan, atau kendala teknis? Sampaikan langsung ke Tim IT Rumah Sakit!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={() => {
                setShowFeedbackForm(!showFeedbackForm);
                setFeedbackSuccess('');
                setFeedbackError('');
              }}
              style={{ fontWeight: 700, borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}
            >
              {showFeedbackForm ? '✕ Tutup Formulir' : '✍️ Tulis Saran / Kendala'}
            </button>
            {myFeedbacks.length > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowFeedbackList(!showFeedbackList)}
                style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', background: 'white', borderColor: '#fdba74', color: '#c2410c' }}
              >
                Riwayat Masukan ({myFeedbacks.length}) {showFeedbackList ? '▲' : '▼'}
              </button>
            )}
          </div>

          {/* Feedback Form */}
          {showFeedbackForm && (
            <form onSubmit={handleSubmitFeedback} style={{ marginTop: '12px', background: '#fff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#9a3412' }}>
                Form Masukan ke Tim IT
              </h4>

              {feedbackError && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca' }}>{feedbackError}</div>}
              {feedbackSuccess && <div style={{ color: '#16a34a', fontSize: '11px', marginBottom: '8px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>{feedbackSuccess}</div>}

              {/* Kategori Radio / Pills */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Pilih Kategori</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'saran', label: '💡 Saran Fitur', desc: 'Ide pengembangan' },
                    { id: 'kendala', label: '⚠️ Laporan Kendala', desc: 'Error atau bug' },
                    { id: 'pertanyaan', label: '❓ Pertanyaan', desc: 'Panduan aplikasi' },
                    { id: 'lainnya', label: '📝 Lain-lain', desc: 'Masukan umum' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFeedbackCategory(cat.id as any)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: feedbackCategory === cat.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                        background: feedbackCategory === cat.id ? '#fff7ed' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: feedbackCategory === cat.id ? '#c2410c' : '#1e293b' }}>{cat.label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{cat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subjek */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Topik / Judul</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: Usulan tombol periksa diperbesar"
                  value={feedbackSubject}
                  onChange={e => setFeedbackSubject(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 10px' }}
                  required
                />
              </div>

              {/* Detail Pesan */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Pesan / Uraian Lengkap</label>
                <textarea
                  className={styles.formInput}
                  rows={3}
                  placeholder="Tuliskan detail saran atau kendala yang dialami secara rinci..."
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 10px', resize: 'vertical' }}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={feedbackSubmitting}
                style={{ width: '100%', fontWeight: 700, height: '34px', fontSize: '12px' }}
              >
                {feedbackSubmitting ? 'Mengirim ke IT...' : '🚀 Kirim ke Tim IT'}
              </button>
            </form>
          )}

          {/* Feedback History List */}
          {showFeedbackList && myFeedbacks.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
                Riwayat Masukan Anda ({myFeedbacks.length})
              </h4>
              {myFeedbacks.map((fb: any) => (
                <div key={fb.id} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: fb.category === 'saran' ? '#dbeafe' : fb.category === 'kendala' ? '#fee2e2' : '#fef3c7',
                      color: fb.category === 'saran' ? '#1d4ed8' : fb.category === 'kendala' ? '#b91c1c' : '#b45309'
                    }}>
                      {fb.category.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {new Date(fb.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{fb.subject}</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{fb.message}</div>
                  
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: fb.status === 'resolved' ? '#16a34a' : fb.status === 'in_review' ? '#ea580c' : '#2563eb' }}>
                      Status: {fb.status === 'resolved' ? '✓ Selesai / Ditindaklanjuti' : fb.status === 'in_review' ? '⏳ Sedang Ditinjau IT' : '📩 Terkirim'}
                    </span>
                  </div>

                  {fb.adminNotes && (
                    <div style={{ marginTop: '6px', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: '#334155', borderLeft: '3px solid #3b82f6' }}>
                      <strong>💬 Tanggapan IT:</strong> {fb.adminNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className={`${styles.logoutSection} animate-slide-up stagger-3`}>

        <button
          className="btn btn-danger btn-xl"
          onClick={handleLogout}
          id="btn-logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Keluar
        </button>
      </div>

      <p className={styles.version}>Security Patrol v1.0 — JEC ORBITA</p>
    </div>
  );
}
