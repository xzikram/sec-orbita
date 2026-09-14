'use client';

import {
  getOfflineChecks,
  getOfflineFindings,
  getOfflineQrScans,
  deleteOfflineCheck,
  deleteOfflineFinding,
  deleteOfflineQrScan,
  deleteOfflineChecksByIds,
  deleteOfflineFindingsByIds,
  deleteOfflineQrScansByIds,
  clearTemporaryOfflineMedia,
  type OfflineCheck,
  type OfflineFinding,
  type OfflineQrScan,
} from './db';
import { flushQueuedSystemErrors } from './error-reporter';

export interface SyncResult {
  success: boolean;
  checksSynced: number;
  findingsSynced: number;
  qrScansSynced: number;
  memoryCleared?: boolean;
  error?: string;
}

export type SyncProgressCallback = (progress: {
  percent: number;
  currentChunk: number;
  totalChunks: number;
  statusText: string;
}) => void;

export async function syncOfflineData(onProgress?: SyncProgressCallback): Promise<SyncResult> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return { success: false, checksSynced: 0, findingsSynced: 0, qrScansSynced: 0, error: 'Perangkat offline' };
  }

  // Also flush queued error logs to server
  flushQueuedSystemErrors().catch(() => {});

  let checksSynced = 0;
  let findingsSynced = 0;
  let qrScansSynced = 0;

  try {
    const checks: OfflineCheck[] = await getOfflineChecks();
    const findings: OfflineFinding[] = await getOfflineFindings();
    const qrScans: OfflineQrScan[] = await getOfflineQrScans();

    const totalItems = checks.length + findings.length + qrScans.length;
    if (totalItems === 0) {
      return { success: true, checksSynced: 0, findingsSynced: 0, qrScansSynced: 0, memoryCleared: true };
    }

    // 1. High-Speed Chunked Batch Upload (/api/patrol/sync-bundle)
    // Send in chunks of 8-10 checks per HTTP request for lightning-fast, crash-proof upload
    const CHUNK_SIZE = 10;
    const checkChunks: OfflineCheck[][] = [];
    for (let i = 0; i < checks.length; i += CHUNK_SIZE) {
      checkChunks.push(checks.slice(i, i + CHUNK_SIZE));
    }

    const totalChunks = Math.max(1, checkChunks.length);
    let batchSucceeded = true;

    if (checkChunks.length > 0) {
      for (let idx = 0; idx < checkChunks.length; idx++) {
        const chunk = checkChunks[idx];
        const isLastChunk = idx === checkChunks.length - 1;

        // Attach findings & QR scans to the first or last chunk
        const chunkFindings = idx === 0 ? findings : [];
        const chunkQrScans = isLastChunk ? qrScans : [];

        if (onProgress) {
          const percent = Math.round(((idx + 1) / totalChunks) * 90);
          onProgress({
            percent,
            currentChunk: idx + 1,
            totalChunks,
            statusText: `Mengunggah data paket ${idx + 1}/${totalChunks}...`,
          });
        }

        try {
          const res = await fetch('/api/patrol/sync-bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checks: chunk,
              findings: chunkFindings,
              qrScans: chunkQrScans,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const syncedChecks: string[] = data.syncedCheckIds || [];
            const syncedFnds: string[] = data.syncedFindingIds || [];
            const syncedQrs: string[] = data.syncedQrScanIds || [];

            await Promise.all([
              deleteOfflineChecksByIds(syncedChecks),
              deleteOfflineFindingsByIds(syncedFnds),
              deleteOfflineQrScansByIds(syncedQrs),
            ]);

            checksSynced += syncedChecks.length;
            findingsSynced += syncedFnds.length;
            qrScansSynced += syncedQrs.length;
          } else {
            batchSucceeded = false;
            break;
          }
        } catch (chunkErr) {
          console.warn('Batch chunk error, falling back to item loop:', chunkErr);
          batchSucceeded = false;
          break;
        }
      }
    } else if (findings.length > 0 || qrScans.length > 0) {
      // Only findings or QR scans
      try {
        const res = await fetch('/api/patrol/sync-bundle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checks: [], findings, qrScans }),
        });
        if (res.ok) {
          const data = await res.json();
          await Promise.all([
            deleteOfflineFindingsByIds(data.syncedFindingIds || []),
            deleteOfflineQrScansByIds(data.syncedQrScanIds || []),
          ]);
          findingsSynced += (data.syncedFindingIds || []).length;
          qrScansSynced += (data.syncedQrScanIds || []).length;
        } else {
          batchSucceeded = false;
        }
      } catch {
        batchSucceeded = false;
      }
    }

    // 2. Fallback to individual items if batch endpoint failed
    if (!batchSucceeded) {
      const remainingChecks = await getOfflineChecks();
      const remainingFindings = await getOfflineFindings();
      const remainingQrScans = await getOfflineQrScans();

      for (const check of remainingChecks) {
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
          }
        } catch {
          break;
        }
      }

      for (const finding of remainingFindings) {
        try {
          const res = await fetch('/api/findings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finding),
          });
          if (res.ok) {
            await deleteOfflineFinding(finding.id);
            findingsSynced++;
          }
        } catch {
          break;
        }
      }

      for (const scan of remainingQrScans) {
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
          }
        } catch {
          break;
        }
      }
    }

    // 3. Complete Wipe of temporary media & session cache after successful sync
    const remainingChecksCount = (await getOfflineChecks()).length;
    const remainingFindingsCount = (await getOfflineFindings()).length;
    const remainingQrCount = (await getOfflineQrScans()).length;

    const allCleaned = remainingChecksCount === 0 && remainingFindingsCount === 0 && remainingQrCount === 0;

    if (allCleaned) {
      try {
        await clearTemporaryOfflineMedia();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cached-active-session');
          localStorage.removeItem('lastPatrolState');
        }
      } catch (clearErr) {
        console.warn('Post-sync clear notice:', clearErr);
      }
    }

    if (onProgress) {
      onProgress({
        percent: 100,
        currentChunk: totalChunks,
        totalChunks,
        statusText: 'Sinkronisasi selesai! Penyimpanan HP dibersihkan.',
      });
    }

    return {
      success: checksSynced > 0 || findingsSynced > 0 || qrScansSynced > 0 || allCleaned,
      checksSynced,
      findingsSynced,
      qrScansSynced,
      memoryCleared: allCleaned,
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
