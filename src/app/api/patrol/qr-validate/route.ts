import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/qr-validate - Validate QR scan for a floor
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionFloorId, qrToken } = body;

    if (!sessionFloorId || !qrToken) {
      return NextResponse.json({ error: 'Session floor ID dan QR token wajib' }, { status: 400 });
    }

    // Find session floor by UUID or fallback by code from active session
    let sessionFloor = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionFloorId);
    if (isUuid) {
      const foundSf = await prisma.patrolSessionFloor.findUnique({
        where: { id: sessionFloorId },
        include: { floor: { include: { qrCode: true } }, session: true },
      });
      // Allow if admin, if session owner, or if session is active (collaborative)
      if (foundSf && (auth.role !== 'security' || foundSf.session.userId === auth.id || foundSf.session.status === 'in_progress')) {
        sessionFloor = foundSf;
      }
    }

    if (!sessionFloor) {
      const cleanCode = String(sessionFloorId)
        .replace(/^sf-/, '')
        .replace(/^floor-/, '')
        .toUpperCase();
      const normalizedCode = cleanCode === '1' ? 'L1' : cleanCode;

      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      const activeSession = await prisma.patrolSession.findFirst({
        where: {
          patrolDate,
          status: 'in_progress',
        },
        include: {
          sessionFloors: {
            include: { floor: { include: { qrCode: true } } }
          }
        },
        orderBy: { startedAt: 'desc' }
      }) || await prisma.patrolSession.findFirst({
        where: {
          status: 'in_progress',
        },
        include: {
          sessionFloors: {
            include: { floor: { include: { qrCode: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeSession) {
        sessionFloor = activeSession.sessionFloors.find(
          sf => sf.floor.code.toUpperCase() === normalizedCode ||
                sf.floorCodeSnapshot?.toUpperCase() === normalizedCode ||
                sf.floorId === sessionFloorId ||
                sf.id === sessionFloorId
        ) || null;
      }
    }

    if (!sessionFloor) return NextResponse.json({ error: 'Session floor tidak ditemukan' }, { status: 404 });

    // Parse QR content and validate token
    let rawToken = String(qrToken).trim();
    try {
      const qrData = JSON.parse(qrToken);
      if (qrData.token) rawToken = String(qrData.token).trim();
    } catch {
      // Use raw token directly
    }

    const { isOfficialQrValidForFloor, OFFICIAL_QR_MAP } = await import('@/lib/qr-constants');
    const floorCode = sessionFloor.floor.code;
    const dbToken = sessionFloor.floor.qrCode?.token;

    const isOfficial = isOfficialQrValidForFloor(floorCode, rawToken);
    const isDbMatch = dbToken ? dbToken.toUpperCase() === rawToken.toUpperCase() : false;
    const qrValid = isOfficial || isDbMatch;

    if (!qrValid) {
      return NextResponse.json({ error: 'QR code tidak valid untuk lantai ini', valid: false }, { status: 400 });
    }

    const tokenToSave = OFFICIAL_QR_MAP[floorCode.toUpperCase()] || dbToken || rawToken;

    // Verify that all active rooms on this floor have been inspected before allowing QR seal completion
    const totalFloorRooms = await prisma.room.count({
      where: { floorId: sessionFloor.floorId, isActive: true },
    });

    const existingChecks = await prisma.patrolCheck.findMany({
      where: { sessionFloorId: sessionFloor.id },
      select: { roomId: true, roomCodeSnapshot: true },
    });
    const uniqueCheckedRooms = new Set(existingChecks.map(c => c.roomId || c.roomCodeSnapshot));

    if (totalFloorRooms > 0 && uniqueCheckedRooms.size < totalFloorRooms) {
      return NextResponse.json({
        error: `Pemeriksaan ruangan belum selesai (${uniqueCheckedRooms.size}/${totalFloorRooms} ruangan). Selesaikan seluruh ceklist & foto ruangan terlebih dahulu sebelum scan QR lantai.`,
        valid: false,
        incompleteRooms: true,
        checkedRooms: uniqueCheckedRooms.size,
        totalRooms: totalFloorRooms,
      }, { status: 400 });
    }

    // Update session floor as validated
    await prisma.patrolSessionFloor.update({
      where: { id: sessionFloor.id },
      data: { qrValidated: true, qrScannedAt: new Date(), qrTokenUsed: tokenToSave, status: 'completed', completedAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'scan_qr', entityType: 'patrol_session_floor', entityId: sessionFloor.id },
    });

    // Check if all floors are completed
    const session = await prisma.patrolSession.findFirst({
      where: { sessionFloors: { some: { id: sessionFloor.id } } },
      include: { sessionFloors: true },
    });

    if (session) {
      const allCompleted = session.sessionFloors.every(sf => sf.id === sessionFloor.id ? true : sf.status === 'completed');
      if (allCompleted) {
        await prisma.patrolSession.update({
          where: { id: session.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        await prisma.activityLog.create({
          data: { userId: auth.id, action: 'complete_patrol', entityType: 'patrol_session', entityId: session.id },
        });
      }
    }

    return NextResponse.json({ valid: true, message: 'QR validasi berhasil' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
