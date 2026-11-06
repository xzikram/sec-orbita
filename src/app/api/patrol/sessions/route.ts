import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { resolveShiftForSchedule } from '@/lib/shifts';

// GET /api/patrol/sessions - Get patrol sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
  const todayDate = new Date(todayMakassarStr);

  // Auto-close dangling sessions from past dates or inactive > 12 hours (1 full shift)
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const staleSessions = await prisma.patrolSession.findMany({
      where: {
        status: 'in_progress',
        OR: [
          { patrolDate: { lt: todayDate }, startedAt: { lt: twelveHoursAgo } },
          { startedAt: { lt: twelveHoursAgo } },
        ],
      },
      select: { id: true },
    });

    if (staleSessions.length > 0) {
      const staleIds = staleSessions.map(s => s.id);
      await prisma.patrolSession.updateMany({
        where: { id: { in: staleIds } },
        data: {
          status: 'incomplete',
          notes: '[OTOMATIS DITUTUP SISTEM: Sesi patroli melewati batas waktu operasional (12 jam) tanpa diselesaikan secara manual oleh petugas]',
          completedAt: new Date(),
        },
      });
    }
  } catch (autoCloseErr) {
    console.error('Auto-close past sessions error:', autoCloseErr);
  }

  const where: Record<string, any> = {};
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  if (id) {
    where.id = id;
  } else {
    const date = searchParams.get('date');
    if (date) {
      where.patrolDate = new Date(date);
    } else {
      // Cross-midnight resilience: match today's sessions OR any session currently in_progress started within last 12 hours
      where.OR = [
        { patrolDate: todayDate },
        { status: 'in_progress', startedAt: { gte: twelveHoursAgo } },
      ];
    }
  }

  const personal = searchParams.get('personal');
  if (userId) {
    where.userId = userId;
  } else if (personal === 'true' && auth.role === 'security') {
    where.userId = auth.id;
  }

  const sessions = await prisma.patrolSession.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, employeeId: true } },
      schedule: true,
      shift: { select: { name: true } },
      sessionFloors: {
        include: {
          floor: true,
          patrolChecks: {
            include: {
              user: { select: { id: true, name: true, employeeId: true } },
              findings: true,
              photos: true,
            }
          },
        },
        orderBy: {
          floor: {
            sortOrder: 'asc'
          }
        }
      },
    },
    orderBy: [
      { patrolDate: 'asc' },
      { startedAt: 'asc' },
    ],
  });

  return NextResponse.json(sessions);
}

// POST /api/patrol/sessions - Start a new patrol session
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { scheduleId, notes, forceNew, resumeSessionId } = body;

    const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const patrolDate = new Date(todayMakassarStr);

    // 1. Auto-close dangling sessions (> 12 hours)
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const staleSessions = await prisma.patrolSession.findMany({
        where: {
          status: 'in_progress',
          OR: [
            { patrolDate: { lt: patrolDate }, startedAt: { lt: twelveHoursAgo } },
            { startedAt: { lt: twelveHoursAgo } },
          ],
        },
        select: { id: true },
      });

      if (staleSessions.length > 0) {
        const staleIds = staleSessions.map(s => s.id);
        await prisma.patrolSession.updateMany({
          where: { id: { in: staleIds } },
          data: {
            status: 'incomplete',
            notes: '[OTOMATIS DITUTUP SISTEM: Sesi patroli melewati batas waktu operasional (12 jam) tanpa diselesaikan secara manual oleh petugas]',
            completedAt: new Date(),
          },
        });
      }
    } catch (autoCloseErr) {
      console.error('Auto-close error before POST:', autoCloseErr);
    }

    // 2. Resume a specific incomplete session if requested
    if (resumeSessionId) {
      const targetIncomplete = await prisma.patrolSession.findUnique({
        where: { id: resumeSessionId },
        include: {
          user: { select: { id: true, name: true, employeeId: true } },
          schedule: true,
          sessionFloors: {
            include: {
              floor: true,
              patrolChecks: { include: { findings: true } },
            },
            orderBy: { floor: { sortOrder: 'asc' } },
          },
        },
      });

      if (targetIncomplete && targetIncomplete.status === 'incomplete' && (auth.role === 'admin' || targetIncomplete.userId === auth.id)) {
        const timeMakassar = new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
        });
        const resumeNote = `[DILANJUTKAN KEMBALI: ${timeMakassar} WITA]`;
        const updatedNotes = [targetIncomplete.notes, resumeNote].filter(Boolean).join('\n');

        const resumedSession = await prisma.patrolSession.update({
          where: { id: targetIncomplete.id },
          data: {
            status: 'in_progress',
            completedAt: null,
            notes: updatedNotes,
          },
          include: {
            user: { select: { id: true, name: true, employeeId: true } },
            schedule: true,
            sessionFloors: {
              include: {
                floor: true,
                patrolChecks: { include: { findings: true } },
              },
              orderBy: { floor: { sortOrder: 'asc' } },
            },
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: auth.id,
            action: 'resume_patrol',
            entityType: 'patrol_session',
            entityId: resumedSession.id,
            metadata: {
              reason: 'Melanjutkan sesi patroli yang sebelumnya diselesaikan sebagian (incomplete)',
              patrolNumber: resumedSession.patrolNumber,
            },
          },
        });

        return NextResponse.json(resumedSession, { status: 200 });
      }
    }

    // 3. If forceNew is requested: close any active in_progress session for this officer
    if (forceNew) {
      const activeToClose = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate,
          status: 'in_progress',
        },
      });

      if (activeToClose) {
        const timeMakassar = new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
        });
        const closeNote = `[DITUTUP UNTUK MEMULAI RONDA BARU: ${timeMakassar} WITA]`;
        const updatedNotes = [activeToClose.notes, closeNote].filter(Boolean).join('\n');

        await prisma.patrolSession.update({
          where: { id: activeToClose.id },
          data: {
            status: 'incomplete',
            completedAt: new Date(),
            notes: updatedNotes,
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: auth.id,
            action: 'override_close_patrol',
            entityType: 'patrol_session',
            entityId: activeToClose.id,
            metadata: {
              reason: 'Menutup sesi lama untuk membuka putaran ronda baru',
              previousPatrolNumber: activeToClose.patrolNumber,
            },
          },
        });
      }
    } else {
      // If not forceNew, check if user already has an active session in progress
      const myActiveSession = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate,
          status: 'in_progress',
        },
        include: {
          user: { select: { id: true, name: true, employeeId: true } },
          schedule: true,
          sessionFloors: {
            include: {
              floor: true,
              patrolChecks: { include: { findings: true } },
            },
            orderBy: { floor: { sortOrder: 'asc' } },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      if (myActiveSession) {
        return NextResponse.json(myActiveSession, { status: 200 });
      }
    }

    // 4. Calculate next sequential patrol number for today (24-hour chronological sequence)
    // Ronda 1 is whoever starts first today, Ronda 2 is next, etc.
    const todaySessions = await prisma.patrolSession.findMany({
      where: { patrolDate },
      select: { patrolNumber: true },
    });
    const maxNumber = todaySessions.reduce((max, s) => Math.max(max, s.patrolNumber || 0), 0);
    const nextPatrolNumber = maxNumber + 1;

    // 5. Match schedule record if available (non-blocking reference)
    const allSchedules = await prisma.patrolSchedule.findMany({ orderBy: { patrolNumber: 'asc' } });
    const matchingSchedule = allSchedules.find(s => s.patrolNumber === nextPatrolNumber) || allSchedules[0] || null;
    const resolvedScheduleId = scheduleId || matchingSchedule?.id || null;

    // 6. Resolve shift dynamically
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

    // 7. Get all active floors and create session floors
    const floors = await prisma.floor.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const now = new Date();

    const session = await prisma.patrolSession.create({
      data: {
        userId: auth.id,
        scheduleId: resolvedScheduleId,
        shiftId: sessionShiftId,
        patrolDate,
        patrolNumber: nextPatrolNumber,
        status: 'in_progress',
        startedAt: now,
        notes: notes || null,
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

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'start_patrol',
        entityType: 'patrol_session',
        entityId: session.id,
        metadata: {
          patrolNumber: nextPatrolNumber,
          startedAt: now.toISOString(),
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/patrol/sessions - Delete a patrol session with clean cascading (Admin only)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Hanya admin yang berhak menghapus sesi patroli.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID sesi patroli wajib disertakan' }, { status: 400 });
    }

    const session = await prisma.patrolSession.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        schedule: { select: { name: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesi patroli tidak ditemukan' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get session floors
      const sessionFloors = await tx.patrolSessionFloor.findMany({
        where: { sessionId: id },
        select: { id: true },
      });
      const sfIds = sessionFloors.map(sf => sf.id);

      // 2. Get checks in these session floors
      const checks = await tx.patrolCheck.findMany({
        where: { sessionFloorId: { in: sfIds } },
        select: { id: true },
      });
      const checkIds = checks.map(c => c.id);

      // 3. Find findings related to this session or checks
      const findings = await tx.finding.findMany({
        where: {
          OR: [
            { sessionId: id },
            { checkId: { in: checkIds } },
          ],
        },
        select: { id: true },
      });
      const findingIds = findings.map(f => f.id);

      // 4. Delete finding updates
      if (findingIds.length > 0) {
        await tx.findingUpdate.deleteMany({
          where: { findingId: { in: findingIds } },
        });
        // 5. Delete findings
        await tx.finding.deleteMany({
          where: { id: { in: findingIds } },
        });
      }

      // 6. Delete photos
      if (checkIds.length > 0) {
        await tx.patrolPhoto.deleteMany({
          where: { checkId: { in: checkIds } },
        });
        // 7. Delete checks
        await tx.patrolCheck.deleteMany({
          where: { id: { in: checkIds } },
        });
      }

      // 8. Delete session floors
      if (sfIds.length > 0) {
        await tx.patrolSessionFloor.deleteMany({
          where: { id: { in: sfIds } },
        });
      }

      // 9. Delete patrol session
      await tx.patrolSession.delete({
        where: { id },
      });

      // 10. Audit log
      await tx.activityLog.create({
        data: {
          userId: auth.id,
          action: 'delete_patrol_session',
          entityType: 'patrol_session',
          entityId: id,
          metadata: {
            deletedBy: auth.name,
            officer: session.user?.name,
            patrolNumber: session.patrolNumber,
          },
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Sesi patroli berhasil dihapus' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal menghapus sesi patroli';
    console.error('Delete patrol session error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
