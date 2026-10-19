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
    let preferences: Record<string, string[]> = setting?.value ? JSON.parse(setting.value) : {};

    // Merge with global route orders for any floors not explicitly customized by this user
    const globalSettings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: 'global_route_order_' } },
    });
    for (const gs of globalSettings) {
      const fCode = gs.key.replace('global_route_order_', '').toUpperCase();
      if (!preferences[fCode] && gs.value) {
        try {
          preferences[fCode] = JSON.parse(gs.value);
        } catch {}
      }
    }

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

      // Reset patrolOrder in database to natural order based on code
      const floor = await prisma.floor.findFirst({
        where: {
          OR: [
            { code: cleanFloorCode },
            { id: floorCode },
          ],
        },
        include: { rooms: { orderBy: { code: 'asc' } } },
      });

      if (floor && floor.rooms.length > 0) {
        await prisma.$transaction(
          floor.rooms.map((r, idx) =>
            prisma.room.update({
              where: { id: r.id },
              data: { patrolOrder: idx + 1 },
            })
          )
        );
      }
    } else {
      if (!Array.isArray(roomCodes)) {
        return NextResponse.json({ error: 'Room codes harus berupa array' }, { status: 400 });
      }
      const cleanCodes = roomCodes.map((c: string) => String(c).trim().toUpperCase());
      preferences[cleanFloorCode] = cleanCodes;

      // Update patrolOrder permanently in database Room table so it applies globally to all officers
      const updateOps = cleanCodes.map((code: string, idx: number) =>
        prisma.room.updateMany({
          where: { code },
          data: { patrolOrder: idx + 1 },
        })
      );
      await prisma.$transaction(updateOps);
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

    // Also update global floor route order setting for cross-user consistency
    const globalKey = `global_route_order_${cleanFloorCode}`;
    await prisma.systemSetting.upsert({
      where: { key: globalKey },
      create: {
        key: globalKey,
        value: JSON.stringify(preferences[cleanFloorCode] || []),
        description: `Urutan rute patroli ruangan global untuk lantai ${cleanFloorCode}`,
      },
      update: {
        value: JSON.stringify(preferences[cleanFloorCode] || []),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Save route order error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
