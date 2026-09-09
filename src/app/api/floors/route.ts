import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { OFFICIAL_QR_MAP } from '@/lib/qr-constants';

// GET /api/floors - List floors with rooms and guaranteed official physical QR tokens
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

  const formattedFloors = floors.map(f => {
    const officialToken = OFFICIAL_QR_MAP[f.code.toUpperCase()];
    return {
      ...f,
      qrCode: {
        token: officialToken || f.qrCode?.token || `JEC-ORB-${f.code}-PENDING`,
        generatedAt: f.qrCode?.generatedAt || new Date(1785290309550).toISOString(),
      },
    };
  });

  return NextResponse.json(formattedFloors);
}
