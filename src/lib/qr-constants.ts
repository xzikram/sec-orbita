// ============================================================
// OFFICIAL PHYSICAL FLOOR QR CODES - RS MATA JEC ORBITA
// Nilai token ini PERMANEN dan terkunci, identik 100% dengan
// stiker fisik yang telah dicetak dan ditempel di setiap lantai.
// JANGAN DIUBAH!
// ============================================================

export interface OfficialFloorQR {
  floorCode: string;
  floorName: string;
  token: string;
  alternativeTokens?: string[];
  level: number;
}

export const OFFICIAL_FLOOR_QRS: OfficialFloorQR[] = [
  {
    floorCode: 'SB',
    floorName: 'Semi Basement',
    token: 'JEC-ORB-SB-1785290309537-R4ZC',
    level: -1,
  },
  {
    floorCode: 'L1',
    floorName: 'Lantai 1',
    token: 'JEC-ORB-L1-1785290309542-8Z4K',
    level: 1,
  },
  {
    floorCode: 'P2',
    floorName: 'Lantai P2',
    token: 'JEC-ORB-P2-1785290309546-TWEO',
    level: 2,
  },
  {
    floorCode: 'P3',
    floorName: 'Lantai P3',
    token: 'JEC-ORB-P3-1785290309549-P2CR',
    level: 3,
  },
  {
    floorCode: 'P4',
    floorName: 'Lantai P4',
    token: 'JEC-ORB-P4-1785290309552-ZUMY',
    level: 4,
  },
  {
    floorCode: 'L5',
    floorName: 'Lantai 5',
    token: 'JEC-ORB-L5-1785290309555-6X2J',
    level: 5,
  },
  {
    floorCode: 'L6',
    floorName: 'Lantai 6',
    token: 'JEC-ORB-L6-1785290309559-6YRH',
    level: 6,
  },
  {
    floorCode: 'L7',
    floorName: 'Lantai 7',
    token: 'JEC-ORB-L7-1785290309562-B2S5',
    level: 7,
  },
  {
    floorCode: 'L8',
    floorName: 'Lantai 8',
    token: 'JEC-ORB-L8-1785290309565-QK16',
    level: 8,
  },
  {
    floorCode: 'L9',
    floorName: 'Lantai 9',
    token: 'JEC-ORB-L9-1785290309568-XUYC',
    level: 9,
  },
  {
    floorCode: 'L10',
    floorName: 'Lantai 10',
    token: 'JEC-ORB-L10-1785290309572-9J8U',
    level: 10,
  },
  {
    floorCode: 'L11',
    floorName: 'Lantai 11',
    token: 'JEC-ORB-L11-1785290309575-50K0',
    alternativeTokens: ['JEC-ORB-L11-1785290309575-5OK0'],
    level: 11,
  },
];

export const OFFICIAL_QR_MAP: Record<string, string> = Object.fromEntries(
  OFFICIAL_FLOOR_QRS.map((q) => [q.floorCode.toUpperCase(), q.token])
);

export function cleanFloorCode(code: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/^FLOOR-/, '')
    .replace(/^SF-/, '')
    .replace(/^LANTAI-/, '')
    .replace(/^LANTAI\s*/, '')
    .replace(/^L0+/, 'L');
}

export function getFloorByQrToken(scannedToken: string): OfficialFloorQR | undefined {
  if (!scannedToken) return undefined;
  const cleanScanned = scannedToken.trim().toUpperCase();
  return OFFICIAL_FLOOR_QRS.find(
    (q) => q.token.toUpperCase() === cleanScanned ||
           q.alternativeTokens?.some(alt => alt.toUpperCase() === cleanScanned)
  );
}

/**
 * Validasi apakah suatu token QR cocok dengan lantai tertentu.
 * Mendukung pencocokan token utama, alternatif, serta normalisasi prefix (floor-, sf-, dll).
 */
export function isOfficialQrValidForFloor(floorCodeOrId: string, scannedToken: string): boolean {
  if (!scannedToken) return false;
  const cleanScanned = scannedToken.trim().toUpperCase();
  const cleanTarget = cleanFloorCode(floorCodeOrId);

  // 1. Direct check against config
  const config = OFFICIAL_FLOOR_QRS.find(
    (q) => cleanFloorCode(q.floorCode) === cleanTarget || q.floorCode.toUpperCase() === cleanTarget
  );

  if (config) {
    if (config.token.toUpperCase() === cleanScanned) return true;
    if (config.alternativeTokens) {
      return config.alternativeTokens.some((alt) => alt.toUpperCase() === cleanScanned);
    }
  }

  // 2. Token-level matching: check if scanned token is ANY valid official token of RS JEC ORBITA
  const matchedOfficial = getFloorByQrToken(scannedToken);
  if (matchedOfficial) {
    // If cleanTarget is empty or long UUID, or if target matches
    if (!cleanTarget || cleanTarget.length > 8 || cleanFloorCode(matchedOfficial.floorCode) === cleanTarget) {
      return true;
    }
  }

  return false;
}

