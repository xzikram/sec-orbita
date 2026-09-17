#!/bin/bash
# ==============================================================================
# SCRIPT BACKUP HARIAN OTOMATIS (JAM 00:00 WITA)
# RS MATA JEC ORBITA MAKASSAR - SISTEM PATROLI KEAMANAN
# Domain: https://security-orbita.jec.co.id
# ==============================================================================
# Script ini mencadangkan:
# 1. Seluruh Database MySQL (tabel, data patroli, checklist, temuan, user, shift)
# 2. Seluruh Berkas Gambar / Foto Patroli (public/uploads & uploads)
# 3. Seluruh Pengaturan Sistem (.env, konfigurasi sistem, metadata)
# ==============================================================================

set -e

# Menentukan path direktori proyek
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_NAME="backup_$TIMESTAMP"
TEMP_DIR="$BACKUP_ROOT/temp_$TIMESTAMP"
BACKUP_ARCHIVE="$BACKUP_ROOT/$BACKUP_NAME.tar.gz"

echo "========================================================================"
echo "🕒 [$(date '+%Y-%m-%d %H:%M:%S')] Memulai Backup Harian Otomatis"
echo "📂 Project Root : $PROJECT_ROOT"
echo "📦 Backup File  : $BACKUP_ARCHIVE"
echo "========================================================================"

# 1. Pastikan folder backup tersedia
mkdir -p "$BACKUP_ROOT"
mkdir -p "$TEMP_DIR/$BACKUP_NAME"

# 2. Parsing file .env untuk mendapatkan koneksi database
ENV_FILE="$PROJECT_ROOT/.env"
DB_USER="root"
DB_PASS=""
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="security_patrol"

if [ -f "$ENV_FILE" ]; then
    # Ambil DATABASE_URL dari .env
    DB_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$DB_URL" ]; then
        # Format: mysql://user:password@host:port/database
        # Mengurai regex sederhana
        PROTO="${DB_URL%%://*}"
        URL_NO_PROTO="${DB_URL#*://}"
        USER_PASS="${URL_NO_PROTO%%@*}"
        HOST_DB="${URL_NO_PROTO#*@}"
        
        DB_USER="${USER_PASS%%:*}"
        if [[ "$USER_PASS" == *":"* ]]; then
            DB_PASS="${USER_PASS#*:}"
        else
            DB_PASS=""
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

# Jika DB_HOST localhost, ubah ke 127.0.0.1 untuk kompatibilitas socket
if [ "$DB_HOST" == "localhost" ]; then
    DB_HOST="127.0.0.1"
fi

echo "🗄️  1. Mencadangkan Database MySQL [$DB_NAME]..."
PASS_PARAM=""
if [ -n "$DB_PASS" ]; then
    PASS_PARAM="-p$DB_PASS"
fi

# Eksekusi mysqldump
if command -v mysqldump >/dev/null 2>&1; then
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $PASS_PARAM \
        --no-tablespaces \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "$DB_NAME" > "$TEMP_DIR/$BACKUP_NAME/database.sql"
    echo "   ✓ Database berhasil diekspor ($(du -h "$TEMP_DIR/$BACKUP_NAME/database.sql" | cut -f1))"
else
    echo "   ⚠️  Peringatan: command 'mysqldump' tidak ditemukan di PATH. Melewati dump direct mysqldump."
    touch "$TEMP_DIR/$BACKUP_NAME/database.sql"
fi

# 3. Mencadangkan Seluruh Foto & Gambar Uploads (Deduplikasi)
echo "📸 2. Mencadangkan Berkas Foto & Gambar Patroli..."
mkdir -p "$TEMP_DIR/$BACKUP_NAME/uploads"

# Cukup ambil dari public/uploads (tanpa menduplikasi dengan root uploads agar ukuran hemat 50%)
if [ -d "$PROJECT_ROOT/public/uploads" ]; then
    cp -r "$PROJECT_ROOT/public/uploads"/* "$TEMP_DIR/$BACKUP_NAME/uploads/" 2>/dev/null || true
    PHOTO_SIZE=$(du -sh "$TEMP_DIR/$BACKUP_NAME/uploads" 2>/dev/null | cut -f1 || echo "0")
    echo "   ✓ Foto patroli berhasil disalin ($PHOTO_SIZE)."
elif [ -d "$PROJECT_ROOT/uploads" ]; then
    cp -r "$PROJECT_ROOT/uploads"/* "$TEMP_DIR/$BACKUP_NAME/uploads/" 2>/dev/null || true
    PHOTO_SIZE=$(du -sh "$TEMP_DIR/$BACKUP_NAME/uploads" 2>/dev/null | cut -f1 || echo "0")
    echo "   ✓ Foto patroli berhasil disalin ($PHOTO_SIZE)."
fi

# 4. Mencadangkan Pengaturan & Konfigurasi Sistem
echo "⚙️  3. Mencadangkan Konfigurasi & Pengaturan Sistem..."
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$TEMP_DIR/$BACKUP_NAME/env_backup"
    echo "   ✓ Berkas .env tersimpan."
fi

# Buat metadata backup
cat <<EOF > "$TEMP_DIR/$BACKUP_NAME/metadata.json"
{
  "system": "RS Mata JEC ORBITA Security Patrol",
  "domain": "https://security-orbita.jec.co.id",
  "timestamp": "$TIMESTAMP",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database_name": "$DB_NAME",
  "database_host": "$DB_HOST",
  "git_commit": "$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF
echo "   ✓ Metadata backup tersimpan."

# 5. Kompresi Seluruh Isi Backup Menjadi Satu File Tar.gz
PHOTO_COUNT=$(find "$TEMP_DIR/$BACKUP_NAME/uploads" -type f 2>/dev/null | wc -l || echo "0")
echo "🗜️  4. Mengompresi seluruh isi backup ke format .tar.gz (memuat $PHOTO_COUNT foto)..."
tar -czf "$BACKUP_ARCHIVE" -C "$TEMP_DIR" "$BACKUP_NAME"

# Simpan sidecar metadata agar pembacaan di web admin instan & akurat
cat <<EOF > "$BACKUP_ARCHIVE.json"
{
  "system": "RS Mata JEC ORBITA Security Patrol",
  "timestamp": "$TIMESTAMP",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "uploadedPhotosCount": $PHOTO_COUNT,
  "databaseName": "$DB_NAME"
}
EOF

# Bersihkan direktori sementara
rm -rf "$TEMP_DIR"

ARCHIVE_SIZE=$(du -h "$BACKUP_ARCHIVE" | cut -f1)
echo "   ✓ Arsip backup selesai dibuat: $BACKUP_ARCHIVE ($ARCHIVE_SIZE, $PHOTO_COUNT foto)"

# 6. Rotasi Backup: Hanya simpan maksimal 7 cadangan terbaru (hemat disk)
echo "🧹 5. Melakukan rotasi berkas cadangan (maksimal 7 cadangan terbaru)..."
DELETED_COUNT=0

# Urutkan arsip backup .tar.gz dari yang terbaru ke terlama.
# Lewati 7 baris pertama (cadangan terbaru), dan hapus baris ke-8 ke atas (arsip lama)
while IFS= read -r old_archive; do
    if [ -n "$old_archive" ] && [ -f "$old_archive" ]; then
        echo "   - Menghapus arsip kedaluwarsa: $(basename "$old_archive")"
        rm -f "$old_archive"
        rm -f "${old_archive}.json"
        FOLDER_NAME="${old_archive%.tar.gz}"
        if [ -d "$FOLDER_NAME" ]; then
            rm -rf "$FOLDER_NAME"
        fi
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done < <(ls -t "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | tail -n +8)

# Bersihkan juga sisa folder uncompressed yang file .tar.gz-nya sudah ada
while IFS= read -r old_dir; do
    if [ -n "$old_dir" ] && [ -f "${old_dir}.tar.gz" ]; then
        rm -rf "$old_dir"
    fi
done < <(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" 2>/dev/null)

echo "   ✓ Rotasi lokal selesai (maksimal 7 cadangan terbaru dipertahankan, $DELETED_COUNT lama dihapus)."

# 7. Sinkronisasi Otomatis ke Google Drive via Rclone (Jika Terkonfigurasi)
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_FOLDER="${RCLONE_FOLDER:-Backup_Patroli_JEC}"

# Tampilkan progress bar interaktif jika dijalankan manual di terminal
RCLONE_OPT=""
if [ -t 1 ]; then
    RCLONE_OPT="--progress"
fi

if command -v rclone >/dev/null 2>&1; then
    if rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        echo "☁️  6. Mengunggah salinan cadangan ke Google Drive [${RCLONE_REMOTE}:${RCLONE_FOLDER}]..."
        rclone copy "$BACKUP_ARCHIVE" "${RCLONE_REMOTE}:${RCLONE_FOLDER}/" $RCLONE_OPT
        echo "   ✓ Berkas berhasil disinkronkan ke Google Drive!"
        
        # Bersihkan cadangan di Google Drive yang lebih lama dari 7 hari (maksimal 7 backup)
        rclone delete --min-age 7d "${RCLONE_REMOTE}:${RCLONE_FOLDER}/" 2>/dev/null || true
        echo "   ✓ Rotasi Google Drive selesai (retensi 7 hari)."
    else
        echo "   ℹ️  Remote rclone '${RCLONE_REMOTE}' belum dikonfigurasi. Melewati upload Google Drive."
    fi
else
    echo "   ℹ️  Utilitas 'rclone' belum terpasang di server. Melewati upload Google Drive."
fi

echo "========================================================================"
echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] Backup Harian Selesai dengan Sukses!"
echo "📦 Berkas Lokal : $BACKUP_ARCHIVE"
echo "========================================================================"

