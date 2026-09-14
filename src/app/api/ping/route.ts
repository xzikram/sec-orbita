import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/ping - Ultra-fast heartbeat probe to verify real server reachability
export async function GET() {
  return NextResponse.json({
    ok: true,
    serverTime: new Date().toISOString(),
  });
}
