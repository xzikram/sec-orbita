import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import prisma from './prisma';

export interface BackupItem {
  name: string;
  createdAt: string;
  sizeFormatted: string;
  sizeBytes: number;
  photosCount: number;
  databaseName: string;
  timestamp: string;
}

function getFolderSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getFolderSize(fullPath);
    } else {
      try {
        total += fs.statSync(fullPath).size;
      } catch {}
    }
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function countFilesInDir(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFilesInDir(fullPath);
    } else {
      count++;
    }
  }
  return count;
}

export interface ServerStorageStats {
  diskTotalFormatted: string;
  diskFreeFormatted: string;
  diskUsedFormatted: string;
  diskUsedPercent: number;
  uploadsSizeBytes: number;
  uploadsSizeFormatted: string;
  uploadsCount: number;
  backupsSizeBytes: number;
  backupsSizeFormatted: string;
  backupsCount: number;
}

// Prevent Turbopack AST tracer from scanning whole project root and user files
const getAppRoot = (): string => process.env.APP_DIR || (process as any)['cwd']();

export function getServerStorageStats(): ServerStorageStats {
  const rootDir = getAppRoot();

  // 1. Disk usage via statfsSync
  let diskTotalFormatted = 'N/A';
  let diskFreeFormatted = 'N/A';
  let diskUsedFormatted = 'N/A';
  let diskUsedPercent = 0;

  try {
    const stat = fs.statfsSync(rootDir);
    const totalBytes = Number(stat.blocks) * Number(stat.bsize);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    if (totalBytes > 0) {
      diskUsedPercent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
      diskTotalFormatted = formatBytes(totalBytes);
      diskFreeFormatted = formatBytes(freeBytes);
      diskUsedFormatted = formatBytes(usedBytes);
    }
  } catch {}

  // 2. Uploads folder size & file count
  let uploadsSizeBytes = 0;
  let uploadsCount = 0;
  const pubUploads = path.join(/*turbopackIgnore: true*/ rootDir, 'public', 'uploads');
  const rootUploads = path.join(/*turbopackIgnore: true*/ rootDir, 'uploads');
  const uploadsDir = fs.existsSync(pubUploads) ? pubUploads : (fs.existsSync(rootUploads) ? rootUploads : null);

  if (uploadsDir) {
    try {
      uploadsSizeBytes = getFolderSize(uploadsDir);
      uploadsCount = countFilesInDir(uploadsDir);
    } catch {}
  }

  // 3. Backups folder size
  const backupRootDir = path.join(/*turbopackIgnore: true*/ rootDir, 'backups');
  let backupsSizeBytes = 0;
  let backupsCount = 0;
  if (fs.existsSync(backupRootDir)) {
    try {
      backupsSizeBytes = getFolderSize(backupRootDir);
      const items = listBackups();
      backupsCount = items.length;
    } catch {}
  }

  return {
    diskTotalFormatted,
    diskFreeFormatted,
    diskUsedFormatted,
    diskUsedPercent,
    uploadsSizeBytes,
    uploadsSizeFormatted: formatBytes(uploadsSizeBytes),
    uploadsCount,
    backupsSizeBytes,
    backupsSizeFormatted: formatBytes(backupsSizeBytes),
    backupsCount,
  };
}

function copyFolderSync(from: string, to: string): number {
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

export function listBackups(): BackupItem[] {
  const backupRootDir = path.join(/*turbopackIgnore: true*/ getAppRoot(), 'backups');
  if (!fs.existsSync(backupRootDir)) return [];

  const items: BackupItem[] = [];
  const entries = fs.readdirSync(backupRootDir);

  const tarArchives = new Set(
    entries.filter((e) => e.endsWith('.tar.gz')).map((e) => e.replace('.tar.gz', ''))
  );

  for (const entry of entries) {
    if (!entry.startsWith('backup_') || entry.endsWith('.json')) continue;
    const fullPath = path.join(backupRootDir, entry);

    // Jika ini adalah folder uncompressed padahal sudah ada berkas .tar.gz yang setara,
    // bersihkan foldernya dari disk untuk menghemat ratusan MB dan jangan tampilkan dobel di tabel!
    if (!entry.endsWith('.tar.gz') && tarArchives.has(entry)) {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } catch {}
      }
      continue;
    }

    try {
      const stats = fs.statSync(fullPath);
      let photosCount = 0;
      let databaseName = 'security_patrol';
      let timestamp = entry.replace('backup_', '').replace('.tar.gz', '');

      // 1. Cek jika ada file metadata.json di dalam folder
      const metaPath = path.join(fullPath, 'metadata.json');
      // 2. Cek jika ada file sidecar json (misal: backup_xxx.tar.gz.json)
      const sidecarPath = `${fullPath}.json`;

      if (fs.existsSync(sidecarPath)) {
        try {
          const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
          photosCount = sidecar.uploadedPhotosCount || 0;
          databaseName = sidecar.databaseName || databaseName;
          timestamp = sidecar.timestamp || timestamp;
        } catch {}
      } else if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          photosCount = meta.uploadedPhotosCount || 0;
          databaseName = meta.databaseName || databaseName;
          timestamp = meta.timestamp || timestamp;
        } catch {}
      } else if (entry.endsWith('.tar.gz')) {
        // Coba hitung foto dari arsip tar jika memungkinkan secara cepat
        try {
          const tarCheck = execSync(`tar -ztf "${fullPath}" 2>/dev/null | grep -E -c "\\.(jpg|jpeg|png|webp)"`, {
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 3000,
          });
          const parsed = parseInt(tarCheck.toString().trim(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            photosCount = parsed;
          }
        } catch {}
      }

      let sizeBytes = stats.size;
      if (stats.isDirectory()) {
        sizeBytes = getFolderSize(fullPath);
        if (photosCount === 0) {
          const upDir = path.join(fullPath, 'uploads');
          const pubUpDir = path.join(fullPath, 'public_uploads');
          if (fs.existsSync(upDir)) photosCount = fs.readdirSync(upDir).length;
          else if (fs.existsSync(pubUpDir)) photosCount = fs.readdirSync(pubUpDir).length;
        }
      }

      items.push({
        name: entry,
        createdAt: stats.mtime.toISOString(),
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        photosCount,
        databaseName,
        timestamp,
      });
    } catch {}
  }

  // Sort by newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function rotateBackups(maxKeep: number = 2): number {
  const backupRootDir = path.join(/*turbopackIgnore: true*/ getAppRoot(), 'backups');
  if (!fs.existsSync(backupRootDir)) return 0;

  // 1. Bersihkan semua folder uncompressed yang berkas .tar.gz-nya sudah ada
  try {
    const entries = fs.readdirSync(backupRootDir);
    const tarArchives = new Set(
      entries.filter((e) => e.endsWith('.tar.gz')).map((e) => e.replace('.tar.gz', ''))
    );
    for (const entry of entries) {
      if (entry.startsWith('backup_') && !entry.endsWith('.tar.gz') && !entry.endsWith('.json')) {
        if (tarArchives.has(entry)) {
          const dirToClean = path.join(backupRootDir, entry);
          if (fs.existsSync(dirToClean) && fs.statSync(dirToClean).isDirectory()) {
            try {
              fs.rmSync(dirToClean, { recursive: true, force: true });
            } catch {}
          }
        }
      }
    }
  } catch {}

  // 2. Ambil semua item backup (sudah terurut dari yang terbaru)
  const items = listBackups();
  if (items.length <= maxKeep) return 0;

  let deletedCount = 0;
  const toDelete = items.slice(maxKeep);
  for (const item of toDelete) {
    try {
      deleteBackup(item.name);
      deletedCount++;
    } catch {}
  }

  // 3. Rotasi di Google Drive jika rclone terkonfigurasi (retensi 2 hari / maksimal 2 cadangan)
  try {
    execSync('rclone delete --min-age 2d gdrive:Backup_Patroli_JEC/ 2>/dev/null || true', { stdio: 'ignore' });
  } catch {}

  return deletedCount;
}

export async function createFullBackup(reason: string = 'manual'): Promise<BackupItem> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const rootDir = getAppRoot();
  const backupRootDir = path.join(/*turbopackIgnore: true*/ rootDir, 'backups');
  const folderName = reason === 'pre_restore' ? `backup_pre_restore_${timestamp}` : `backup_${timestamp}`;
  const targetFolder = path.join(/*turbopackIgnore: true*/ backupRootDir, folderName);

  fs.mkdirSync(targetFolder, { recursive: true });

  // 1. DUMP DATABASE
  const jsonBackupDir = path.join(/*turbopackIgnore: true*/ targetFolder, 'database_json');
  fs.mkdirSync(jsonBackupDir, { recursive: true });

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
        fs.writeFileSync(path.join(/*turbopackIgnore: true*/ jsonBackupDir, `${model}.json`), JSON.stringify(rows, null, 2), 'utf-8');
        totalRecords += rows.length;
      }
    } catch {}
  }

  // 2. BACKUP FOTO
  const pubUploadsSrc = path.join(/*turbopackIgnore: true*/ rootDir, 'public', 'uploads');
  const pubUploadsDest = path.join(/*turbopackIgnore: true*/ targetFolder, 'public_uploads');
  const pubCount = copyFolderSync(pubUploadsSrc, pubUploadsDest);

  const rootUploadsSrc = path.join(/*turbopackIgnore: true*/ rootDir, 'uploads');
  const rootUploadsDest = path.join(/*turbopackIgnore: true*/ targetFolder, 'root_uploads');
  const rootCount = copyFolderSync(rootUploadsSrc, rootUploadsDest);

  // 3. BACKUP .ENV
  const envSrc = path.join(/*turbopackIgnore: true*/ rootDir, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, path.join(/*turbopackIgnore: true*/ targetFolder, 'env_backup'));
  }

  // 4. METADATA
  const metadata = {
    system: 'RS Mata JEC ORBITA Makassar - Security Patrol Monitoring System',
    domain: 'https://security-orbita.jec.co.id',
    timestamp,
    reason,
    createdAt: now.toISOString(),
    databaseName: 'security_patrol',
    uploadedPhotosCount: pubCount + rootCount,
    totalRecords,
  };
  fs.writeFileSync(path.join(targetFolder, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');

  let finalName = folderName;
  let finalSizeBytes = getFolderSize(targetFolder);

  // Also compress to tar.gz if tar is available on the system
  try {
    const tarFile = path.join(backupRootDir, `${folderName}.tar.gz`);
    execSync(`tar -czf "${tarFile}" -C "${backupRootDir}" "${folderName}"`, { stdio: 'ignore' });

    if (fs.existsSync(tarFile)) {
      finalName = `${folderName}.tar.gz`;
      finalSizeBytes = fs.statSync(tarFile).size;

      // Simpan sidecar metadata JSON untuk pembacaan instan di tabel
      const sidecarData = {
        system: 'RS Mata JEC ORBITA Makassar - Security Patrol Monitoring System',
        domain: 'https://security-orbita.jec.co.id',
        timestamp,
        reason,
        createdAt: now.toISOString(),
        databaseName: 'security_patrol',
        uploadedPhotosCount: pubCount + rootCount,
        totalRecords,
      };
      fs.writeFileSync(`${tarFile}.json`, JSON.stringify(sidecarData, null, 2), 'utf-8');

      // Hapus folder uncompressed agar kapasitas disk hemat dan tidak muncul ganda
      try {
        fs.rmSync(targetFolder, { recursive: true, force: true });
      } catch {}

      // Sinkronisasi otomatis ke Google Drive via rclone jika terkonfigurasi
      try {
        execSync(`rclone copy "${tarFile}" gdrive:Backup_Patroli_JEC/`, { stdio: 'ignore' });
      } catch {}
    }
  } catch {}

  // Lakukan rotasi otomatis: pertahankan maksimal 2 cadangan terbaru
  try {
    rotateBackups(2);
  } catch {}

  return {
    name: finalName,
    createdAt: now.toISOString(),
    sizeBytes: finalSizeBytes,
    sizeFormatted: formatBytes(finalSizeBytes),
    photosCount: pubCount + rootCount,
    databaseName: 'security_patrol',
    timestamp,
  };
}

export async function restoreFullBackup(backupName: string): Promise<{ success: boolean; message: string }> {
  const rootDir = getAppRoot();
  const backupRootDir = path.join(/*turbopackIgnore: true*/ rootDir, 'backups');
  let selectedBackupPath = path.join(/*turbopackIgnore: true*/ backupRootDir, backupName);

  if (!fs.existsSync(selectedBackupPath)) {
    throw new Error(`Berkas cadangan ${backupName} tidak ditemukan di server!`);
  }

  // If it's a tar.gz file, extract it to a temporary directory
  let extractedPath = selectedBackupPath;
  let tempDirToClean: string | null = null;
  if (backupName.endsWith('.tar.gz')) {
    const tempExtract = path.join(/*turbopackIgnore: true*/ backupRootDir, `temp_restore_${Date.now()}`);
    fs.mkdirSync(tempExtract, { recursive: true });
    execSync(`tar -xzf "${selectedBackupPath}" -C "${tempExtract}"`);
    const children = fs.readdirSync(tempExtract);
    extractedPath = children.length > 0 ? path.join(/*turbopackIgnore: true*/ tempExtract, children[0]) : tempExtract;
    tempDirToClean = tempExtract;
  }

  try {
    // 1. RESTORE DATABASE FROM JSON SNAPSHOT
    const jsonDir = path.join(/*turbopackIgnore: true*/ extractedPath, 'database_json');
    if (fs.existsSync(jsonDir)) {
      const orderedModels = [
        'shift', 'building', 'floor', 'floorQrCode', 'patrolSchedule',
        'checklistTemplate', 'systemSetting', 'user', 'userAchievement',
        'room', 'patrolSession', 'patrolSessionFloor', 'patrolCheck',
        'patrolPhoto', 'finding', 'findingUpdate', 'shiftHandover',
        'activityLog', 'systemErrorLog', 'supportFeedback'
      ];

      for (const model of orderedModels) {
        const filePath = path.join(/*turbopackIgnore: true*/ jsonDir, `${model}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const records = JSON.parse(content);
          const delegate = (prisma as any)[model];
          if (delegate && records.length > 0) {
            await delegate.deleteMany().catch(() => {});
            await delegate.createMany({ data: records, skipDuplicates: true }).catch(async () => {
              for (const item of records) {
                await delegate.create({ data: item }).catch(() => {});
              }
            });
          }
        }
      }
    }

    // 2. RESTORE PHOTOS
    const pubSrc = path.join(/*turbopackIgnore: true*/ extractedPath, 'public_uploads');
    const pubDest = path.join(/*turbopackIgnore: true*/ rootDir, 'public', 'uploads');
    if (fs.existsSync(pubSrc)) {
      copyFolderSync(pubSrc, pubDest);
    }

    const rootSrc = path.join(/*turbopackIgnore: true*/ extractedPath, 'root_uploads');
    const rootDest = path.join(/*turbopackIgnore: true*/ rootDir, 'uploads');
    if (fs.existsSync(rootSrc)) {
      copyFolderSync(rootSrc, rootDest);
    }

    return {
      success: true,
      message: `Cadangan ${backupName} berhasil dipulihkan secara menyeluruh.`,
    };
  } finally {
    if (tempDirToClean && fs.existsSync(tempDirToClean)) {
      try {
        fs.rmSync(tempDirToClean, { recursive: true, force: true });
      } catch {}
    }
  }
}

export async function verifyBackupAuthorization(password: string, adminUserId?: string): Promise<boolean> {
  if (!password) return false;
  // 1. Check server environment master key if explicitly configured
  const envMaster = process.env.BACKUP_MASTER_KEY;
  if (envMaster && password === envMaster) {
    return true;
  }
  // 2. Check logged-in admin's own password
  if (adminUserId) {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      const { verifyPassword } = await import('@/lib/auth');
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { password: true, role: true },
      });
      if (user && user.role === 'admin') {
        return await verifyPassword(password, user.password);
      }
    } catch {
      return false;
    }
  }
  return false;
}

export async function deleteBackup(backupName: string): Promise<{ success: boolean; message: string }> {
  const rootDir = getAppRoot();
  const backupRootDir = path.join(/*turbopackIgnore: true*/ rootDir, 'backups');
  const targetPath = path.join(/*turbopackIgnore: true*/ backupRootDir, backupName);
  const sidecarPath = `${targetPath}.json`;

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Berkas cadangan ${backupName} tidak ditemukan di server.`);
  }

  // 1. Hapus berkas utama / folder
  if (fs.statSync(targetPath).isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }

  // 2. Hapus sidecar jika ada
  if (fs.existsSync(sidecarPath)) {
    try {
      fs.unlinkSync(sidecarPath);
    } catch {}
  }

  // 3. Jika ada folder uncompressed dengan nama yang sama, bersihkan juga
  const uncompressedFolder = path.join(backupRootDir, backupName.replace('.tar.gz', ''));
  if (fs.existsSync(uncompressedFolder) && fs.statSync(uncompressedFolder).isDirectory()) {
    try {
      fs.rmSync(uncompressedFolder, { recursive: true, force: true });
    } catch {}
  }

  return {
    success: true,
    message: `Cadangan ${backupName} berhasil dihapus permanen dari server.`,
  };
}

