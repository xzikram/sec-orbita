'use client';

import {
  getOfflineChecks,
  getOfflineFindings,
  getOfflineQrScans,
  deleteOfflineCheck,
  deleteOfflineFinding,
  deleteOfflineQrScan,
  clearTemporaryOfflineMedia,
  type OfflineCheck,
  type OfflineFinding,
  type OfflineQrScan,
} from './db';

export interface SyncResult {
  success: boolean;
  checksSynced: number;
  findingsSynced: number;
  qrScansSynced: number;
  memoryCleared?: boolean;
  error?: string;
}

export async function syncOfflineData(): Promise<SyncResult> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return { success: false, checksSynced: 0, findingsSynced: 0, qrScansSynced: 0, error: 'Perangkat offline' };
  }

  let checksSynced = 0;
  let findingsSynced = 0;
  let qrScansSynced = 0;

  try {
    const checks: OfflineCheck[] = await getOfflineChecks();
    const findings: OfflineFinding[] = await getOfflineFindings();
    const qrScans: OfflineQrScan[] = await getOfflineQrScans();

    // 1. Sync checks with per-item resilience
    const checkErrors: string[] = [];
    for (const check of checks) {
      try {
        const res = await fetch('/api/patrol/checks', {
          method: 'POST',
          body: JSON.stringify({
            sessionFloorId: check.sessionFloorId,
            roomId: check.roomId,
            acStatus: check.acStatus,
            lightStatus: check.lightStatus,
            condition: check.condition,
            remarks: check.remarks,
            photoBase64: check.photoBase64,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          await deleteOfflineCheck(check.id);
          checksSynced++;
        } else {
          const errJson = await res.json().catch(() => ({}));
          checkErrors.push(errJson.error || `Ruangan ${check.roomId} gagal`);
        }
      } catch (e) {
        checkErrors.push(e instanceof Error ? e.message : 'Koneksi terputus saat sync check');
        break; // Network dropped during loop
      }
    }

    // 2. Sync findings with per-item resilience
    const findingErrors: string[] = [];
    for (const finding of findings) {
      try {
        const res = await fetch('/api/findings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finding),
        });

        if (res.ok) {
          await deleteOfflineFinding(finding.id);
          findingsSynced++;
        } else {
          const errJson = await res.json().catch(() => ({}));
          findingErrors.push(errJson.error || 'Temuan gagal');
        }
      } catch (e) {
        findingErrors.push(e instanceof Error ? e.message : 'Koneksi terputus saat sync finding');
        break;
      }
    }

    // 3. Sync offline QR scans with per-item resilience
    const qrErrors: string[] = [];
    for (const scan of qrScans) {
      try {
        const res = await fetch('/api/patrol/qr-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionFloorId: scan.sessionFloorId,
            qrToken: scan.qrToken,
          }),
        });

        if (res.ok) {
          await deleteOfflineQrScan(scan.id);
          qrScansSynced++;
        } else {
          const errJson = await res.json().catch(() => ({}));
          qrErrors.push(errJson.error || `Scan QR ${scan.floorCode} gagal`);
        }
      } catch (e) {
        qrErrors.push(e instanceof Error ? e.message : 'Koneksi terputus saat sync scan QR');
        break;
      }
    }

    // 4. Complete wipe of temporary media if all items synced to guarantee zero storage footprint
    const allChecksDone = checksSynced === checks.length;
    const allFindingsDone = findingsSynced === findings.length;
    const allQrDone = qrScansSynced === qrScans.length;
    const hadItems = checks.length > 0 || findings.length > 0 || qrScans.length > 0;

    if (allChecksDone && allFindingsDone && allQrDone && hadItems) {
      try {
        await clearTemporaryOfflineMedia();
      } catch (clearErr) {
        console.warn('Post-sync clear notice:', clearErr);
      }
    }

    const hasErrors = checkErrors.length > 0 || findingErrors.length > 0 || qrErrors.length > 0;
    const errorSummary = hasErrors
      ? [...checkErrors, ...findingErrors, ...qrErrors].slice(0, 2).join('; ')
      : undefined;

    return {
      success: !hasErrors || (checksSynced > 0 || findingsSynced > 0 || qrScansSynced > 0),
      checksSynced,
      findingsSynced,
      qrScansSynced,
      memoryCleared: allChecksDone && allFindingsDone && allQrDone,
      error: errorSummary,
    };
  } catch (err) {
    console.error('Offline Sync Error:', err);
    return {
      success: false,
      checksSynced,
      findingsSynced,
      qrScansSynced,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat sinkronisasi',
    };
  }
}
