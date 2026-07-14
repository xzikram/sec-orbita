'use client';

// Simple IndexedDB wrapper for offline storage of checks and findings
const DB_NAME = 'jec_patrol_offline_db';
const DB_VERSION = 1;
const STORE_CHECKS = 'offline_checks';
const STORE_FINDINGS = 'offline_findings';

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
    };
  });
}

export interface OfflineCheck {
  id: string;
  sessionFloorId: string;
  roomId: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKS, 'readonly');
    const store = tx.objectStore(STORE_CHECKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FINDINGS, 'readonly');
    const store = tx.objectStore(STORE_FINDINGS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

export async function getOfflineCount(): Promise<{ checks: number; findings: number }> {
  try {
    const [checks, findings] = await Promise.all([
      getOfflineChecks(),
      getOfflineFindings(),
    ]);
    return { checks: checks.length, findings: findings.length };
  } catch {
    return { checks: 0, findings: 0 };
  }
}

export async function clearOfflineData(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_CHECKS, STORE_FINDINGS], 'readwrite');
    tx.objectStore(STORE_CHECKS).clear();
    tx.objectStore(STORE_FINDINGS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
