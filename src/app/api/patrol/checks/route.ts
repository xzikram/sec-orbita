import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rooms as mockRooms } from '@/lib/dummy-data';

// POST /api/patrol/checks - Submit a room check
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { sessionFloorId, roomId, acStatus, lightStatus, condition, remarks } = body;

    let realRoomId = roomId;
    const isRoomDummy = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId) || roomId.startsWith('room-');

    if (isRoomDummy) {
      let mockRoom = mockRooms.find(r => r.id === roomId);
      if (!mockRoom) {
        const match = roomId.match(/^room-([a-z0-9]+)-(\d+)$/i);
        if (match) {
          const floorPart = match[1].toLowerCase();
          const numPart = String(match[2]).padStart(2, '0');
          const normalizedId = `room-${floorPart}-${numPart}`;
          mockRoom = mockRooms.find(r => r.id === normalizedId);
        }
      }
      if (!mockRoom) {
        const matchL1 = roomId.match(/^room-(\d+)$/i);
        if (matchL1) {
          const numPart = String(matchL1[1]).padStart(2, '0');
          const normalizedId = `room-l1-${numPart}`;
          mockRoom = mockRooms.find(r => r.id === normalizedId);
        }
      }

      if (mockRoom) {
        const dbRoom = await prisma.room.findUnique({ where: { code: mockRoom.code } });
        if (dbRoom) {
          realRoomId = dbRoom.id;
        }
      }
    }

    const room = await prisma.room.findUnique({ where: { id: realRoomId }, include: { floor: true } });
    if (!room) return NextResponse.json({ error: `Ruangan '${roomId}' tidak ditemukan` }, { status: 404 });

    let realSessionFloorId = sessionFloorId;
    const isDummy = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionFloorId) || sessionFloorId.startsWith('sf-');

    if (isDummy) {
      // Find the active schedule for current Makassar time
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat('id-ID', options);
      const parts = formatter.formatToParts(now);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const currentTime = `${hour}:${minute}`;

      const dbSchedules = await prisma.patrolSchedule.findMany({ where: { isActive: true } });
      let schedule = dbSchedules.find(s => {
        if (s.startTime < s.endTime) {
          return currentTime >= s.startTime && currentTime < s.endTime;
        }
        return currentTime >= s.startTime || currentTime < s.endTime;
      });

      if (!schedule) {
        schedule = dbSchedules[0] || await prisma.patrolSchedule.findFirst();
      }

      if (!schedule) {
        return NextResponse.json({ error: 'Jadwal patroli tidak ditemukan di database' }, { status: 400 });
      }

      // Find or create active PatrolSession for today
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      let session = await prisma.patrolSession.findUnique({
        where: {
          userId_scheduleId_patrolDate: {
            userId: auth.id,
            scheduleId: schedule.id,
            patrolDate,
          }
        },
        include: { sessionFloors: true }
      });

      if (!session) {
        const floors = await prisma.floor.findMany({ where: { isActive: true } });
        session = await prisma.patrolSession.create({
          data: {
            userId: auth.id,
            scheduleId: schedule.id,
            shiftId: auth.shiftId || '',
            patrolDate,
            patrolNumber: schedule.patrolNumber,
            status: 'in_progress',
            startedAt: new Date(),
            sessionFloors: {
              create: floors.map(f => ({
                floorId: f.id,
                floorNameSnapshot: f.name,
                floorCodeSnapshot: f.code,
              })),
            },
          },
          include: { sessionFloors: true }
        });
      }

      const sessionFloor = session.sessionFloors.find(sf => sf.floorId === room.floorId);
      if (!sessionFloor) {
        return NextResponse.json({ error: 'Lantai patroli tidak terdaftar di sesi aktif' }, { status: 400 });
      }

      realSessionFloorId = sessionFloor.id;
    }

    const check = await prisma.patrolCheck.create({
      data: {
        sessionFloorId: realSessionFloorId,
        roomId,
        userId: auth.id,
        roomNameSnapshot: room.name,
        roomCodeSnapshot: room.code,
        floorNameSnapshot: room.floor.name,
        roomOrderSnapshot: room.patrolOrder,
        acStatus: acStatus || 'not_available',
        lightStatus: lightStatus || 'off',
        condition: condition || 'normal',
        remarks,
        checkedAt: new Date(),
      },
    });

    // Update session floor status to in_progress
    await prisma.patrolSessionFloor.update({
      where: { id: realSessionFloorId },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'check_room', entityType: 'patrol_check', entityId: check.id },
    });

    return NextResponse.json(check, { status: 201 });
  } catch (error: unknown) {
    console.error('Check submission error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
