import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/rooms - List all rooms
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const floorId = searchParams.get('floorId');
  const id = searchParams.get('id');
  const code = searchParams.get('code');

  try {
    const where: any = { isActive: true };
    if (floorId) where.floorId = floorId;
    if (id) {
      where.OR = [
        { id },
        { code: { equals: id } }
      ];
    }
    if (code) where.code = { equals: code };

    const rooms = await prisma.room.findMany({
      where,
      include: {
        floor: {
          select: {
            id: true,
            code: true,
            name: true,
            building: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ floor: { sortOrder: 'asc' } }, { patrolOrder: 'asc' }],
    });

    return NextResponse.json(rooms);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { floorId, code, name, patrolOrder, hasAc, hasLight, photoGuide } = body;

    if (!floorId || !code || !name) {
      return NextResponse.json(
        { error: 'Lantai, kode ruangan, dan nama ruangan wajib diisi' },
        { status: 400 }
      );
    }

    // Check unique code
    const existing = await prisma.room.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kode ruangan "${code}" sudah terdaftar` },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        floorId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        patrolOrder: Number(patrolOrder) || 0,
        hasAc: hasAc !== undefined ? Boolean(hasAc) : true,
        hasLight: hasLight !== undefined ? Boolean(hasLight) : true,
        photoGuide: photoGuide?.trim() || null,
        isActive: true,
      },
      include: {
        floor: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'create_room',
        entityType: 'room',
        entityId: room.id,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/rooms - Update an existing room
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, floorId, code, name, patrolOrder, hasAc, hasLight, photoGuide, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID ruangan wajib disertakan' }, { status: 400 });
    }

    if (!floorId || !code || !name) {
      return NextResponse.json(
        { error: 'Lantai, kode ruangan, dan nama ruangan wajib diisi' },
        { status: 400 }
      );
    }

    // Check unique code against other rooms
    const existing = await prisma.room.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kode ruangan "${code}" sudah digunakan pada ruangan lain` },
        { status: 400 }
      );
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        floorId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        patrolOrder: Number(patrolOrder) || 0,
        hasAc: hasAc !== undefined ? Boolean(hasAc) : true,
        hasLight: hasLight !== undefined ? Boolean(hasLight) : true,
        photoGuide: photoGuide ? photoGuide.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        floor: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'update_room',
        entityType: 'room',
        entityId: room.id,
        metadata: {
          roomName: room.name,
          roomCode: room.code,
        },
      },
    });

    return NextResponse.json(room);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/rooms - Soft-delete a room
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID ruangan wajib disertakan' }, { status: 400 });
    }

    const room = await prisma.room.update({
      where: { id },
      data: { isActive: false },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'delete_room',
        entityType: 'room',
        entityId: room.id,
      },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
