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
    const { employeeId, name, email, password, role, shiftId } = body;

    // Validate required fields
    if (!employeeId || !name || !email) {
      return NextResponse.json({ error: 'ID Karyawan, nama, dan email wajib diisi' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['security', 'supervisor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid. Pilih: security, supervisor, atau admin' }, { status: 400 });
    }

    // Validate password
    const userPassword = password || '';
    if (!userPassword || userPassword.length < 6) {
      return NextResponse.json({ error: 'Password wajib diisi dan minimal 6 karakter' }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    const { hashPassword } = await import('@/lib/auth');
    const hashed = await hashPassword(userPassword);

    const user = await prisma.user.create({
      data: {
        employeeId,
        name,
        email,
        password: hashed,
        role: role || 'security',
        shiftId: shiftId || null,
      },
    });

    // Don't return password hash
    const { password: _, ...safeUser } = user as any;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
