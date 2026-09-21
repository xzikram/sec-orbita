import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { OFFICIAL_QR_MAP } from '@/lib/qr-constants';

// GET /api/floors - List floors with rooms and guaranteed official physical QR tokens
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const floors = await prisma.floor.findMany({
      where: { isActive: true },
      include: {
        building: { select: { id: true, name: true, code: true } },
        rooms: {
          where: { isActive: true },
          orderBy: { patrolOrder: 'asc' },
          include: {
            checklistTemplate: {
              select: { id: true, name: true, items: true, isDefault: true, isActive: true },
            },
          },
        },
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
  } catch (error: any) {
    console.error('Fetch floors error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memuat lantai' }, { status: 500 });
  }
}

// POST /api/floors - Create a new floor (admin only)
export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { buildingId, code, name, sortOrder } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Kode dan Nama Lantai wajib diisi' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Default to first active building if not provided
    let bId = buildingId;
    if (!bId) {
      const firstBuilding = await prisma.building.findFirst({ where: { isActive: true } });
      if (!firstBuilding) {
        return NextResponse.json({ error: 'Belum ada data gedung aktif' }, { status: 400 });
      }
      bId = firstBuilding.id;
    }

    // Check duplicate code
    const existing = await prisma.floor.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: `Lantai dengan kode ${cleanCode} sudah ada` }, { status: 409 });
    }

    const floor = await prisma.floor.create({
      data: {
        buildingId: bId,
        code: cleanCode,
        name: String(name).trim(),
        sortOrder: typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder || '0', 10) || 0,
        isActive: true,
      },
      include: {
        building: { select: { id: true, name: true, code: true } },
      },
    });

    // Create official QR code record for the new floor
    const officialToken = OFFICIAL_QR_MAP[cleanCode] || `JEC-ORB-${cleanCode}`;
    await prisma.floorQrCode.create({
      data: {
        floorId: floor.id,
        token: officialToken,
        qrContent: JSON.stringify({ token: officialToken, floorCode: cleanCode, floorName: floor.name }),
        isActive: true,
      },
    }).catch((qrErr) => {
      console.warn('Auto create FloorQrCode notice:', qrErr);
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'create_floor',
        entityType: 'floor',
        entityId: floor.id,
        metadata: { code: cleanCode, name: floor.name },
      },
    }).catch(() => {});

    return NextResponse.json(floor, { status: 201 });
  } catch (error: any) {
    console.error('Create floor error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal menambahkan lantai' }, { status: 500 });
  }
}

// PUT /api/floors - Update floor (admin only)
export async function PUT(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, code, name, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Lantai wajib disertakan' }, { status: 400 });
    }

    const cleanCode = code ? String(code).trim().toUpperCase() : undefined;

    const floor = await prisma.floor.update({
      where: { id },
      data: {
        ...(cleanCode ? { code: cleanCode } : {}),
        ...(name ? { name: String(name).trim() } : {}),
        ...(sortOrder !== undefined ? { sortOrder: parseInt(String(sortOrder), 10) || 0 } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        building: { select: { id: true, name: true, code: true } },
        rooms: { where: { isActive: true } },
        qrCode: true,
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'update_floor',
        entityType: 'floor',
        entityId: floor.id,
        metadata: { code: floor.code, name: floor.name, isActive: floor.isActive },
      },
    }).catch(() => {});

    return NextResponse.json(floor);
  } catch (error: any) {
    console.error('Update floor error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memperbarui lantai' }, { status: 500 });
  }
}

// DELETE /api/floors - Deactivate floor (admin only)
export async function DELETE(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Lantai wajib disertakan' }, { status: 400 });
    }

    // Soft delete: set isActive = false
    const floor = await prisma.floor.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'delete_floor',
        entityType: 'floor',
        entityId: floor.id,
        metadata: { code: floor.code, name: floor.name },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Lantai berhasil dinonaktifkan' });
  } catch (error: any) {
    console.error('Delete floor error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal menghapus lantai' }, { status: 500 });
  }
}
