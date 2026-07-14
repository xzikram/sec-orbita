#!/bin/bash

# Menghentikan eksekusi script jika ada error
set -e

echo "🚀 Memulai deployment update untuk JEC ORBITA Security Patrol..."

# 1. Menarik kode terbaru dari GitHub
echo "📥 Menarik perubahan kode terbaru dari Git..."
git pull origin main

# 2. Menginstal dependensi NPM baru jika ada
echo "📦 Menginstal dependensi NPM..."
npm install

# 3. Membuat ulang Prisma Client
echo "⚙️ Mengenerasi Prisma Client..."
npx prisma generate

# 4. Sinkronisasi struktur tabel database
echo "🗄️ Sinkronisasi skema database..."
npx prisma db push

# 5. Seed data master terbaru ke database (aman jika dijalankan berulang)
echo "🌱 Melakukan database seeding..."
npx tsx prisma/seed.ts

# 6. Membangun ulang (build) kode Next.js untuk production
echo "🛠️ Membangun (build) proyek Next.js..."
npm run build

# 7. Restart proses aplikasi di PM2
echo "♻️ Memulai ulang (restart) proses di PM2..."
if pm2 list | grep -q "sec-orbita"; then
    echo "Menjalankan restart untuk proses PM2 'sec-orbita'..."
    pm2 restart sec-orbita
else
    echo "Membuat proses baru PM2 'sec-orbita'..."
    pm2 start npm --name "sec-orbita" -- run start
fi

# 8. Menyimpan daftar proses PM2 agar persisten
pm2 save

echo "✅ Deployment sukses! Aplikasi JEC ORBITA Security Patrol telah diperbarui dan berjalan."
