#!/bin/bash
# ==============================================================================
# SCRIPT RESTORE LENGKAP (DATABASE, GAMBAR & PENGATURAN)
# RS MATA JEC ORBITA MAKASSAR - SISTEM PATROLI KEAMANAN
# Domain: https://security-orbita.jec.co.id
# ==============================================================================
# Script ini mengembalikan (restore):
# 1. Database MySQL dari file database.sql dalam arsip
# 2. Seluruh Berkas Foto & Gambar Patroli ke public/uploads dan uploads
# 3. Konfigurasi Sistem (.env jika disetujui)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="$PROJECT_ROOT/backups"

echo "========================================================================"
echo "🔄 RESTORE SISTEM PATROLI KEAMANAN RS MATA JEC ORBITA"
echo "========================================================================"

TARGET_ARCHIVE="$1"

# Jika arsip tidak diberikan sebagai argumen, tampilkan daftar yang tersedia
if [ -z "$TARGET_ARCHIVE" ]; then
    echo "📋 Mencari arsip backup yang tersedia di: $BACKUP_ROOT"
    
    if [ ! -d "$BACKUP_ROOT" ]; then
        echo "❌ Direktori $BACKUP_ROOT tidak ditemukan!"
        exit 1
    fi
    
    # Ambil daftar file backup
    BACKUP_FILES=($(ls -t "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null || true))
    
    if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
        echo "❌ Tidak ada berkas backup (*.tar.gz) di folder $BACKUP_ROOT."
        exit 1
    fi
    
    echo "Pilih nomor berkas backup yang ingin di-restore:"
    for i in "${!BACKUP_FILES[@]}"; do
        FILE_BASENAME=$(basename "${BACKUP_FILES[$i]}")
        FILE_SIZE=$(du -h "${BACKUP_FILES[$i]}" | cut -f1)
        FILE_DATE=$(date -r "${BACKUP_FILES[$i]}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "N/A")
        echo "  [$((i+1))] $FILE_BASENAME ($FILE_SIZE) - $FILE_DATE"
    done
    
    echo ""
    read -p "Masukkan pilihan nomor (1-${#BACKUP_FILES[@]}): " CHOICE
    
    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#BACKUP_FILES[@]}" ]; then
        echo "❌ Pilihan tidak valid! Pembatalan proses."
        exit 1
    fi
    
    TARGET_ARCHIVE="${BACKUP_FILES[$((CHOICE-1))]}"
fi

if [ ! -f "$TARGET_ARCHIVE" ]; then
    echo "❌ Berkas $TARGET_ARCHIVE tidak ditemukan!"
    exit 1
fi

echo ""
echo "📦 Arsip yang dipilih: $TARGET_ARCHIVE"
echo "⚠️  PERINGATAN: Proses ini akan MENIMPA database dan foto patroli saat ini dengan isi arsip backup!"
read -p "Ketik 'YA' untuk melanjutkan proses restore: " CONFIRM

if [ "$CONFIRM" != "YA" ]; then
    echo "🚫 Pemulihan dibatalkan oleh pengguna."
    exit 0
fi

echo ""
echo "🚀 Memulai proses restore..."
TEMP_RESTORE="$BACKUP_ROOT/restore_temp_$(date +%s)"
mkdir -p "$TEMP_RESTORE"

# 1. Ekstrak arsip tar.gz
echo "📦 1. Mengekstrak arsip backup..."
tar -xzf "$TARGET_ARCHIVE" -C "$TEMP_RESTORE"

# Cari folder hasil ekstrak
EXTRACTED_DIR=$(find "$TEMP_RESTORE" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
    echo "❌ Gagal menemukan isi folder hasil ekstraksi!"
    rm -rf "$TEMP_RESTORE"
    exit 1
fi

echo "   ✓ Berhasil diekstrak ke: $EXTRACTED_DIR"

# Tampilkan metadata jika ada
if [ -f "$EXTRACTED_DIR/metadata.json" ]; then
    echo "ℹ️  Metadata Backup:"
    cat "$EXTRACTED_DIR/metadata.json"
    echo ""
fi

# 2. Parsing file .env untuk koneksi database
ENV_FILE="$PROJECT_ROOT/.env"
DB_USER="root"
DB_PASS=""
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="security_patrol"

if [ -f "$ENV_FILE" ]; then
    DB_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$DB_URL" ]; then
        PROTO="${DB_URL%%://*}"
        URL_NO_PROTO="${DB_URL#*://}"
        USER_PASS="${URL_NO_PROTO%%@*}"
        HOST_DB="${URL_NO_PROTO#*@}"
        
        DB_USER="${USER_PASS%%:*}"
        if [[ "$USER_PASS" == *":"* ]]; then
            DB_PASS="${USER_PASS#*:}"
        fi
        
        HOST_PORT="${HOST_DB%%/*}"
        DB_NAME_RAW="${HOST_DB#*/}"
        DB_NAME="${DB_NAME_RAW%%\?*}"
        
        DB_HOST="${HOST_PORT%%:*}"
        if [[ "$HOST_PORT" == *":"* ]]; then
            DB_PORT="${HOST_PORT#*:}"
        fi
    fi
fi

if [ "$DB_HOST" == "localhost" ]; then
    DB_HOST="127.0.0.1"
fi

PASS_PARAM=""
if [ -n "$DB_PASS" ]; then
    PASS_PARAM="-p$DB_PASS"
fi

# 3. Restore Database MySQL
SQL_FILE="$EXTRACTED_DIR/database.sql"
if [ -f "$SQL_FILE" ] && [ -s "$SQL_FILE" ]; then
    echo "🗄️  2. Mengembalikan (restore) database MySQL [$DB_NAME]..."
    if command -v mysql >/dev/null 2>&1; then
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $PASS_PARAM "$DB_NAME" < "$SQL_FILE"
        echo "   ✓ Database berhasil diimpor kembali ke MySQL."
    else
        echo "   ⚠️  Command 'mysql' tidak ditemukan. Silakan impor manual: mysql -u $DB_USER -p $DB_NAME < $SQL_FILE"
    fi
else
    echo "   ⚠️  File database.sql kosong atau tidak ditemukan dalam arsip."
fi

# 4. Restore Foto & Gambar
echo "📸 3. Mengembalikan berkas foto & gambar patroli..."
mkdir -p "$PROJECT_ROOT/public/uploads"
mkdir -p "$PROJECT_ROOT/uploads"

if [ -d "$EXTRACTED_DIR/uploads" ]; then
    cp -r "$EXTRACTED_DIR/uploads"/* "$PROJECT_ROOT/public/uploads/" 2>/dev/null || true
    cp -r "$EXTRACTED_DIR/uploads"/* "$PROJECT_ROOT/uploads/" 2>/dev/null || true
    echo "   ✓ Foto patroli berhasil dipulihkan."
elif [ -d "$EXTRACTED_DIR/public_uploads" ]; then
    cp -r "$EXTRACTED_DIR/public_uploads"/* "$PROJECT_ROOT/public/uploads/" 2>/dev/null || true
    echo "   ✓ Foto ke public/uploads berhasil dikembalikan."
fi

if [ -d "$EXTRACTED_DIR/root_uploads" ]; then
    cp -r "$EXTRACTED_DIR/root_uploads"/* "$PROJECT_ROOT/uploads/" 2>/dev/null || true
    echo "   ✓ Foto ke uploads (root) berhasil dikembalikan."
fi

# 5. Restore Konfigurasi .env (Opsional)
if [ -f "$EXTRACTED_DIR/env_backup" ]; then
    echo "⚙️  4. Arsip memuat backup berkas .env."
    read -p "Apakah Anda ingin memulihkan file .env juga? (y/N): " RESTORE_ENV
    if [[ "$RESTORE_ENV" == "y" || "$RESTORE_ENV" == "Y" ]]; then
        cp "$EXTRACTED_DIR/env_backup" "$PROJECT_ROOT/.env"
        echo "   ✓ Berkas .env dipulihkan."
    else
        echo "   ⏩ Berkas .env yang sedang aktif tetap dipertahankan."
    fi
fi

# 6. Regenerate Prisma Client
echo "⚙️  5. Mengenerasi Prisma Client..."
npx prisma generate || true

# 7. Restart PM2 Process jika ada
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q "sec-orbita"; then
        echo "♻️  6. Memulai ulang proses PM2 'sec-orbita'..."
        pm2 restart sec-orbita || true
    fi
fi

# Bersihkan direktori temporary
rm -rf "$TEMP_RESTORE"

echo "========================================================================"
echo "✅ RESTORE SELESAI DENGAN SUKSES!"
echo "   Sistem patroli telah dipulihkan dari arsip: $(basename "$TARGET_ARCHIVE")"
echo "========================================================================"
