import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/floors - List floors with rooms
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const floors = await prisma.floor.findMany({
    where: { isActive: true },
    include: {
      building: { select: { name: true, code: true } },
      rooms: { where: { isActive: true }, orderBy: { patrolOrder: 'asc' } },
      qrCode: { select: { token: true, generatedAt: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(floors);
}
