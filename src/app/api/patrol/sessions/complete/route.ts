import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/patrol/sessions/complete - Finalize and mark a patrol session as completed (100% full round)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'security' && auth.role !== 'admin' && auth.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionId } = body;

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
      // Pure local offline session with no DB counterpart yet: return success gracefully
      return NextResponse.json({
        success: true,
        message: 'Sesi patroli offline berhasil ditandai selesai',
      });
    }

    const targetSessionId = session.id;
    const now = new Date();

    // Mark all session floors as completed if not already completed
    await prisma.patrolSessionFloor.updateMany({
      where: { sessionId: targetSessionId },
      data: {
        status: 'completed',
        completedAt: now,
      },
    });

    const updatedSession = await prisma.patrolSession.update({
      where: { id: targetSessionId },
      data: {
        status: 'completed',
        completedAt: now,
      },
      include: {
        sessionFloors: {
          include: {
            floor: true,
            patrolChecks: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'complete_patrol',
        entityType: 'patrol_session',
        entityId: session.id,
        metadata: {
          completedAt: now.toISOString(),
          patrolNumber: session.patrolNumber,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Patroli berhasil diselesaikan secara penuh (completed)',
      session: updatedSession,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
