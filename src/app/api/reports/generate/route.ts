import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'supervisor' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily, weekly, monthly
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);

    let startDate = new Date(targetDate);
    let endDate = new Date(targetDate);

    if (type === 'daily') {
      endDate.setDate(targetDate.getDate() + 1);
    } else if (type === 'weekly') {
      // Get start of week (Sunday)
      startDate.setDate(targetDate.getDate() - targetDate.getDay());
      endDate.setDate(startDate.getDate() + 7);
    } else if (type === 'monthly') {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
    }

    // Fetch patrol sessions in range
    const sessions = await prisma.patrolSession.findMany({
      where: {
        patrolDate: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        user: { select: { name: true, employeeId: true } },
        schedule: { select: { name: true, startTime: true, endTime: true } },
        sessionFloors: { include: { patrolChecks: true } }
      },
      orderBy: { patrolDate: 'asc' }
    });

    // Fetch findings in range
    const findings = await prisma.finding.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        user: { select: { name: true } },
        room: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Aggregate statistics
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 100;

    const totalFindings = findings.length;
    const resolvedFindings = findings.filter(f => f.status === 'resolved').length;
    const openFindings = totalFindings - resolvedFindings;

    const summary = {
      periodType: type.toUpperCase(),
      startDate: startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      endDate: new Date(endDate.getTime() - 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      totalSessions,
      completedSessions,
      completionRate,
      totalFindings,
      resolvedFindings,
      openFindings
    };

    return NextResponse.json({
      summary,
      sessions: sessions.map(s => ({
        id: s.id,
        patrolNumber: s.patrolNumber,
        date: s.patrolDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        scheduleName: s.schedule?.name || 'Patroli',
        startTime: s.schedule?.startTime || '',
        endTime: s.schedule?.endTime || '',
        officer: s.user?.name || 'Petugas',
        status: s.status,
        checkedRoomsCount: s.sessionFloors.reduce((sum, sf) => sum + sf.patrolChecks.length, 0)
      })),
      findings: findings.map(f => ({
        id: f.id,
        number: f.findingNumber,
        room: f.roomNameSnapshot || f.room?.name || 'Umum',
        floor: f.floorNameSnapshot || 'Umum',
        category: f.category,
        description: f.description,
        status: f.status,
        officer: f.user?.name || 'Petugas',
        date: f.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      }))
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
