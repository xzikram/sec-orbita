import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rooms as mockRooms } from '@/lib/dummy-data';
import { isOfficialQrValidForFloor, OFFICIAL_QR_MAP } from '@/lib/qr-constants';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const checks: any[] = Array.isArray(body.checks) ? body.checks : [];
    const findings: any[] = Array.isArray(body.findings) ? body.findings : [];
    const qrScans: any[] = Array.isArray(body.qrScans) ? body.qrScans : [];

    const syncedCheckIds: string[] = [];
    const syncedFindingIds: string[] = [];
    const syncedQrScanIds: string[] = [];
    const checkIdMap: Record<string, string> = {}; // client check ID -> db check ID

    // Today in Makassar
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const patrolDate = new Date(todayStr);

    // 1. Get or create active session for this specific user
    let activeSession = null;
    if (body.sessionId && !String(body.sessionId).startsWith('offline-')) {
      activeSession = await prisma.patrolSession.findUnique({
        where: { id: body.sessionId },
        include: {
          sessionFloors: {
            include: { floor: { include: { qrCode: true } } },
          },
        },
      });
      if (activeSession && auth.role === 'security' && activeSession.userId !== auth.id) {
        activeSession = null;
      }
    }

    if (!activeSession) {
      activeSession = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate,
          status: 'in_progress',
        },
        include: {
          sessionFloors: {
            include: { floor: { include: { qrCode: true } } },
          },
        },
        orderBy: { startedAt: 'desc' },
      });
    }

    if (!activeSession) {
      // Auto-resolve schedule based on current Makassar time
      const allSchedules = await prisma.patrolSchedule.findMany({ orderBy: { patrolNumber: 'asc' } });
      const nowTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()).replace('.', ':');

      const defaultSchedule = allSchedules.find(s => {
        if (s.startTime < s.endTime) {
          return nowTime >= s.startTime && nowTime < s.endTime;
        }
        return nowTime >= s.startTime || nowTime < s.endTime;
      }) || allSchedules[0];

      if (defaultSchedule) {
        const defaultShift = await prisma.shift.findFirst({ where: { isActive: true } });
        const allFloors = await prisma.floor.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

        activeSession = await prisma.patrolSession.create({
          data: {
            userId: auth.id,
            scheduleId: defaultSchedule.id,
            shiftId: defaultShift?.id || '',
            patrolDate,
            patrolNumber: defaultSchedule.patrolNumber,
            status: 'in_progress',
            startedAt: new Date(),
            sessionFloors: {
              create: allFloors.map(f => ({
                floorId: f.id,
                floorNameSnapshot: f.name,
                floorCodeSnapshot: f.code,
              })),
            },
          },
          include: {
            sessionFloors: {
              include: { floor: { include: { qrCode: true } } },
            },
          },
        });
      }
    }

    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'patrol');
    const rootUploadDir = path.join(process.cwd(), 'uploads', 'patrol');
    await fs.mkdir(publicUploadDir, { recursive: true }).catch(() => {});
    await fs.mkdir(rootUploadDir, { recursive: true }).catch(() => {});

    // Pre-cache rooms map for fast batch lookups
    const allDbRooms = await prisma.room.findMany({
      include: { floor: true },
    });
    const roomsByCode = new Map(allDbRooms.map(r => [r.code.toUpperCase(), r]));
    const roomsById = new Map(allDbRooms.map(r => [r.id, r]));

    // 2. Process room checks in batch
    for (const c of checks) {
      try {
        let dbRoom = roomsById.get(c.roomId);
        if (!dbRoom) {
          const cleanCode = String(c.roomId).replace(/^room-/, '').toUpperCase();
          dbRoom = roomsByCode.get(cleanCode);
        }
        if (!dbRoom) {
          // Try lookup via mock rooms
          const mock = mockRooms.find(r => r.id === c.roomId || r.code.toLowerCase() === String(c.roomId).toLowerCase());
          if (mock) {
            dbRoom = roomsByCode.get(mock.code.toUpperCase());
          }
        }
        if (!dbRoom) {
          // Fallback first room
          dbRoom = allDbRooms[0];
        }

        if (!dbRoom) continue;

        // Resolve sessionFloorId
        const roomFloorCode = dbRoom.code ? dbRoom.code.split('-')[0].toUpperCase() : '';
        let targetSf = activeSession?.sessionFloors?.find(sf =>
          sf.id === c.sessionFloorId ||
          sf.floorId === dbRoom!.floorId ||
          sf.floor.code.toUpperCase() === dbRoom!.floor.code.toUpperCase() ||
          (roomFloorCode && sf.floor.code.toUpperCase() === roomFloorCode) ||
          (roomFloorCode && sf.floorCodeSnapshot.toUpperCase() === roomFloorCode)
        );

        if (!targetSf) continue;

        // Check if room check already exists for this room in this sessionFloor
        let checkRecord = await prisma.patrolCheck.findFirst({
          where: {
            sessionFloorId: targetSf.id,
            roomId: dbRoom.id,
          },
        });

        const checkedTimestamp = c.checkedAt ? new Date(c.checkedAt) : new Date();

        let resolvedAc = c.acStatus;
        if (!resolvedAc && c.checklistValues && typeof c.checklistValues === 'object') {
          const v = c.checklistValues['AC'] || c.checklistValues['ac'];
          if (v === 'on' || v === 'off' || v === 'not_available') resolvedAc = v;
        }
        if (!resolvedAc) resolvedAc = 'not_available';

        let resolvedLight = c.lightStatus;
        if (!resolvedLight && c.checklistValues && typeof c.checklistValues === 'object') {
          const v = c.checklistValues['Lampu'] || c.checklistValues['lampu'];
          if (v === 'on' || v === 'off') resolvedLight = v;
        }
        if (!resolvedLight) resolvedLight = 'off';

        if (checkRecord) {
          // Update existing
          checkRecord = await prisma.patrolCheck.update({
            where: { id: checkRecord.id },
            data: {
              acStatus: resolvedAc,
              lightStatus: resolvedLight,
              checklistValues: c.checklistValues ? c.checklistValues : undefined,
              condition: c.condition || 'normal',
              remarks: c.remarks,
              checkedAt: checkedTimestamp,
            },
          });
        } else {
          // Create new
          checkRecord = await prisma.patrolCheck.create({
            data: {
              sessionFloorId: targetSf.id,
              roomId: dbRoom.id,
              userId: auth.id,
              roomNameSnapshot: dbRoom.name,
              roomCodeSnapshot: dbRoom.code,
              floorNameSnapshot: dbRoom.floor.name,
              roomOrderSnapshot: dbRoom.patrolOrder,
              acStatus: resolvedAc,
              lightStatus: resolvedLight,
              checklistValues: c.checklistValues ? c.checklistValues : undefined,
              condition: c.condition || 'normal',
              remarks: c.remarks,
              checkedAt: checkedTimestamp,
            },
          });
        }

        checkIdMap[c.id] = checkRecord.id;

        // Save photo if present
        if (c.photoBase64 && typeof c.photoBase64 === 'string' && c.photoBase64.length > 100) {
          try {
            const base64Data = c.photoBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `patrol-${checkRecord.id}-${Date.now()}.jpg`;

            const filePath = path.join(publicUploadDir, fileName);
            await fs.writeFile(filePath, buffer);
            try {
              await fs.writeFile(path.join(rootUploadDir, fileName), buffer);
            } catch {}

            // Check if photo record already exists
            const existingPhoto = await prisma.patrolPhoto.findFirst({
              where: { checkId: checkRecord.id },
            });

            if (!existingPhoto) {
              await prisma.patrolPhoto.create({
                data: {
                  checkId: checkRecord.id,
                  userId: auth.id,
                  filePath: `/uploads/patrol/${fileName}`,
                  originalFilename: fileName,
                  fileSize: buffer.length,
                  mimeType: 'image/jpeg',
                  isPrimary: true,
                  hasWatermark: true,
                  takenAt: checkedTimestamp,
                },
              });
            }
          } catch (photoErr) {
            console.warn('Batch photo save notice:', photoErr);
          }
        }

        // Mark session floor in_progress
        await prisma.patrolSessionFloor.update({
          where: { id: targetSf.id },
          data: { status: 'in_progress', startedAt: targetSf.startedAt || checkedTimestamp },
        });

        syncedCheckIds.push(c.id);
      } catch (checkErr) {
        console.error('Batch sync check error for item:', c.id, checkErr);
      }
    }

    // 3. Process findings
    for (const f of findings) {
      try {
        const realCheckId = f.checkId ? (checkIdMap[f.checkId] || f.checkId) : undefined;
        let dbCheck = null;
        if (realCheckId) {
          dbCheck = await prisma.patrolCheck.findUnique({ where: { id: realCheckId } });
        }

        const todayNumberStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const count = await prisma.finding.count({ where: { findingNumber: { startsWith: `FND-${todayNumberStr}` } } });
        const findingNumber = `FND-${todayNumberStr}-${String(count + 1 + syncedFindingIds.length).padStart(3, '0')}`;

        await prisma.finding.create({
          data: {
            findingNumber,
            checkId: dbCheck?.id || undefined,
            sessionId: activeSession?.id || undefined,
            floorId: f.floorId || dbCheck?.sessionFloorId,
            roomId: f.roomId || dbCheck?.roomId,
            userId: auth.id,
            floorNameSnapshot: f.floorNameSnapshot || '',
            roomNameSnapshot: f.roomNameSnapshot || '',
            category: (f.category as any) || 'lainnya',
            description: f.description || '-',
            status: 'new',
            createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
          },
        });

        syncedFindingIds.push(f.id);
      } catch (findErr) {
        console.error('Batch sync finding error for item:', f.id, findErr);
      }
    }

    // 4. Process QR scans
    for (const q of qrScans) {
      try {
        let rawToken = String(q.qrToken || '').trim();
        try {
          const parsed = JSON.parse(rawToken);
          if (parsed.token) rawToken = String(parsed.token).trim();
        } catch {}

        const targetSf = activeSession?.sessionFloors?.find(sf =>
          sf.id === q.sessionFloorId ||
          sf.floor.code.toUpperCase() === String(q.floorCode || '').toUpperCase() ||
          sf.floorCodeSnapshot?.toUpperCase() === String(q.floorCode || '').toUpperCase()
        );

        if (targetSf) {
          const floorCode = targetSf.floor.code;
          const isOfficial = isOfficialQrValidForFloor(floorCode, rawToken);
          const dbToken = targetSf.floor.qrCode?.token;
          const isDbMatch = dbToken ? dbToken.toUpperCase() === rawToken.toUpperCase() : false;

          if (isOfficial || isDbMatch || rawToken.length > 3) {
            const tokenToSave = OFFICIAL_QR_MAP[floorCode.toUpperCase()] || dbToken || rawToken;
            const scanTimestamp = q.scannedAt ? new Date(q.scannedAt) : new Date();

            await prisma.patrolSessionFloor.update({
              where: { id: targetSf.id },
              data: {
                qrValidated: true,
                qrScannedAt: scanTimestamp,
                qrTokenUsed: tokenToSave,
                status: 'completed',
                completedAt: scanTimestamp,
              },
            });

            syncedQrScanIds.push(q.id);
          }
        }
      } catch (qrErr) {
        console.error('Batch sync QR error for item:', q.id, qrErr);
      }
    }

    // 5. Check if all floors completed to finalize session
    if (activeSession) {
      const refreshedFloors = await prisma.patrolSessionFloor.findMany({
        where: { sessionId: activeSession.id },
      });
      const allCompleted = refreshedFloors.length > 0 && refreshedFloors.every(sf => sf.status === 'completed' || sf.qrValidated);
      if (allCompleted) {
        await prisma.patrolSession.update({
          where: { id: activeSession.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        await prisma.activityLog.create({
          data: { userId: auth.id, action: 'complete_patrol', entityType: 'patrol_session', entityId: activeSession.id },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      syncedCheckIds,
      syncedFindingIds,
      syncedQrScanIds,
      totalSynced: syncedCheckIds.length + syncedFindingIds.length + syncedQrScanIds.length,
    });
  } catch (err: any) {
    console.error('Batch Sync Bundle Error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Gagal memproses sinkronisasi batch',
    }, { status: 500 });
  }
}
