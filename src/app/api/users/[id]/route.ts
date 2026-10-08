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

    // 1. Gather all related session IDs for this user
    const userSessions = await prisma.patrolSession.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const sessionIds = userSessions.map(s => s.id);

    // 2. Gather session floor IDs for these sessions
    const sessionFloors = await prisma.patrolSessionFloor.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    });
    const sessionFloorIds = sessionFloors.map(sf => sf.id);

    // 3. Gather patrol check IDs belonging to this user OR these session floors
    const userChecks = await prisma.patrolCheck.findMany({
      where: {
        OR: [
          { userId: id },
          { sessionFloorId: { in: sessionFloorIds } },
        ],
      },
      select: { id: true },
    });
    const checkIds = userChecks.map(c => c.id);

    // 4. Gather finding IDs belonging to this user, these checks, or these sessions
    const userFindings = await prisma.finding.findMany({
      where: {
        OR: [
          { userId: id },
          { checkId: { in: checkIds } },
          { sessionId: { in: sessionIds } },
        ],
      },
      select: { id: true },
    });
    const findingIds = userFindings.map(f => f.id);

    // Execute comprehensive cascading delete in correct dependency order
    await prisma.$transaction([
      // a. Finding updates (by this user or for these findings)
      prisma.findingUpdate.deleteMany({
        where: {
          OR: [
            { userId: id },
            { findingId: { in: findingIds } },
          ],
        },
      }),

      // b. Findings
      prisma.finding.deleteMany({
        where: { id: { in: findingIds } },
      }),

      // c. Patrol photos (by this user or for these checks)
      prisma.patrolPhoto.deleteMany({
        where: {
          OR: [
            { userId: id },
            { checkId: { in: checkIds } },
          ],
        },
      }),

      // d. Patrol checks
      prisma.patrolCheck.deleteMany({
        where: { id: { in: checkIds } },
      }),

      // e. Patrol session floors
      prisma.patrolSessionFloor.deleteMany({
        where: { id: { in: sessionFloorIds } },
      }),

      // f. Patrol sessions
      prisma.patrolSession.deleteMany({
        where: { id: { in: sessionIds } },
      }),

      // g. Support feedbacks submitted by this user
      prisma.supportFeedback.deleteMany({
        where: { userId: id },
      }),

      // h. Shift handovers (sent from or sent to this user)
      prisma.shiftHandover.deleteMany({
        where: { OR: [{ fromUserId: id }, { toUserId: id }] },
      }),

      // i. User achievements
      prisma.userAchievement.deleteMany({
        where: { userId: id },
      }),

      // j. Activity logs
      prisma.activityLog.deleteMany({
        where: { userId: id },
      }),

      // k. Finally delete the user
      prisma.user.delete({
        where: { id },
      }),
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
