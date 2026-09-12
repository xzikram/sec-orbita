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
    const dateParam = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    const [year, month, day] = dateParam.split('-').map(Number);

    let startDate: Date;
    let endDate: Date;

    if (type === 'daily') {
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else if (type === 'weekly') {
      // Get start of week (Sunday) in UTC
      const target = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const dayOfWeek = target.getUTCDay(); // 0 is Sunday
      startDate = new Date(target);
      startDate.setUTCDate(target.getUTCDate() - dayOfWeek);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);
    } else if (type === 'monthly') {
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    } else {
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }

    // Fetch patrol sessions in range (patrolDate is stored as UTC date)
    const sessions = await prisma.patrolSession.findMany({
      where: {
        patrolDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { name: true, employeeId: true } },
        schedule: { select: { name: true, startTime: true, endTime: true } },
        shift: { select: { name: true } },
        sessionFloors: {
          include: {
            patrolChecks: {
              include: {
                user: { select: { name: true, employeeId: true } },
              },
              orderBy: [
                { floorNameSnapshot: 'asc' },
                { roomOrderSnapshot: 'asc' },
                { checkedAt: 'asc' },
              ],
            },
          },
        },
      },
      orderBy: { patrolNumber: 'asc' },
    });

    // Timezone adjusted range for timestamp fields (createdAt) in Makassar (UTC+8)
    const makassarStart = new Date(startDate.getTime() - 8 * 3600 * 1000);
    const makassarEnd = new Date(endDate.getTime() - 8 * 3600 * 1000 + 86400000);

    // Fetch findings in range
    const findings = await prisma.finding.findMany({
      where: {
        createdAt: {
          gte: makassarStart,
          lte: makassarEnd,
        },
      },
      include: {
        user: { select: { name: true } },
        room: { select: { name: true, code: true } },
        check: {
          include: {
            photos: {
              select: {
                filePath: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
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
      startDate: startDate.toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }),
      endDate: endDate.toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }),
      totalSessions,
      completedSessions,
      completionRate,
      totalFindings,
      resolvedFindings,
      openFindings,
    };

    // Flatten all checks for checklist reports
    const checks: any[] = [];
    for (const s of sessions) {
      const sessionDate = s.patrolDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const rawDate = s.patrolDate.toISOString().split('T')[0];
      const shiftName = s.shift?.name || s.schedule?.name || `Patroli #${s.patrolNumber}`;
      for (const sf of s.sessionFloors) {
        for (const c of sf.patrolChecks) {
          checks.push({
            id: c.id,
            sessionId: s.id,
            sessionNumber: s.patrolNumber,
            date: sessionDate,
            rawDate,
            shiftName,
            officer: c.user?.name || s.user?.name || 'Petugas',
            officerEmployeeId: c.user?.employeeId || s.user?.employeeId || '-',
            floor: c.floorNameSnapshot,
            room: c.roomNameSnapshot,
            code: c.roomCodeSnapshot,
            acStatus: c.acStatus,
            lightStatus: c.lightStatus,
            condition: c.condition,
            remarks: c.remarks || null,
            time: new Date(c.checkedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' }),
            checkedAt: c.checkedAt,
          });
        }
      }
    }

    // Sort checks by date, floor, room
    checks.sort((a, b) => {
      if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
      if (a.floor !== b.floor) return a.floor.localeCompare(b.floor, undefined, { numeric: true });
      return a.room.localeCompare(b.room);
    });

    return NextResponse.json({
      summary,
      sessions: sessions.map(s => {
        const totalChecks = s.sessionFloors.reduce((sum, sf) => sum + sf.patrolChecks.length, 0);
        const findingChecks = s.sessionFloors.reduce((cnt, sf) => cnt + sf.patrolChecks.filter(c => c.condition === 'finding').length, 0);
        return {
          id: s.id,
          patrolNumber: s.patrolNumber,
          date: s.patrolDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          rawDate: s.patrolDate.toISOString().split('T')[0],
          scheduleName: s.schedule?.name || `Patroli #${s.patrolNumber}`,
          shiftName: s.shift?.name || 'Shift Pagi',
          startTime: s.schedule?.startTime || '',
          endTime: s.schedule?.endTime || '',
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          officer: s.user?.name || 'Petugas',
          officerEmployeeId: s.user?.employeeId || '-',
          status: s.status,
          floorCount: s.sessionFloors.length,
          checkedRoomsCount: totalChecks,
          findingCount: findingChecks,
        };
      }),
      checks,
      findings: findings.map(f => ({
        id: f.id,
        number: f.findingNumber,
        room: f.roomNameSnapshot || f.room?.name || 'Umum',
        floor: f.floorNameSnapshot || 'Umum',
        category: f.category,
        description: f.description,
        status: f.status,
        officer: f.user?.name || 'Petugas',
        date: f.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        photoUrl: f.check?.photos?.[0]?.filePath || null,
      }))
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
