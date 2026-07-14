import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch the patrol session
    const session = await prisma.patrolSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { name: true, employeeId: true } },
        schedule: true,
        shift: true,
        sessionFloors: {
          include: {
            patrolChecks: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Patrol session not found' }, { status: 404 });
    }

    // 2. Map all checks by roomId for fast lookup
    const checksMap = new Map<string, any>();
    for (const sf of session.sessionFloors) {
      for (const chk of sf.patrolChecks) {
        checksMap.set(chk.roomId, chk);
      }
    }

    // 3. Fetch all active floors and rooms from database
    const dbFloors = await prisma.floor.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { patrolOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 4. Construct the report matrix
    const floorMatrix = dbFloors.map(floor => ({
      id: floor.id,
      code: floor.code,
      name: floor.name,
      rooms: floor.rooms.map(room => {
        const check = checksMap.get(room.id);
        return {
          id: room.id,
          code: room.code,
          name: room.name,
          hasAc: room.hasAc,
          hasLight: room.hasLight,
          check: check ? {
            id: check.id,
            acStatus: check.acStatus, // 'on' | 'off' | 'not_available'
            lightStatus: check.lightStatus, // 'on' | 'off'
            condition: check.condition, // 'normal' | 'finding'
            remarks: check.remarks,
            checkedAt: check.checkedAt,
          } : null,
        };
      }),
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        date: session.patrolDate,
        patrolNumber: session.patrolNumber,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        notes: session.notes,
        officer: session.user,
        schedule: session.schedule,
        shift: session.shift,
      },
      floors: floorMatrix,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    console.error('Patrol Book API error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
