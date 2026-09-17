import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

dotenv.config();

// Parse DATABASE_URL
let dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'security_patrol',
};

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    const match = dbUrl.match(/mysql:\/\/([^:@]+)(?::([^@]+))?@([^:/]+)(?::(\d+))?\/(.+)/);
    if (match) {
      dbConfig = {
        user: match[1],
        password: match[2] || '',
        host: match[3] === 'localhost' ? '127.0.0.1' : match[3],
        port: match[4] ? parseInt(match[4], 10) : 3306,
        database: match[5].split('?')[0],
      };
    }
  } catch (e) {
    console.error('Error parsing DATABASE_URL:', e);
  }
}

function copyFolderSync(from: string, to: string) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  const entries = fs.readdirSync(from, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      count += copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

async function runBackup() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const rootDir = process.cwd();
  const backupRootDir = path.join(rootDir, 'backups');
  const backupFolder = path.join(backupRootDir, `backup_${timestamp}`);

  console.log('========================================================================');
  console.log(`🕒 [${now.toISOString()}] Memulai Backup Harian Sistem Patroli`);
  console.log(`📁 Target Folder: ${backupFolder}`);
  console.log('========================================================================');

  fs.mkdirSync(backupFolder, { recursive: true });

  // 1. BACKUP DATABASE
  console.log(`🗄️  1. Mengekspor Database [${dbConfig.database}]...`);
  const sqlFile = path.join(backupFolder, 'database.sql');
  const jsonBackupDir = path.join(backupFolder, 'database_json');
  let dbSuccess = false;

  // Coba gunakan mysqldump jika tersedia di OS
  try {
    const pwdFlag = dbConfig.password ? `-p"${dbConfig.password}"` : '';
    const cmd = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdFlag} --single-transaction --quick --routines --triggers ${dbConfig.database} > "${sqlFile}"`;
    execSync(cmd, { stdio: 'pipe' });
    if (fs.existsSync(sqlFile) && fs.statSync(sqlFile).size > 0) {
      console.log(`   ✓ Database berhasil diekspor via mysqldump (${(fs.statSync(sqlFile).size / 1024).toFixed(1)} KB)`);
      dbSuccess = true;
    }
  } catch (err) {
    // mysqldump tidak ada di PATH, gunakan fallback Prisma/MariaDB Table Dump
    console.log('   ℹ️  mysqldump CLI tidak ditemukan. Menggunakan Prisma Data Engine fallback...');
  }

  // Backup Data via Prisma Adapter jika mysqldump tidak berjalan atau sebagai pelengkap
  try {
    fs.mkdirSync(jsonBackupDir, { recursive: true });
    const adapter = new PrismaMariaDb(dbConfig);
    const prisma = new PrismaClient({ adapter });

    const models = [
      'user', 'shift', 'shiftHandover', 'userAchievement',
      'building', 'floor', 'room', 'floorQrCode', 'patrolSchedule',
      'patrolSession', 'patrolSessionFloor', 'patrolCheck', 'patrolPhoto',
      'finding', 'findingUpdate', 'activityLog', 'checklistTemplate',
      'systemSetting', 'systemErrorLog', 'supportFeedback'
    ];

    let totalRecords = 0;
    for (const model of models) {
      try {
        const delegate = (prisma as any)[model];
        if (delegate && typeof delegate.findMany === 'function') {
          const rows = await delegate.findMany();
          fs.writeFileSync(path.join(jsonBackupDir, `${model}.json`), JSON.stringify(rows, null, 2), 'utf-8');
          totalRecords += rows.length;
        }
      } catch (mErr) {
        // Skip any non-existent model
      }
    }
    await prisma.$disconnect();
    console.log(`   ✓ Prisma snapshot tersimpan: ${totalRecords} baris data pada 19 model.`);
    dbSuccess = true;
  } catch (prismaErr) {
    console.warn('   ⚠️  Prisma data dump warning:', (prismaErr as any).message);
  }

  // 2. BACKUP UPLOADS / FOTO
  console.log('📸 2. Mencadangkan Seluruh Berkas Foto & Gambar...');
  const pubUploadsSrc = path.join(rootDir, 'public', 'uploads');
  const pubUploadsDest = path.join(backupFolder, 'public_uploads');
  const pubCount = copyFolderSync(pubUploadsSrc, pubUploadsDest);
  console.log(`   ✓ Salin public/uploads: ${pubCount} file.`);

  const rootUploadsSrc = path.join(rootDir, 'uploads');
  const rootUploadsDest = path.join(backupFolder, 'root_uploads');
  const rootCount = copyFolderSync(rootUploadsSrc, rootUploadsDest);
  console.log(`   ✓ Salin uploads: ${rootCount} file.`);

  // 3. BACKUP CONFIGURATION (.env)
  console.log('⚙️  3. Mencadangkan Pengaturan Konfigurasi (.env)...');
  const envSrc = path.join(rootDir, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, path.join(backupFolder, 'env_backup'));
    console.log('   ✓ File .env tersimpan.');
  }

  // 4. METADATA
  const metadata = {
    system: 'RS Mata JEC ORBITA Makassar - Security Patrol Monitoring System',
    domain: 'https://security-orbita.jec.co.id',
    timestamp,
    createdAt: new Date().toISOString(),
    databaseName: dbConfig.database,
    databaseHost: dbConfig.host,
    uploadedPhotosCount: pubCount + rootCount,
    nodeVersion: process.version,
  };
  fs.writeFileSync(path.join(backupFolder, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  console.log('   ✓ Metadata backup tersimpan.');

  // 5. ROTASI BACKUP: Hapus folder/arsip backup yang lebih lama dari 30 hari
  console.log('🧹 4. Rotasi Backup (> 30 Hari)...');
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const items = fs.readdirSync(backupRootDir);
    let deleted = 0;
    for (const item of items) {
      if (item.startsWith('backup_')) {
        const itemPath = path.join(backupRootDir, item);
        const stats = fs.statSync(itemPath);
        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.rmSync(itemPath, { recursive: true, force: true });
          deleted++;
          console.log(`   - Menghapus backup lama: ${item}`);
        }
      }
    }
    console.log(`   ✓ Rotasi selesai (${deleted} backup lama dibersihkan).`);
  } catch (rotErr) {
    console.warn('   ⚠️  Gagal membersihkan rotasi:', rotErr);
  }

  console.log('========================================================================');
  console.log(`✅ Backup Harian Selesai! Disimpan di: backups/backup_${timestamp}`);
  console.log('========================================================================');
}

runBackup().catch((err) => {
  console.error('❌ Backup Gagal:', err);
  process.exit(1);
});
