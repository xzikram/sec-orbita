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
    // SHEET 2: LEMBAR CEKLIST RUANGAN LENGKAP
    // ----------------------------------------------------
    const checklistRows: any[][] = [
      ['RS MATA JEC ORBITA @ MAKASSAR'],
      ['LEMBAR BUKTI CEKLIST FISIK PEMERIKSAAN RUANGAN & FASILITAS'],
      ['Periode:', periodLabel],
      [],
      [
        'No',
        'Tanggal Patroli',
        'Waktu Scan (WITA)',
        'Shift / Sesi',
        'Petugas Security',
        'NIK',
        'Lantai',
        'Kode Ruangan',
        'Nama Ruangan',
        'Status AC',
        'Status Lampu',
        'Kondisi Fisik / Pintu',
        'Catatan / Temuan Lapangan',
      ],
    ];

    flatChecks.forEach((c, idx) => {
      checklistRows.push([
        idx + 1,
        c.date,
        c.timeWita,
        c.shift,
        c.officer,
        c.officerId,
        c.floor,
        c.code,
        c.room,
        c.acStatus,
        c.lightStatus,
        c.condition,
        c.remarks,
      ]);
    });

    if (flatChecks.length === 0) {
      checklistRows.push(['Belum ada data ceklist ruangan dalam rentang periode yang dipilih']);
    }

    const wsChecklist = XLSX.utils.aoa_to_sheet(checklistRows);
    wsChecklist['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 25 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsChecklist, 'Ceklist Ruangan');

    // ----------------------------------------------------
    // SHEET 3: REKAP TEMUAN KENDALA (FINDINGS)
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
