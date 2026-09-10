import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/system/error-logs - Automatically record client/system errors
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser().catch(() => null);
    const body = await request.json().catch(() => ({}));

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || body.userAgent || 'unknown';

    const message = String(body.message || body.errorMessage || 'Unknown Error').slice(0, 2000);
    const stack = body.stack || body.errorStack || null;
    const digest = body.digest || null;
    const url = String(body.url || request.headers.get('referer') || 'unknown').slice(0, 1000);

    // Deduping recent duplicate errors: If exact same message & url occurred within last 15 seconds, avoid spamming
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const existing = await prisma.systemErrorLog.findFirst({
      where: {
        message,
        url,
        createdAt: { gte: fifteenSecondsAgo },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, deduped: true, id: existing.id });
    }

    const errorLog = await prisma.systemErrorLog.create({
      data: {
        userId: auth?.id || body.userId || null,
        userName: auth?.name || body.userName || null,
        employeeId: auth?.employeeId || body.employeeId || null,
        role: auth?.role || body.role || null,
        url,
        message,
        stack: typeof stack === 'string' ? stack : JSON.stringify(stack),
        digest,
        userAgent,
        ipAddress: ip,
        status: 'unresolved',
      },
    });

    return NextResponse.json({ success: true, id: errorLog.id });
  } catch (err: any) {
    console.error('Failed to log system error:', err);
    return NextResponse.json({ error: 'Failed to record error log' }, { status: 500 });
  }
}

// GET /api/system/error-logs - List error logs for Admin/IT
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'supervisor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { message: { contains: search } },
        { url: { contains: search } },
        { userName: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [logs, total, unresolvedCount] = await Promise.all([
      prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.systemErrorLog.count({ where }),
      prisma.systemErrorLog.count({ where: { status: 'unresolved' } }),
    ]);

    return NextResponse.json({
      logs,
      total,
      unresolvedCount,
    });
  } catch (err: any) {
    console.error('Error fetching error logs:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/system/error-logs - Update status of an error log
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const updated = await prisma.systemErrorLog.update({
      where: { id },
      data: {
        status,
        resolvedBy: status === 'resolved' ? auth.name : null,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, log: updated });
  } catch (err: any) {
    console.error('Error updating error log:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE /api/system/error-logs - Clean resolved logs
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await prisma.systemErrorLog.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Log deleted' });
    }

    // Delete all resolved logs older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const result = await prisma.systemErrorLog.deleteMany({
      where: {
        status: 'resolved',
        createdAt: { lt: sevenDaysAgo },
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (err: any) {
    console.error('Error deleting error logs:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
