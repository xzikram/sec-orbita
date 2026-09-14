# Sistem Patroli Keamanan RS Mata JEC ORBITA Makassar

Sistem manajemen dan inspeksi patroli satuan pengamanan (Security) rumah sakit berbasis **Next.js 16 (App Router)**, **Prisma ORM**, dan **Offline-First PWA (Service Worker v14 & IndexedDB)**.

---

## 🌟 Fitur Utama

- **On-Demand Free-Flow Multi-Officer Patrol**: Petugas bebas patroli kapan saja tanpa terkunci single session; nomor ronda (Ronda 1 - 8) dipetakan otomatis dari waktu Makassar (WITA).
- **Offline-First Architecture**: Mampu beroperasi 100% tanpa jaringan di area basement/parkir dengan sinkronisasi otomatis (*Sync Bundle*).
- **Validasi QR Code Fisik**: Verifikasi kehadiran fisik per lantai pada 12 lantai & 133 ruangan RS Mata JEC ORBITA.
- **Inspeksi Ruangan & Voice-to-Text**: Pencatatan AC, lampu, kondisi ruangan, input suara otomatis, dan foto dengan watermark nama RS serta timestamp WITA.
- **Serah Terima Shift (Handover)**: Catatan serah terima ke seluruh shift atau petugas tertentu, dengan auto-attach temuan *open*.
- **Monitoring Real-Time & Ekspor Excel**: Dashboard supervisor dengan selector multi-petugas dan ekspor workbook matriks ronda harian/mingguan/bulanan.
- **Error Logging Otomatis**: Antrian error lokal saat offline yang otomatis dikirim ke database admin saat online.

---

## 🚀 Memulai Cepat

1. **Pasang Dependensi**:
   ```bash
   npm install
   ```
2. **Setup Database**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
3. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```

Akses aplikasi di `http://localhost:3000`.

---

## 📖 Dokumentasi Lengkap

Untuk dokumentasi arsitektur teknis, alur data, role matrix, skema database, dan panduan troubleshooting lengkap, silakan baca berkas:
👉 **[CATATAN_PROYEK.md](CATATAN_PROYEK.md)**
