import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rooms as mockRooms } from '@/lib/dummy-data';
import { resolveShiftForSchedule } from '@/lib/shifts';

// POST /api/patrol/checks - Submit a room check
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionFloorId, roomId, acStatus, lightStatus, condition, remarks, photoBase64 } = body;

    let realRoomId = roomId;
    const isRoomDummy = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId) || roomId.startsWith('room-');

    if (isRoomDummy) {
      let mockRoom = mockRooms.find(r => r.id === roomId || r.code.toLowerCase() === roomId.toLowerCase());
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

    let room = await prisma.room.findUnique({ where: { id: realRoomId }, include: { floor: true } });
    if (!room) {
      const cleanCode = roomId.replace(/^room-/, '').toUpperCase();
      room = await prisma.room.findUnique({ where: { code: cleanCode }, include: { floor: true } });
    }
    if (!room) {
      room = await prisma.room.findFirst({
        where: {
          OR: [
            { id: realRoomId },
            { code: { equals: roomId } }
          ]
        },
        include: { floor: true }
      });
    }
    if (!room) return NextResponse.json({ error: `Ruangan '${roomId}' tidak ditemukan` }, { status: 404 });

    let realSessionFloorId = sessionFloorId;
    const isDummy = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionFloorId) || sessionFloorId.startsWith('sf-');

    if (isDummy) {
      // Today date in Makassar time
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      // Check if there is an in_progress session today (collaborative team round)
      let session = await prisma.patrolSession.findFirst({
        where: {
          patrolDate,
          status: 'in_progress',
        },
        include: { sessionFloors: { include: { floor: true } } },
        orderBy: { startedAt: 'desc' },
      });

      if (!session) {
        // Find all active schedules
        const dbSchedules = await prisma.patrolSchedule.findMany({
          where: { isActive: true },
          orderBy: { patrolNumber: 'asc' },
        });

        if (dbSchedules.length === 0) {
          return NextResponse.json({ error: 'Jadwal patroli belum dikonfigurasi' }, { status: 400 });
        }

        // Check which schedules already completed today
        const completedSessions = await prisma.patrolSession.findMany({
          where: {
            patrolDate,
            status: { in: ['completed', 'incomplete'] },
          },
          select: { scheduleId: true },
        });
        const completedScheduleIds = new Set(completedSessions.map(s => s.scheduleId));

        // Get current Makassar time
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const currentMins = hour * 60 + minute;

        // Smart flexible schedule picker (Early start buffer: up to 60 minutes before start)
        const uncompleted = dbSchedules.filter(s => !completedScheduleIds.has(s.id));
        let selectedSchedule = uncompleted[0] || dbSchedules[0];
        let isEarlyStart = false;

        const parseMins = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        for (const s of uncompleted) {
          const startMins = parseMins(s.startTime);
          let endMins = parseMins(s.endTime);
          if (endMins <= startMins) endMins += 24 * 60; // crosses midnight

          // 60-minute early buffer window
          const earlyBufferStart = startMins - 60;
          let testCurrent = currentMins;
          if (testCurrent < earlyBufferStart && earlyBufferStart < 0) {
            testCurrent += 24 * 60;
          }

          if (testCurrent >= earlyBufferStart && testCurrent < endMins) {
            selectedSchedule = s;
            isEarlyStart = testCurrent < startMins;
            break;
          }
        }

        const schedule = selectedSchedule;

        // Check if session for this schedule already exists today (collaborative round)
        session = await prisma.patrolSession.findFirst({
          where: {
            scheduleId: schedule.id,
            patrolDate,
          },
          include: { sessionFloors: { include: { floor: true } } },
        });

        if (!session) {
          let sessionShiftId = auth.shiftId || '';
          try {
            const activeShifts = await prisma.shift.findMany({ where: { isActive: true } });
            const resolved = resolveShiftForSchedule(schedule, activeShifts);
            if (resolved && 'id' in resolved && resolved.id) {
              sessionShiftId = resolved.id;
            }
          } catch {
            if (!sessionShiftId) {
              const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
              sessionShiftId = defaultShift?.id || '';
            }
          }

          const floors = await prisma.floor.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
          
          let earlyNotes: string | null = null;
          if (isEarlyStart) {
            earlyNotes = `Mulai lebih awal pukul ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WITA (Jadwal resmi: ${schedule.startTime} - ${schedule.endTime})`;
          }

          session = await prisma.patrolSession.create({
            data: {
              userId: auth.id,
              scheduleId: schedule.id,
              shiftId: sessionShiftId,
              patrolDate,
              patrolNumber: schedule.patrolNumber,
              status: 'in_progress',
              startedAt: now,
              notes: earlyNotes,
              sessionFloors: {
                create: floors.map(f => ({
                  floorId: f.id,
                  floorNameSnapshot: f.name,
                  floorCodeSnapshot: f.code,
                })),
              },
            },
            include: { sessionFloors: { include: { floor: true } } },
          });
        }
      }

      const sessionFloor = session.sessionFloors.find(sf => 
        sf.floorId === room.floorId || 
        sf.floorCodeSnapshot?.toUpperCase() === room.floor.code?.toUpperCase() ||
        (sf.floor && sf.floor.code.toUpperCase() === room.floor.code.toUpperCase())
      );
      if (!sessionFloor) {
        return NextResponse.json({ error: 'Lantai patroli tidak terdaftar di sesi aktif' }, { status: 400 });
      }

      realSessionFloorId = sessionFloor.id;
    } else {
      const sessionFloor = await prisma.patrolSessionFloor.findUnique({
        where: { id: realSessionFloorId },
        include: { session: { select: { userId: true } } },
      });
      if (!sessionFloor) {
        return NextResponse.json({ error: 'Session floor tidak ditemukan' }, { status: 404 });
      }

      // In Option C: If session floor belongs to another officer (e.g. from cached state),
      // re-route check to current authenticated officer's own session floor
      if (auth.role === 'security' && sessionFloor.session.userId !== auth.id) {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
        const patrolDate = new Date(todayStr);

        let userSession = await prisma.patrolSession.findFirst({
          where: {
            userId: auth.id,
            patrolDate,
            status: 'in_progress',
          },
          include: { sessionFloors: true },
        });

        if (userSession) {
          const matchingSf = userSession.sessionFloors.find(sf => sf.floorId === room.floorId);
          if (matchingSf) {
            realSessionFloorId = matchingSf.id;
          }
        }
      }
    }

    const check = await prisma.patrolCheck.create({
      data: {
        sessionFloorId: realSessionFloorId,
        roomId: realRoomId,
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

    // Save photo if provided
    if (photoBase64 && typeof photoBase64 === 'string' && photoBase64.length > 100) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');

        // Extract base64 data
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `patrol-${check.id}-${Date.now()}.jpg`;
        const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'patrol');
        const rootUploadDir = path.join(process.cwd(), 'uploads', 'patrol');

        // Create directories if they do not exist
        await fs.mkdir(publicUploadDir, { recursive: true }).catch(() => {});
        await fs.mkdir(rootUploadDir, { recursive: true }).catch(() => {});

        // Save to public upload dir
        const filePath = path.join(publicUploadDir, fileName);
        await fs.writeFile(filePath, buffer);

        // Also save a copy to root uploads dir for nginx direct mapping fallback
        try {
          await fs.writeFile(path.join(rootUploadDir, fileName), buffer);
        } catch {}

        // Create PatrolPhoto record
        await prisma.patrolPhoto.create({
          data: {
            checkId: check.id,
            userId: auth.id,
            filePath: `/uploads/patrol/${fileName}`,
            originalFilename: fileName,
            fileSize: buffer.length,
            mimeType: 'image/jpeg',
            isPrimary: true,
            hasWatermark: true,
            takenAt: new Date(),
          },
        });
      } catch (photoErr) {
        console.error('Photo save error (non-fatal):', photoErr);
        // Non-fatal: check is still saved even if photo fails
      }
    }

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
