import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/checks - Submit a room check
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { sessionFloorId, roomId, acStatus, lightStatus, condition, remarks } = body;

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { floor: true } });
    if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    const check = await prisma.patrolCheck.create({
      data: {
        sessionFloorId,
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
      where: { id: sessionFloorId },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'check_room', entityType: 'patrol_check', entityId: check.id },
    });

    return NextResponse.json(check, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
