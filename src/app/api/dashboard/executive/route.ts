import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'supervisor' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // 1. Total Patrols (Today, Week, Month) vs Targets
    const [patrolsToday, patrolsWeek, patrolsMonth] = await Promise.all([
      prisma.patrolSession.count({ where: { patrolDate: { gte: today } } }),
      prisma.patrolSession.count({ where: { patrolDate: { gte: startOfWeek } } }),
      prisma.patrolSession.count({ where: { patrolDate: { gte: startOfMonth } } }),
    ]);

    // Target: 8 patrols per day
    const targetToday = 8;
    const targetWeek = 56;
    const targetMonth = 240;

    // 2. Compliance Rate per Security Officer
    const securityUsers = await prisma.user.findMany({
      where: { role: 'security' },
      select: {
        id: true,
        name: true,
        employeeId: true,
        patrolSessions: {
          select: {
            status: true
          }
        }
      }
    });

    const compliancePerSecurity = securityUsers.map(user => {
      const total = user.patrolSessions.length;
      const completed = user.patrolSessions.filter(s => s.status === 'completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;
      return {
        name: user.name,
        employeeId: user.employeeId,
        total,
        completed,
        rate
      };
    }).sort((a, b) => b.rate - a.rate);

    // 3. Top 5 Rooms with Most Findings
    const findings = await prisma.finding.findMany({
      select: {
        roomId: true,
        roomNameSnapshot: true,
        floorNameSnapshot: true
      }
    });

    const roomCountMap: Record<string, { count: number; name: string; floor: string }> = {};
    findings.forEach(f => {
      if (!f.roomId) return;
      if (!roomCountMap[f.roomId]) {
        roomCountMap[f.roomId] = { count: 0, name: f.roomNameSnapshot, floor: f.floorNameSnapshot };
      }
      roomCountMap[f.roomId].count++;
    });

    const topRooms = Object.values(roomCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Average Resolution Time
    const resolvedFindings = await prisma.finding.findMany({
      where: {
        status: 'resolved'
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let avgResolutionTimeHours = 0;
    if (resolvedFindings.length > 0) {
      const totalTimeMs = resolvedFindings.reduce((sum, f) => {
        return sum + (f.updatedAt.getTime() - f.createdAt.getTime());
      }, 0);
      avgResolutionTimeHours = Math.round((totalTimeMs / (1000 * 60 * 60 * resolvedFindings.length)) * 10) / 10;
    }

    // 5. Findings Trend (Last 30 Days)
    const findings30Days = await prisma.finding.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        createdAt: true
      }
    });

    const trendMap: Record<string, number> = {};
    // Pre-populate last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      trendMap[dateStr] = 0;
    }

    findings30Days.forEach(f => {
      const dateStr = f.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (dateStr in trendMap) {
        trendMap[dateStr]++;
      }
    });

    const trend = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count
    }));

    // 6. Findings Summary stats
    const openFindings = await prisma.finding.count({ where: { status: { in: ['new', 'in_progress'] } } });

    return NextResponse.json({
      patrols: {
        today: { actual: patrolsToday, target: targetToday },
        week: { actual: patrolsWeek, target: targetWeek },
        month: { actual: patrolsMonth, target: targetMonth }
      },
      compliance: compliancePerSecurity,
      topRooms,
      avgResolutionTimeHours,
      openFindings,
      trend
    });
  } catch (error) {
    console.error('Failed to load executive stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
