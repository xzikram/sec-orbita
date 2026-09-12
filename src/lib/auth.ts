import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';
import { getRealtimeShift, ShiftInfo } from './shifts';

const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}
const JWT_SECRET: string = _jwtSecret;
const TOKEN_EXPIRY = '365d'; // 1 year persistent session
const COOKIE_NAME = 'patrol-auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days in seconds


export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'security' | 'supervisor' | 'admin';
  shiftId: string | null;
  shift?: {
    id?: string;
    name: string;
    code?: string;
    startTime: string;
    endTime: string;
  } | null;
  activeShift?: ShiftInfo | null;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

export function generateToken(user: AuthUser): string {
  return sign(
    { id: user.id, employeeId: user.employeeId, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): (JwtPayload & { id: string; employeeId: string; name: string; role: string }) | null {
  try {
    return verify(token, JWT_SECRET) as JwtPayload & { id: string; employeeId: string; name: string; role: string };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        shiftId: true,
        isActive: true,
        shift: {
          select: {
            id: true,
            name: true,
            code: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!user || !user.isActive) return null;

    let activeShift = null;
    try {
      const allActiveShifts = await prisma.shift.findMany({ where: { isActive: true } });
      activeShift = getRealtimeShift(allActiveShifts);
    } catch {
      activeShift = getRealtimeShift();
    }

    return {
      ...user,
      activeShift,
    } as unknown as AuthUser;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string, isSecure?: boolean) {
  const cookieStore = await cookies();
  
  // Safe secure flag: only use secure if explicitly requested or via HTTPS
  // Never blindly enable secure on HTTP production hosts (which causes browsers to reject the cookie)
  let secureFlag = false;
  if (isSecure !== undefined) {
    secureFlag = isSecure;
  } else if (process.env.COOKIE_SECURE === 'true') {
    secureFlag = true;
  }

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureFlag,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE, // 365 days
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  // Ensure the browser immediately expires any residual cookie
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

