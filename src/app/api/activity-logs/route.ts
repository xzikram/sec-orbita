import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/activity-logs - List activity logs (admin/supervisor)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role === 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: Record<string, unknown> = {};
  if (action && action !== 'all') where.action = action;

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { name: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(logs);
}
