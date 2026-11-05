import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { resolveShiftForSchedule } from '@/lib/shifts';

// POST /api/patrol/sessions/override-next - Gracefully close an incomplete previous round and start the new round
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { scheduleId, previousSessionId, reason, notes } = body;

    let schedule = null;
    if (scheduleId) {
      schedule = await prisma.patrolSchedule.findUnique({ where: { id: scheduleId } });
    }

    if (!schedule) {
      const allSchedules = await prisma.patrolSchedule.findMany({ orderBy: { patrolNumber: 'asc' } });
      const nowTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()).replace('.', ':');

      schedule = allSchedules.find(s => {
        if (s.startTime < s.endTime) {
          return nowTime >= s.startTime && nowTime < s.endTime;
        }
        return nowTime >= s.startTime || nowTime < s.endTime;
      }) || allSchedules[0];
    }

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

    // 1. Close the previous session if provided, or any currently dangling in_progress session belonging to this officer today
    let prevSessionToClose = null;
    if (previousSessionId) {
      prevSessionToClose = await prisma.patrolSession.findUnique({
        where: { id: previousSessionId },
        include: { user: true, schedule: true, sessionFloors: true },
      });
      // Non-admin security officer can only override their own session
      if (prevSessionToClose && auth.role !== 'admin' && prevSessionToClose.userId !== auth.id) {
        prevSessionToClose = null;
      }
    }

    if (!prevSessionToClose) {
      // Find any active in_progress session belonging to this officer today
      prevSessionToClose = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate,
          status: 'in_progress',
        },
        include: { user: true, schedule: true, sessionFloors: true },
        orderBy: { startedAt: 'desc' },
      });
    }

    if (prevSessionToClose && (prevSessionToClose.status === 'in_progress' || prevSessionToClose.status === 'incomplete')) {
      const closureReason = reason || 'Pergantian putaran jadwal patroli';
      const closureLog = `[DITUTUP UNTUK RONDA BARU]\nDitutup oleh: ${auth.name} (${auth.employeeId || 'Petugas'}) pukul ${timeMakassar} WITA saat memulai ${schedule.name} (Ronda #${schedule.patrolNumber}).\nAlasan: ${closureReason}${notes ? `\nCatatan Tambahan: ${notes}` : ''}`;
      const updatedPrevNotes = [prevSessionToClose.notes, closureLog].filter(Boolean).join('\n\n');

      await prisma.patrolSession.update({
        where: { id: prevSessionToClose.id },
        data: {
          status: 'incomplete',
          completedAt: prevSessionToClose.completedAt || now,
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

    // 2. Calculate next sequential patrol number for today (24-hour chronological sequence)
    const todaySessions = await prisma.patrolSession.findMany({
      where: { patrolDate },
      select: { patrolNumber: true },
    });
    const maxNumber = todaySessions.reduce((max, s) => Math.max(max, s.patrolNumber || 0), 0);
    const nextPatrolNumber = maxNumber + 1;

    // 3. Match schedule record if available (non-blocking reference)
    const allSchedules = await prisma.patrolSchedule.findMany({ orderBy: { patrolNumber: 'asc' } });
    const matchingSchedule = allSchedules.find(s => s.patrolNumber === nextPatrolNumber) || allSchedules[0] || null;
    const resolvedScheduleId = scheduleId || matchingSchedule?.id || null;

    // Determine shift dynamically based on schedule and real-time clock
    let sessionShiftId = auth.shiftId || '';
    try {
      const activeShifts = await prisma.shift.findMany({ where: { isActive: true } });
      const resolved = resolveShiftForSchedule(matchingSchedule, activeShifts);
      if (resolved && 'id' in resolved && resolved.id) {
        sessionShiftId = resolved.id;
      }
    } catch {
      if (!sessionShiftId) {
        const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
        sessionShiftId = defaultShift?.id || '';
      }
    }

    // Get active floors
    const floors = await prisma.floor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 4. Create the new session for this round
    const newSession = await prisma.patrolSession.create({
      data: {
        userId: auth.id,
        scheduleId: resolvedScheduleId,
        shiftId: sessionShiftId,
        patrolDate,
        patrolNumber: nextPatrolNumber,
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
          orderBy: { floor: { sortOrder: 'asc' } },
        },
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'start_patrol',
        entityType: 'patrol_session',
        entityId: newSession.id,
        metadata: {
          patrolNumber: nextPatrolNumber,
          startedAt: now.toISOString(),
          overrideFrom: prevSessionToClose?.id || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ronda #${nextPatrolNumber} siap dijalankan`,
      session: newSession,
      closedPreviousSessionId: prevSessionToClose?.id || null,
    }, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
