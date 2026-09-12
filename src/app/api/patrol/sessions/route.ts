import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/patrol/sessions - Get patrol sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
  const todayDate = new Date(todayMakassarStr);

  // Auto-close dangling sessions from past dates that are still in_progress
  try {
    await prisma.patrolSession.updateMany({
      where: {
        status: 'in_progress',
        patrolDate: { lt: todayDate },
      },
      data: {
        status: 'incomplete',
        notes: 'Otomatis ditutup: sesi melewati batas tanggal operasional.',
        completedAt: new Date(),
      },
    });
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

  if (userId) where.userId = userId;
  if (auth.role === 'security') where.userId = auth.id;

  const sessions = await prisma.patrolSession.findMany({
    where,
    include: {
      user: { select: { name: true, employeeId: true } },
      schedule: true,
      shift: { select: { name: true } },
      sessionFloors: {
        include: {
          floor: true,
          patrolChecks: {
            include: {
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
    const body = await request.json();
    const { scheduleId } = body;

    const schedule = await prisma.patrolSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });

    const todayMakassarStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const patrolDate = new Date(todayMakassarStr);

    // Check if a session already exists for this user, schedule, and date
    let existingSession = await prisma.patrolSession.findUnique({
      where: {
        userId_scheduleId_patrolDate: {
          userId: auth.id,
          scheduleId,
          patrolDate,
        },
      },
      include: { sessionFloors: true },
    });

    if (existingSession) {
      return NextResponse.json(existingSession, { status: 200 });
    }

    // Get default shift if not assigned to user
    let userShiftId = auth.shiftId;
    if (!userShiftId) {
      const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
      userShiftId = defaultShift?.id || '';
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
        scheduleId,
        shiftId: userShiftId,
        patrolDate,
        patrolNumber: schedule.patrolNumber,
        status: 'in_progress',
        startedAt: now,
        notes: earlyNotes,
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
