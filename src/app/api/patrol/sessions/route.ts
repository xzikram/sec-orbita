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

  // Auto-close dangling sessions from past dates or inactive > 4 hours
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const staleSessions = await prisma.patrolSession.findMany({
      where: {
        status: 'in_progress',
        OR: [
          { patrolDate: { lt: todayDate }, startedAt: { lt: fourHoursAgo } },
          { startedAt: { lt: fourHoursAgo } },
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
          notes: 'Otomatis ditutup: sesi terhenti di tengah jalan dan telah melewati batas hari/waktu operasional.',
          completedAt: new Date(),
        },
      });
    }
  } catch (autoCloseErr) {
    console.error('Auto-close past sessions error:', autoCloseErr);
  }

  const where: Record<string, any> = {};
  if (id) {
    where.id = id;
  } else {
    const date = searchParams.get('date');
    if (date) {
      where.patrolDate = new Date(date);
    } else {
      where.patrolDate = todayDate;
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
              findings: true
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
    orderBy: { patrolNumber: 'asc' },
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
    const { scheduleId, notes } = body;

    let schedule = null;
    if (scheduleId) {
      schedule = await prisma.patrolSchedule.findUnique({ where: { id: scheduleId } });
    }

    // Auto-resolve schedule based on current Makassar time if not specified
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
      return NextResponse.json({ error: 'Jadwal patroli tidak ditemukan' }, { status: 404 });
    }

    const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const patrolDate = new Date(todayMakassarStr);

    // 1. Auto-close dangling sessions before starting or checking active round
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const staleSessions = await prisma.patrolSession.findMany({
        where: {
          status: 'in_progress',
          OR: [
            { patrolDate: { lt: patrolDate }, startedAt: { lt: fourHoursAgo } },
            { startedAt: { lt: fourHoursAgo } },
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
            notes: 'Otomatis ditutup: sesi terhenti di tengah jalan dan telah melewati batas hari/waktu operasional.',
            completedAt: new Date(),
          },
        });
      }
    } catch (autoCloseErr) {
      console.error('Auto-close error before POST:', autoCloseErr);
    }

    // 2. Multi-officer On-Demand Concurrency:
    // Only check if THIS SPECIFIC USER already has an active session in progress
    const myActiveSession = await prisma.patrolSession.findFirst({
      where: {
        userId: auth.id,
        patrolDate,
        status: 'in_progress',
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        schedule: true,
        sessionFloors: true,
      },
    });

    if (myActiveSession) {
      // User already has their own active round, return it to resume without error
      return NextResponse.json(myActiveSession, { status: 200 });
    }

    // Resolve shift dynamically based on schedule and real-time clock
    let sessionShiftId = auth.shiftId || '';
    try {
      const activeShifts = await prisma.shift.findMany({ where: { isActive: true } });
      const resolved = resolveShiftForSchedule(schedule, activeShifts);
      if (resolved && 'id' in resolved && resolved.id) {
        sessionShiftId = resolved.id;
      }
    } catch {
      if (!sessionShiftId) {
        const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
        sessionShiftId = defaultShift?.id || '';
      }
    }

    // Check if patrol started earlier than scheduled
    let earlyNotes: string | null = null;
    const now = new Date();
    if (schedule.startTime) {
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const nowH = parseInt(now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', hour12: false }));
      const nowM = parseInt(now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', minute: '2-digit' }));
      const diffMins = (sh * 60 + sm) - (nowH * 60 + nowM);
      if (diffMins > 10 && diffMins <= 90) {
        earlyNotes = `Mulai lebih awal pukul ${String(nowH).padStart(2, '0')}:${String(nowM).padStart(2, '0')} WITA (Jadwal resmi: ${schedule.startTime} - ${schedule.endTime})`;
      }
    }

    // Get all active floors and create session floors
    const floors = await prisma.floor.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

    const session = await prisma.patrolSession.create({
      data: {
        userId: auth.id,
        scheduleId: schedule.id,
        shiftId: sessionShiftId,
        patrolDate,
        patrolNumber: schedule.patrolNumber,
        status: 'in_progress',
        startedAt: now,
        notes: [notes, earlyNotes].filter(Boolean).join(' | ') || null,
        sessionFloors: {
          create: floors.map(f => ({
            floorId: f.id,
            floorNameSnapshot: f.name,
            floorCodeSnapshot: f.code,
          })),
        },
      },
      include: { sessionFloors: true },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'start_patrol', entityType: 'patrol_session', entityId: session.id },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
