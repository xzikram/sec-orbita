import { NextRequest, NextResponse } from 'next/server';

// Cryptographic JWT HMAC-SHA256 verification using standard Web Crypto API
async function verifyTokenPayload(token: string): Promise<{ role?: string; exp?: number; id?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[PROXY SECURITY] JWT_SECRET environment variable is missing!');
      return null;
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert signature from base64url to Uint8Array
    const sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigPad = sigBase64.padEnd(sigBase64.length + (4 - (sigBase64.length % 4)) % 4, '=');
    const sigBinary = atob(sigPad);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const dataBytes = enc.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    if (!isValid) {
      console.warn('[PROXY SECURITY] Invalid or forged token signature rejected');
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('patrol-auth-token')?.value;
  const payload = token ? await verifyTokenPayload(token) : null;

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
