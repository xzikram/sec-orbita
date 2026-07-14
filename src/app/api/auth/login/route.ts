import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, password } = body;

    if (!employeeId || !password) {
      return NextResponse.json({ error: 'ID Karyawan dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { shift: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'ID Karyawan tidak ditemukan' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun nonaktif. Hubungi admin.' }, { status: 403 });
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    const authUser = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role as 'security' | 'supervisor' | 'admin',
      shiftId: user.shiftId,
    };

    const token = generateToken(authUser);
    await setAuthCookie(token);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entityType: 'session',
        metadata: { ip: request.headers.get('x-forwarded-for') || 'unknown' },
      },
    });

    // Determine redirect based on role
    const redirectMap = {
      security: '/security/dashboard',
      supervisor: '/supervisor/dashboard',
      admin: '/admin/dashboard',
    };

    return NextResponse.json({
      success: true,
      user: authUser,
      shift: user.shift,
      redirect: redirectMap[user.role],
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
