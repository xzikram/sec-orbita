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
    const now = new Date();
    // Default to current year & month in Makassar
    const makassarStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); // YYYY-MM-DD
    const [defYear, defMonth] = makassarStr.split('-').map(Number);

    const year = parseInt(searchParams.get('year') || String(defYear), 10);
    const month = parseInt(searchParams.get('month') || String(defMonth), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Parameter tahun atau bulan tidak valid' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Last day of month
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(year, month, 0).getDate();

    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNamesIndo[month - 1];

    // Fetch total active rooms & 8 schedules
    const [totalRooms, dbSchedules] = await Promise.all([
      prisma.room.count({ where: { isActive: true } }),
      prisma.patrolSchedule.findMany({
        where: { isActive: true },
        orderBy: { patrolNumber: 'asc' },
      }),
    ]);

    // Fetch patrol sessions in this month
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
              select: {
                id: true,
                condition: true,
                remarks: true,
                checkedAt: true,
              },
            },
          },
        },
      },
      orderBy: [
        { patrolDate: 'asc' },
        { patrolNumber: 'asc' },
      ],
    });

    // Map sessions by dateString_patrolNumber
    const sessionMap: Record<string, typeof sessions[0]> = {};
    sessions.forEach(s => {
      const dStr = s.patrolDate.toISOString().split('T')[0];
      sessionMap[`${dStr}_${s.patrolNumber}`] = s;
    });

    // Generate day-by-day structure
    const daysData = [];
    let totalRunSessions = 0;
    let perfectSessionsCount = 0;
    let partialSessionsCount = 0;
    let totalChecksSum = 0;
    let totalFindingsInMonth = 0;

    const dayNameShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(Date.UTC(year, month - 1, day));
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeekName = dayNameShort[dayDate.getUTCDay()];

      const daySessions = [];

      for (const sch of dbSchedules) {
        const sess = sessionMap[`${dayStr}_${sch.patrolNumber}`];
        if (sess) {
          totalRunSessions++;
          const allChecks = sess.sessionFloors.flatMap(sf => sf.patrolChecks);
          const checkedCount = allChecks.length;
          totalChecksSum += checkedCount;

          const findingsInSession = allChecks.filter(c => c.condition === 'finding');
          totalFindingsInMonth += findingsInSession.length;

          let rate = totalRooms > 0 ? Math.min(100, Math.round((checkedCount / totalRooms) * 100)) : 100;
          // Sesi yang sudah berstatus resmi 'completed' atau mencapai >= 99% (toleransi 1 ruangan dinonaktifkan/dihapus di master) dianggap 100% tuntas
          if ((sess.status === 'completed' && rate >= 95) || rate >= 99) {
            rate = 100;
          }
          if (rate === 100) perfectSessionsCount++;
          else if (rate > 0) partialSessionsCount++;

          // Actual execution time formatting
          let actualTimeStr = '—';
          if (sess.startedAt) {
            const startWita = new Date(sess.startedAt).toLocaleTimeString('id-ID', {
              timeZone: 'Asia/Makassar',
              hour: '2-digit',
              minute: '2-digit',
            });
            if (sess.completedAt) {
              const endWita = new Date(sess.completedAt).toLocaleTimeString('id-ID', {
                timeZone: 'Asia/Makassar',
                hour: '2-digit',
                minute: '2-digit',
              });
              const durMins = Math.round((sess.completedAt.getTime() - sess.startedAt.getTime()) / (1000 * 60));
              actualTimeStr = `${startWita} - ${endWita} (${durMins}m)`;
            } else {
              actualTimeStr = `${startWita} - Aktif`;
            }
          }

          let remarksText = sess.notes || '';
          if (findingsInSession.length > 0) {
            remarksText = `${findingsInSession.length} Temuan${remarksText ? ` • ${remarksText}` : ''}`;
          }

          daySessions.push({
            patrolNumber: sch.patrolNumber,
            scheduleName: sch.name,
            scheduledRange: `${sch.startTime} - ${sch.endTime}`,
            startTime: sch.startTime,
            endTime: sch.endTime,
            shiftName: sch.patrolNumber <= 4 ? 'Pagi' : 'Malam',
            isRun: true,
            status: sess.status,
            actualTimeRange: actualTimeStr,
            checkedRooms: checkedCount,
            totalRooms,
            complianceRate: rate,
            officer: sess.user?.name || 'Petugas',
            officerEmployeeId: sess.user?.employeeId || '-',
            findingsCount: findingsInSession.length,
            remarks: remarksText || 'Aman terkendali',
          });
        } else {
          daySessions.push({
            patrolNumber: sch.patrolNumber,
            scheduleName: sch.name,
            scheduledRange: `${sch.startTime} - ${sch.endTime}`,
            startTime: sch.startTime,
            endTime: sch.endTime,
            shiftName: sch.patrolNumber <= 4 ? 'Pagi' : 'Malam',
            isRun: false,
            status: 'not_run',
            actualTimeRange: '—',
            checkedRooms: 0,
            totalRooms,
            complianceRate: 0,
            officer: '—',
            officerEmployeeId: '—',
            findingsCount: 0,
            remarks: 'Terlewat / Belum Berjalan',
          });
        }
      }

      daysData.push({
        day,
        date: dayStr,
        dayOfWeek: dayOfWeekName,
        sessions: daySessions,
      });
    }

    const totalScheduledSessions = daysInMonth * dbSchedules.length;
    const missedSessionsCount = totalScheduledSessions - totalRunSessions;
    const overallRate = totalScheduledSessions > 0
      ? Math.round((totalRunSessions / totalScheduledSessions) * 100)
      : 0;

    return NextResponse.json({
      period: {
        year,
        month,
        monthName,
        label: `Bulan ${monthName} ${year}`,
        daysInMonth,
        totalRooms,
      },
      summary: {
        totalScheduledSessions,
        totalRunSessions,
        missedSessionsCount,
        overallRate,
        perfectSessionsCount,
        partialSessionsCount,
        totalChecksSum,
        totalFindingsInMonth,
      },
      days: daysData,
    });
  } catch (error) {
    console.error('Failed to generate monthly compliance report:', error);
    return NextResponse.json({ error: 'Gagal menghasilkan data kepatuhan bulanan' }, { status: 500 });
  }
}
