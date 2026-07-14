import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/users - List all users (admin only)
export async function GET() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, employeeId: true, name: true, email: true, role: true, shiftId: true, isActive: true, createdAt: true, shift: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users);
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { hashPassword } = await import('@/lib/auth');
    const hashed = await hashPassword(body.password || 'password123');

    const user = await prisma.user.create({
      data: {
        employeeId: body.employeeId,
        name: body.name,
        email: body.email,
        password: hashed,
        role: body.role || 'security',
        shiftId: body.shiftId || null,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
