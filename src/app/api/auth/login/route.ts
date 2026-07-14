import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

// Cleanup old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

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
      return NextResponse.json({ error: 'ID Karyawan atau password salah' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun nonaktif. Hubungi admin.' }, { status: 403 });
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'ID Karyawan atau password salah' }, { status: 401 });
    }

    // Reset rate limit on successful login
    loginAttempts.delete(ip);

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
        metadata: { ip },
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

