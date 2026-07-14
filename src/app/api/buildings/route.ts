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
