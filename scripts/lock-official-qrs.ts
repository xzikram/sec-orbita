import 'dotenv/config';
import prisma from '../src/lib/prisma';

export const OFFICIAL_FLOOR_QRS = [
  { floorCode: 'SB', name: 'Semi Basement', token: 'JEC-ORB-SB-1785290309537-R4ZC' },
  { floorCode: 'L1', name: 'Lantai 1', token: 'JEC-ORB-L1-1785290309542-8Z4K' },
  { floorCode: 'P2', name: 'Lantai P2', token: 'JEC-ORB-P2-1785290309546-TWEO' },
  { floorCode: 'P3', name: 'Lantai P3', token: 'JEC-ORB-P3-1785290309549-P2CR' },
  { floorCode: 'P4', name: 'Lantai P4', token: 'JEC-ORB-P4-1785290309552-ZUMY' },
  { floorCode: 'L5', name: 'Lantai 5', token: 'JEC-ORB-L5-1785290309555-6X2J' },
  { floorCode: 'L6', name: 'Lantai 6', token: 'JEC-ORB-L6-1785290309559-6YRH' },
  { floorCode: 'L7', name: 'Lantai 7', token: 'JEC-ORB-L7-1785290309562-B2S5' },
  { floorCode: 'L8', name: 'Lantai 8', token: 'JEC-ORB-L8-1785290309565-QK16' },
  { floorCode: 'L9', name: 'Lantai 9', token: 'JEC-ORB-L9-1785290309568-XUYC' },
  { floorCode: 'L10', name: 'Lantai 10', token: 'JEC-ORB-L10-1785290309572-9J8U' },
  { floorCode: 'L11', name: 'Lantai 11', token: 'JEC-ORB-L11-1785290309575-50K0' },
];

async function main() {
  console.log('Synchronizing official physical QR codes with database...');

  const floors = await prisma.floor.findMany({
    include: { building: true },
  });

  console.log(`Found ${floors.length} floors in database.`);

  for (const item of OFFICIAL_FLOOR_QRS) {
    const floor = floors.find(f => f.code.toUpperCase() === item.floorCode.toUpperCase());
    if (!floor) {
      console.warn(`⚠️ Floor ${item.floorCode} not found in database!`);
      continue;
    }

    const qrContent = JSON.stringify({
      token: item.token,
      floorCode: floor.code,
      floorName: floor.name,
      building: floor.building?.name || 'RS Mata JEC ORBITA',
      isOfficialLocked: true,
    });

    const qr = await prisma.floorQrCode.upsert({
      where: { floorId: floor.id },
      update: {
        token: item.token,
        qrContent,
        isActive: true,
        generatedAt: new Date(1785290309550), // Standardized timestamp matching the physical stickers
      },
      create: {
        floorId: floor.id,
        token: item.token,
        qrContent,
        isActive: true,
        generatedAt: new Date(1785290309550),
      },
    });

    console.log(`✓ Floor ${floor.name} (${floor.code}) locked to QR: ${qr.token}`);
  }

  console.log('✅ All 12 official QR codes locked successfully.');
}

main()
  .catch((e) => {
    console.error('Error locking QR codes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
