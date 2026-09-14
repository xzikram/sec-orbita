import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const DEFAULT_SETTINGS: Record<string, string> = {
  hospital_name: 'RS Mata JEC ORBITA',
  patrol_interval: '3',
  late_tolerance: '15',
  require_photo: 'true',
  compression_quality: '80',
  watermark_timestamp: 'true',
  block_gallery: 'false',
  require_qr: 'true',
  gps_validation: 'false',
  notif_late: 'true',
  notif_finding: 'true',
};

// GET /api/settings - List all settings
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await prisma.systemSetting.findMany();
    const obj: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach(s => {
      obj[s.key] = s.value;
    });
    return NextResponse.json(obj);
  } catch (error: unknown) {
    console.error('Failed to load settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// PUT /api/settings - Update settings (admin only)
export async function PUT(request: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await Promise.all(updates);

    // Record audit log
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'update_system_settings',
        entityType: 'settings',
        entityId: 'global',
        metadata: body,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
