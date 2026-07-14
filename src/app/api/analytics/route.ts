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
    const type = searchParams.get('type') || 'all';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Fetch findings for aggregations
    const allFindings = await prisma.finding.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo }
      },
      select: {
        id: true,
        roomId: true,
        roomNameSnapshot: true,
        floorId: true,
        floorNameSnapshot: true,
        createdAt: true,
        category: true,
        status: true
      }
    });

    // 1. Heatmap Data (Findings count per floor & room)
    const heatmap: Record<string, { floorName: string; rooms: Record<string, { count: number; name: string }> }> = {};
    allFindings.forEach(f => {
      const floorKey = f.floorNameSnapshot || 'Unknown Floor';
      const roomKey = f.roomNameSnapshot || 'Unknown Room';

      if (!heatmap[floorKey]) {
        heatmap[floorKey] = { floorName: floorKey, rooms: {} };
      }

      if (!heatmap[floorKey].rooms[roomKey]) {
        heatmap[floorKey].rooms[roomKey] = { count: 0, name: roomKey };
      }

      heatmap[floorKey].rooms[roomKey].count++;
    });

    const heatmapFormatted = Object.values(heatmap).map(floorItem => ({
      floorName: floorItem.floorName,
      rooms: Object.values(floorItem.rooms)
    }));

    // 2. Trend (Findings per day for last 90 days)
    const trendMap: Record<string, number> = {};
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      trendMap[dateStr] = 0;
    }

    allFindings.forEach(f => {
      const dateStr = f.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (dateStr in trendMap) {
        trendMap[dateStr]++;
      }
    });

    const trend = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count
    }));

    // 3. Peak Hours (Findings by hour of day 0-23)
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count: 0
    }));

    allFindings.forEach(f => {
      // Get hour in local time (Makassar)
      const hour = new Date(f.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Makassar' })).getHours();
      if (hour >= 0 && hour < 24) {
        peakHours[hour].count++;
      }
    });

    // 4. Recurring issues (rooms with > 3 findings in last 90 days)
    const roomFindingsMap: Record<string, { roomId: string; name: string; floor: string; count: number; categories: string[] }> = {};
    allFindings.forEach(f => {
      if (!f.roomId) return;
      if (!roomFindingsMap[f.roomId]) {
        roomFindingsMap[f.roomId] = {
          roomId: f.roomId,
          name: f.roomNameSnapshot,
          floor: f.floorNameSnapshot,
          count: 0,
          categories: []
        };
      }
      roomFindingsMap[f.roomId].count++;
      if (!roomFindingsMap[f.roomId].categories.includes(f.category)) {
        roomFindingsMap[f.roomId].categories.push(f.category);
      }
    });

    const recurring = Object.values(roomFindingsMap)
      .filter(item => item.count >= 3)
      .sort((a, b) => b.count - a.count);

    // Generate Smart Recommendations
    const recommendations: { level: 'red' | 'yellow' | 'green'; text: string }[] = [];
    recurring.forEach(item => {
      const catsStr = item.categories.map(c => c.toUpperCase()).join(', ');
      if (item.count >= 5) {
        recommendations.push({
          level: 'red',
          text: `🚨 ${item.name} (${item.floor}): Ditemukan ${item.count} temuan (${catsStr}) dalam 90 hari terakhir. Diperlukan tindakan perbaikan menyeluruh segera.`
        });
      } else {
        recommendations.push({
          level: 'yellow',
          text: `🟡 ${item.name} (${item.floor}): Ditemukan ${item.count} masalah berulang. Silakan hubungi tim fasilitas untuk pengecekan berkala.`
        });
      }
    });

    if (recommendations.length === 0) {
      recommendations.push({
        level: 'green',
        text: '🟢 Semua area dalam kondisi normal. Tidak ada tren temuan berulang yang signifikan dalam 90 hari terakhir.'
      });
    }

    return NextResponse.json({
      heatmap: heatmapFormatted,
      trend,
      peakHours,
      recurring,
      recommendations
    });
  } catch (error) {
    console.error('Failed to calculate analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
