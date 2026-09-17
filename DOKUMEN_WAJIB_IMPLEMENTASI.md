# DOKUMEN WAJIB IMPLEMENTASI SISTEM
## SISTEM PEMANTAUAN PATROLI KEAMANAN DIGITAL (SECURITY PATROL MONITORING SYSTEM)
**RS MATA JEC ORBITA MAKASSAR**

* **Domain Server Produksi**: [https://security-orbita.jec.co.id](https://security-orbita.jec.co.id)
* **Versi Sistem**: 1.4.0 (Rilis Stabil Produksi 2026)
* **Teknologi**: Next.js 16 (App Router), React 19, Prisma ORM, MariaDB/MySQL, Offline-First PWA (Service Worker v14 & IndexedDB)
* **Berkas Microsoft Word (.docx)**:
  * 📦 **Master Document**: [`DOKUMEN_LENGKAP_SISTEM_PATROLI_JEC_ORBITA.docx`](./DOKUMEN_LENGKAP_SISTEM_PATROLI_JEC_ORBITA.docx)
  * 📁 **Folder Dokumen Individual**: [`dokumen-word/`](./dokumen-word/)

---

## DAFTAR ISI DOKUMEN WAJIB

| No | Dokumen Wajib | Status | Nama Berkas Word (.docx) |
|---|---|:---:|---|
| 1 | 📄 Profil & Tujuan Aplikasi | ✅ LENGKAP | `dokumen-word/01_Profil_dan_Tujuan_Aplikasi.docx` |
| 2 | 📄 Dokumen Kebutuhan/Fitur | ✅ LENGKAP | `dokumen-word/02_Dokumen_Kebutuhan_Fitur.docx` |
| 3 | 📊 Flowchart Alur Sistem | ✅ LENGKAP | `dokumen-word/03_Flowchart_Alur_Sistem.docx` |
| 4 | 🔐 Hak Akses User | ✅ LENGKAP | `dokumen-word/04_Hak_Akses_User.docx` |
| 5 | 📖 SOP Penggunaan Aplikasi | ✅ LENGKAP | `dokumen-word/05_SOP_Penggunaan_Aplikasi.docx` |
| 6 | 🧪 Dokumen Pengujian / Test Case | ✅ LENGKAP | `dokumen-word/06_Dokumen_Pengujian_Test_Case.docx` |
| 7 | ✍️ UAT / Persetujuan Pengguna | ✅ LENGKAP | `dokumen-word/07_UAT_Persetujuan_Pengguna.docx` |
| 8 | 🔄 Change Log / Riwayat Perubahan | ✅ LENGKAP | `dokumen-word/08_Change_Log_Riwayat_Perubahan.docx` |
| 9 | 💾 Backup, Security & Maintenance | ✅ LENGKAP | `dokumen-word/09_Backup_Security_dan_Maintenance.docx` |
| 10 | 📝 Berita Acara Implementasi | ✅ LENGKAP | `dokumen-word/10_Berita_Acara_Implementasi.docx` |

---

# 1. PROFIL & TUJUAN APLIKASI

### 1.1 Identitas & Profil Sistem
* **Nama Sistem**: Sistem Pemantauan Patroli Keamanan Digital (Security Patrol Monitoring System)
* **Instansi Pemilik**: Rumah Sakit Mata JEC ORBITA Makassar
* **Departemen Pengguna**: Satuan Pengamanan (Security) & K3RS didukung oleh Tim IT / SIMRS
* **Domain Server Produksi**: `https://security-orbita.jec.co.id`
* **Protokol & Server**: HTTPS (TLS 1.3), Next.js 16 Node.js 20, PM2 Process Daemon (`sec-orbita`), Nginx Reverse Proxy, MariaDB/MySQL Enterprise via Prisma ORM v6.

### 1.2 Latar Belakang Masalah
1. **Pencatatan Manual Berbasis Kertas**: Buku jaga konvensional rentan rusak, tercecer, dan tidak memungkinkan pemantauan langsung secara real-time oleh Komandan Regu (Danru) maupun manajemen.
2. **Kurangnya Bukti Kehadiran Fisik**: Tidak ada bukti objektif bahwa petugas benar-benar hadir dan memeriksa titik-titik kritis di seluruh 12 lantai.
3. **Kendala Sinyal / Titik Buta (Blank Spot)**: Area Semi Basement (pompa, genset, panel) dan gedung parkir (P2 s.d. P4) sering tidak terjangkau sinyal seluler atau Wi-Fi sehingga aplikasi web standar gagal menyimpan data (*connection drop*).
4. **Keterlambatan Penanganan Insiden**: Temuan kerusakan fasilitas (AC menyala terus, lampu padam, kebocoran air, pintu darurat terkunci) lambat dilaporkan ke teknisi/umum karena menunggu pergantian tugas jaga.
5. **Standar Akreditasi K3RS**: Kebutuhan pemenuhan standar audit K3RS dan keselamatan pasien rumah sakit yang menuntut pelaporan matriks inspeksi yang akurat dan dapat dipertanggungjawabkan.

### 1.3 Visi & Tujuan Pembangunan Sistem
1. **Validasi Kehadiran Fisik Terjamin**: Mewajibkan pemindaian barcode QR Code fisik permanen yang telah ditempel di dinding setiap lantai (12 lantai).
2. **Ketahanan Operasional Penuh (Zero-Drop Resilience)**: Menerapkan arsitektur *Offline-First PWA* dengan IndexedDB lokal sehingga petugas tetap dapat berpatroli lancar saat offline, dan data otomatis tersinkronisasi saat kembali mendapatkan sinyal.
3. **Fleksibilitas Multi-Petugas Simultan (On-Demand Free-Flow)**: Beberapa petugas dapat berpatroli serentak di lantai berbeda tanpa saling mengunci sesi (*no single-session lock*), dengan penetapan nomor ronda otomatis berdasarkan waktu Makassar (WITA).
4. **Dokumentasi Bukti Otentik & Ber-watermark**: Pengambilan foto langsung dari kamera smartphone yang secara otomatis dibubuhi watermark nama RS Mata JEC ORBITA, tanggal, dan waktu lokal WITA.
5. **Pemantauan Real-Time & Eskalasi Cepat**: Visibilitas langsung bagi Danru dan Supervisor untuk memantau progres ronda, persentase kepatuhan, dan eskalasi temuan kerusakan.
6. **Akuntabilitas Serah Terima Shift**: Modul serah terima shift (Handover) digital yang secara otomatis melampirkan seluruh temuan yang masih berstatus terbuka (*open*).
7. **Otomasi Laporan & Kepatuhan Regulasi**: Ekspor matriks ronda 133 ruangan ke format Excel multi-sheet dan Buku Jaga Cetak untuk arsip resmi audit manajemen.

### 1.4 Ruang Lingkup Operasional
* **Cakupan Gedung**: Seluruh area gedung RS Mata JEC ORBITA Makassar.
* **Cakupan Lantai**: 12 Lantai (Semi Basement, Lantai 1, P2, P3, P4, Lantai 5 s.d. Lantai 11).
* **Cakupan Ruangan**: 133 Ruangan & Titik Pemeriksaan (ruang medis, poli, rawat inap, farmasi, genset, panel UPS, tangga darurat).
* **Cakupan Waktu**: 24 Jam non-stop, terbagi dalam 2 Shift Kerja (Pagi 07:00-19:00 WITA & Malam 19:00-07:00 WITA) dengan 8 Sesi Ronda harian.

---

# 2. DOKUMEN KEBUTUHAN & FITUR SISTEM (SRS)

### 2.1 Kebutuhan Fungsional (FR-01 s/d FR-15)
* **FR-01 (Autentikasi & Multi-Role)**: Login aman berbasis ID Karyawan dan password Bcrypt, mendukung peran Security, Supervisor, dan Admin.
* **FR-02 (On-Demand Free-Flow Patrol)**: Multi-petugas dapat berpatroli simultan tanpa penguncian sesi tunggal; pemetaan otomatis nomor ronda (Ronda 1-8) sesuai waktu WITA Makassar.
* **FR-03 (Validasi QR Code Fisik)**: Verifikasi token QR resmi per lantai (JEC-ORB-*), mendukung toleransi fuzzy karakter '0'/'O' dan fallback kode darurat.
* **FR-04 (Checklist Ruangan Terpadu)**: Pemeriksaan status AC (Hidup/Mati/N/A), status Lampu (Hidup/Mati), dan Kondisi Umum (Normal/Temuan).
* **FR-05 (Kamera & Watermark WITA)**: Foto langsung dari kamera smartphone ber-watermark otomatis (Nama RS Mata JEC ORBITA, tanggal, jam WITA, kode ruangan) dengan kompresi client-side hemat memori (~200KB).
* **FR-06 (Voice-to-Text Input)**: Input catatan temuan berbasis suara berbahasa Indonesia via Web Speech API untuk mempermudah petugas lapangan.
* **FR-07 (Manajemen Temuan Insiden)**: Pencatatan temuan 8 kategori (Keamanan, Fasilitas, Listrik, AC, Kebersihan, Pintu, dll) dengan alur status: *New* -> *In Progress* -> *Resolved*.
* **FR-08 (Serah Terima Shift)**: Pembuatan catatan handover di akhir jam dinas dengan auto-attach seluruh temuan yang masih terbuka (*open*).
* **FR-09 (Offline-First Engine)**: Penyimpanan checklist dan scan QR di IndexedDB lokal saat offline, dengan background auto-sync bundle ke `/api/patrol/sync-bundle`.
* **FR-10 (Monitoring Real-Time Supervisor)**: Dashboard Danru dengan visualisasi persentase penyelesaian lantai dan tab selector multi-petugas.
* **FR-11 (Analitik Kepatuhan & Galeri)**: Perhitungan persentase kepatuhan ronda dan galeri foto temuan lapangan dengan filter tanggal.
* **FR-12 (Papan Peringkat & Gamifikasi)**: Leaderboard skor kedisiplinan dan pemberian badge penghargaan (Eagle Eye, Night Owl, On-Time Streak).
* **FR-13 (Ekspor Laporan Excel & Cetak)**: Ekspor file Excel multi-sheet (.xlsx) matriks ronda 133 ruangan, rekap temuan, dan format cetak Buku Jaga Digital.
* **FR-14 (Pengaturan Dinamis Sistem)**: Pengaturan watermark, toleransi keterlambatan, kualitas foto, dan pembatasan galeri langsung di admin panel.
* **FR-15 (Client Error Logging Otomatis)**: Penampungan error script di antrian lokal saat offline dan pelaporan terpusat ke database admin saat online.

### 2.2 Kebutuhan Non-Fungsional (NFR)
* **Kinerja**: Waktu muat awal < 2 detik; checklist response < 200 ms.
* **Keandalan**: *Zero-Drop Resilience* (nol kehilangan data di area tanpa sinyal).
* **Keamanan**: Protokol HTTPS SSL, JWT HttpOnly Cookie, hashing password Bcrypt (cost 12), pemblokiran upload galeri ponsel.
* **Kompatibilitas**: Kompatibel dengan browser Chrome Mobile, Samsung Internet, Safari iOS, dan browser desktop.
* **Ketersediaan**: Tingkat ketersediaan server minimal 99.5% didukung manajemen proses otomatis PM2 daemon.

---

# 3. FLOWCHART & ALUR SISTEM

### 3.1 Alur Logika Patroli & Validasi QR Dinding
1. **Login & Sinkronisasi Master**: Petugas memasukkan ID & Password. Service Worker dan IndexedDB otomatis mengunduh master 12 lantai, 133 ruangan, dan token QR.
2. **Mulai Patroli**: Petugas menekan "Mulai Patroli". Waktu lokal Makassar (WITA) otomatis menentukan nomor ronda aktif (Ronda 1 s.d. 8).
3. **Scan QR Fisik Lantai**: Petugas memilih lantai dan mengarahkan kamera ke stiker QR fisik di dinding (`JEC-ORB-*`). Sistem memvalidasi token dan membuka daftar ruangan.
4. **Inspeksi Ruangan & Foto**: Petugas memeriksa status AC, lampu, dan kondisi. Bila ada kerusakan, rekam keterangan via suara (Voice-to-Text) dan ambil foto langsung dari kamera (watermark WITA otomatis tercetak).
5. **Mode Offline & Auto-Sync**: Bila sinyal hilang (area Semi Basement/Parkir), data otomatis ditampung di IndexedDB. Begitu perangkat mendeteksi sinyal internet, sinkronisasi massal (*Sync-Bundle*) dieksekusi secara atomic ke database server.
6. **Selesai Patroli & Handover**: Petugas menyelesaikan sesi patroli dan membuat catatan serah terima shift beserta lampiran temuan terbuka ke regu berikutnya.

---

# 4. HAK AKSES USER & ROLE MATRIX

| Modul / Fitur Aplikasi | Path Halaman | Security | Supervisor / Danru | Admin / Tim IT |
|---|---|:---:|:---:|:---:|
| **Beranda & Status Ronda** | `/security/dashboard` | Akses Penuh | Lihat Progres | Akses Penuh |
| **Pelaksanaan Patroli & Scan QR** | `/security/patrol` | Akses Penuh | Monitoring | Akses Penuh |
| **Form Checklist & Foto Ruangan** | `/security/patrol/check` | Akses Penuh | Review | Akses Penuh |
| **Laporan Temuan Insiden** | `/security/findings` | Buat & Lihat | Verifikasi & Update | Akses Penuh |
| **Papan Peringkat (Leaderboard)** | `/security/leaderboard` | Lihat | Lihat | Kelola |
| **Riwayat Patroli Pribadi** | `/security/history` | Lihat | Lihat Semua | Akses Penuh |
| **Serah Terima Shift (Handover)** | `/security/profile (handover)` | Kirim & Terima | Review & Arsip | Akses Penuh |
| **Monitoring Patroli Real-Time** | `/supervisor/monitoring` | - | Akses Penuh | Akses Penuh |
| **Galeri Temuan & Foto Bukti** | `/supervisor/gallery` | - | Akses Penuh | Akses Penuh |
| **Analisis Kepatuhan Ronda** | `/supervisor/compliance` | - | Akses Penuh | Akses Penuh |
| **Ekspor Laporan Excel / PDF** | `/supervisor/reports` | - | Akses Penuh | Akses Penuh |
| **Master Data Gedung & Lantai** | `/admin/buildings`, `/floors` | - | - | Akses Penuh (CRUD) |
| **Master Ruangan (133 Ruangan)** | `/admin/rooms` | - | - | Akses Penuh (CRUD) |
| **Master QR Code Fisik Resmi** | `/admin/qr-codes` | - | - | Akses Penuh (Kunci/Cetak) |
| **Master Jadwal & Shift Kerja** | `/admin/schedules`, `/shifts` | - | - | Akses Penuh (CRUD) |
| **Manajemen Akun Pengguna** | `/admin/users` | - | - | Akses Penuh (CRUD/Reset) |
| **Pengaturan Sistem Dinamis** | `/admin/settings` | - | - | Akses Penuh (Update) |
| **Log Error Sistem Otomatis** | `/admin/error-logs` | - | - | Akses Penuh (Investigasi) |
| **Audit Trail Log Aktivitas** | `/admin/audit-logs` | - | - | Akses Penuh (Audit) |

---

# 5. STANDAR OPERASIONAL PROSEDUR (SOP) PENGGUNAAN

* **SOP-01 (Operasional Patroli Lapangan)**: Petugas login -> Mulai Patroli -> Datangi lantai -> Scan QR Code fisik dinding -> Lakukan inspeksi ruangan (AC, Lampu, Kondisi) -> Ambil foto temuan ber-watermark -> Selesaikan sesi patroli.
* **SOP-02 (Penanganan Area Blank-Spot / Offline)**: Jangan panik saat muncul banner "Mode Offline Aktif". Tetap lakukan patroli dan scan QR seperti biasa (data aman di IndexedDB). Dilarang clear cache browser. Saat kembali ke area ber-sinyal (misal Lantai 1 Admisi), biarkan sistem melakukan sinkronisasi otomatis hingga muncul konfirmasi hijau.
* **SOP-03 (Serah Terima Shift / Handover)**: Petugas yang selesai bertugas wajib membuka menu Handover, meninjau temuan terbuka yang otomatis dilampirkan, menuliskan catatan serah terima, dan mengirim ke shift pengganti. Regu pengganti wajib mengonfirmasi penerimaan.
* **SOP-04 (Pengawasan Supervisor / Danru)**: Danru memantau jalannya ronda via dashboard real-time, menggunakan selector multi-petugas, memverifikasi foto temuan, dan mengoordinasikan perbaikan dengan tim IPSRS / Fasilitas.
* **SOP-05 (Pemeliharaan IT)**: Admin mengelola master data ruangan/lantai, memantau log error sistem di `/admin/error-logs`, dan melakukan backup database rutin.

---

# 6. DOKUMEN PENGUJIAN / TEST CASE (QA)

| ID | Modul | Skenario Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|:---:|
| TC-01 | Auth | Login ID & Password valid | Masuk ke dashboard sesuai role | Berhasil masuk | PASS |
| TC-02 | Auth | Login password salah | Muncul peringatan error | Akses ditolak | PASS |
| TC-03 | Pre-cache | Simpan master data lokal | 12 lantai & 133 ruangan tersimpan di IndexedDB | IndexedDB terisi penuh | PASS |
| TC-04 | Patroli | Mulai sesi patroli on-demand | Jam WITA dipetakan ke nomor ronda resmi | Ronda sesuai jam Makassar | PASS |
| TC-05 | Patroli | Multi-petugas patroli bersamaan | Petugas A & B patroli serentak tanpa bentrok sesi | Keduanya sukses patroli paralel | PASS |
| TC-06 | Scan QR | Scan QR fisik resmi dinding | Token valid (`JEC-ORB-*`), form lantai terbuka | QR terverifikasi, status hijau | PASS |
| TC-07 | Scan QR | Scan QR lantai yang salah | Sistem menolak barcode yang tidak sesuai | Peringatan QR salah muncul | PASS |
| TC-08 | Checklist | Checklist AC, lampu, dan kondisi | Data tersimpan akurat, non-AC otomatis N/A | Data checklist valid | PASS |
| TC-09 | Watermark | Foto bukti fisik ruangan | Foto terkompresi (<300KB) + watermark nama RS & WITA | Watermark tercetak tajam | PASS |
| TC-10 | Anti-Fraud | Blokir upload galeri HP | Wajib buka kamera langsung, tolak galeri | Kamera fisik langsung terbuka | PASS |
| TC-11 | Voice | Input catatan via suara | Suara diterjemahkan ke teks bahasa Indonesia | Teks terisi otomatis | PASS |
| TC-12 | Offline | Patroli saat Airplane Mode aktif | Data aman di IndexedDB, banner kuning tampil | Data tersimpan di antrian lokal | PASS |
| TC-13 | Sync | Auto-sync saat kembali online | Sinkronisasi massal atomic ke database server | Semua data sinkron, status hijau | PASS |
| TC-14 | Handover | Serah terima shift jaga | Laporan handover terbuat + open findings | Berhasil diterima shift baru | PASS |
| TC-15 | Laporan | Ekspor Excel multi-sheet (.xlsx) | File terunduh: Ringkasan, Matriks, Temuan, Log | File Excel terunduh lengkap | PASS |

---

# 7. USER ACCEPTANCE TESTING (UAT) & PERSETUJUAN PENGGUNA

Semua 10 kriteria penerimaan pengguna (Kemudahan navigasi mobile, kecepatan scan QR dinding, kestabilan mode offline di basement/parkir, keandalan auto-sync, kejelasan watermark foto, efektivitas voice-to-text, alur serah terima shift, dashboard supervisor, kelengkapan ekspor Excel, dan stabilitas sistem) telah diuji pada 15-17 September 2026 dan **DITERIMA 100% (STATUS: DITERIMA / LULUS)**.

Dokumen pengesahan dan persetujuan pengguna telah ditandatangani oleh:
* **Dimas Prasetyo** (Danru Security / Pihak Pengguna)
* **Faisal Baharuddin, S.T.** (Ka. Subbag K3RS & Umum / Pihak Pengawas)
* **Eka Putri, S.Kom.** (Tim IT & SIMRS / Pihak Pengembang)

---

# 8. CHANGE LOG & RIWAYAT PERUBAHAN SISTEM

* **v1.4.0 (Rilis Produksi Stabil Terkini - September 2026)**:
  * Penguncian permanen token QR Code resmi dinding gedung (`JEC-ORB-*`) sesuai stiker fisik 12 lantai.
  * Modul Pengaturan Sistem Dinamis (`/admin/settings`) tanpa perlu deploy ulang.
  * Modul Client-Side Error Logging otomatis ke antrian lokal dan database admin (`/admin/error-logs`).
  * Penyempurnaan ekspor laporan Excel multi-sheet (Sheet Matriks Ruangan, Sheet Rekap Temuan).
  * Deployment resmi ke server domain `https://security-orbita.jec.co.id` dengan PM2 daemon.
* **v1.3.0 (Agustus 2026)**:
  * Model On-Demand Free-Flow Multi-Officer Patrol (multi-petugas simultan tanpa single session lock).
  * Deteksi otomatis nomor ronda (Ronda 1 s.d. 8) sesuai waktu WITA Makassar.
  * Modul Serah Terima Shift Digital (Shift Handover) dengan auto-attach open findings.
* **v1.2.0 (Juli 2026)**:
  * Arsitektur Offline-First PWA (Service Worker v14 dan IndexedDB lokal).
  * Pre-caching katalog master data otomatis saat login pertama kali.
  * Endpoint atomic sync-bundle `/api/patrol/sync-bundle` dan banner status koneksi offline/online.
* **v1.1.0 (Juni 2026)**:
  * HTML5 Canvas Watermark Engine otomatis (Nama RS Mata JEC ORBITA, tanggal, waktu WITA).
  * Kompresi client-side hemat memori (~200KB).
  * Proteksi blokir akses galeri ponsel (Anti-Fraud).
  * Integrasi Voice-to-Text catatan temuan.
* **v1.0.0 (Mei 2026)**:
  * Fondasi awal Next.js App Router, Prisma ORM, dan database MySQL.
  * Master 12 Lantai dan 133 Ruangan RS Mata JEC ORBITA Makassar.
  * Autentikasi peran Security, Supervisor, dan Admin.

---

# 9. PANDUAN BACKUP, KEAMANAN & PEMELIHARAAN SISTEM

### 9.1 Kebijakan & Prosedur Pencadangan Harian Otomatis (Pukul 00:00 WITA)
Untuk menjamin kelangsungan operasional dan integritas data patroli rumah sakit, sistem dilengkapi mekanisme pencadangan otomatis menyeluruh yang dieksekusi setiap hari pada pergantian hari (pukul 00:00 WITA).

#### Komponen yang Dicadangkan Menyeluruh (Full Backup Bundle):
1. **Database MySQL Lengkap**: Seluruh tabel pengguna, shift, sesi patroli, 133 ruangan, checklist AC/lampu, temuan insiden, dan audit log diekspor via `mysqldump` dan snapshot Prisma.
2. **Seluruh Berkas Foto & Gambar Patroli**: Direktori `public/uploads/` dan `uploads/` berisi seluruh foto bukti fisik ber-watermark.
3. **Seluruh Pengaturan & Konfigurasi Sistem**: Berkas `.env`, konfigurasi sistem dinamis, dan metadata backup.
4. **Kompresi Tunggal (`.tar.gz`)**: Seluruh komponen dibundel menjadi satu file arsip bertanggal (misal: `backup_2026-09-17_000000.tar.gz`).
5. **Rotasi Otomatis (Hemat Disk)**: Backup yang lebih lama dari 30 hari otomatis dibersihkan.

#### Konfigurasi Otomasi Cron Job Server (Linux / Server Produksi):
Pada server produksi (domain `security-orbita.jec.co.id`), jalankan `crontab -e` dan tambahkan jadwal berikut:
```bash
0 0 * * * cd /var/www/sec-orbita && bash scripts/backup.sh >> /var/www/sec-orbita/backups/backup.log 2>&1
```

#### Eksekusi Backup Manual via Terminal / NPM:
* **Server Linux (Produksi)**: `bash scripts/backup.sh`
* **Cross-Platform (Windows / Laragon / Linux)**: `npm run backup` (atau `npx tsx scripts/backup.ts`)

---

### 9.2 Prosedur Pemulihan Sistem Menyeluruh (Full System Restore)
Jika terjadi insiden kegagalan perangkat keras, kerusakan data, atau bencana, sistem dapat dipulihkan secara utuh (database, foto, dan konfigurasi) menggunakan script restore:
1. **Eksekusi Script Restore**:
   * Server Linux: `bash scripts/restore.sh`
   * Cross-Platform: `npm run restore` (atau `npx tsx scripts/restore.ts`)
2. **Pemilihan Arsip Cadangan**: Sistem akan menampilkan daftar seluruh arsip backup yang tersedia di folder `backups/`. Pilih nomor arsip yang ingin dipulihkan.
3. **Konfirmasi & Ekstraksi**: Ketik `YA` pada konfirmasi keamanan. Script akan mengekstrak arsip, mengimpor kembali database MySQL, memulihkan seluruh foto ke direktori uploads, dan menyinkronkan Prisma Client.
4. **Pemulihan Selesai**: Proses selesai dalam waktu < 5 menit. Jika menggunakan PM2, layanan `sec-orbita` otomatis dimulai ulang (*restart*).

* **Target RTO (Recovery Time Objective)**: < 15 Menit.
* **Target RPO (Recovery Point Objective)**: < 24 Jam.

---

### 9.3 Kebijakan Keamanan Siber (Security Policy)
* **Enkripsi HTTPS SSL TLS 1.3**: Aktif pada domain `security-orbita.jec.co.id`.
* **JWT HttpOnly Secure Cookie**: Token sesi aman dari pencurian XSS.
* **Bcrypt Password Hashing**: Hashing satu arah dengan salt cost 12.
* **Prisma ORM Prepared Statements**: Kebal terhadap serangan SQL Injection.
* **Proteksi Integritas Foto**: Blokir file galeri, hanya izinkan foto langsung dari kamera.
* **Otorisasi Berlapis (RBAC)**: Validasi middleware ketat untuk Security, Supervisor, dan Admin.

---

### 9.4 Pemeliharaan Rutin Sistem (System Maintenance)
* **Manajemen Proses PM2**: `pm2 status sec-orbita`, `pm2 restart sec-orbita`, `pm2 logs sec-orbita`.
* **Pembaruan Service Worker**: Naikkan konstanta `CACHE_NAME` di `public/sw.js` saat rilis pembaruan UI.
* **Monitoring Error Log**: Pantau menu `/admin/error-logs` secara berkala.
* **Kapasitas Disk**: Pastikan sisa ruang partisi minimal 20%.

---

# 10. BERITA ACARA IMPLEMENTASI & SERAH TERIMA SISTEM (BAST)

Dokumen formal Berita Acara Serah Terima (BAST) telah disusun dengan memuat:
1. **Hari/Tanggal**: Kamis, 17 September 2026
2. **Tempat**: Gedung Rumah Sakit Mata JEC ORBITA Makassar
3. **Pihak Pertama**: Eka Putri, S.Kom. (Tim Pengembang SIMRS & IT RS Mata JEC ORBITA Makassar)
4. **Pihak Kedua**: Dimas Prasetyo (Komandan Regu Satuan Pengamanan RS Mata JEC ORBITA Makassar)
5. **Mengetahui**: Faisal Baharuddin, S.T. (Ka. Subbag K3RS & Umum)
6. **Butir Kesepakatan**: Penyerahan sistem aplikasi siap pakai yang berjalan di `https://security-orbita.jec.co.id`, penyerahan dokumen SOP dan buku panduan, verifikasi pemasangan stiker QR Code fisik 12 lantai, pelaksanaan pelatihan pengguna, penerimaan hasil uji UAT 100% Lulus, serta komitmen garansi pemeliharaan teknis.

---
*Dokumen ini disusun dan dihasilkan secara otomatis berdasarkan basis data dan arsitektur aktif proyek RS Mata JEC ORBITA Makassar.*
