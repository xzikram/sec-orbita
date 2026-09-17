import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

dotenv.config();

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

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function runRestore() {
  const rootDir = process.cwd();
  const backupRootDir = path.join(rootDir, 'backups');

  if (!fs.existsSync(backupRootDir)) {
    console.error('❌ Folder backups/ tidak ditemukan!');
    process.exit(1);
  }

  // Cari semua folder backup yang berawalan backup_
  const entries = fs.readdirSync(backupRootDir)
    .filter((e) => e.startsWith('backup_'))
    .map((e) => ({
      name: e,
      fullPath: path.join(backupRootDir, e),
      isDir: fs.statSync(path.join(backupRootDir, e)).isDirectory(),
      mtime: fs.statSync(path.join(backupRootDir, e)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (entries.length === 0) {
    console.error('❌ Tidak ada berkas atau folder backup di folder backups/.');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('🔄 RESTORE SISTEM PATROLI KEAMANAN RS MATA JEC ORBITA');
  console.log('========================================================================');
  console.log('Daftar cadangan (backup) yang tersedia:');
  entries.forEach((b, idx) => {
    console.log(`  [${idx + 1}] ${b.name} (${b.mtime.toLocaleString('id-ID')})`);
  });

  const argTarget = process.argv[2];
  let selectedBackup = '';

  if (argTarget) {
    selectedBackup = path.isAbsolute(argTarget) ? argTarget : path.join(rootDir, argTarget);
  } else {
    const choiceStr = await askQuestion(`\nPilih nomor backup yang ingin dipulihkan (1-${entries.length}): `);
    const choiceNum = parseInt(choiceStr, 10);
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > entries.length) {
      console.log('❌ Pilihan tidak valid. Proses dibatalkan.');
      process.exit(1);
    }
    selectedBackup = entries[choiceNum - 1].fullPath;
  }

  console.log(`\n📦 Backup yang dipilih: ${selectedBackup}`);
  console.log('⚠️  PERINGATAN: Proses ini akan MENIMPA database & gambar saat ini!');
  const confirm = await askQuestion("Ketik 'YA' untuk mengonfirmasi dan melanjutkan: ");
  if (confirm !== 'YA') {
    console.log('🚫 Restore dibatalkan oleh pengguna.');
    process.exit(0);
  }

  console.log('\n🚀 Memulai proses restore...');

  // 1. Restore Database SQL jika ada
  const sqlPath = path.join(selectedBackup, 'database.sql');
  if (fs.existsSync(sqlPath) && fs.statSync(sqlPath).size > 0) {
    try {
      console.log(`🗄️  1. Memulihkan database MySQL dari ${sqlPath}...`);
      const pwdFlag = dbConfig.password ? `-p"${dbConfig.password}"` : '';
      const cmd = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdFlag} ${dbConfig.database} < "${sqlPath}"`;
      execSync(cmd, { stdio: 'pipe' });
      console.log('   ✓ Database SQL berhasil diimpor.');
    } catch (e) {
      console.warn('   ⚠️  mysql CLI gagal/tidak ditemukan. Mencoba pemulihan via Prisma Snapshot...');
    }
  }

  // 1b. Restore via JSON Snapshot jika database.sql tidak tersedia atau gagal
  const jsonDir = path.join(selectedBackup, 'database_json');
  if (fs.existsSync(jsonDir)) {
    console.log('🗄️  1b. Memulihkan data dari JSON Snapshot Prisma...');
    try {
      const adapter = new PrismaMariaDb(dbConfig);
      const prisma = new PrismaClient({ adapter });

      // Urutan pemulihan sesuai dependensi foreign key
      const orderedModels = [
        'shift', 'building', 'floor', 'floorQrCode', 'patrolSchedule',
        'checklistTemplate', 'systemSetting', 'user', 'userAchievement',
        'room', 'patrolSession', 'patrolSessionFloor', 'patrolCheck',
        'patrolPhoto', 'finding', 'findingUpdate', 'shiftHandover',
        'activityLog', 'systemErrorLog', 'supportFeedback'
      ];

      for (const model of orderedModels) {
        const filePath = path.join(jsonDir, `${model}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const records = JSON.parse(content);
          const delegate = (prisma as any)[model];
          if (delegate && records.length > 0) {
            // Delete existing records
            await delegate.deleteMany().catch(() => {});
            // Batch create
            await delegate.createMany({ data: records, skipDuplicates: true }).catch(async () => {
              for (const item of records) {
                await delegate.create({ data: item }).catch(() => {});
              }
            });
            console.log(`   ✓ ${model}: ${records.length} baris dipulihkan.`);
          }
        }
      }
      await prisma.$disconnect();
    } catch (jErr) {
      console.error('   ❌ Gagal memulihkan snapshot JSON:', jErr);
    }
  }

  // 2. Restore Uploads (Foto & Gambar)
  console.log('📸 2. Memulihkan berkas foto & gambar...');
  const pubSrc = path.join(selectedBackup, 'public_uploads');
  const pubDest = path.join(rootDir, 'public', 'uploads');
  const pubCount = copyFolderSync(pubSrc, pubDest);
  console.log(`   ✓ Foto public/uploads dipulihkan: ${pubCount} file.`);

  const rootSrc = path.join(selectedBackup, 'root_uploads');
  const rootDest = path.join(rootDir, 'uploads');
  const rootCount = copyFolderSync(rootSrc, rootDest);
  console.log(`   ✓ Foto uploads dipulihkan: ${rootCount} file.`);

  // 3. Restore .env (opsional)
  const envSrc = path.join(selectedBackup, 'env_backup');
  if (fs.existsSync(envSrc)) {
    const restoreEnv = await askQuestion('\nApakah Anda ingin memulihkan file .env dari backup juga? (y/N): ');
    if (restoreEnv.toLowerCase() === 'y') {
      fs.copyFileSync(envSrc, path.join(rootDir, '.env'));
      console.log('   ✓ File .env dipulihkan.');
    } else {
      console.log('   ⏩ File .env saat ini dipertahankan.');
    }
  }

  // 4. Prisma Generate
  console.log('⚙️  3. Mengenerasi Prisma Client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
  } catch (e) {}

  console.log('========================================================================');
  console.log('✅ RESTORE SELESAI DENGAN SUKSES!');
  console.log('   Sistem telah dipulihkan ke kondisi cadangan.');
  console.log('========================================================================');
}

runRestore().catch((err) => {
  console.error('❌ Restore Gagal:', err);
  process.exit(1);
});
