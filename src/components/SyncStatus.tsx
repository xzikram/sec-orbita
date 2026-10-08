'use client';

import { useEffect, useState } from 'react';
import { getOfflineCount } from '@/lib/db';
import { syncOfflineData } from '@/lib/sync';
import { checkServerReachable } from '@/lib/data-client';
import styles from './sync-status.module.css';

export default function SyncStatus() {
  const [counts, setCounts] = useState({ checks: 0, findings: 0, qrScans: 0 });
  const [serverReachable, setServerReachable] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPercent, setSyncPercent] = useState(0);
  const [message, setMessage] = useState('');

  const updateCounts = async () => {
    try {
      const c = await getOfflineCount();
      setCounts(c);
    } catch {}
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncPercent(10);
    setMessage('Menghubungkan ke server...');

    const result = await syncOfflineData((p) => {
      setSyncPercent(p.percent);
      setMessage(p.statusText);
    });

    setSyncing(false);

    if (result.success) {
      const totalSynced = result.checksSynced + result.findingsSynced + result.qrScansSynced;
      setMessage(`✓ Berhasil menyinkronkan ${totalSynced} data & penyimpanan HP telah dibersihkan.`);
      setTimeout(() => setMessage(''), 4500);
    } else {
      setMessage(result.error || 'Gagal menyinkronkan data.');
      setTimeout(() => setMessage(''), 4000);
    }
    updateCounts();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const probe = async () => {
      const ok = await checkServerReachable(800);
      if (isMounted) setServerReachable(ok);
      try {
        const c = await getOfflineCount();
        if (isMounted) {
          setCounts(c);
          const total = c.checks + c.findings + (c.qrScans || 0);
          if (ok && total > 0 && !syncing) {
            handleSync();
          }
        }
      } catch {}
    };

    probe();
    const interval = setInterval(probe, 6000);

    const handleOnline = async () => {
      const ok = await checkServerReachable(800);
      if (isMounted) {
        setServerReachable(ok);
        if (ok) {
          handleSync();
        }
      }
    };

    const handleOffline = () => {
      if (isMounted) setServerReachable(false);
    };

    const handleSyncComplete = () => {
      if (isMounted) updateCounts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-complete', handleSyncComplete);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const totalOffline = counts.checks + counts.findings + (counts.qrScans || 0);

  if (totalOffline === 0 && !message) return null;

  return (
    <div className={`${styles.bar} ${!serverReachable ? styles.barOffline : styles.barPending}`}>
      <div className={styles.info}>
        <span className={styles.statusDot} />
        <span>
          {message || (
            !serverReachable
              ? `Mode Offline • Ada ${totalOffline} data aman di HP`
              : `${totalOffline} data tersimpan di HP siap dikirim`
          )}
        </span>
      </div>
      {serverReachable && totalOffline > 0 && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? `Sinkron (${syncPercent}%)` : 'Sinkronkan Sekarang'}
          </button>
        </div>
      )}
    </div>
  );
}
