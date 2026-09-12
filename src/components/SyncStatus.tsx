'use client';

import { useEffect, useState } from 'react';
import { getOfflineCount, clearOfflineData } from '@/lib/db';
import { syncOfflineData } from '@/lib/sync';
import styles from './sync-status.module.css';

export default function SyncStatus() {
  const [counts, setCounts] = useState({ checks: 0, findings: 0, qrScans: 0 });
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const updateCounts = async () => {
    const c = await getOfflineCount();
    setCounts(c);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('Menyinkronkan data...');
    const result = await syncOfflineData();
    setSyncing(false);

    if (result.success) {
      const totalSynced = result.checksSynced + result.findingsSynced + result.qrScansSynced;
      setMessage(`Sukses menyinkronkan ${totalSynced} data.`);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || 'Gagal menyinkronkan data.');
      setTimeout(() => setMessage(''), 4000);
    }
    updateCounts();
  };

  const autoSync = async () => {
    const c = await getOfflineCount();
    if (c.checks > 0 || c.findings > 0 || c.qrScans > 0) {
      handleSync();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      autoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateCounts();
    // Poll counts every 5 seconds for updates
    const i = setInterval(updateCounts, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(i);
    };
  }, []);

  const totalOffline = counts.checks + counts.findings + (counts.qrScans || 0);

  if (totalOffline === 0 && isOnline && !message) return null;

  return (
    <div className={`${styles.bar} ${!isOnline ? styles.barOffline : styles.barPending}`}>
      <div className={styles.info}>
        <span className={styles.statusDot} />
        <span>
          {!isOnline
            ? `Offline • Ada ${totalOffline} data tersimpan lokal`
            : message || `${totalOffline} data siap disinkronkan`}
        </span>
      </div>
      {isOnline && totalOffline > 0 && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        </div>
      )}
    </div>
  );
}
