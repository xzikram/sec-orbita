import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listBackups, createFullBackup } from '@/lib/backup-service';
import prisma from '@/lib/prisma';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Akses khusus Administrator.' }, { status: 403 });
  }

  try {
    const backups = listBackups();
    return NextResponse.json({ backups });
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
