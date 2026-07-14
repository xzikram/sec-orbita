import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/dashboard/stats - Dashboard statistics
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalFloors,
    totalRooms,
    todaySessions,
    todayChecks,
    activeFindings,
    resolvedFindings,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.floor.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.patrolSession.count({ where: { patrolDate: today } }),
    prisma.patrolCheck.count({ where: { checkedAt: { gte: today } } }),
    prisma.finding.count({ where: { status: { in: ['new', 'in_progress'] } } }),
    prisma.finding.count({ where: { status: 'resolved' } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalFloors,
    totalRooms,
    todaySessions,
    todayChecks,
    activeFindings,
    resolvedFindings,
  });
}
