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

    const session = await prisma.patrolSession.findUnique({
      where: { id: sessionId },
      include: { sessionFloors: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesi patroli tidak ditemukan' }, { status: 404 });
    }

    if (auth.role === 'security' && session.userId !== auth.id) {
      return NextResponse.json({ error: 'Anda hanya dapat mengakhiri sesi patroli milik Anda sendiri' }, { status: 403 });
    }

    const formattedNotes = [
      reason ? `[ALASAN BERAKHIR LEBIH AWAL: ${reason}]` : '[SELESAI SEBAGIAN]',
      notes ? notes.trim() : '',
      session.notes || '',
    ].filter(Boolean).join('\n');

    const updatedSession = await prisma.patrolSession.update({
      where: { id: sessionId },
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
