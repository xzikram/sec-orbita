'use client';

import {
  getOfflineChecks,
  getOfflineFindings,
  deleteOfflineCheck,
  deleteOfflineFinding,
  type OfflineCheck,
  type OfflineFinding,
} from './db';

export interface SyncResult {
  success: boolean;
  checksSynced: number;
  findingsSynced: number;
  error?: string;
}

export async function syncOfflineData(): Promise<SyncResult> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return { success: false, checksSynced: 0, findingsSynced: 0, error: 'Perangkat offline' };
  }

  let checksSynced = 0;
  let findingsSynced = 0;

  try {
    const checks: OfflineCheck[] = await getOfflineChecks();
    const findings: OfflineFinding[] = await getOfflineFindings();

    // 1. Sync checks
    for (const check of checks) {
      const res = await fetch('/api/patrol/checks', {
        method: 'POST',
        body: JSON.stringify({
          sessionFloorId: check.sessionFloorId,
          roomId: check.roomId,
          acStatus: check.acStatus,
          lightStatus: check.lightStatus,
          condition: check.condition,
          remarks: check.remarks,
          photoBase64: check.photoBase64, // Endpoint supports base64 directly or standard upload
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await deleteOfflineCheck(check.id);
        checksSynced++;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyinkronkan pemeriksaan ruangan');
      }
    }

    // 2. Sync findings
    for (const finding of findings) {
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
        throw new Error(errJson.error || 'Gagal menyinkronkan temuan');
      }
    }

    return { success: true, checksSynced, findingsSynced };
  } catch (err) {
    console.error('Offline Sync Error:', err);
    return {
      success: false,
      checksSynced,
      findingsSynced,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat sinkronisasi',
    };
  }
}
