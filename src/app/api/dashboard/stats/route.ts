import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/dashboard/stats - Real-time statistics connected with Security App
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const todayMakassarStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  const todayDate = new Date(todayMakassarStr);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalSecurityOfficers,
    totalFloors,
    totalRooms,
    totalSchedules,
    totalShifts,
    todaySessionsCount,
    totalSessionsCount,
    todayChecksCount,
    totalChecksCount,
    activeFindingsCount,
    resolvedFindingsCount,
    recentSessions,
    recentFindings,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'security', isActive: true } }),
    prisma.floor.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.patrolSchedule.count({ where: { isActive: true } }),
    prisma.shift.count({ where: { isActive: true } }),
    prisma.patrolSession.count({ where: { patrolDate: todayDate } }),
    prisma.patrolSession.count(),
    prisma.patrolCheck.count({ where: { checkedAt: { gte: todayMidnight } } }),
    prisma.patrolCheck.count(),
    prisma.finding.count({ where: { status: { in: ['new', 'in_progress'] } } }),
    prisma.finding.count({ where: { status: 'resolved' } }),
    prisma.patrolSession.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, employeeId: true } },
        shift: { select: { name: true } },
        sessionFloors: { select: { id: true, status: true, qrValidated: true } },
        _count: { select: { findings: true } },
      },
    }),
    prisma.finding.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, employeeId: true } },
      },
    }),
  ]);

  const formattedRecentSessions = recentSessions.map(s => {
    const totalFloors = s.sessionFloors.length;
    const completedFloors = s.sessionFloors.filter(f => f.status === 'completed').length;
    return {
      id: s.id,
      patrolNumber: s.patrolNumber,
      officerName: s.user.name,
      officerId: s.user.employeeId,
      shiftName: s.shift.name,
      status: s.status,
      patrolDate: s.patrolDate,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      totalFloors,
      completedFloors,
      findingsCount: s._count.findings,
    };
  });

  const formattedRecentFindings = recentFindings.map(f => ({
    id: f.id,
    findingNumber: f.findingNumber,
    category: f.category,
    roomName: f.roomNameSnapshot,
    floorName: f.floorNameSnapshot,
    officerName: f.user.name,
    status: f.status,
    description: f.description,
    createdAt: f.createdAt,
  }));

  return NextResponse.json({
    totalUsers,
    totalSecurityOfficers,
    totalFloors,
    totalRooms,
    totalSchedules,
    totalShifts,
    todaySessions: todaySessionsCount,
    totalSessions: totalSessionsCount,
    todayChecks: todayChecksCount,
    totalChecks: totalChecksCount,
    activeFindings: activeFindingsCount,
    resolvedFindings: resolvedFindingsCount,
    recentSessions: formattedRecentSessions,
    recentFindings: formattedRecentFindings,
  });
}

