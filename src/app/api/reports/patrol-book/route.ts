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
            patrolChecks: {
              include: {
                photos: true,
                findings: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Patrol session not found' }, { status: 404 });
    }

    // 2. Map all checks by roomId and roomCodeSnapshot for 100% reliable matching
    const checksMap = new Map<string, any>();
    const sessionFloorMap = new Map<string, any>();
    for (const sf of session.sessionFloors) {
      if (sf.floorId) sessionFloorMap.set(sf.floorId, sf);
      if (sf.floorCodeSnapshot) sessionFloorMap.set(sf.floorCodeSnapshot.toUpperCase(), sf);

      for (const chk of sf.patrolChecks) {
        if (chk.roomId) checksMap.set(chk.roomId, chk);
        if (chk.roomCodeSnapshot) checksMap.set(chk.roomCodeSnapshot.toUpperCase(), chk);
      }
    }

    // 3. Fetch all active floors and rooms from database
    let dbFloors = await prisma.floor.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { patrolOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Fallback to static floor catalog if DB floors are empty
    if (dbFloors.length === 0) {
      const { floors: mockFloors, getRoomsByFloor } = await import('@/lib/dummy-data');
      dbFloors = mockFloors.map(f => ({
        ...f,
        rooms: getRoomsByFloor(f.id) as any,
      })) as any;
    }

    // 4. Construct the report matrix
    const floorMatrix = dbFloors.map(floor => {
      const sf = sessionFloorMap.get(floor.id) || sessionFloorMap.get(floor.code.toUpperCase());
      return {
        id: floor.id,
        code: floor.code,
        name: floor.name,
        qrValidated: sf?.qrValidated || false,
        qrScannedAt: sf?.qrScannedAt || null,
        floorStatus: sf?.status || 'pending',
        rooms: floor.rooms.map((room: any) => {
          const check = checksMap.get(room.id) || (room.code ? checksMap.get(room.code.toUpperCase()) : null);
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
              photos: (check.photos || []).map((p: any) => ({
                id: p.id,
                filePath: p.filePath,
                thumbnailPath: p.thumbnailPath,
              })),
              findings: (check.findings || []).map((f: any) => ({
                id: f.id,
                findingNumber: f.findingNumber,
                category: f.category,
                description: f.description,
                status: f.status,
              })),
            } : null,
          };
        }),
      };
    });

    return NextResponse.json({
      session: {
        id: session.id,
        date: session.patrolDate,
        patrolNumber: session.patrolNumber,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        notes: session.notes,
        officer: session.user || { name: 'Petugas Security', employeeId: 'SEC' },
        schedule: session.schedule || { name: 'Jadwal Patroli', startTime: '00:00', endTime: '00:00' },
        shift: session.shift || { name: 'Shift Patroli' },
      },
      floors: floorMatrix,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    console.error('Patrol Book API error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
