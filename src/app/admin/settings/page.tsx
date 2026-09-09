'use client';

import { useState, useEffect } from 'react';
import s from '../admin-crud.module.css';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [hospitalName, setHospitalName] = useState('RS Mata JEC ORBITA');
  const [patrolInterval, setPatrolInterval] = useState('3');
  const [lateTolerance, setLateTolerance] = useState('15');
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState('80');
  const [watermarkTimestamp, setWatermarkTimestamp] = useState(true);
  const [blockGallery, setBlockGallery] = useState(false);
  const [requireQr, setRequireQr] = useState(true);
  const [gpsValidation, setGpsValidation] = useState(false);
  const [notifLate, setNotifLate] = useState(true);
  const [notifFinding, setNotifFinding] = useState(true);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.hospital_name) setHospitalName(data.hospital_name);
          if (data.patrol_interval) setPatrolInterval(data.patrol_interval);
          if (data.late_tolerance) setLateTolerance(data.late_tolerance);
          if (data.require_photo !== undefined) setRequirePhoto(data.require_photo === 'true');
          if (data.compression_quality) setCompressionQuality(data.compression_quality);
          if (data.watermark_timestamp !== undefined) setWatermarkTimestamp(data.watermark_timestamp === 'true');
          if (data.block_gallery !== undefined) setBlockGallery(data.block_gallery === 'true');
          if (data.require_qr !== undefined) setRequireQr(data.require_qr === 'true');
          if (data.gps_validation !== undefined) setGpsValidation(data.gps_validation === 'true');
          if (data.notif_late !== undefined) setNotifLate(data.notif_late === 'true');
          if (data.notif_finding !== undefined) setNotifFinding(data.notif_finding === 'true');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      const payload = {
        hospital_name: hospitalName,
        patrol_interval: patrolInterval,
        late_tolerance: lateTolerance,
        require_photo: String(requirePhoto),
        compression_quality: compressionQuality,
        watermark_timestamp: String(watermarkTimestamp),
        block_gallery: String(blockGallery),
        require_qr: String(requireQr),
        gps_validation: String(gpsValidation),
        notif_late: String(notifLate),
        notif_finding: String(notifFinding),
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMsg('Pengaturan sistem berhasil disimpan.');
        setTimeout(() => setStatusMsg(''), 3500);
      } else {
        const data = await res.json();
        setStatusMsg(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      setStatusMsg('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Pengaturan Sistem</h1>
          <p className={s.pageSub}>Konfigurasi operasional aplikasi Security Patrol</p>
        </div>
      </div>

      {statusMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: statusMsg.includes('berhasil') ? 'var(--color-success-50)' : 'var(--color-danger-50)',
          color: statusMsg.includes('berhasil') ? 'var(--color-success-700)' : 'var(--color-danger-700)',
          fontWeight: '600',
          marginBottom: '20px',
          border: '1px solid currentColor'
        }}>
          {statusMsg}
        </div>
      )}

      <div className={styles.settingsGrid}>
        {/* General */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>⚙️ Umum</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Nama Rumah Sakit</span>
                <span className={styles.settingDesc}>Ditampilkan di header aplikasi & watermark foto</span>
              </div>
              <input
                className={s.formInput}
                style={{ width: 240 }}
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Interval Patroli</span>
                <span className={styles.settingDesc}>Waktu antar sesi patroli</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className={s.formInput}
                  style={{ width: 80 }}
                  type="number"
                  value={patrolInterval}
                  onChange={e => setPatrolInterval(e.target.value)}
                />
                <span className={styles.settingUnit}>jam</span>
              </div>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Toleransi Keterlambatan</span>
                <span className={styles.settingDesc}>Batas terlambat mulai patroli</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className={s.formInput}
                  style={{ width: 80 }}
                  type="number"
                  value={lateTolerance}
                  onChange={e => setLateTolerance(e.target.value)}
                />
                <span className={styles.settingUnit}>menit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>📷 Foto</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Wajib Foto per Ruangan</span>
                <span className={styles.settingDesc}>Security harus mengambil foto ruangan</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${requirePhoto ? s.toggleSwitchOn : ''}`}
                onClick={() => setRequirePhoto(!requirePhoto)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Kualitas Kompresi</span>
                <span className={styles.settingDesc}>Kualitas foto setelah kompresi</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className={s.formInput}
                  style={{ width: 80 }}
                  type="number"
                  value={compressionQuality}
                  onChange={e => setCompressionQuality(e.target.value)}
                />
                <span className={styles.settingUnit}>%</span>
              </div>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Watermark Timestamp</span>
                <span className={styles.settingDesc}>Tambah timestamp & nama gedung pada foto</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${watermarkTimestamp ? s.toggleSwitchOn : ''}`}
                onClick={() => setWatermarkTimestamp(!watermarkTimestamp)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Blokir Upload Galeri</span>
                <span className={styles.settingDesc}>Hanya izinkan foto langsung dari kamera</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${blockGallery ? s.toggleSwitchOn : ''}`}
                onClick={() => setBlockGallery(!blockGallery)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* QR */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>📱 QR Validasi</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Wajib Scan QR</span>
                <span className={styles.settingDesc}>Security wajib scan QR untuk menyelesaikan lantai</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${requireQr ? s.toggleSwitchOn : ''}`}
                onClick={() => setRequireQr(!requireQr)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Validasi Lokasi GPS</span>
                <span className={styles.settingDesc}>Cocokkan koordinat GPS saat scan QR</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${gpsValidation ? s.toggleSwitchOn : ''}`}
                onClick={() => setGpsValidation(!gpsValidation)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className={`card ${styles.settingCard}`}>
          <h3 className={styles.settingTitle}>🔔 Notifikasi</h3>
          <div className={styles.settingGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Notifikasi Keterlambatan</span>
                <span className={styles.settingDesc}>Kirim notif ke supervisor saat terlambat</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${notifLate ? s.toggleSwitchOn : ''}`}
                onClick={() => setNotifLate(!notifLate)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Notifikasi Temuan Baru</span>
                <span className={styles.settingDesc}>Kirim notif saat ada temuan baru</span>
              </div>
              <div
                className={`${s.toggleSwitch} ${notifFinding ? s.toggleSwitchOn : ''}`}
                onClick={() => setNotifFinding(!notifFinding)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveBar}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {saving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  );
}
