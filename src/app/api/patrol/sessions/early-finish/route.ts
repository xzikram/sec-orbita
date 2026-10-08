import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/sessions/early-finish - End an incomplete patrol gracefully with reason
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin' && auth.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionId, reason, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib disertakan' }, { status: 400 });
    }

    let session = null;
    if (sessionId && !String(sessionId).startsWith('offline-')) {
      session = await prisma.patrolSession.findUnique({
        where: { id: sessionId },
        include: { sessionFloors: true },
      });
    }

    if (!session) {
      session = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          status: 'in_progress',
        },
        include: { sessionFloors: true },
        orderBy: { startedAt: 'desc' },
      });
    }

    if (!session) {
      return NextResponse.json({
        success: true,
        message: 'Sesi patroli offline berhasil diselesaikan lebih awal',
      });
    }

    const targetSessionId = session.id;
    const isOwner = session.userId === auth.id;
    const actorNote = isOwner
      ? ''
      : `[DITUTUP OLEH REKAN: ${auth.name} (${auth.employeeId || 'Petugas'})]`;

    const formattedNotes = [
      reason ? `[ALASAN BERAKHIR LEBIH AWAL: ${reason}]` : '[SELESAI SEBAGIAN]',
      actorNote,
      notes ? notes.trim() : '',
      session.notes || '',
    ].filter(Boolean).join('\n');

    const updatedSession = await prisma.patrolSession.update({
      where: { id: targetSessionId },
      data: {
        status: 'incomplete',
        completedAt: new Date(),
        notes: formattedNotes,
      },
      include: { sessionFloors: true },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'early_finish_patrol',
        entityType: 'patrol_session',
        entityId: session.id,
        metadata: { reason, notes },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Patroli berhasil diakhiri lebih awal dengan status tidak lengkap (incomplete)',
      session: updatedSession,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
