import { NextResponse } from 'next/server';
import { getAuthUser, verifyPassword } from '@/lib/auth';
import { createFullBackup, restoreFullBackup } from '@/lib/backup-service';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Akses ditolak. Hanya Administrator yang berhak memulihkan sistem.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { backupName, adminPassword, confirmKeyword } = body;

    // 1. Validasi Input
    if (!backupName) {
      return NextResponse.json({ error: 'Nama berkas cadangan wajib ditentukan!' }, { status: 400 });
    }

    if (confirmKeyword !== 'RESTORE') {
      return NextResponse.json({ error: 'Kata kunci konfirmasi salah! Anda harus mengetik kata "RESTORE" dengan huruf besar.' }, { status: 400 });
    }

    if (!adminPassword) {
      return NextResponse.json({ error: 'Password Admin wajib diisi untuk verifikasi otorisasi keamanan!' }, { status: 400 });
    }

    // 2. Verifikasi Password Admin yang sedang login
    const adminUser = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { password: true, name: true, employeeId: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Akun Administrator tidak valid.' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(adminPassword, adminUser.password);
    if (!isPasswordValid) {
      // Catat percobaan pemulihan gagal ke Audit Log untuk investigasi keamanan
      await prisma.activityLog.create({
        data: {
          userId: auth.id,
          action: 'restore_system_failed_invalid_password',
          entityType: 'backup',
          entityId: backupName,
          metadata: { reason: 'Invalid admin password attempted', targetBackup: backupName },
        },
      }).catch(() => {});

      return NextResponse.json({ error: 'Password Admin SALAH! Tindakan pemulihan ditolak demi keamanan sistem.' }, { status: 401 });
    }

    console.log(`🛡️ [RESTORE AUDIT] Admin ${auth.name} (${auth.employeeId}) memulai pemulihan sistem dari cadangan: ${backupName}`);

    // 3. Buat Snapshot Keamanan Otomatis (Pre-Restore Safety Backup)
    // Supaya jika restore salah file, admin bisa langsung membatalkan/kembali ke kondisi sebelum restore!
    let preRestoreBackupName = '';
    try {
      const safetyBackup = await createFullBackup('pre_restore');
      preRestoreBackupName = safetyBackup.name;
      console.log(`   ✓ Safety snapshot tersimpan: ${preRestoreBackupName}`);
    } catch (sErr) {
      console.warn('   ⚠️ Gagal membuat safety backup sebelum restore:', sErr);
    }

    // 4. Eksekusi Restore Penuh
    const result = await restoreFullBackup(backupName);

    // 5. Catat Audit Trail Sukses
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'restore_system_success',
        entityType: 'backup',
        entityId: backupName,
        metadata: {
          restoredBackup: backupName,
          safetyBackupCreated: preRestoreBackupName,
          executedBy: auth.name,
          employeeId: auth.employeeId,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Sistem berhasil dipulihkan secara utuh dari cadangan ${backupName}. Snapshot keamanan sebelum restore juga telah dibuat (${preRestoreBackupName}).`,
      safetyBackup: preRestoreBackupName,
    });
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json({ error: error.message || 'Gagal memulihkan sistem' }, { status: 500 });
  }
}
