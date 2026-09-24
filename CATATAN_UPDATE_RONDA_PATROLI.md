# Catatan Pembaruan: Penanganan Sesi Patroli Selesai Sebagian (Incomplete) & Pemisahan Putaran Ronda Baru

**Tanggal:** 24 September 2026  
**Sistem:** Sistem Patroli Keamanan RS Mata JEC ORBITA Makassar  
**Status:** Selesai Diimplementasikan & Lolos Uji TypeScript  

---

## 1. Latar Belakang & Masalah (Problem Statement)
Ditemukan kendala operasional pada alur patroli security:
> **Kasus:** Seorang security berpatroli pagi hari, namun karena situasi di lapangan (misal ada panggilan darurat / insiden IGD), patroli tidak selesai 100% (hanya mencapai 40%) lalu petugas mengakhirinya melalui tombol *"Selesaikan Sebagian"*.  
> Ketika 3 jam setelahnya petugas yang sama ingin berpatroli lagi pada jadwal ronda berikutnya, aplikasi justru mengarahkan petugas untuk **melanjutkan sesi sebelumnya** (dengan progress ruangan 40% tetap tercentang), bukan membuka patroli baru dengan progress bersih 0%.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

Setelah penelusuran arsitektur kode frontend dan backend, ditemukan 3 faktor utama:

1. **Dashboard UI Mengunci Pilihan ke "Lanjutkan Patroli Sebagian" (Tanpa Deteksi Jadwal Ronda):**
   - Di `src/app/security/dashboard/page.tsx`, dashboard memfilter sesi hari ini dengan status `incomplete`.
   - Karena query database diurutkan ascending berdasarkan nomor ronda (`patrolNumber: 'asc'`), sesi pagi (misal Ronda #1) selalu tertangkap.
   - Dashboard langsung menampilkan banner kuning dan mengganti tombol utama menjadi *"Lanjutkan Patroli Sebagian (Ronda #1)"*.
   - Tidak ada pengecekan apakah jam jadwal Ronda #1 telah berakhir atau sudah masuk jam Ronda #2, sehingga security tidak diberi opsi untuk membuka ronda baru.

2. **Residu Pemeriksaan Lokal (IndexedDB) Tidak Terisolasi per Sesi:**
   - Saat patroli diakhiri lebih awal, checklist ruangan yang tersimpan di IndexedDB (`offline_checks`) tidak dibersihkan.
   - Fungsi pemeriksaan ruangan `isRoomChecked()` sebelumnya hanya memvalidasi kecocokan kode ruangan (`roomCode`), tanpa memeriksa apakah checklist tersebut milik `sessionId` aktif saat ini.
   - Akibatnya, sekalipun sesi baru dibuka di server, ruangan 40% dari tadi pagi otomatis langsung tercentang di UI karena kecocokan kode ruangan di IndexedDB.

3. **Backend `override-next` Belum Terintegrasi ke Dashboard:**
   - Backend sebenarnya sudah memiliki endpoint `POST /api/patrol/sessions/override-next` untuk menutup sesi lama dan membuka ronda baru, namun endpoint ini belum dihubungkan ke UI Dashboard.
   - Endpoint `override-next` sebelumnya juga mewajibkan parameter `scheduleId` secara mutlak dan belum mendukung auto-resolve jadwal berdasarkan jam real-time.

---

## 3. Solusi & Perubahan yang Diterapkan (Implemented Solution)

### A. Dashboard Cerdas Berbasis Jadwal Waktu (`dashboard/page.tsx`)
- Menambahkan perbandingan waktu antara sesi `incompleteSession` dengan jadwal aktif saat ini (`currentSched = getCurrentSchedule()`):
  - **Jika Waktu Ronda Telah Berganti (misal selang 3 jam, masuk Ronda #2):**
    - Kartu Dashboard berubah menjadi info aktif:  
      **`Waktu Ronda #2 Telah Tiba (10:00 - 13:00)`**  
      *Ronda #1 sebelumnya diselesaikan sebagian. Tekan Mulai Patroli Baru di bawah untuk membuka putaran baru dari awal.*
    - **Tombol Utama (Primary):** **`🛡️ Mulai Patroli Baru (Ronda #2)`**  
      Menutup sesi Ronda 1 secara rapi dengan audit log, membersihkan data checklist lokal, dan membuka Ronda 2 fresh 0%.
    - **Tombol Sekunder (Opsional):** **`↩️ Lanjutkan Sisa Ronda #1 (Sebelumnya)`**  
      Tetap disediakan jika petugas diperintahkan pengawas untuk menyelesaikan sisa 60% rute ronda sebelumnya.
  - **Jika Masih Dalam Rentang Jam yang Sama (misal jeda 20 menit):**
    - Tombol utama: *"Lanjutkan Patroli Sebagian (Ronda #X)"*.
    - Tombol sekunder: *"Mulai Ulang Ronda #X dari Awal"*.

### B. Isolasi & Pembersihan Data Offline (`db.ts`, `data-client.ts`, `dummy-data.ts`)
- Menambahkan properti `sessionId` pada antarmuka `OfflineCheck` dan payload `RoomCheckPayload`.
- Memperbarui fungsi `isRoomChecked(room, sessionFloorChecks, offlineChecks, currentSessionId)`:
  - Checklist di IndexedDB hanya dianggap valid jika `c.sessionId === currentSessionId` (menolak checklist milik sesi lama).
- Pada alur `handleEarlyFinish` di `patrol/page.tsx` dan saat membuka ronda baru di `dashboard/page.tsx`, sistem mengeksekusi `clearTemporaryOfflineMedia()` agar checklist sementara sesi lama tidak bocor ke sesi baru.

### C. Penyempurnaan API `override-next` (`override-next/route.ts`)
- Parameter `scheduleId` kini bersifat opsional; jika tidak dikirim, backend otomatis mendeteksi jadwal aktif berdasarkan jam WITA saat ini.
- Mendukung penutupan sesi berstatus `in_progress` maupun `incomplete` dengan timestamp penyelesaian dan audit log terperinci.
- Mengembalikan objek sesi baru yang lengkap dengan relasi lantai, ruangan, dan checklist kosong untuk ronda yang baru.

---

## 4. Daftar Berkas yang Diperbarui

| Berkas | Perubahan |
|---|---|
| `src/app/security/dashboard/page.tsx` | Logika deteksi ronda baru vs ronda lama, integrasi `override-next`, pemisahan tombol Mulai Baru vs Lanjutkan. |
| `src/app/api/patrol/sessions/override-next/route.ts` | Auto-resolve jadwal ronda real-time, penutupan sesi `incomplete` lama, dan include relasi lengkap. |
| `src/lib/dummy-data.ts` | Menambahkan filter isolasi `currentSessionId` pada fungsi `isRoomChecked()`. |
| `src/lib/db.ts` | Menambahkan field `sessionId` pada `OfflineCheck`. |
| `src/lib/data-client.ts` | Menambahkan field `sessionId` pada `RoomCheckPayload`. |
| `src/app/security/patrol/page.tsx` | Pembersihan media offline saat `handleEarlyFinish` dan pengiriman `currentSession.id` ke `isRoomChecked()`. |
| `src/app/security/patrol/room/[id]/page.tsx` | Pengiriman `sessionId` saat submit pemeriksaan dan isolasi centang ruangan. |
| `src/app/security/patrol/floor/[id]/page.tsx` | Pengiriman `currentSession.id` ke `isRoomChecked()`. |
| `src/app/security/patrol/floor/[id]/qr-scan/page.tsx` | Pengiriman `currentSession.id` ke `isRoomChecked()`. |

---

## 5. Verifikasi & Pengujian
- **Pemeriksaan Tipe (Type Check):** `npx tsc --noEmit` lolos 100% tanpa error (**Exit code: 0**).
- **Integritas Rute:** Tidak ada breaking changes pada alur sinkronisasi batch (`/api/patrol/sync-bundle`) maupun validasi QR fisik.
