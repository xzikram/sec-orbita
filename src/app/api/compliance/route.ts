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

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Patrol Selesai vs Target
    // Daily target: 8 schedules
    // Monthly target: 8 * number of days passed in this month
    const daysPassedInMonth = today.getDate();
    const targetSchedules = 8 * daysPassedInMonth;

    const actualSessions = await prisma.patrolSession.count({
      where: {
        patrolDate: {
          gte: startOfMonth,
          lte: today
        },
        status: 'completed'
      }
    });

    const patrolComplianceRate = targetSchedules > 0
      ? Math.min(100, Math.round((actualSessions / targetSchedules) * 100))
      : 100;

    // 2. Average Response & Resolution Time
    const findingsThisMonth = await prisma.finding.findMany({
      where: {
        createdAt: { gte: startOfMonth }
      },
      include: {
        updates: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    let totalResponseTimeMs = 0;
    let responseCount = 0;
    let totalResolutionTimeMs = 0;
    let resolutionCount = 0;
    let resolvedWithinSlaCount = 0;

    findingsThisMonth.forEach(f => {
      // Response time (first update time - creation time)
      if (f.updates.length > 0) {
        const firstUpdate = f.updates[0];
        totalResponseTimeMs += firstUpdate.createdAt.getTime() - f.createdAt.getTime();
        responseCount++;
      }

      // Resolution time
      if (f.status === 'resolved') {
        const resolveUpdate = f.updates.find(u => u.newStatus === 'resolved');
        if (resolveUpdate) {
          const resTime = resolveUpdate.createdAt.getTime() - f.createdAt.getTime();
          totalResolutionTimeMs += resTime;
          resolutionCount++;

          // SLA is 24 hours (24 * 60 * 60 * 1000 = 86400000 ms)
          if (resTime <= 24 * 60 * 60 * 1000) {
            resolvedWithinSlaCount++;
          }
        }
      }
    });

    const avgResponseTimeMinutes = responseCount > 0
      ? Math.round(totalResponseTimeMs / (1000 * 60 * responseCount))
      : 15; // default 15 mins if no data

    const avgResolutionTimeHours = resolutionCount > 0
      ? Math.round(totalResolutionTimeMs / (1000 * 60 * 60 * resolutionCount) * 10) / 10
      : 0;

    const slaComplianceRate = resolutionCount > 0
      ? Math.round((resolvedWithinSlaCount / resolutionCount) * 100)
      : 100; // 100% if all resolved are within SLA or no resolved findings yet

    // 3. Floor-level check completion rates
    const sessionFloors = await prisma.patrolSessionFloor.findMany({
      where: {
        createdAt: { gte: startOfMonth }
      },
      select: {
        status: true
      }
    });

    const totalFloorsSession = sessionFloors.length;
    const completedFloorsSession = sessionFloors.filter(sf => sf.status === 'completed').length;
    const floorComplianceRate = totalFloorsSession > 0
      ? Math.round((completedFloorsSession / totalFloorsSession) * 100)
      : 100;

    return NextResponse.json({
      patrols: {
        actual: actualSessions,
        target: targetSchedules,
        rate: patrolComplianceRate
      },
      findings: {
        total: findingsThisMonth.length,
        resolved: resolutionCount,
        resolvedWithinSla: resolvedWithinSlaCount,
        slaRate: slaComplianceRate,
        avgResponseMinutes: avgResponseTimeMinutes,
        avgResolutionHours: avgResolutionTimeHours
      },
      floors: {
        total: totalFloorsSession,
        completed: completedFloorsSession,
        rate: floorComplianceRate
      },
      accreditationStatus: patrolComplianceRate >= 95 && slaComplianceRate >= 90 ? 'PARIPURNA' : patrolComplianceRate >= 80 ? 'UTAMA' : 'MADYA'
    });
  } catch (error) {
    console.error('Failed to get compliance stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
