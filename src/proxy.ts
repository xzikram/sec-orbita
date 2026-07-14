import { NextRequest, NextResponse } from 'next/server';

// Lightweight JWT decode (header.payload.signature) — we only read the payload
function decodeTokenPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('patrol-auth-token')?.value;

  // Public routes — no auth required
  const publicPaths = ['/login', '/api/auth/login'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes — let the API handlers check auth themselves
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Protected routes — redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const payload = decodeTokenPayload(token);
  const role = payload?.role;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    const redirectUrl = new URL(role === 'supervisor' ? '/supervisor/dashboard' : '/security/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith('/supervisor') && role !== 'supervisor' && role !== 'admin') {
    const redirectUrl = new URL(role === 'admin' ? '/admin/dashboard' : '/security/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith('/security') && role !== 'security') {
    const redirectUrl = new URL(role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
