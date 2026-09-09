import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/findings/[id] - Get detail finding by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        room: { select: { id: true, name: true, code: true } },
        floor: { select: { id: true, name: true, code: true } },
        check: {
          include: {
            photos: {
              select: {
                id: true,
                filePath: true,
                hasWatermark: true,
                takenAt: true,
              },
            },
          },
        },
        updates: {
          include: {
            user: { select: { id: true, name: true, employeeId: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Temuan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(finding);
  } catch (error: unknown) {
    console.error('Fetch finding error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/findings/[id] - Update finding status or add comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'supervisor' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, newStatus, comment } = body;

    const existing = await prisma.finding.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Temuan tidak ditemukan' }, { status: 404 });
    }

    if (action === 'status_change') {
      if (!newStatus || !['new', 'in_progress', 'resolved'].includes(newStatus)) {
        return NextResponse.json({ error: 'Status baru tidak valid' }, { status: 400 });
      }

      // Update finding status
      const updatedFinding = await prisma.finding.update({
        where: { id },
        data: { status: newStatus },
      });

      // Add finding update history
      await prisma.findingUpdate.create({
        data: {
          findingId: id,
          userId: auth.id,
          action: 'status_change',
          oldStatus: existing.status,
          newStatus,
          comment: comment || null,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: auth.id,
          action: 'update_finding_status',
          entityType: 'finding',
          entityId: id,
          metadata: { oldStatus: existing.status, newStatus },
        },
      });

      return NextResponse.json({ success: true, finding: updatedFinding });
    }

    if (action === 'comment') {
      if (!comment || !comment.trim()) {
        return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 });
      }

      const update = await prisma.findingUpdate.create({
        data: {
          findingId: id,
          userId: auth.id,
          action: 'comment',
          comment: comment.trim(),
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: auth.id,
          action: 'comment_finding',
          entityType: 'finding',
          entityId: id,
        },
      });

      return NextResponse.json({ success: true, update });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Update finding error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
