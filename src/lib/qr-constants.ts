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

/**
 * Validasi apakah suatu token QR cocok dengan lantai tertentu.
 * Mendukung pencocokan token utama dan alternatif (misal toleransi O/0).
 */
export function isOfficialQrValidForFloor(floorCode: string, scannedToken: string): boolean {
  if (!floorCode || !scannedToken) return false;
  const cleanScanned = scannedToken.trim().toUpperCase();
  const config = OFFICIAL_FLOOR_QRS.find(
    (q) => q.floorCode.toUpperCase() === floorCode.trim().toUpperCase()
  );
  if (!config) return false;

  if (config.token.toUpperCase() === cleanScanned) return true;
  if (config.alternativeTokens) {
    return config.alternativeTokens.some((alt) => alt.toUpperCase() === cleanScanned);
  }
  return false;
}
