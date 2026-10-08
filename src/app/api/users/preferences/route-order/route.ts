import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/users/preferences/route-order
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const key = `user_route_order_${auth.id}`;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    const preferences = setting?.value ? JSON.parse(setting.value) : {};

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Fetch route order error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/users/preferences/route-order
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { floorCode, roomCodes, reset } = body;

    if (!floorCode) {
      return NextResponse.json({ error: 'Floor code wajib disertakan' }, { status: 400 });
    }

    const cleanFloorCode = String(floorCode).toUpperCase().trim();
    const key = `user_route_order_${auth.id}`;

    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    let preferences: Record<string, string[]> = existing?.value ? JSON.parse(existing.value) : {};

    if (reset) {
      delete preferences[cleanFloorCode];
    } else {
      if (!Array.isArray(roomCodes)) {
        return NextResponse.json({ error: 'Room codes harus berupa array' }, { status: 400 });
      }
      preferences[cleanFloorCode] = roomCodes.map((c: string) => String(c).trim().toUpperCase());
    }

    const jsonVal = JSON.stringify(preferences);

    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: jsonVal,
        description: `Preferensi urutan patroli ruangan untuk user ${auth.name} (${auth.employeeId})`,
      },
      update: {
        value: jsonVal,
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Save route order error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
