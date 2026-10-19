import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, hashPassword } from '@/lib/auth';

// DELETE /api/users/[id] - Delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  if (auth.id === id) {
    return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Check if user has historical audit or patrol data
    const hasHistory = (await prisma.patrolSession.count({ where: { userId: id } })) > 0 ||
                       (await prisma.finding.count({ where: { userId: id } })) > 0 ||
                       (await prisma.patrolCheck.count({ where: { userId: id } })) > 0;

    if (hasHistory) {
      // Soft delete to protect compliance and audit records
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: 'User memiliki riwayat patroli/temuan. Akun telah dinonaktifkan untuk menjaga arsip kepatuhan rumah sakit.',
      });
    }

    // If user has no historical records, safe to hard delete
    await prisma.$transaction([
      prisma.userAchievement.deleteMany({ where: { userId: id } }),
      prisma.activityLog.deleteMany({ where: { userId: id } }),
      prisma.supportFeedback.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    console.error('Delete user error:', error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PUT /api/users/[id] - Update a user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { employeeId, name, email, password, role, shiftId, isActive } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
      updateData.email = email;
    }
    if (role !== undefined) {
      const validRoles = ['security', 'supervisor', 'admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (shiftId !== undefined) updateData.shiftId = shiftId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Reset password if provided
    if (password && typeof password === 'string' && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...safeUser } = updatedUser as any;
    return NextResponse.json(safeUser);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
