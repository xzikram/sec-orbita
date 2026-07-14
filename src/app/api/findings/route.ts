import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/findings - List findings
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (status && status !== 'all') where.status = status;
  if (auth.role === 'security') where.userId = auth.id;

  const findings = await prisma.finding.findMany({
    where,
    include: {
      user: { select: { name: true, employeeId: true } },
      updates: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(findings);
}

// POST /api/findings - Create a finding
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();

    // Generate finding number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.finding.count({ where: { findingNumber: { startsWith: `FND-${today}` } } });
    const findingNumber = `FND-${today}-${String(count + 1).padStart(3, '0')}`;

    const finding = await prisma.finding.create({
      data: {
        findingNumber,
        checkId: body.checkId || null,
        sessionId: body.sessionId || null,
        userId: auth.id,
        floorId: body.floorId || null,
        roomId: body.roomId || null,
        floorNameSnapshot: body.floorNameSnapshot || '',
        roomNameSnapshot: body.roomNameSnapshot || '',
        category: body.category || 'lainnya',
        description: body.description,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: auth.id, action: 'create_finding', entityType: 'finding', entityId: finding.id },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
