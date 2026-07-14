import { NextResponse } from 'next/server';
import { getAuthUser, verifyPassword, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Password saat ini dan password baru wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal harus 6 karakter.' }, { status: 400 });
    }

    // Get full user with password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Verify current password
    const isCorrect = await verifyPassword(currentPassword, dbUser.password);
    if (!isCorrect) {
      return NextResponse.json({ error: 'Password saat ini salah.' }, { status: 400 });
    }

    // Hash new password
    const hashed = await hashPassword(newPassword);

    // Update in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'change_password',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          detail: `Pengguna ${user.employeeId} mengubah password akun.`,
        },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
