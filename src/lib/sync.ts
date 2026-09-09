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

    const hasErrors = checkErrors.length > 0 || findingErrors.length > 0;
    const errorSummary = hasErrors
      ? [...checkErrors, ...findingErrors].slice(0, 2).join('; ')
      : undefined;

    return {
      success: !hasErrors || (checksSynced > 0 || findingsSynced > 0),
      checksSynced,
      findingsSynced,
      error: errorSummary,
    };
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
