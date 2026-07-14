import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/handover - Get pending shift handover for the current user's shift
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const handover = await prisma.shiftHandover.findFirst({
      where: {
        status: 'pending',
        OR: [
          { toUserId: auth.id },
          {
            toUserId: null,
            shiftId: auth.shiftId || undefined
          }
        ],
        fromUserId: { not: auth.id } // Don't show handovers sent by themselves
      },
      include: {
        fromUser: {
          select: {
            name: true,
            employeeId: true
          }
        },
        shift: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ handover });
  } catch (error) {
    console.error('Failed to get shift handover:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/handover - Create a new shift handover
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { notes, shiftId } = body;

    // Get open findings count
    const openFindingsCount = await prisma.finding.count({
      where: {
        status: { in: ['new', 'in_progress'] }
      }
    });

    // Auto-detect target shift if not provided
    let targetShiftId = shiftId;
    if (!targetShiftId && auth.shiftId) {
      const otherShift = await prisma.shift.findFirst({
        where: { id: { not: auth.shiftId } }
      });
      if (otherShift) {
        targetShiftId = otherShift.id;
      }
    }

    if (!targetShiftId) {
      return NextResponse.json({ error: 'Target shift not found' }, { status: 400 });
    }

    const handover = await prisma.shiftHandover.create({
      data: {
        fromUserId: auth.id,
        shiftId: targetShiftId,
        notes: notes || '',
        openFindings: openFindingsCount,
        handoverDate: new Date(),
        status: 'pending'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'create_handover',
        entityType: 'shift_handover',
        entityId: handover.id
      }
    });

    return NextResponse.json({ success: true, handover }, { status: 201 });
  } catch (error) {
    console.error('Failed to create shift handover:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/handover - Acknowledge a pending shift handover
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Handover ID is required' }, { status: 400 });
    }

    const handover = await prisma.shiftHandover.update({
      where: { id },
      data: {
        status: 'acknowledged',
        toUserId: auth.id
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'acknowledge_handover',
        entityType: 'shift_handover',
        entityId: handover.id
      }
    });

    return NextResponse.json({ success: true, handover });
  } catch (error) {
    console.error('Failed to acknowledge shift handover:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
