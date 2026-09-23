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
    token: 'JEC-ORB-L11-1785290309575-5OKO',
    alternativeTokens: [
      'JEC-ORB-L11-1785290309575-50K0',
      'JEC-ORB-L11-1785290309575-5OK0',
      'JEC-ORB-L11-1785290309575-50KO',
      'JEC-ORB-L11-1785290309575-5OKO',
    ],
    level: 11,
  },
];

export const OFFICIAL_QR_MAP: Record<string, string> = Object.fromEntries(
  OFFICIAL_FLOOR_QRS.map((q) => [q.floorCode.toUpperCase(), q.token])
);

const DB_UUID_TO_CODE: Record<string, string> = {
  '32f95559-8190-4335-b448-6f96b7c7e9fd': 'L1',
  'b9c1f91b-fe5d-49c3-881a-62513fcb4064': 'L10',
  '04a1208d-6e61-45c4-8047-7b3206564f67': 'L11',
  '07a3a76e-cca8-4ca9-a6c6-8d204275d9a4': 'L5',
  '8d9f5507-9c67-402b-875d-bbdf360b736f': 'L6',
  '239e1143-33c6-4808-a431-8facfb63a26b': 'L7',
  'f3cadf41-f5f0-4d2c-9270-dca03be439b8': 'L8',
  '55981ce8-06b0-4a25-abbe-8e5185d64685': 'L9',
  'c0b5ac2b-4d77-4489-8220-1f35e3c73408': 'P2',
  'f9d6a3cb-11c3-4b73-8159-976a34b0844c': 'P3',
  '73822a3b-ae0d-41f2-a361-b82aa7b1e1cd': 'P4',
  'e20088de-d3c8-4079-9532-3c5eeffe31ea': 'SB',
};

export function cleanFloorCode(code: string): string {
  if (!code) return '';
  const trimmed = String(code).trim().toLowerCase();
  if (DB_UUID_TO_CODE[trimmed]) {
    return DB_UUID_TO_CODE[trimmed];
  }

  let c = trimmed
    .replace(/^floor-/, '')
    .replace(/^sf-/, '')
    .replace(/^lantai-/, '')
    .replace(/^lantai\s*/, '')
    .toUpperCase();

  // Canonical mapping for numeric floors & basement aliases
  if (c === '0' || c === 'SB' || c.includes('BASEMENT') || c.includes('SEMI')) return 'SB';
  if (c === '1' || c === 'L1') return 'L1';
  if (c === '2' || c === 'P2') return 'P2';
  if (c === '3' || c === 'P3') return 'P3';
  if (c === '4' || c === 'P4') return 'P4';
  if (c === '5' || c === 'L5') return 'L5';
  if (c === '6' || c === 'L6') return 'L6';
  if (c === '7' || c === 'L7') return 'L7';
  if (c === '8' || c === 'L8') return 'L8';
  if (c === '9' || c === 'L9') return 'L9';
  if (c === '10' || c === 'L10') return 'L10';
  if (c === '11' || c === 'L11') return 'L11';

  return c;
}

export function getFloorByQrToken(scannedToken: string): OfficialFloorQR | undefined {
  if (!scannedToken) return undefined;
  const cleanScanned = scannedToken.trim().toUpperCase();
  // 1. Check exact match on token or alternativeTokens
  const exact = OFFICIAL_FLOOR_QRS.find(
    (q) => q.token.toUpperCase() === cleanScanned ||
           q.alternativeTokens?.some(alt => alt.toUpperCase() === cleanScanned)
  );
  if (exact) return exact;

  // 1b. Fuzzy check: match interchangeable '0' (zero) and 'O' (letter O)
  const normZero = cleanScanned.replace(/O/g, '0');
  const fuzzy = OFFICIAL_FLOOR_QRS.find(
    (q) => q.token.toUpperCase().replace(/O/g, '0') === normZero ||
           q.alternativeTokens?.some(alt => alt.toUpperCase().replace(/O/g, '0') === normZero)
  );
  if (fuzzy) return fuzzy;

  // 2. Check if scanned text contains the canonical floor code
  const norm = cleanFloorCode(cleanScanned);
  return OFFICIAL_FLOOR_QRS.find((q) => q.floorCode === norm);
}

/**
 * Validasi apakah suatu token QR cocok dengan lantai tertentu.
 * Mendukung pencocokan token utama, alternatif, serta toleransi huruf 'O' dan angka '0'.
 */
export function isOfficialQrValidForFloor(floorCodeOrId: string, scannedToken: string): boolean {
  if (!scannedToken) return false;
  const cleanScanned = scannedToken.trim().toUpperCase();
  const cleanTarget = cleanFloorCode(floorCodeOrId);

  // 1. Direct check against config
  const config = OFFICIAL_FLOOR_QRS.find(
    (q) => cleanFloorCode(q.floorCode) === cleanTarget
  );

  if (config) {
    if (config.token.toUpperCase() === cleanScanned) return true;
    if (config.alternativeTokens && config.alternativeTokens.some((alt) => alt.toUpperCase() === cleanScanned)) {
      return true;
    }
    // Fuzzy match for interchangeable '0' and 'O'
    const normScanned = cleanScanned.replace(/O/g, '0');
    if (config.token.toUpperCase().replace(/O/g, '0') === normScanned) return true;
    if (config.alternativeTokens && config.alternativeTokens.some((alt) => alt.toUpperCase().replace(/O/g, '0') === normScanned)) {
      return true;
    }
    // Support matching by clean floor code (e.g. guard scanned test barcode or typed "L1", "LANTAI 1", "SB")
    if (cleanScanned === config.floorCode || cleanFloorCode(cleanScanned) === config.floorCode) {
      return true;
    }
  }

  // 2. Token-level matching: check if scanned token is ANY valid official token of RS JEC ORBITA
  const matchedOfficial = getFloorByQrToken(scannedToken);
  if (matchedOfficial) {
    if (!cleanTarget || cleanFloorCode(matchedOfficial.floorCode) === cleanTarget) {
      return true;
    }
  }

  return false;
}

export function extractQrToken(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.token) return String(parsed.token).trim();
  } catch {}
  return trimmed;
}

/**
 * Validasi apakah suatu token QR cocok dengan lantai manapun di RS Mata JEC ORBITA.
 * Mengembalikan objek OfficialFloorQR jika valid, atau undefined jika tidak valid.
 */
export function validateAnyOfficialFloorQr(scannedText: string): OfficialFloorQR | undefined {
  if (!scannedText) return undefined;
  const token = extractQrToken(scannedText);
  return getFloorByQrToken(token);
}

