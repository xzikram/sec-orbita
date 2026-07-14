'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getCurrentShift, patrolHistory } from '@/lib/dummy-data';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Error fetching profile user:', err));
  }, []);

  const dummyUser = getCurrentUser();
  const dummyShift = getCurrentShift();

  const user = currentUser || dummyUser;
  const shift = currentUser?.shift || dummyShift;

  const completedPatrols = patrolHistory.filter(p => p.status === 'completed').length;
  const latePatrols = patrolHistory.filter(p => p.status === 'late').length;
  const totalPatrols = patrolHistory.length;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
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

    setLoading(true);
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
      setLoading(false);
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
          <span className="badge badge-neutral badge-lg">{shift.name}</span>
        </div>
      </div>

      {/* Stats */}
      <div className={`${styles.statsCard} card animate-slide-up stagger-1`}>
        <div className="card-body">
          <h3 className={styles.statsTitle}>Statistik Patroli</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{totalPatrols}</span>
              <span className={styles.statLabel}>Total Patroli</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} text-success`}>{completedPatrols}</span>
              <span className={styles.statLabel}>Selesai</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} text-warning`}>{latePatrols}</span>
              <span className={styles.statLabel}>Terlambat</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} text-primary`}>
                {totalPatrols > 0 ? Math.round((completedPatrols / totalPatrols) * 100) : 0}%
              </span>
              <span className={styles.statLabel}>On-Time Rate</span>
            </div>
          </div>
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
              <span className={styles.infoValue}>{shift.name} ({shift.startTime} - {shift.endTime})</span>
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
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Memproses...' : 'Simpan Password Baru'}
            </button>
          </form>
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
