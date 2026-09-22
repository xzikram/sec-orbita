import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'supervisor' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily, weekly, monthly
    const dateParam = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    const shiftParam = searchParams.get('shift') || 'all'; // all, pagi, siang, malam
    const [year, month, day] = dateParam.split('-').map(Number);

    let startDate: Date;
    let endDate: Date;
    let periodLabel = '';
    let filenameSuffix = '';

    if (type === 'daily') {
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      periodLabel = `Harian - ${dateParam}`;
      filenameSuffix = `Harian_${dateParam}`;
    } else if (type === 'weekly') {
      const target = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const dayOfWeek = target.getUTCDay(); // 0 is Sunday
      startDate = new Date(target);
      startDate.setUTCDate(target.getUTCDate() - dayOfWeek);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      periodLabel = `Mingguan - ${startStr} s/d ${endStr}`;
      filenameSuffix = `Mingguan_${startStr}_sd_${endStr}`;
    } else if (type === 'monthly') {
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      periodLabel = `Bulanan - Periode ${year}-${String(month).padStart(2, '0')}`;
      filenameSuffix = `Bulanan_${year}_${String(month).padStart(2, '0')}`;
    } else if (type === 'compliance') {
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      periodLabel = `Form Kepatuhan Bulanan - ${year}-${String(month).padStart(2, '0')}`;
      filenameSuffix = `Form_Kepatuhan_Bulanan_${year}_${String(month).padStart(2, '0')}`;
    } else if (type === 'ranking') {
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      periodLabel = `Peringkat Kinerja Security - ${year}-${String(month).padStart(2, '0')}`;
      filenameSuffix = `Peringkat_Kinerja_Security_${year}_${String(month).padStart(2, '0')}`;
    } else {
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      periodLabel = `Harian - ${dateParam}`;
      filenameSuffix = `Harian_${dateParam}`;
    }

    // Fetch patrol sessions with checks and users
    const rawSessions = await prisma.patrolSession.findMany({
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
                findings: true,
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
      orderBy: [
        { patrolDate: 'asc' },
        { patrolNumber: 'asc' },
      ],
    });

    // Filter by shift if specified
    const sessions = rawSessions.filter(s => {
      if (shiftParam === 'all') return true;
      const sName = (s.shift?.name || '').toLowerCase();
      const schedName = (s.schedule?.name || '').toLowerCase();
      const startTime = s.schedule?.startTime || '';
      if (shiftParam === 'pagi') return sName.includes('pagi') || schedName.includes('pagi') || (startTime >= '06:00' && startTime < '14:00');
      if (shiftParam === 'siang') return sName.includes('siang') || schedName.includes('siang') || (startTime >= '14:00' && startTime < '22:00');
      if (shiftParam === 'malam') return sName.includes('malam') || schedName.includes('malam') || startTime >= '22:00' || startTime < '06:00';
      return true;
    });

    // Fetch findings in range
    const makassarStart = new Date(startDate.getTime() - 8 * 3600 * 1000);
    const makassarEnd = new Date(endDate.getTime() - 8 * 3600 * 1000 + 86400000);
    const findings = await prisma.finding.findMany({
      where: {
        createdAt: {
          gte: makassarStart,
          lte: makassarEnd,
        },
      },
      include: {
        user: { select: { name: true, employeeId: true } },
        room: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Flatten all checks
    interface FlatCheck {
      sessionNumber: number;
      date: string;
      shift: string;
      officer: string;
      officerId: string;
      floor: string;
      room: string;
      code: string;
      acStatus: string;
      lightStatus: string;
      condition: string;
      remarks: string;
      timeWita: string;
    }

    const flatChecks: FlatCheck[] = [];
    for (const s of sessions) {
      const sessionDate = s.patrolDate.toISOString().split('T')[0];
      const shiftName = s.shift?.name || s.schedule?.name || `Patroli #${s.patrolNumber}`;
      for (const sf of s.sessionFloors) {
        for (const c of sf.patrolChecks) {
          const timeWita = new Date(c.checkedAt).toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Makassar',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          const acLabel = c.acStatus === 'on' ? 'Menyala (ON)' : c.acStatus === 'off' ? 'Mati (OFF)' : 'Tidak Ada AC';
          const lightLabel = c.lightStatus === 'on' ? 'Menyala (ON)' : 'Padam (OFF)';
          const conditionLabel = c.condition === 'normal' ? 'Normal / Aman' : 'Ada Temuan Kendala';

          flatChecks.push({
            sessionNumber: s.patrolNumber,
            date: sessionDate,
            shift: shiftName,
            officer: c.user?.name || s.user?.name || 'Petugas',
            officerId: c.user?.employeeId || s.user?.employeeId || '-',
            floor: c.floorNameSnapshot,
            room: c.roomNameSnapshot,
            code: c.roomCodeSnapshot,
            acStatus: acLabel,
            lightStatus: lightLabel,
            condition: conditionLabel,
            remarks: c.remarks || '-',
            timeWita,
          });
        }
      }
    }

    // Sort checks by date, floor, room
    flatChecks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.floor !== b.floor) return a.floor.localeCompare(b.floor, undefined, { numeric: true });
      return a.room.localeCompare(b.room);
    });

    // Create Excel Workbook
    const wb = XLSX.utils.book_new();

    // ----------------------------------------------------
    // SHEET 1: RINGKASAN & SESI PATROLI
    // ----------------------------------------------------
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 100;
    const totalChecksCount = flatChecks.length;
    const totalFindingChecks = flatChecks.filter(c => c.condition.includes('Temuan')).length;

    const summaryRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR'],
      ['LAPORAN REKAPITULASI PATROLI & PEMERIKSAAN FASILITAS KEAMANAN'],
      ['Periode:', periodLabel],
      ['Filter Shift:', shiftParam.toUpperCase()],
      ['Tanggal Unduh:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA'],
      [],
      ['RINGKASAN STATISTIK EKSEKUTIF'],
      ['Indikator', 'Nilai', 'Satuan / Keterangan'],
      ['Total Sesi Patroli Terjadwal', totalSessions, 'Sesi'],
      ['Sesi Selesai (Completed)', completedSessions, 'Sesi'],
      ['Tingkat Kepatuhan Patroli', `${completionRate}%`, 'Persentase'],
      ['Total Titik Ruangan Diperiksa', totalChecksCount, 'Ruangan'],
      ['Pemeriksaan Normal / Aman', totalChecksCount - totalFindingChecks, 'Ruangan'],
      ['Pemeriksaan dengan Temuan', totalFindingChecks, 'Titik Masalah'],
      ['Total Temuan Masuk (Findings)', findings.length, 'Laporan'],
      ['Temuan Selesai Ditangani', findings.filter(f => f.status === 'resolved').length, 'Laporan'],
      [],
      ['DAFTAR SESI PATROLI OPERASIONAL'],
      ['No Sesi', 'Tanggal', 'Shift / Jadwal', 'Jam Mulai', 'Jam Selesai', 'Petugas Security', 'NIK', 'Status', 'Jml Ruangan Cek', 'Jml Temuan'],
    ];

    sessions.forEach(s => {
      const checksInSession = s.sessionFloors.reduce((acc, sf) => acc + sf.patrolChecks.length, 0);
      const findingsInSession = s.sessionFloors.reduce((acc, sf) => acc + sf.patrolChecks.filter(c => c.condition === 'finding').length, 0);
      summaryRows.push([
        `Patroli #${s.patrolNumber}`,
        s.patrolDate.toISOString().split('T')[0],
        s.shift?.name || s.schedule?.name || '-',
        s.schedule?.startTime || '-',
        s.schedule?.endTime || '-',
        s.user?.name || 'Petugas',
        s.user?.employeeId || '-',
        s.status.toUpperCase(),
        checksInSession,
        findingsInSession,
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

    // ----------------------------------------------------
    // SHEET 2: REKAP TEMUAN KENDALA (FINDINGS)
    // ----------------------------------------------------
    const findingsRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR'],
      ['BUKU REGISTER TEMUAN KENDALA FASILITAS & KEAMANAN'],
      ['Periode:', periodLabel],
      [],
      [
        'No Tiket',
        'Waktu Lapor (WITA)',
        'Lantai',
        'Ruangan',
        'Kategori',
        'Deskripsi Kendala',
        'Status',
        'Petugas Pelapor',
      ],
    ];

    findings.forEach(f => {
      const timeStr = f.createdAt.toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const statusLabel = f.status === 'resolved' ? 'SELESAI (RESOLVED)' : f.status === 'in_progress' ? 'SEDANG DIKERJAKAN' : 'BARU (OPEN)';

      findingsRows.push([
        f.findingNumber,
        timeStr,
        f.floorNameSnapshot || 'Umum',
        f.roomNameSnapshot || f.room?.name || 'Umum',
        f.category.toUpperCase(),
        f.description,
        statusLabel,
        f.user?.name || 'Petugas',
      ]);
    });

    if (findings.length === 0) {
      findingsRows.push(['Tidak ada temuan kendala dalam rentang periode ini']);
    }

    const wsFindings = XLSX.utils.aoa_to_sheet(findingsRows);
    wsFindings['!cols'] = [
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 40 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFindings, 'Temuan Kendala');

    // ----------------------------------------------------
    // SHEET 4: MATRIKS 8 SESI PATROLI (SHIFT PAGI & MALAM)
    // ----------------------------------------------------
    const allFloorsWithRooms = await prisma.floor.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { patrolOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Lookup of checks by roomId_p{patrolNumber} and roomCode_p{patrolNumber}
    const matrixCheckMap: Record<string, { condition: string; remarks: string | null }> = {};
    for (const s of sessions) {
      for (const sf of s.sessionFloors) {
        for (const c of sf.patrolChecks) {
          matrixCheckMap[`${c.roomId}_p${s.patrolNumber}`] = { condition: c.condition, remarks: c.remarks || null };
          matrixCheckMap[`${c.roomCodeSnapshot}_p${s.patrolNumber}`] = { condition: c.condition, remarks: c.remarks || null };
        }
      }
    }

    const matrixRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR'],
      ['MATRIKS KONTROL 8 SESI PATROLI KEAMANAN (SHIFT PAGI: P1-P4 | SHIFT MALAM: P5-P8)'],
      ['Periode:', periodLabel],
      ['Tanggal Unduh:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA'],
      [],
      [
        'No',
        'Lantai',
        'Kode',
        'Nama Ruangan',
        'P1 (07:00-10:00) [Shift Pagi]',
        'P2 (10:00-13:00) [Shift Pagi]',
        'P3 (13:00-16:00) [Shift Pagi]',
        'P4 (16:00-19:00) [Shift Pagi]',
        'P5 (19:00-22:00) [Shift Malam]',
        'P6 (22:00-01:00) [Shift Malam]',
        'P7 (01:00-04:00) [Shift Malam]',
        'P8 (04:00-07:00) [Shift Malam]',
        'Total Sesi Diperiksa',
      ],
    ];

    let roomCounter = 1;
    for (const fl of allFloorsWithRooms) {
      for (const rm of fl.rooms) {
        const row: any[] = [
          roomCounter++,
          fl.name,
          rm.code,
          rm.name,
        ];
        let checkedCountForRoom = 0;
        for (let p = 1; p <= 8; p++) {
          const chk = matrixCheckMap[`${rm.id}_p${p}`] || matrixCheckMap[`${rm.code}_p${p}`];
          if (chk) {
            checkedCountForRoom++;
            row.push(chk.condition === 'normal' ? '✓' : '! Temuan');
          } else {
            row.push('—');
          }
        }
        row.push(`${checkedCountForRoom}/8`);
        matrixRows.push(row);
      }
    }

    // Summary footer for the 8 patrols
    const roomsCheckedRow: any[] = ['REKAP', 'TOTAL CEK', 'RUANGAN', '->'];
    const scheduleStatusRow: any[] = ['STATUS', 'SESI PATROLI', 'STATUS JALAN', '->'];
    const officerRow: any[] = ['PETUGAS', 'SECURITY', 'BERTUGAS', '->'];

    for (let p = 1; p <= 8; p++) {
      const matchSess = sessions.find(s => s.patrolNumber === p);
      const totalChecksInP = matchSess
        ? matchSess.sessionFloors.reduce((sum, sf) => sum + sf.patrolChecks.length, 0)
        : 0;

      roomsCheckedRow.push(`${totalChecksInP} Ruangan`);
      scheduleStatusRow.push(totalChecksInP > 0 ? '✓ JALAN' : '✗ TIDAK JALAN');
      officerRow.push(matchSess?.user?.name || '—');
    }
    roomsCheckedRow.push('');
    scheduleStatusRow.push('');
    officerRow.push('');

    matrixRows.push([]);
    matrixRows.push(roomsCheckedRow);
    matrixRows.push(scheduleStatusRow);
    matrixRows.push(officerRow);

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
    wsMatrix['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 26 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
    ];
    // ----------------------------------------------------
    // SHEET: FORM KEPATUHAN BULANAN (2 SISI SEJAJAR: TGL 1-16 & 17-31)
    // ----------------------------------------------------
    const targetYear = year;
    const targetMonth = month;
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const targetMonthName = monthNamesIndo[targetMonth - 1] || `Bulan ${targetMonth}`;

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const [totalActiveRooms, dbSchedulesForCompliance, monthlySessions, securityUsersForRanking] = await Promise.all([
      prisma.room.count({ where: { isActive: true } }),
      prisma.patrolSchedule.findMany({ where: { isActive: true }, orderBy: { patrolNumber: 'asc' } }),
      prisma.patrolSession.findMany({
        where: {
          patrolDate: { gte: monthStart, lte: monthEnd },
        },
        include: {
          user: { select: { name: true, employeeId: true } },
          schedule: { select: { name: true, startTime: true, endTime: true } },
          sessionFloors: {
            include: {
              patrolChecks: {
                select: { id: true, condition: true, checkedAt: true },
              },
            },
          },
        },
        orderBy: [{ patrolDate: 'asc' }, { patrolNumber: 'asc' }],
      }),
      prisma.user.findMany({
        where: { role: 'security' },
        select: {
          id: true,
          name: true,
          employeeId: true,
          patrolSessions: {
            where: { patrolDate: { gte: monthStart, lte: monthEnd } },
            select: { id: true, status: true },
          },
          findings: {
            where: {
              createdAt: {
                gte: new Date(monthStart.getTime() - 8 * 3600 * 1000),
                lte: new Date(monthEnd.getTime() - 8 * 3600 * 1000 + 86400000),
              },
            },
            select: { id: true },
          },
          achievements: { select: { badge: true } },
        },
      }),
    ]);

    const complianceMap: Record<string, typeof monthlySessions[0]> = {};
    monthlySessions.forEach(s => {
      const dStr = s.patrolDate.toISOString().split('T')[0];
      complianceMap[`${dStr}_${s.patrolNumber}`] = s;
    });

    const complianceRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`FORM KEPATUHAN PATROLI KEAMANAN BULAN ${targetMonthName.toUpperCase()} ${targetYear}`, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`Periode: 01 s/d ${daysInTargetMonth} ${targetMonthName} ${targetYear} • Total Titik Ruangan: ${totalActiveRooms}`, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [],
      [
        'Tanggal', 'Jam Terjadwal', 'Jam Realisasi', '% Kepatuhan', 'Ruangan Cek', 'Paraf (Petugas)', 'Keterangan',
        '',
        'Tanggal', 'Jam Terjadwal', 'Jam Realisasi', '% Kepatuhan', 'Ruangan Cek', 'Paraf (Petugas)', 'Keterangan',
      ],
    ];

    // Build 128 rows (16 days * 8 slots)
    for (let r = 0; r < 128; r++) {
      const leftDay = Math.floor(r / 8) + 1; // 1..16
      const leftSlot = r % 8; // 0..7
      const schLeft = dbSchedulesForCompliance[leftSlot];

      const rightDay = Math.floor(r / 8) + 17; // 17..32
      const rightSlot = r % 8;
      const schRight = dbSchedulesForCompliance[rightSlot];

      const rowData: any[] = [];

      // Left Column Block (Day 1-16)
      if (leftDay <= 16 && schLeft) {
        const leftDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(leftDay).padStart(2, '0')}`;
        const sessLeft = complianceMap[`${leftDateStr}_${schLeft.patrolNumber}`];
        const dayLabel = leftSlot === 0 ? String(leftDay) : '';
        const schedRange = `${schLeft.startTime} - ${schLeft.endTime}`;

        if (sessLeft) {
          const checks = sessLeft.sessionFloors.flatMap(sf => sf.patrolChecks);
          const checkedCount = checks.length;
          let rate = totalActiveRooms > 0 ? Math.min(100, Math.round((checkedCount / totalActiveRooms) * 100)) : 100;
          if ((sessLeft.status === 'completed' && rate >= 95) || rate >= 99) {
            rate = 100;
          }
          const findings = checks.filter(c => c.condition === 'finding').length;

          let timeStr = '—';
          if (sessLeft.startedAt && sessLeft.completedAt) {
            const startWita = new Date(sessLeft.startedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
            const endWita = new Date(sessLeft.completedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
            const dur = Math.round((sessLeft.completedAt.getTime() - sessLeft.startedAt.getTime()) / (1000 * 60));
            timeStr = `${startWita} - ${endWita} (${dur}m)`;
          }

          rowData.push(
            dayLabel,
            schedRange,
            timeStr,
            `${rate}%`,
            `${checkedCount}/${totalActiveRooms}`,
            sessLeft.user?.name || 'Petugas',
            findings > 0 ? `${findings} Temuan` : (sessLeft.notes || 'Aman'),
          );
        } else {
          rowData.push(
            dayLabel,
            schedRange,
            '—',
            '0%',
            `0/${totalActiveRooms}`,
            '—',
            'Belum Berjalan',
          );
        }
      } else {
        rowData.push('', '', '', '', '', '', '');
      }

      // Separator column
      rowData.push('');

      // Right Column Block (Day 17-31)
      if (rightDay <= daysInTargetMonth && schRight) {
        const rightDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(rightDay).padStart(2, '0')}`;
        const sessRight = complianceMap[`${rightDateStr}_${schRight.patrolNumber}`];
        const dayLabel = rightSlot === 0 ? String(rightDay) : '';
        const schedRange = `${schRight.startTime} - ${schRight.endTime}`;

        if (sessRight) {
          const checks = sessRight.sessionFloors.flatMap(sf => sf.patrolChecks);
          const checkedCount = checks.length;
          let rate = totalActiveRooms > 0 ? Math.min(100, Math.round((checkedCount / totalActiveRooms) * 100)) : 100;
          if ((sessRight.status === 'completed' && rate >= 95) || rate >= 99) {
            rate = 100;
          }
          const findings = checks.filter(c => c.condition === 'finding').length;

          let timeStr = '—';
          if (sessRight.startedAt && sessRight.completedAt) {
            const startWita = new Date(sessRight.startedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
            const endWita = new Date(sessRight.completedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
            const dur = Math.round((sessRight.completedAt.getTime() - sessRight.startedAt.getTime()) / (1000 * 60));
            timeStr = `${startWita} - ${endWita} (${dur}m)`;
          }

          rowData.push(
            dayLabel,
            schedRange,
            timeStr,
            `${rate}%`,
            `${checkedCount}/${totalActiveRooms}`,
            sessRight.user?.name || 'Petugas',
            findings > 0 ? `${findings} Temuan` : (sessRight.notes || 'Aman'),
          );
        } else {
          rowData.push(
            dayLabel,
            schedRange,
            '—',
            '0%',
            `0/${totalActiveRooms}`,
            '—',
            'Belum Berjalan',
          );
        }
      } else {
        rowData.push('', '', '', '', '', '', '');
      }

      complianceRows.push(rowData);
    }

    const wsCompliance = XLSX.utils.aoa_to_sheet(complianceRows);
    wsCompliance['!cols'] = [
      { wch: 8 },  // A: Tanggal
      { wch: 15 }, // B: Jam Terjadwal
      { wch: 20 }, // C: Jam Realisasi
      { wch: 14 }, // D: % Kepatuhan
      { wch: 14 }, // E: Ruangan Cek
      { wch: 20 }, // F: Paraf
      { wch: 22 }, // G: Keterangan
      { wch: 4 },  // H: Separator
      { wch: 8 },  // I: Tanggal
      { wch: 15 }, // J: Jam Terjadwal
      { wch: 20 }, // K: Jam Realisasi
      { wch: 14 }, // L: % Kepatuhan
      { wch: 14 }, // M: Ruangan Cek
      { wch: 20 }, // N: Paraf
      { wch: 22 }, // O: Keterangan
    ];

    // ----------------------------------------------------
    // SHEET: PERINGKAT KINERJA SECURITY (RANKING)
    // ----------------------------------------------------
    const userLeaderboard = securityUsersForRanking.map(u => {
      const completed = u.patrolSessions.filter(s => s.status === 'completed').length;
      const total = u.patrolSessions.length;
      const onTimeRate = total > 0 ? Math.round((completed / total) * 100) : (completed > 0 ? 100 : 0);
      const findingsCount = u.findings.length;
      const missed = u.patrolSessions.filter(s => s.status !== 'completed').length;
      const score = Math.max(0, (completed * 10) + Math.round(onTimeRate * 0.5) + (findingsCount * 15) - (missed * 20));
      return {
        ...u,
        completed,
        total,
        onTimeRate,
        findingsCount,
        missed,
        score,
        badges: u.achievements.map(a => a.badge).join(', ') || '-',
      };
    }).sort((a, b) => b.score - a.score || b.completed - a.completed);

    const rankingRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR'],
      [`LAPORAN PERINGKAT & EVALUASI KINERJA SECURITY BULAN ${targetMonthName.toUpperCase()} ${targetYear}`],
      [`Periode: ${targetMonthName} ${targetYear} • Tanggal Unduh: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA`],
      [],
      ['Peringkat', 'NIK', 'Nama Petugas Security', 'Total Sesi Patroli', 'Tingkat Kepatuhan (%)', 'Temuan Kerusakan Dilaporkan', 'Skor Disiplin', 'Piala / Badges'],
    ];

    userLeaderboard.forEach((u, idx) => {
      const medal = idx === 0 ? 'Juara 1 🥇' : idx === 1 ? 'Juara 2 🥈' : idx === 2 ? 'Juara 3 🥉' : `Peringkat #${idx + 1}`;
      rankingRows.push([
        medal,
        u.employeeId || '-',
        u.name,
        `${u.completed} Sesi`,
        `${u.onTimeRate}%`,
        `${u.findingsCount} Laporan`,
        u.score,
        u.badges,
      ]);
    });

    const wsRanking = XLSX.utils.aoa_to_sheet(rankingRows);
    wsRanking['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 25 },
      { wch: 18 },
      { wch: 22 },
      { wch: 26 },
      { wch: 16 },
      { wch: 30 },
    ];

    // ----------------------------------------------------
    // APPEND SHEETS BASED ON EXPORT TYPE
    // ----------------------------------------------------
    if (type === 'compliance') {
      XLSX.utils.book_append_sheet(wb, wsCompliance, 'Form Kepatuhan Bulanan');
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Peringkat Kinerja Security');
    } else if (type === 'ranking') {
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Peringkat Kinerja Security');
      XLSX.utils.book_append_sheet(wb, wsCompliance, 'Form Kepatuhan Bulanan');
    } else if (type === 'monthly') {
      XLSX.utils.book_append_sheet(wb, wsCompliance, 'Form Kepatuhan Bulanan');
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Peringkat Kinerja Security');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');
      XLSX.utils.book_append_sheet(wb, wsFindings, 'Temuan Kendala');
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks 8 Patroli');
    } else {
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');
      XLSX.utils.book_append_sheet(wb, wsFindings, 'Temuan Kendala');
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks 8 Patroli');
    }

    // Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Laporan_Patroli_JEC_ORBITA_${filenameSuffix}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to export excel report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
