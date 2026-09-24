# Catatan & Panduan Teknis Proyek Sistem Patroli Keamanan
**RS Mata JEC ORBITA Makassar**

Dokumen ini memuat arsitektur teknis, alur operasional, daftar fitur, struktur data, dan panduan pengelolaan aplikasi sistem patroli keamanan rumah sakit.

---

## 1. Ringkasan Eksekutif

Sistem ini dirancang khusus untuk memodernisasi dan mendigitalkan kegiatan patroli satuan pengamanan (Security) di lingkungan rumah sakit **RS Mata JEC ORBITA Makassar**. Aplikasi mendukung:
- Operasional penuh dalam kondisi **Offline-First** (area basement/parkir tanpa sinyal internet atau Wi-Fi drop).
- Model patroli **On-Demand Bebas Hambatan** (multi-petugas berpatroli serentak tanpa saling kunci/bentrok).
- Validasi fisik lokasi berbasis **QR Code** per lantai untuk menjamin kehadiran petugas di titik patroli.
- Inspeksi berkala 12 lantai & 133 ruangan dengan checklist kepatuhan (AC, lampu, pintu, kebersihan, insiden).
- Dokumentasi foto lapangan dengan watermark otomatis (nama rumah sakit, timestamp WITA, kompresi cerdas).
- Pemantauan langsung (*real-time monitoring*) bagi Komandan Regu (Danru) & Supervisor.
- Buku Jaga Digital dan pelaporan matriks inspeksi otomatis ke format Excel dan cetak PDF.

---

## 2. Arsitektur & Teknologi

### A. Tech Stack
- **Framework Utama**: Next.js 16 (Turbopack, App Router, React 19).
- **Bahasa**: TypeScript (Strict Mode).
- **Database & ORM**: MySQL / MariaDB via Prisma ORM v6.
- **Styling**: Vanilla CSS murni dengan CSS Variables Design Tokens (tidak menggunakan Tailwind).
- **PWA & Offline Engine**: Service Worker kustom (`v14`), CacheStorage API, dan IndexedDB via library internal.
- **Pengolahan Gambar**: HTML5 Canvas API untuk kompresi client-side dan pencetakan watermark.
- **Ekspor Dokumen**: XLSX library untuk pembuatan workbook multi-sheet Excel laporan patroli.

### B. Arsitektur Offline-First (Zero-Drop Resilience)
1. **Master Data Pre-caching**:
   - Saat petugas membuka dashboard, aplikasi otomatis mengunduh katalog 12 lantai, 133 ruangan, checklist, dan token QR ke IndexedDB lokal (`master_floors`, `master_rooms`, `master_tokens`).
   - Service Worker menyimpan bundle rute halaman, aset UI, dan logo JEC.
2. **Pencatatan Tanpa Internet**:
   - Seluruh scan QR, checklist ruangan, dan temuan insiden dapat disimpan di IndexedDB lokal (`offline_checks`, `offline_findings`, `offline_qr_scans`).
3. **Background Auto-Sync**:
   - Saat perangkat kembali terhubung ke jaringan internet, fungsi `syncOfflineData()` memaketkan seluruh transaksi yang tertunda ke endpoint `/api/patrol/sync-bundle` dalam 1 request atomic.
   - Sesi patroli otomatis disinkronkan ke database server tanpa duplikasi data.

---

## 3. Konsep & Alur Operasional Utama

### A. On-Demand Free-Flow Multi-Officer Patrol
- **Tanpa Penguncian Tunggal**: Petugas A dan Petugas B dapat memulai sesi patroli di waktu yang sama pada area yang berbeda (misal: satu di lantai parkir, satu di area rawat inap).
- **Pemetaan Jadwal Otomatis**: Petugas tidak perlu memilih ronda secara manual. Jam mulai (`startedAt`) dikonversikan ke zona waktu Makassar (WITA) dan dicocokkan otomatis ke jadwal ronda resmi di sistem (Ronda 1 s.d. 8).
- **Proteksi Sesi Pribadi**:
  - Tombol tutup paksa (*override*) dan paksa bergabung (*join*) antar security telah ditiadakan untuk mencegah insiden penutupan ronda rekan kerja.
  - Setiap perangkat hanya memuat dan memperbarui sesi milik petugas yang sedang login.
  - Jika ada rekan kerja yang sedang berpatroli, dashboard menampilkan widget status ramah non-intrusif:
    > *🛡️ [N] Rekan Security Sedang Berpatroli: Petugas A (Ronda #1), Petugas B (Ronda #2)*

### B. Validasi QR Code Fisik Per Lantai
- Setiap lantai memiliki token fisik unik:
  - **SB (Semi Basement)**: `QR-RSJEC-FL-SB`
  - **Lantai 1**: `QR-RSJEC-FL-1`
  - **Lantai P2 - P4 (Parkir)**: `QR-RSJEC-FL-P2` s.d. `QR-RSJEC-FL-P4`
  - **Lantai 5 - 11 (Pelayanan & Rawat Inap)**: `QR-RSJEC-FL-5` s.d. `QR-RSJEC-FL-11`
- Petugas harus memvalidasi QR lantai sebelum/sesudah memeriksa ruangan lantai terkait untuk membuktikan kehadiran fisik di lokasi.
- Tersedia opsi input kode darurat manual jika kamera mengalami kendala fisik (misal: stiker QR robek).

### C. Inspeksi Ruangan & Dokumentasi Temuan
- Setiap ruangan memeriksa:
  1. **Status AC**: Hidup / Mati / Tidak Tersedia (otomatis jika ruangan non-AC).
  2. **Status Lampu**: Hidup / Mati / Sebagian.
  3. **Kondisi Umum**: Normal / Ada Temuan Insiden.
  4. **Kategori Temuan**: Kerusakan Fasilitas, Bahaya Keamanan, Kebersihan, Kebocoran Air/Gas, Listrik, Lainnya.
  5. **Foto Bukti**: Kamera langsung dengan watermark nama RS & waktu lokal WITA (upload galeri dapat dibatasi via pengaturan).
  6. **Voice-to-Text**: Input suara otomatis bahasa Indonesia untuk mempermudah petugas mengetik catatan temuan secara cepat di lapangan.

### D. Serah Terima Shift (Shift Handover)
- Petugas yang menyelesaikan shift jaga dapat menyerahkan laporan operasional ke shift berikutnya.
- **Pilihan Target Penerima**:
  1. *Semua Petugas Shift*: Disiarkan ke seluruh anggota regu shift tujuan.
  2. *Tunjuk Petugas Tertentu*: Ditujukan khusus ke Danru atau petugas yang dipilih.
- Seluruh temuan insiden berstatus *open* otomatis dilampirkan ke dalam catatan serah terima.

### E. Monitoring Real-Time Supervisor
- Menampilkan persentase penyelesaian ruangan, daftar lantai yang telah tuntas, dan temuan aktif.
- **Multi-Officer Selector**: Jika beberapa petugas sedang patroli bersamaan, supervisor dapat berpindah memantau progress masing-masing petugas secara real-time melalui tombol tab/pill pemilih petugas.

### F. Pelaporan & Ekspor Data
- **Matriks Ronda Harian**: Menampilkan status seluruh 133 ruangan per ronda dalam bentuk tabel centang visual.
- **Ekspor Excel Multi-Sheet**:
  - Sheet 1: Ringkasan & Tingkat Kepatuhan (Compliance Rate).
  - Sheet 2: Matriks Detail Ruangan per Ronda.
  - Sheet 3: Rekap Seluruh Temuan Insiden & Status Penanganan.
  - Sheet 4: Log Aktivitas Petugas.
- **Buku Jaga Digital (Buku Patroli)**: Format baku yang siap dicetak untuk kebutuhan arsip fisik manajemen rumah sakit.

### G. Pengaturan Dinamis & Error Logging Otomatis
- **Pengaturan Terintegrasi (`/admin/settings`)**:
  - Nama rumah sakit watermark, toggle tanggal watermark, kualitas kompresi foto, blokir galeri, dan kewajiban melampirkan foto dapat diatur dinamis oleh admin dan langsung diterapkan ke modul security tanpa deploy ulang.
- **Error Log Queue (`/admin/error-logs`)**:
  - Setiap error JavaScript atau crash UI di perangkat security ditampung di antrian lokal jika perangkat offline, lalu otomatis dikirim ke database log saat kembali online. Admin dapat memantau jejak error perangkat secara terpusat.

---

## 4. Struktur Peran & Hak Akses (Role Matrix)

| Modul / Halaman | Security | Supervisor / Danru | Admin / IT |
| :--- | :---: | :---: | :---: |
| **Mobile Patroli & Scan QR** (`/security/patrol`) | Ya | Monitoring | Akses Penuh |
| **Laporan Temuan Security** (`/security/findings`) | Buat & Lihat | Verifikasi | Akses Penuh |
| **Papan Peringkat** (`/security/leaderboard`) | Lihat | Lihat | Kelola |
| **Monitoring Real-Time** (`/supervisor/monitoring`) | - | Ya | Ya |
| **Galeri Temuan & Foto** (`/supervisor/gallery`) | - | Ya | Ya |
| **Analisis & Kepatuhan** (`/supervisor/compliance`) | - | Ya | Ya |
| **Ekspor Laporan Excel / Cetak** (`/supervisor/reports`) | - | Ya | Ya |
| **Master Ruangan & Lantai** (`/admin/rooms`, `/floors`) | - | - | Kelola |
| **Master Checklist** (`/admin/checklists`) | - | - | Kelola (Tambah/Edit/Hapus) |
| **Master Jadwal & Shift** (`/admin/schedules`, `/shifts`) | - | - | Kelola |
| **Kelola Pengguna** (`/admin/users`) | - | - | Kelola (Akun & Password) |
| **Pengaturan Sistem** (`/admin/settings`) | - | - | Kelola |
| **Log Error Sistem** (`/admin/error-logs`) | - | - | Pantau & Uji Kirim |
| **Audit Logs** (`/admin/audit-logs`) | - | - | Pantau Aktivitas |

---

## 5. Struktur Direktori Utama

```
security/
├── prisma/
│   ├── schema.prisma          # Skema database relasional (Users, Sessions, Floors, Rooms, Checks, Findings)
│   └── seed.ts                # Master data awal (Gedung, 12 Lantai, 133 Ruangan, Jadwal Ronda, Shift)
├── public/
│   ├── logo-jec.png           # Logo resmi RS Mata JEC ORBITA
│   ├── sw.js                  # Service Worker v14 (PWA & Offline Cache)
│   └── uploads/patrol/        # Penyimpanan foto hasil patroli
├── src/
│   ├── app/
│   │   ├── admin/             # Panel Administrasi Master Data & Sistem
│   │   ├── api/               # API Routes (Auth, Patrol, Sessions, Sync, Reports, Settings)
│   │   ├── security/          # Antarmuka Mobile PWA untuk Petugas Keamanan
│   │   │   ├── dashboard/     # Beranda security & status ronda
│   │   │   ├── patrol/        # Alur inspeksi, floor list, scan QR, & room check
│   │   │   ├── findings/      # Input & riwayat temuan insiden
│   │   │   └── leaderboard/   # Papan klasemen disiplin petugas
│   │   └── supervisor/        # Portal Pemantauan & Analitik Danru
│   ├── components/            # Komponen UI (CameraCapture, Navbar, OfflineBanner, dll)
│   └── lib/
│       ├── auth.ts            # Manajemen autentikasi JWT / Cookies
│       ├── db.ts              # Driver penyimpanan IndexedDB client-side
│       ├── dummy-data.ts      # Master katalog statis 133 ruangan RS Mata JEC ORBITA
│       ├── error-reporter.ts  # Mesin pencatat error otomatis & offline queue
│       ├── offline-cache.ts   # Mesin sinkronisasi & download paket patroli
│       ├── prisma.ts          # Singleton koneksi Prisma Client
│       ├── qr-constants.ts    # Peta token resmi QR lantai
│       ├── settings-client.ts # Cache client-side pengaturan sistem
│       └── shifts.ts          # Logika resolusi shift & ronda real-time
└── CATATAN_PROYEK.md          # Dokumen panduan ini
```

---

## 6. Panduan Instalasi & Menjalankan Aplikasi

### Persyaratan Lingkungan
- **Node.js**: Versi 20.x atau lebih baru.
- **Database Server**: MySQL 8.x / MariaDB 10.x (kompatibel dengan Laragon).
- **Package Manager**: `npm`.

### Langkah Instalasi
1. Masuk ke direktori proyek:
   ```bash
   cd c:\laragon\www\security
   ```

2. Konfigurasi berkas `.env`:
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/db_security_patrol"
   JWT_SECRET="kunci_rahasia_jwt_anda"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. Pasang dependensi:
   ```bash
   npm install
   ```

4. Sinkronkan skema database & masukkan data awal:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

6. Atau kompilasi untuk mode produksi:
   ```bash
   npm run build
   npm run start
   ```

---

## 7. Panduan Pemeliharaan & Troubleshooting

1. **Pembaruan Aset Offline (Service Worker Cache)**:
   - Jika mengubah CSS global, logo, atau routing scan QR, pastikan untuk menaikkan versi `CACHE_NAME` pada `public/sw.js` (misal dari `sec-patrol-v14` ke `sec-patrol-v15`) agar browser security langsung membuang cache lama.
2. **Sesi Terhenti Lewat Hari (Auto-Close Stale Sessions)**:
   - Sistem memiliki mekanisme auto-close otomatis: jika sesi patroli berstatus `in_progress` terhenti lebih dari 4 jam atau berasal dari tanggal sebelumnya, sesi akan otomatis ditutup dengan status `incomplete` saat ada request patroli baru agar tidak merusak laporan harian.
3. **Penyelarasan Foto Upload**:
   - Foto hasil upload tersimpan di dua direktori cadangan: `public/uploads/patrol/` dan `uploads/patrol/`. Pastikan folder ini memiliki izin tulis (*write permission*) pada server produksi.
4. **Inspeksi Log Error**:
   - Jika ada laporan kendala dari petugas di lapangan, buka menu **Sistem > Log Error Sistem** (`/admin/error-logs`) untuk melihat pesan error, stack trace, tipe browser, dan URL saat kendala terjadi.
5. **Pemisahan Sesi Incomplete & Ronda Baru**:
   - Jika petugas mengakhiri ronda lebih awal (status `incomplete`), lalu memulai patroli pada jadwal ronda berikutnya (misal 3 jam setelahnya), dashboard secara cerdas mendeteksi pergantian jadwal ronda dan menyajikan tombol **Mulai Patroli Baru** yang menutup sesi sebelumnya via API `override-next` serta membersihkan residu checklist IndexedDB, sehingga ronda baru dimulai fresh 0%. Dokumentasi terperinci tersedia pada berkas `CATATAN_UPDATE_RONDA_PATROLI.md`.
