import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/schedules - List patrol schedules
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schedules = await prisma.patrolSchedule.findMany({
    where: { isActive: true },
    orderBy: { patrolNumber: 'asc' },
  });
  return NextResponse.json(schedules);
}

// POST /api/schedules - Create schedule (admin only)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const schedule = await prisma.patrolSchedule.create({ data: body });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
