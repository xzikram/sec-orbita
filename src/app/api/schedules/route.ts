import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/schedules - List patrol schedules
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('all') === 'true';

  const where = includeInactive || auth.role === 'admin' ? {} : { isActive: true };

  const schedules = await prisma.patrolSchedule.findMany({
    where,
    orderBy: { patrolNumber: 'asc' },
  });
  return NextResponse.json(schedules);
}

// POST /api/schedules - Create schedule (admin only)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, patrolNumber, startTime, endTime } = body;

    if (!name || patrolNumber == null || !startTime || !endTime) {
      return NextResponse.json({ error: 'Nama, nomor patroli, waktu mulai, dan waktu selesai wajib diisi' }, { status: 400 });
    }

    const schedule = await prisma.patrolSchedule.create({
      data: {
        name,
        patrolNumber: Number(patrolNumber),
        startTime,
        endTime,
        isActive: true,
      },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PUT /api/schedules - Update schedule (admin only)
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, name, patrolNumber, startTime, endTime, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID jadwal wajib disertakan' }, { status: 400 });
    }

    const dataToUpdate: Record<string, any> = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (patrolNumber !== undefined) dataToUpdate.patrolNumber = Number(patrolNumber);
    if (startTime !== undefined) dataToUpdate.startTime = startTime;
    if (endTime !== undefined) dataToUpdate.endTime = endTime;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.patrolSchedule.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/schedules - Delete or deactivate schedule (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID jadwal wajib disertakan' }, { status: 400 });
    }

    // Check if schedule is used in patrol sessions
    const sessionCount = await prisma.patrolSession.count({ where: { scheduleId: id } });

    if (sessionCount > 0) {
      // Soft-delete to preserve history
      const updated = await prisma.patrolSchedule.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: 'Jadwal dinonaktifkan karena memiliki riwayat sesi patroli.',
        schedule: updated,
        softDeleted: true,
      });
    }

    // Hard-delete if never used
    await prisma.patrolSchedule.delete({ where: { id } });
    return NextResponse.json({ message: 'Jadwal berhasil dihapus permanen.', softDeleted: false });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
