import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/sessions/join - Join an ongoing active patrol session
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib disertakan' }, { status: 400 });
    }

    const session = await prisma.patrolSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        schedule: true,
        sessionFloors: {
          include: {
            floor: true,
            patrolChecks: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesi patroli tidak ditemukan' }, { status: 404 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Sesi patroli ini sudah tidak aktif / sudah selesai' }, { status: 400 });
    }

    const now = new Date();
    const timeMakassar = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
    });

    const joinTag = `[BERGABUNG: ${auth.name}]`;
    let updatedNotes = session.notes || '';
    if (!updatedNotes.includes(joinTag) && session.userId !== auth.id) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n[BERGABUNG: ${auth.name} (${auth.employeeId || 'Petugas'}) pukul ${timeMakassar} WITA]`
        : `[BERGABUNG: ${auth.name} (${auth.employeeId || 'Petugas'}) pukul ${timeMakassar} WITA]`;

      await prisma.patrolSession.update({
        where: { id: session.id },
        data: { notes: updatedNotes },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'join_patrol',
        entityType: 'patrol_session',
        entityId: session.id,
        metadata: {
          joinedAt: now.toISOString(),
          userName: auth.name,
          employeeId: auth.employeeId,
          patrolNumber: session.patrolNumber,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil bergabung dengan Ronda #${session.patrolNumber} bersama ${session.user.name}`,
      session: {
        ...session,
        notes: updatedNotes,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
