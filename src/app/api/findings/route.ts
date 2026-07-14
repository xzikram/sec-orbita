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

    let realCheckId = body.checkId || null;
    let realSessionId = body.sessionId || null;

    const isCheckDummy = realCheckId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realCheckId) || realCheckId.startsWith('check-'));
    const isSessionDummy = realSessionId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realSessionId) || realSessionId.startsWith('session-'));

    if (isCheckDummy) {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      const recentCheck = await prisma.patrolCheck.findFirst({
        where: {
          roomId: body.roomId,
          userId: auth.id,
          checkedAt: {
            gte: patrolDate
          }
        },
        orderBy: { checkedAt: 'desc' }
      });
      realCheckId = recentCheck ? recentCheck.id : null;
    }

    if (isSessionDummy || !realSessionId || realSessionId.startsWith('session-')) {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
      const patrolDate = new Date(todayStr);

      const recentSession = await prisma.patrolSession.findFirst({
        where: {
          userId: auth.id,
          patrolDate
        },
        orderBy: { startedAt: 'desc' }
      });
      realSessionId = recentSession ? recentSession.id : null;
    }

    const finding = await prisma.finding.create({
      data: {
        findingNumber,
        checkId: realCheckId,
        sessionId: realSessionId,
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
    console.error('Finding creation error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
