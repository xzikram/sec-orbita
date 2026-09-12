import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/shifts - List shifts
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('all') === 'true';

  const where = includeInactive || auth.role === 'admin' ? {} : { isActive: true };

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });
  return NextResponse.json(shifts);
}

// POST /api/shifts - Create shift (admin only)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, code, startTime, endTime } = body;

    if (!name || !code || !startTime || !endTime) {
      return NextResponse.json({ error: 'Nama, kode, waktu mulai, dan waktu selesai wajib diisi' }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        startTime,
        endTime,
        isActive: true,
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PUT /api/shifts - Update shift (admin only)
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, name, code, startTime, endTime, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID shift wajib disertakan' }, { status: 400 });
    }

    const dataToUpdate: Record<string, any> = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (code !== undefined) dataToUpdate.code = code.toUpperCase().trim();
    if (startTime !== undefined) dataToUpdate.startTime = startTime;
    if (endTime !== undefined) dataToUpdate.endTime = endTime;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.shift.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/shifts - Delete or deactivate shift (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID shift wajib disertakan' }, { status: 400 });
    }

    // Check if shift is used in users or sessions
    const [userCount, sessionCount] = await Promise.all([
      prisma.user.count({ where: { shiftId: id } }),
      prisma.patrolSession.count({ where: { shiftId: id } }),
    ]);

    if (userCount > 0 || sessionCount > 0) {
      // Soft delete to protect relational integrity
      const updated = await prisma.shift.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: 'Shift dinonaktifkan karena sedang digunakan oleh petugas atau sesi patroli.',
        shift: updated,
        softDeleted: true,
      });
    }

    // Hard delete if unused
    await prisma.shift.delete({ where: { id } });
    return NextResponse.json({ message: 'Shift berhasil dihapus permanen.', softDeleted: false });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
