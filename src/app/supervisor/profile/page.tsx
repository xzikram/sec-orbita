'use client';

import Link from 'next/link';
import styles from './profile.module.css';

export default function SupervisorProfilePage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Profil Supervisor</h1>

      <div className={styles.grid}>
        <div className={`card ${styles.profileCard}`}>
          <div className={styles.avatarArea}>
            <div className={styles.avatar}>DP</div>
            <h2 className={styles.name}>Dimas Prasetyo</h2>
            <span className="badge badge-warning badge-lg">Supervisor</span>
          </div>
          <div className={styles.infoList}>
            <div className={styles.infoRow}><span className={styles.infoLabel}>ID Karyawan</span><span className={styles.infoValue}>SPV-001</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>Email</span><span className={styles.infoValue}>dimas@jec.co.id</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>Shift</span><span className={styles.infoValue}>Shift Pagi (06:00 - 14:00)</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>Bergabung</span><span className={styles.infoValue}>10 Januari 2026</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>Status</span><span className="badge badge-success">Aktif</span></div>
          </div>
        </div>

        <div className={`card ${styles.statsCard}`}>
          <h3 className={styles.sectionTitle}>Statistik Bulan Ini</h3>
          <div className={styles.statsGrid}>
            <div className={styles.stat}><span className={styles.statNum}>124</span><span className={styles.statLabel}>Sesi Direview</span></div>
            <div className={styles.stat}><span className={styles.statNum}>18</span><span className={styles.statLabel}>Temuan Diproses</span></div>
            <div className={styles.stat}><span className={styles.statNum}>15</span><span className={styles.statLabel}>Temuan Selesai</span></div>
            <div className={styles.stat}><span className={styles.statNum}>2</span><span className={styles.statLabel}>Override QR</span></div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-outline">Ubah Password</button>
        <Link href="/login" className="btn btn-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          Keluar
        </Link>
      </div>
    </div>
  );
}
