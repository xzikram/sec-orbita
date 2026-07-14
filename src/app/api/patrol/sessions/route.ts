import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/patrol/sessions - Get patrol sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const userId = searchParams.get('userId');

  const where: Record<string, unknown> = { patrolDate: new Date(date) };
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
          patrolChecks: { select: { id: true, condition: true } },
        },
      },
    },
    orderBy: { patrolNumber: 'asc' },
  });

  return NextResponse.json(sessions);
}

// POST /api/patrol/sessions - Start a new patrol session
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { scheduleId } = body;

    const schedule = await prisma.patrolSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });

    // Get all active floors and create session floors
    const floors = await prisma.floor.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const today = new Date().toISOString().split('T')[0];

    const session = await prisma.patrolSession.create({
      data: {
        userId: auth.id,
        scheduleId,
        shiftId: auth.shiftId || '',
        patrolDate: new Date(today),
        patrolNumber: schedule.patrolNumber,
        status: 'in_progress',
        startedAt: new Date(),
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
