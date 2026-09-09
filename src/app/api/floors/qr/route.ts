import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { OFFICIAL_QR_MAP } from '@/lib/qr-constants';

// POST /api/floors/qr - Ensure / restore official locked QR code for a floor
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { floorId } = body;

    if (!floorId) {
      return NextResponse.json({ error: 'Floor ID wajib diisi' }, { status: 400 });
    }

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: { building: true },
    });

    if (!floor) {
      return NextResponse.json({ error: 'Lantai tidak ditemukan' }, { status: 404 });
    }

    // Always use the official locked token corresponding to the physical sticker on the floor
    const token = OFFICIAL_QR_MAP[floor.code.toUpperCase()] || `JEC-ORB-${floor.code.toUpperCase()}-LOCKED`;
    const qrContent = JSON.stringify({
      token,
      floorCode: floor.code,
      floorName: floor.name,
      building: floor.building?.name || 'RS Mata JEC ORBITA',
      isOfficialLocked: true,
      generatedAt: new Date(1785290309550).toISOString(),
    });

    const qrCode = await prisma.floorQrCode.upsert({
      where: { floorId },
      update: {
        token,
        qrContent,
        isActive: true,
        generatedAt: new Date(1785290309550),
      },
      create: {
        floorId,
        token,
        qrContent,
        isActive: true,
        generatedAt: new Date(1785290309550),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.id,
        action: 'lock_official_qr',
        entityType: 'floor_qr_code',
        entityId: qrCode.id,
      },
    });

    return NextResponse.json({
      success: true,
      qrCode: {
        token: qrCode.token,
        generatedAt: qrCode.generatedAt,
      },
      message: 'QR Code resmi fisik berhasil dikunci permanen.',
    });
  } catch (error: unknown) {
    console.error('QR lock error:', error);
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
