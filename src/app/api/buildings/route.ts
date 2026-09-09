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
        name,
        code: code.trim().toUpperCase(),
        address: address || null,
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
