'use client';

// IndexedDB wrapper for offline storage: room checks, photos, findings, offline QR scans, and master catalog cache
const DB_NAME = 'jec_patrol_offline_db';
const DB_VERSION = 2;

const STORE_CHECKS = 'offline_checks';
const STORE_FINDINGS = 'offline_findings';
const STORE_MASTER_FLOORS = 'master_floors';
const STORE_MASTER_ROOMS = 'master_rooms';
const STORE_OFFLINE_QR_SCANS = 'offline_qr_scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CHECKS)) {
        db.createObjectStore(STORE_CHECKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FINDINGS)) {
        db.createObjectStore(STORE_FINDINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MASTER_FLOORS)) {
        db.createObjectStore(STORE_MASTER_FLOORS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MASTER_ROOMS)) {
        db.createObjectStore(STORE_MASTER_ROOMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE_QR_SCANS)) {
        db.createObjectStore(STORE_OFFLINE_QR_SCANS, { keyPath: 'id' });
      }
    };
  });
}

// -------------------------------------------------------------
// Interfaces
// -------------------------------------------------------------

export interface OfflineCheck {
  id: string;
  sessionFloorId: string;
  roomId: string;
  roomCode?: string;
  floorId?: string;
  floorCode?: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
  checklistValues?: Record<string, string>;
  condition: 'normal' | 'finding';
  remarks?: string;
  photoBase64: string; // Base64 representation of photo for offline storage
  checkedAt: string;
}

export interface OfflineFinding {
  id: string;
  checkId?: string;
  sessionId?: string;
  floorId?: string;
  roomId?: string;
  floorNameSnapshot: string;
  roomNameSnapshot: string;
  category: string;
  description: string;
  createdAt: string;
}

export interface OfflineQrScan {
  id: string;
  sessionFloorId: string;
  floorCode: string;
  qrToken: string;
  scannedAt: string;
}

export interface CachedRoom {
  id: string;
  floorId: string;
  code: string;
  name: string;
  patrolOrder: number;
  hasAc: boolean;
  hasLight: boolean;
  photoGuide?: string;
  checklistTemplateId?: string | null;
  checklistTemplate?: { id: string; name: string; items: string[]; isDefault?: boolean } | null;
  isActive: boolean;
}

export interface CachedFloor {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  qrToken?: string;
  rooms?: CachedRoom[];
}

// -------------------------------------------------------------
// Master Data Caching (Pre-download)
// -------------------------------------------------------------

export async function cacheMasterPatrolData(floorsData: any[]): Promise<{ floorsCount: number; roomsCount: number }> {
  const db = await openDB();
  let totalRooms = 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MASTER_FLOORS, STORE_MASTER_ROOMS], 'readwrite');
    const floorStore = tx.objectStore(STORE_MASTER_FLOORS);
    const roomStore = tx.objectStore(STORE_MASTER_ROOMS);

    // Clear old catalog cache first
    floorStore.clear();
    roomStore.clear();

    for (const f of floorsData) {
      const floorRecord: CachedFloor = {
        id: f.id,
        code: f.code,
        name: f.name,
        sortOrder: f.sortOrder ?? 0,
        qrToken: f.qrCode?.token || f.qrToken,
      };
      floorStore.put(floorRecord);

      if (Array.isArray(f.rooms)) {
        for (const r of f.rooms) {
          totalRooms++;
          const roomRecord: CachedRoom = {
            id: r.id,
            floorId: f.id,
            code: r.code,
            name: r.name,
            patrolOrder: r.patrolOrder ?? 0,
            hasAc: r.hasAc !== false,
            hasLight: r.hasLight !== false,
            photoGuide: r.photoGuide || `Periksa ruangan ${r.name}`,
            checklistTemplateId: r.checklistTemplateId || r.checklistTemplate?.id || null,
            checklistTemplate: r.checklistTemplate || null,
            isActive: r.isActive !== false,
          };
          roomStore.put(roomRecord);
        }
      }
    }

    tx.oncomplete = () => resolve({ floorsCount: floorsData.length, roomsCount: totalRooms });
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedFloors(): Promise<CachedFloor[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MASTER_FLOORS, 'readonly');
      const store = tx.objectStore(STORE_MASTER_FLOORS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

import { dbFloorMap } from './dummy-data';

export function matchFloor(f: CachedFloor, query: string): boolean {
  if (!f || !query) return false;
  const q = String(query).trim().toLowerCase();
  const fId = String(f.id).trim().toLowerCase();
  const fCode = String(f.code || '').trim().toLowerCase();
  const fName = String(f.name || '').trim().toLowerCase();

  // 1. Direct ID match
  if (fId === q) return true;

  // 2. Direct code match (e.g. 'l1', 'sb', 'p4')
  if (fCode === q) return true;

  // 3. Name exact match
  if (fName === q) return true;

  // 4. Prefix match e.g. floor-l1, floor-sb, sf-l1
  if (`floor-${fCode}` === q || `sf-${fCode}` === q) return true;

  // 5. DB floor map check (for UUIDs)
  if (dbFloorMap[q] && dbFloorMap[q].toLowerCase() === fCode) return true;
  if (dbFloorMap[fId] && dbFloorMap[fId].toLowerCase() === q) return true;

  // 6. Clean stripped prefix: 'floor-1' -> '1', 'floor-p4' -> 'p4'
  const cleanQ = q.replace(/^floor-/, '').replace(/^sf-/, '');
  if (cleanQ === fCode) return true;

  // 7. Canonical numeric/code mapping for RS Mata JEC ORBITA
  const aliasMap: Record<string, string> = {
    '0': 'sb',
    'sb': 'sb',
    'semi basement': 'sb',
    '1': 'l1',
    'l1': 'l1',
    '2': 'p2',
    'p2': 'p2',
    '3': 'p3',
    'p3': 'p3',
    '4': 'p4',
    'p4': 'p4',
    '5': 'l5',
    'l5': 'l5',
    '6': 'l6',
    'l6': 'l6',
    '7': 'l7',
    'l7': 'l7',
    '8': 'l8',
    'l8': 'l8',
    '9': 'l9',
    'l9': 'l9',
    '10': 'l10',
    'l10': 'l10',
    '11': 'l11',
    'l11': 'l11',
  };

  if (aliasMap[cleanQ] && aliasMap[cleanQ] === fCode) {
    return true;
  }

  return false;
}

export async function getCachedRoomsByFloor(floorIdOrCode: string): Promise<CachedRoom[]> {
  try {
    const db = await openDB();
    const allFloors = await getCachedFloors();
    const matchedFloor = allFloors.find(f => matchFloor(f, floorIdOrCode));

    const targetFloorId = matchedFloor ? matchedFloor.id : floorIdOrCode;
    let targetFloorCode = matchedFloor ? matchedFloor.code.toUpperCase() : null;

    if (!targetFloorCode) {
      const clean = String(floorIdOrCode).trim().toLowerCase().replace(/^floor-/, '').replace(/^sf-/, '');
      const aliasMap: Record<string, string> = {
        '0': 'SB', 'sb': 'SB', 'semi basement': 'SB',
        '1': 'L1', 'l1': 'L1',
        '2': 'P2', 'p2': 'P2',
        '3': 'P3', 'p3': 'P3',
        '4': 'P4', 'p4': 'P4',
        '5': 'L5', 'l5': 'L5',
        '6': 'L6', 'l6': 'L6',
        '7': 'L7', 'l7': 'L7',
        '8': 'L8', 'l8': 'L8',
        '9': 'L9', 'l9': 'L9',
        '10': 'L10', 'l10': 'L10',
        '11': 'L11', 'l11': 'L11',
      };
      if (aliasMap[clean]) {
        targetFloorCode = aliasMap[clean];
      } else if (/^[lp]?\d+$/i.test(clean)) {
        targetFloorCode = clean.toUpperCase();
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MASTER_ROOMS, 'readonly');
      const store = tx.objectStore(STORE_MASTER_ROOMS);
      const req = store.getAll();
      req.onsuccess = () => {
        const allRooms: CachedRoom[] = req.result || [];
        const filtered = allRooms
          .filter(r => {
            // Priority 1: Strict room code prefix check (e.g. L1-01 -> L1, P4-01 -> P4)
            if (targetFloorCode && r.code) {
              const roomPrefix = r.code.split('-')[0].toUpperCase();
              return roomPrefix === targetFloorCode;
            }
            // Priority 2: Fallback to floorId match
            return r.floorId === targetFloorId || r.floorId === floorIdOrCode;
          })
          .sort((a, b) => a.patrolOrder - b.patrolOrder);
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getCachedRoomById(roomId: string): Promise<CachedRoom | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MASTER_ROOMS, 'readonly');
      const store = tx.objectStore(STORE_MASTER_ROOMS);
      const req = store.get(roomId);
      req.onsuccess = () => {
        if (req.result) return resolve(req.result);
        // Fallback: search by code
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const rooms: CachedRoom[] = allReq.result || [];
          const found = rooms.find(r => r.id === roomId || r.code.toLowerCase() === roomId.toLowerCase());
          resolve(found || null);
        };
        allReq.onerror = () => resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Offline Checks (Room Inspections & Photos)
// -------------------------------------------------------------

export async function saveOfflineCheck(check: OfflineCheck): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKS, 'readwrite');
    const store = tx.objectStore(STORE_CHECKS);
    const req = store.put(check);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineChecks(): Promise<OfflineCheck[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHECKS, 'readonly');
      const store = tx.objectStore(STORE_CHECKS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineCheck(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKS, 'readwrite');
    const store = tx.objectStore(STORE_CHECKS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// Offline Findings
// -------------------------------------------------------------

export async function saveOfflineFinding(finding: OfflineFinding): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINDINGS, 'readwrite');
    const store = tx.objectStore(STORE_FINDINGS);
    const req = store.put(finding);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineFindings(): Promise<OfflineFinding[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FINDINGS, 'readonly');
      const store = tx.objectStore(STORE_FINDINGS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineFinding(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINDINGS, 'readwrite');
    const store = tx.objectStore(STORE_FINDINGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// Offline QR Scans
// -------------------------------------------------------------

export async function saveOfflineQrScan(scan: OfflineQrScan): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE_QR_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_OFFLINE_QR_SCANS);
    const req = store.put(scan);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineQrScans(): Promise<OfflineQrScan[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_QR_SCANS, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE_QR_SCANS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineQrScan(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE_QR_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_OFFLINE_QR_SCANS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// Offline Counts & Memory Cleanup
// -------------------------------------------------------------

export async function getOfflineCount(): Promise<{ checks: number; findings: number; qrScans: number }> {
  try {
    const [checks, findings, qrScans] = await Promise.all([
      getOfflineChecks(),
      getOfflineFindings(),
      getOfflineQrScans(),
    ]);
    return { checks: checks.length, findings: findings.length, qrScans: qrScans.length };
  } catch {
    return { checks: 0, findings: 0, qrScans: 0 };
  }
}

export async function deleteOfflineChecksByIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKS, 'readwrite');
    const store = tx.objectStore(STORE_CHECKS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineFindingsByIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINDINGS, 'readwrite');
    const store = tx.objectStore(STORE_FINDINGS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineQrScansByIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE_QR_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_OFFLINE_QR_SCANS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clears only temporary transaction data (checks + photos, findings, qrScans) after successful sync
// Preserves master catalog (master_floors, master_rooms) so device stays ready offline
export async function clearTemporaryOfflineMedia(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_CHECKS, STORE_FINDINGS, STORE_OFFLINE_QR_SCANS], 'readwrite');
      tx.objectStore(STORE_CHECKS).clear();
      tx.objectStore(STORE_FINDINGS).clear();
      tx.objectStore(STORE_OFFLINE_QR_SCANS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lastPatrolState');
      } catch {}
    }
  } catch (err) {
    console.warn('Clear temporary offline media error:', err);
  }
}

export async function clearOfflineData(): Promise<void> {
  return clearTemporaryOfflineMedia();
}

