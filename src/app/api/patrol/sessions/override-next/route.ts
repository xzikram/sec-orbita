import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/sessions/override-next - Gracefully close an incomplete previous round and start the new round
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { scheduleId, previousSessionId, reason, notes } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID wajib disertakan' }, { status: 400 });
    }

    const schedule = await prisma.patrolSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return NextResponse.json({ error: 'Jadwal patroli tujuan tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(now);
    const patrolDate = new Date(todayMakassarStr);

    const timeMakassar = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Close the previous session if provided, or any currently dangling in_progress session today
    let prevSessionToClose = null;
    if (previousSessionId) {
      prevSessionToClose = await prisma.patrolSession.findUnique({
        where: { id: previousSessionId },
        include: { user: true, schedule: true, sessionFloors: true },
      });
    }

    if (!prevSessionToClose) {
      // Find any active in_progress session today
      prevSessionToClose = await prisma.patrolSession.findFirst({
        where: {
          patrolDate,
          status: 'in_progress',
        },
        include: { user: true, schedule: true, sessionFloors: true },
        orderBy: { startedAt: 'desc' },
      });
    }

    if (prevSessionToClose && prevSessionToClose.status === 'in_progress') {
      const closureReason = reason || 'Petugas sebelumnya belum menyelesaikan / pergantian putaran';
      const closureLog = `[DITUTUP OLEH PETUGAS LAIN]\nDitutup oleh: ${auth.name} (${auth.employeeId || 'Petugas'}) pukul ${timeMakassar} WITA saat memulai ${schedule.name} (Ronda #${schedule.patrolNumber}).\nAlasan: ${closureReason}${notes ? `\nCatatan Tambahan: ${notes}` : ''}`;
      const updatedPrevNotes = [prevSessionToClose.notes, closureLog].filter(Boolean).join('\n\n');

      await prisma.patrolSession.update({
        where: { id: prevSessionToClose.id },
        data: {
          status: 'incomplete',
          completedAt: now,
          notes: updatedPrevNotes,
        },
      });

      // Audit log for closing previous session
      await prisma.activityLog.create({
        data: {
          userId: auth.id,
          action: 'override_close_patrol',
          entityType: 'patrol_session',
          entityId: prevSessionToClose.id,
          metadata: {
            reason: closureReason,
            notes: notes || null,
            closedBy: auth.name,
            originalOwner: prevSessionToClose.user?.name,
            previousPatrolNumber: prevSessionToClose.patrolNumber,
            nextPatrolNumber: schedule.patrolNumber,
          },
        },
      });
    }

    // 2. Check if a session already exists for this user, schedule, and date
    let existingTargetSession = await prisma.patrolSession.findUnique({
      where: {
        userId_scheduleId_patrolDate: {
          userId: auth.id,
          scheduleId: schedule.id,
          patrolDate,
        },
      },
      include: { sessionFloors: true },
    });

    if (existingTargetSession) {
      if (existingTargetSession.status !== 'in_progress') {
        // Reopen if needed or return existing
        await prisma.patrolSession.update({
          where: { id: existingTargetSession.id },
          data: { status: 'in_progress' },
        });
      }
      return NextResponse.json({
        success: true,
        message: `Ronda #${schedule.patrolNumber} siap dijalankan`,
        session: existingTargetSession,
        closedPreviousSessionId: prevSessionToClose?.id || null,
      });
    }

    // Determine shift
    let userShiftId = auth.shiftId;
    if (!userShiftId) {
      const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
      userShiftId = defaultShift?.id || '';
    }

    // Get active floors
    const floors = await prisma.floor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 3. Create the new session for this round
    const newSession = await prisma.patrolSession.create({
      data: {
        userId: auth.id,
        scheduleId: schedule.id,
        shiftId: userShiftId,
        patrolDate,
        patrolNumber: schedule.patrolNumber,
        status: 'in_progress',
        startedAt: now,
        notes: `Dimulai oleh ${auth.name} pada ${timeMakassar} WITA`,
        sessionFloors: {
          create: floors.map(f => ({
            floorId: f.id,
            floorNameSnapshot: f.name,
            floorCodeSnapshot: f.code,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        schedule: true,
        sessionFloors: {
          include: {
            floor: true,
            patrolChecks: true,
          },
        },
      },
    });

    // Log start activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'start_patrol',
        entityType: 'patrol_session',
        entityId: newSession.id,
        metadata: {
          patrolNumber: schedule.patrolNumber,
          scheduleName: schedule.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ronda #${schedule.patrolNumber} berhasil dimulai, sesi sebelumnya telah ditutup dengan aman`,
      session: newSession,
      closedPreviousSessionId: prevSessionToClose?.id || null,
    }, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
