import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/patrol/photos - Get patrol photos for gallery
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const condition = searchParams.get('condition'); // 'normal' | 'finding' | 'all'
  const floorName = searchParams.get('floorName');
  const limit = parseInt(searchParams.get('limit') || '60');

  try {
    const where: any = {};
    if (condition && condition !== 'all') {
      where.check = { condition };
    }
    if (floorName && floorName !== 'all') {
      where.check = {
        ...(where.check || {}),
        floorNameSnapshot: floorName,
      };
    }

    const photos = await prisma.patrolPhoto.findMany({
      where,
      include: {
        user: { select: { name: true, employeeId: true } },
        check: {
          select: {
            id: true,
            roomNameSnapshot: true,
            roomCodeSnapshot: true,
            floorNameSnapshot: true,
            acStatus: true,
            lightStatus: true,
            condition: true,
            checkedAt: true,
            sessionFloor: {
              select: {
                session: {
                  select: {
                    id: true,
                    patrolNumber: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = photos.map(p => ({
      id: p.id,
      sessionId: p.check.sessionFloor?.session?.id || '',
      patrolNumber: p.check.sessionFloor?.session?.patrolNumber || 1,
      floorName: p.check.floorNameSnapshot,
      roomName: p.check.roomNameSnapshot,
      roomCode: p.check.roomCodeSnapshot,
      officerName: p.user?.name || 'Petugas',
      takenAt: p.createdAt.toISOString(),
      acStatus: p.check.acStatus === 'not_available' ? '-' : p.check.acStatus.toUpperCase(),
      lightStatus: p.check.lightStatus.toUpperCase(),
      condition: p.check.condition === 'finding' ? 'Temuan' : 'Normal',
      url: p.filePath,
      thumbnailUrl: p.thumbnailPath || p.filePath,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error('Fetch photos error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
