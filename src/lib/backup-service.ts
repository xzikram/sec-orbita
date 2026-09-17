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
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  const backupRootDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupRootDir)) return [];

  const items: BackupItem[] = [];
  const entries = fs.readdirSync(backupRootDir);

  for (const entry of entries) {
    if (!entry.startsWith('backup_')) continue;
    const fullPath = path.join(backupRootDir, entry);
    try {
      const stats = fs.statSync(fullPath);
      let photosCount = 0;
      let databaseName = 'security_patrol';
      let timestamp = entry.replace('backup_', '').replace('.tar.gz', '');

      const metaPath = path.join(fullPath, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          photosCount = meta.uploadedPhotosCount || 0;
          databaseName = meta.databaseName || databaseName;
          timestamp = meta.timestamp || timestamp;
        } catch {}
      }

      let sizeBytes = stats.size;
      if (stats.isDirectory()) {
        sizeBytes = getFolderSize(fullPath);
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

export async function createFullBackup(reason: string = 'manual'): Promise<BackupItem> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const rootDir = process.cwd();
  const backupRootDir = path.join(rootDir, 'backups');
  const folderName = reason === 'pre_restore' ? `backup_pre_restore_${timestamp}` : `backup_${timestamp}`;
  const targetFolder = path.join(backupRootDir, folderName);

  fs.mkdirSync(targetFolder, { recursive: true });

  // 1. DUMP DATABASE
  const jsonBackupDir = path.join(targetFolder, 'database_json');
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
        fs.writeFileSync(path.join(jsonBackupDir, `${model}.json`), JSON.stringify(rows, null, 2), 'utf-8');
        totalRecords += rows.length;
      }
    } catch {}
  }

  // 2. BACKUP FOTO
  const pubUploadsSrc = path.join(rootDir, 'public', 'uploads');
  const pubUploadsDest = path.join(targetFolder, 'public_uploads');
  const pubCount = copyFolderSync(pubUploadsSrc, pubUploadsDest);

  const rootUploadsSrc = path.join(rootDir, 'uploads');
  const rootUploadsDest = path.join(targetFolder, 'root_uploads');
  const rootCount = copyFolderSync(rootUploadsSrc, rootUploadsDest);

  // 3. BACKUP .ENV
  const envSrc = path.join(rootDir, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, path.join(targetFolder, 'env_backup'));
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

  // Also compress to tar.gz if tar is available on the system
  try {
    const tarFile = path.join(backupRootDir, `${folderName}.tar.gz`);
    execSync(`tar -czf "${tarFile}" -C "${backupRootDir}" "${folderName}"`, { stdio: 'ignore' });

    // Sinkronisasi otomatis ke Google Drive via rclone jika terkonfigurasi
    try {
      execSync(`rclone copy "${tarFile}" gdrive:Backup_Patroli_JEC/`, { stdio: 'ignore' });
    } catch {}
  } catch {}

  const sizeBytes = getFolderSize(targetFolder);

  return {
    name: folderName,
    createdAt: now.toISOString(),
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    photosCount: pubCount + rootCount,
    databaseName: 'security_patrol',
    timestamp,
  };
}

export async function restoreFullBackup(backupName: string): Promise<{ success: boolean; message: string }> {
  const rootDir = process.cwd();
  const backupRootDir = path.join(rootDir, 'backups');
  let selectedBackupPath = path.join(backupRootDir, backupName);

  if (!fs.existsSync(selectedBackupPath)) {
    throw new Error(`Berkas cadangan ${backupName} tidak ditemukan di server!`);
  }

  // If it's a tar.gz file, extract it to a temporary directory
  let extractedPath = selectedBackupPath;
  let isTemp = false;
  if (backupName.endsWith('.tar.gz')) {
    const tempExtract = path.join(backupRootDir, `temp_restore_${Date.now()}`);
    fs.mkdirSync(tempExtract, { recursive: true });
    execSync(`tar -xzf "${selectedBackupPath}" -C "${tempExtract}"`);
    const children = fs.readdirSync(tempExtract);
    extractedPath = children.length > 0 ? path.join(tempExtract, children[0]) : tempExtract;
    isTemp = true;
  }

  try {
    // 1. RESTORE DATABASE FROM JSON SNAPSHOT
    const jsonDir = path.join(extractedPath, 'database_json');
    if (fs.existsSync(jsonDir)) {
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
    const pubSrc = path.join(extractedPath, 'public_uploads');
    const pubDest = path.join(rootDir, 'public', 'uploads');
    if (fs.existsSync(pubSrc)) {
      copyFolderSync(pubSrc, pubDest);
    }

    const rootSrc = path.join(extractedPath, 'root_uploads');
    const rootDest = path.join(rootDir, 'uploads');
    if (fs.existsSync(rootSrc)) {
      copyFolderSync(rootSrc, rootDest);
    }

    return {
      success: true,
      message: `Cadangan ${backupName} berhasil dipulihkan secara menyeluruh.`,
    };
  } finally {
    if (isTemp && fs.existsSync(extractedPath)) {
      try {
        fs.rmSync(path.dirname(extractedPath), { recursive: true, force: true });
      } catch {}
    }
  }
}
