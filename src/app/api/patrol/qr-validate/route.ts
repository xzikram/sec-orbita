import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/qr-validate - Validate QR scan for a floor
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { sessionFloorId, qrToken } = body;

    if (!sessionFloorId || !qrToken) {
      return NextResponse.json({ error: 'Session floor ID dan QR token wajib' }, { status: 400 });
    }

    // Find session floor
    const sessionFloor = await prisma.patrolSessionFloor.findUnique({
      where: { id: sessionFloorId },
      include: { floor: { include: { qrCode: true } } },
    });

    if (!sessionFloor) return NextResponse.json({ error: 'Session floor tidak ditemukan' }, { status: 404 });

    // Parse QR content and validate token
    const qrCode = sessionFloor.floor.qrCode;
    if (!qrCode) return NextResponse.json({ error: 'QR code belum di-generate untuk lantai ini' }, { status: 404 });

    let qrValid = false;
    try {
      const qrData = JSON.parse(qrToken);
      qrValid = qrData.token === qrCode.token;
    } catch {
      qrValid = qrToken === qrCode.token;
    }

    if (!qrValid) {
      return NextResponse.json({ error: 'QR code tidak valid untuk lantai ini', valid: false }, { status: 400 });
    }

    // Update session floor as validated
    await prisma.patrolSessionFloor.update({
      where: { id: sessionFloorId },
      data: { qrValidated: true, qrScannedAt: new Date(), qrTokenUsed: qrCode.token, status: 'completed', completedAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'scan_qr', entityType: 'patrol_session_floor', entityId: sessionFloorId },
    });

    // Check if all floors are completed
    const session = await prisma.patrolSession.findFirst({
      where: { sessionFloors: { some: { id: sessionFloorId } } },
      include: { sessionFloors: true },
    });

    if (session) {
      const allCompleted = session.sessionFloors.every(sf => sf.id === sessionFloorId ? true : sf.status === 'completed');
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
