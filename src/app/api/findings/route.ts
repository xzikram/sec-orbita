import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rooms as mockRooms, floors as mockFloors } from '@/lib/dummy-data';

// GET /api/findings - List findings (with pagination)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== 'all') where.status = status;
  if (auth.role === 'security') where.userId = auth.id;

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      include: {
        user: { select: { name: true, employeeId: true } },
        updates: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.finding.count({ where }),
  ]);

  return NextResponse.json({ data: findings, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST /api/findings - Create a finding
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();

    // Generate finding number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.finding.count({ where: { findingNumber: { startsWith: `FND-${today}` } } });
    const findingNumber = `FND-${today}-${String(count + 1).padStart(3, '0')}`;

    let realCheckId = body.checkId || null;
    let realSessionId = body.sessionId || null;

    const isCheckDummy = realCheckId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realCheckId) || realCheckId.startsWith('check-'));
    const isSessionDummy = realSessionId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realSessionId) || realSessionId.startsWith('session-'));

    let realRoomId = body.roomId || null;
    const isRoomDummy = realRoomId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realRoomId) || realRoomId.startsWith('room-'));
    if (isRoomDummy) {
      const mockRoom = mockRooms.find(r => r.id === realRoomId);
      if (mockRoom) {
        const dbRoom = await prisma.room.findUnique({ where: { code: mockRoom.code } });
        if (dbRoom) realRoomId = dbRoom.id;
      }
    }

    let realFloorId = body.floorId || null;
    const isFloorDummy = realFloorId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realFloorId) || realFloorId.startsWith('floor-'));
    if (isFloorDummy) {
      const mockFloor = mockFloors.find(f => f.id === realFloorId);
      if (mockFloor) {
        const dbFloor = await prisma.floor.findUnique({ where: { code: mockFloor.code } });
        if (dbFloor) realFloorId = dbFloor.id;
      }
    }

    if (isCheckDummy) {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      const recentCheck = await prisma.patrolCheck.findFirst({
        where: {
          roomId: realRoomId || undefined,
          userId: auth.id,
          checkedAt: {
            gte: patrolDate
          }
        },
        orderBy: { checkedAt: 'desc' }
      });
      realCheckId = recentCheck ? recentCheck.id : null;
    }

    if (isSessionDummy || !realSessionId || realSessionId.startsWith('session-')) {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      const recentSession = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate
        },
        orderBy: { startedAt: 'desc' }
      });
      realSessionId = recentSession ? recentSession.id : null;
    }

    const finding = await prisma.finding.create({
      data: {
        findingNumber,
        checkId: realCheckId,
        sessionId: realSessionId,
        userId: auth.id,
        floorId: realFloorId,
        roomId: realRoomId,
        floorNameSnapshot: body.floorNameSnapshot || '',
        roomNameSnapshot: body.roomNameSnapshot || '',
        category: body.category || 'lainnya',
        description: body.description,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'create_finding', entityType: 'finding', entityId: finding.id },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error: unknown) {
    console.error('Finding creation error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
