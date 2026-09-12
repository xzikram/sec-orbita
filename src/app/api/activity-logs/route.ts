import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/activity-logs - List activity logs (admin/supervisor)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role === 'security') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const search = searchParams.get('search')?.trim().toLowerCase() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

  const where: Record<string, unknown> = {};
  if (action && action !== 'all') where.action = action;

  const rawLogs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { name: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Batch query referenced entities for human-readable labels
  const checkIds = rawLogs.filter(l => l.entityType === 'patrol_check' && l.entityId).map(l => l.entityId as string);
  const sessionIds = rawLogs.filter(l => l.entityType === 'patrol_session' && l.entityId).map(l => l.entityId as string);
  const floorSessionIds = rawLogs.filter(l => l.entityType === 'patrol_session_floor' && l.entityId).map(l => l.entityId as string);
  const findingIds = rawLogs.filter(l => (l.entityType === 'finding' || l.action.includes('finding')) && l.entityId).map(l => l.entityId as string);

  const [checks, sessions, sessionFloors, findings] = await Promise.all([
    checkIds.length > 0 ? prisma.patrolCheck.findMany({
      where: { id: { in: checkIds } },
      select: { id: true, roomNameSnapshot: true, roomCodeSnapshot: true, floorNameSnapshot: true, condition: true }
    }) : [],
    sessionIds.length > 0 ? prisma.patrolSession.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, patrolNumber: true }
    }) : [],
    floorSessionIds.length > 0 ? prisma.patrolSessionFloor.findMany({
      where: { id: { in: floorSessionIds } },
      select: { id: true, floorNameSnapshot: true, floorCodeSnapshot: true }
    }) : [],
    findingIds.length > 0 ? prisma.finding.findMany({
      where: { id: { in: findingIds } },
      select: { id: true, findingNumber: true, category: true, description: true }
    }) : [],
  ]);

  const checkMap = new Map(checks.map(c => [c.id, c]));
  const sessionMap = new Map(sessions.map(s => [s.id, s]));
  const floorMap = new Map(sessionFloors.map(f => [f.id, f]));
  const findingMap = new Map(findings.map(f => [f.id, f]));

  const enrichedLogs = rawLogs.map(log => {
    const meta = (typeof log.metadata === 'object' && log.metadata !== null) ? (log.metadata as Record<string, any>) : {};
    let entity = log.entityType || '-';
    let detail = meta.detail || '';

    // Humanize entity & detail based on action & entityType
    if (log.action === 'login') {
      entity = 'Session';
      detail = 'Login ke sistem berhasil';
    } else if (log.action === 'check_room') {
      const c = log.entityId ? checkMap.get(log.entityId) : null;
      if (c) {
        entity = `${c.roomCodeSnapshot} ${c.roomNameSnapshot}`;
        detail = `Memeriksa ruangan, kondisi: ${c.condition === 'normal' ? 'Normal' : 'Ada Temuan'}`;
      } else {
        entity = meta.roomName || 'Pemeriksaan Ruangan';
        detail = meta.condition ? `Kondisi: ${meta.condition}` : 'Memeriksa ruangan';
      }
    } else if (log.action === 'scan_qr') {
      const f = log.entityId ? floorMap.get(log.entityId) : null;
      entity = f ? f.floorNameSnapshot : (meta.floorName || 'Validasi Lantai');
      detail = 'Scan QR validasi lantai berhasil';
    } else if (log.action === 'start_patrol') {
      const s = log.entityId ? sessionMap.get(log.entityId) : null;
      entity = s ? `Patroli #${s.patrolNumber}` : (meta.patrolNumber ? `Patroli #${meta.patrolNumber}` : 'Sesi Patroli');
      detail = s ? `Memulai patroli sesi ${s.patrolNumber}` : 'Memulai sesi patroli';
    } else if (log.action === 'complete_patrol') {
      const s = log.entityId ? sessionMap.get(log.entityId) : null;
      entity = s ? `Patroli #${s.patrolNumber}` : 'Sesi Patroli';
      detail = 'Menyelesaikan patroli seluruh lantai';
    } else if (log.action === 'early_finish_patrol') {
      const s = log.entityId ? sessionMap.get(log.entityId) : null;
      entity = s ? `Patroli #${s.patrolNumber}` : 'Sesi Patroli';
      detail = `Mengakhiri patroli lebih awal${meta.reason ? `: ${meta.reason}` : ''}${meta.notes ? ` (${meta.notes})` : ''}`;
    } else if (log.action === 'create_finding') {
      const f = log.entityId ? findingMap.get(log.entityId) : null;
      entity = f ? f.findingNumber : (meta.findingNumber || 'Temuan');
      detail = f ? `Membuat temuan: ${f.description.slice(0, 50)}` : (meta.description ? `Membuat temuan: ${meta.description.slice(0, 50)}` : 'Membuat laporan kendala');
    } else if (log.action === 'process_finding') {
      const f = log.entityId ? findingMap.get(log.entityId) : null;
      entity = f ? f.findingNumber : (meta.findingNumber || 'Temuan');
      detail = 'Mengubah status temuan: Diproses';
    } else if (log.action === 'resolve_finding') {
      const f = log.entityId ? findingMap.get(log.entityId) : null;
      entity = f ? f.findingNumber : (meta.findingNumber || 'Temuan');
      detail = 'Menyelesaikan temuan kendala';
    } else if (log.action === 'update_setting') {
      entity = 'System';
      detail = meta.detail || 'Memperbarui pengaturan sistem';
    } else if (log.action === 'create_handover') {
      entity = 'Handover';
      detail = 'Membuat catatan serah terima shift';
    } else if (log.action === 'change_password') {
      entity = 'Security';
      detail = 'Mengubah kata sandi akun';
    }

    const ipRaw = log.ipAddress || meta.ip || '-';
    const ip = ipRaw === '::1' ? '127.0.0.1 (Local)' : ipRaw;

    return {
      id: log.id,
      userId: log.user?.employeeId || '-',
      userName: log.user?.name || 'Sistem',
      action: log.action,
      entity,
      detail: detail || 'Aktivitas tercatat',
      ip,
      timestamp: log.createdAt.toISOString(),
      metadata: log.metadata,
    };
  });

  // Optional client-side search filter
  const filteredLogs = search
    ? enrichedLogs.filter(l =>
        l.userName.toLowerCase().includes(search) ||
        l.userId.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        l.entity.toLowerCase().includes(search) ||
        l.detail.toLowerCase().includes(search) ||
        l.ip.toLowerCase().includes(search)
      )
    : enrichedLogs;

  return NextResponse.json({ logs: filteredLogs, total: filteredLogs.length });
}
