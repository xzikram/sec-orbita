'use client';

import {
  getOfflineChecks,
  getOfflineFindings,
  deleteOfflineCheck,
  deleteOfflineFinding,
  type OfflineCheck,
  type OfflineFinding,
} from './db';

// Convert base64 dataURL to a File object for API upload
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

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
      // Re-create file from base64 photo
      const file = dataURLtoFile(check.photoBase64, `offline-${check.roomId}.jpg`);
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('sessionFloorId', check.sessionFloorId);
      formData.append('roomId', check.roomId);
      formData.append('acStatus', check.acStatus);
      formData.append('lightStatus', check.lightStatus);
      formData.append('condition', check.condition);
      if (check.remarks) formData.append('remarks', check.remarks);

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
        throw new Error('Gagal menyinkronkan pemeriksaan ruangan');
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
        throw new Error('Gagal menyinkronkan temuan');
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
