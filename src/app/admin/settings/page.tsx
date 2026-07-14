'use client';

import s from '../admin-crud.module.css';
import styles from './settings.module.css';

export default function SettingsPage() {
  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Pengaturan Sistem</h1><p className={s.pageSub}>Konfigurasi aplikasi Security Patrol</p></div>
      </div>

      <div className={styles.settingsGrid}>
        {/* General */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>⚙️ Umum</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Nama Rumah Sakit</span><span className={styles.settingDesc}>Ditampilkan di header aplikasi</span></div>
              <input className={s.formInput} style={{ width: 240 }} defaultValue="RS Mata JEC ORBITA" />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Interval Patroli</span><span className={styles.settingDesc}>Waktu antar sesi patroli</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input className={s.formInput} style={{ width: 80 }} type="number" defaultValue="3" /><span className={styles.settingUnit}>jam</span></div>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Toleransi Keterlambatan</span><span className={styles.settingDesc}>Batas terlambat mulai patroli</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input className={s.formInput} style={{ width: 80 }} type="number" defaultValue="15" /><span className={styles.settingUnit}>menit</span></div>
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>📷 Foto</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Wajib Foto per Ruangan</span><span className={styles.settingDesc}>Security harus mengambil foto</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Kualitas Kompresi</span><span className={styles.settingDesc}>Kualitas foto setelah kompresi</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input className={s.formInput} style={{ width: 80 }} type="number" defaultValue="80" /><span className={styles.settingUnit}>%</span></div>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Watermark Timestamp</span><span className={styles.settingDesc}>Tambah timestamp pada foto</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Blokir Upload Galeri</span><span className={styles.settingDesc}>Hanya izinkan foto langsung dari kamera</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
          </div>
        </div>

        {/* QR */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>📱 QR Validasi</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Wajib Scan QR</span><span className={styles.settingDesc}>Security wajib scan QR untuk menyelesaikan lantai</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Validasi Lokasi GPS</span><span className={styles.settingDesc}>Cocokkan GPS saat scan QR</span></div>
              <div className={s.toggleSwitch} />
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>🔔 Notifikasi</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Notifikasi Keterlambatan</span><span className={styles.settingDesc}>Kirim notif ke supervisor saat terlambat</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}><span className={styles.settingLabel}>Notifikasi Temuan Baru</span><span className={styles.settingDesc}>Kirim notif saat ada temuan baru</span></div>
              <div className={`${s.toggleSwitch} ${s.toggleSwitchOn}`} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveBar}>
        <button className="btn btn-primary btn-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}
