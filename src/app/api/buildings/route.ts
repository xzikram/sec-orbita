import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/buildings - List buildings with floor & room counts
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const buildings = await prisma.building.findMany({
    include: {
      floors: {
        where: { isActive: true },
        include: { _count: { select: { rooms: { where: { isActive: true } } } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(buildings.map(b => ({
    ...b,
    totalFloors: b.floors.length,
    totalRooms: b.floors.reduce((s, f) => s + f._count.rooms, 0),
    floors: b.floors.map(f => ({ ...f, totalRooms: f._count.rooms, _count: undefined })),
  })));
}

// POST /api/buildings - Create a new building (admin only)
export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, address } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Nama dan kode gedung wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.building.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Gedung dengan kode '${code}' sudah ada` }, { status: 400 });
    }

    const building = await prisma.building.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address ? address.trim() : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'create_building',
        entityType: 'building',
        entityId: building.id,
      },
    });

    return NextResponse.json(building, { status: 201 });
  } catch (error: unknown) {
    console.error('Create building error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PUT /api/buildings - Update an existing building (admin only)
export async function PUT(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, code, address, isActive } = body;

    if (!id || !name || !code) {
      return NextResponse.json({ error: 'ID, nama, dan kode gedung wajib diisi' }, { status: 400 });
    }

    const currentBuilding = await prisma.building.findUnique({ where: { id } });
    if (!currentBuilding) {
      return NextResponse.json({ error: 'Gedung tidak ditemukan' }, { status: 404 });
    }

    // Check if code is taken by another building
    const normalizedCode = code.trim().toUpperCase();
    const codeConflict = await prisma.building.findFirst({
      where: {
        code: normalizedCode,
        NOT: { id },
      },
    });
    if (codeConflict) {
      return NextResponse.json({ error: `Kode '${normalizedCode}' sudah digunakan oleh gedung lain` }, { status: 400 });
    }

    const updated = await prisma.building.update({
      where: { id },
      data: {
        name: name.trim(),
        code: normalizedCode,
        address: address ? address.trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : currentBuilding.isActive,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'update_building',
        entityType: 'building',
        entityId: updated.id,
        metadata: {
          old: { name: currentBuilding.name, code: currentBuilding.code },
          new: { name: updated.name, code: updated.code },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Update building error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/buildings - Delete/Deactivate a building (admin only)
export async function DELETE(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gedung wajib diisi' }, { status: 400 });
    }

    const currentBuilding = await prisma.building.findUnique({
      where: { id },
      include: { floors: { select: { id: true } } },
    });

    if (!currentBuilding) {
      return NextResponse.json({ error: 'Gedung tidak ditemukan' }, { status: 404 });
    }

    if (currentBuilding.floors.length > 0) {
      // Soft-delete / deactivate if it has floors
      const updated = await prisma.building.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.activityLog.create({
        data: {
          userId: auth.id,
          action: 'deactivate_building',
          entityType: 'building',
          entityId: id,
        },
      });

      return NextResponse.json({ success: true, message: 'Gedung dinonaktifkan karena memiliki lantai terdaftar' });
    }

    // Hard delete if no floors attached
    await prisma.building.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'delete_building',
        entityType: 'building',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, message: 'Gedung berhasil dihapus' });
  } catch (error: unknown) {
    console.error('Delete building error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
