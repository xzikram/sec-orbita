import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/support/feedback - Security submits suggestion/problem/question
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu' }, { status: 401 });
    }

    const body = await request.json();
    const { category, subject, message, photoUrl } = body;

    if (!category || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Kategori, subjek, dan pesan wajib diisi' }, { status: 400 });
    }

    const validCategories = ['saran', 'kendala', 'pertanyaan', 'lainnya'];
    const sanitizedCategory = validCategories.includes(category) ? category : 'lainnya';

    const feedback = await prisma.supportFeedback.create({
      data: {
        userId: auth.id,
        category: sanitizedCategory,
        subject: subject.trim(),
        message: message.trim(),
        photoUrl: photoUrl || null,
        status: 'open',
      },
      include: {
        user: {
          select: {
            name: true,
            employeeId: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err: any) {
    console.error('Error submitting feedback:', err);
    return NextResponse.json({ error: 'Gagal mengirim saran/laporan' }, { status: 500 });
  }
}

// GET /api/support/feedback - List feedbacks
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};

    // Security guards only view their own submissions
    if (auth.role === 'security') {
      where.userId = auth.id;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const [feedbacks, total] = await Promise.all([
      prisma.supportFeedback.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              employeeId: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.supportFeedback.count({ where }),
    ]);

    return NextResponse.json({ feedbacks, total });
  } catch (err: any) {
    console.error('Error fetching feedbacks:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/support/feedback - Admin updates feedback status or response notes
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'supervisor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID feedback wajib diisi' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updated = await prisma.supportFeedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (err: any) {
    console.error('Error updating feedback:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status' }, { status: 500 });
  }
}
