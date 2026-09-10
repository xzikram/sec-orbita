import { NextRequest, NextResponse } from 'next/server';

// Lightweight JWT decode (header.payload.signature) — we only read the payload
function decodeTokenPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    // If token has an expiry and is expired, treat as invalid
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('patrol-auth-token')?.value;
  const payload = token ? decodeTokenPayload(token) : null;

  // Static files and Next.js internals — bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // If user is already authenticated and visits /login, redirect directly to their dashboard
  if (pathname === '/login') {
    if (payload && payload.role) {
      const redirectUrl = new URL(
        payload.role === 'admin'
          ? '/admin/dashboard'
          : payload.role === 'supervisor'
          ? '/supervisor/reports'
          : '/security/dashboard',
        request.url
      );
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // Public routes — no auth required
  const publicPaths = ['/api/auth/login', '/panduan-security'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes — let individual API handlers verify token or handle offline/custom errors
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Root path '/'
  if (pathname === '/') {
    if (payload && payload.role) {
      const target =
        payload.role === 'admin'
          ? '/admin/dashboard'
          : payload.role === 'supervisor'
          ? '/supervisor/reports'
          : '/security/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protected routes — redirect to login if no valid token
  if (!token || !payload) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    if (token && !payload) {
      // Clean up invalid/expired cookie
      response.cookies.delete('patrol-auth-token');
    }
    return response;
  }

  // Role-based route protection
  const role = payload.role;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    const redirectUrl = new URL(role === 'supervisor' ? '/supervisor/reports' : '/security/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith('/supervisor')) {
    if (role === 'admin' && !pathname.includes('/print')) {
      const target = pathname.includes('/findings') ? '/admin/findings' : '/admin/reports';
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (role !== 'supervisor' && role !== 'admin') {
      const redirectUrl = new URL(role === 'admin' ? '/admin/dashboard' : '/security/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (pathname.startsWith('/security') && role !== 'security' && role !== 'admin') {
    const redirectUrl = new URL(role === 'supervisor' ? '/supervisor/reports' : '/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
