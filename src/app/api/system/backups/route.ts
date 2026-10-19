import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listBackups, createFullBackup, deleteBackup, rotateBackups, getServerStorageStats, verifyBackupAuthorization } from '@/lib/backup-service';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Akses khusus Administrator.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('autoPrune') === 'true') {
      rotateBackups(2);
    }
    const backups = listBackups();
    const storageStats = getServerStorageStats();
    return NextResponse.json({ backups, storageStats });
  } catch (error: any) {
    console.error('Failed to list backups:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar backup' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Akses khusus Administrator.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { securityPassword, action } = body;

    // Verifikasi Password Otorisasi (password login Admin atau BACKUP_MASTER_KEY)
    const isAuthorized = await verifyBackupAuthorization(securityPassword, auth.id);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Password otorisasi backup SALAH! Masukkan password akun Administrator Anda.' }, { status: 401 });
    }

    // Aksi pemangkasan cadangan lama (> 2 cadangan)
    if (action === 'prune') {
      const deletedCount = rotateBackups(2);
      const storageStats = getServerStorageStats();
      return NextResponse.json({
        success: true,
        message: deletedCount > 0
          ? `Berhasil memangkas ${deletedCount} cadangan lama. Kapasitas server berhasil dilegakan!`
          : 'Semua cadangan sudah dalam batas maksimal (maksimal 2 cadangan).',
        deletedCount,
        storageStats,
      });
    }

    const backupItem = await createFullBackup('manual_admin_trigger');

    // Catat Audit Log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'create_system_backup',
        entityType: 'backup',
        entityId: backupItem.name,
        metadata: {
          backupName: backupItem.name,
          sizeBytes: backupItem.sizeBytes,
          photosCount: backupItem.photosCount,
          triggeredBy: auth.name,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Cadangan sistem berhasil dibuat.',
      backup: backupItem,
    });
  } catch (error: any) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat backup' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Akses khusus Administrator.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { backupName, securityPassword } = body;

    if (!backupName) {
      return NextResponse.json({ error: 'Nama berkas cadangan wajib ditentukan!' }, { status: 400 });
    }

    // Verifikasi Password Otorisasi (password login Admin atau BACKUP_MASTER_KEY)
    const isAuthorized = await verifyBackupAuthorization(securityPassword, auth.id);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Password otorisasi penghapusan SALAH! Masukkan password akun Administrator Anda.' }, { status: 401 });
    }

    const result = await deleteBackup(backupName);

    // Catat Audit Log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'delete_system_backup',
        entityType: 'backup',
        entityId: backupName,
        metadata: {
          backupName,
          deletedBy: auth.name,
          employeeId: auth.employeeId,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus backup' }, { status: 500 });
  }
}
