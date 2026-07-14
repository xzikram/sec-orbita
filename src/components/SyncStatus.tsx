'use client';

import { useEffect, useState } from 'react';
import { getOfflineCount, clearOfflineData } from '@/lib/db';
import { syncOfflineData } from '@/lib/sync';
import styles from './sync-status.module.css';

export default function SyncStatus() {
  const [counts, setCounts] = useState({ checks: 0, findings: 0 });
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const updateCounts = async () => {
    const c = await getOfflineCount();
    setCounts(c);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

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

  const autoSync = async () => {
    const c = await getOfflineCount();
    if (c.checks > 0 || c.findings > 0) {
      handleSync();
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('Menyinkronkan data...');
    const result = await syncOfflineData();
    setSyncing(false);

    if (result.success) {
      setMessage(`Sukses menyinkronkan ${result.checksSynced} data.`);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || 'Gagal menyinkronkan data.');
      setTimeout(() => setMessage(''), 4000);
    }
    updateCounts();
  };

  const handleClearOffline = async () => {
    if (confirm('Hapus semua data pending yang belum disinkronkan?')) {
      setSyncing(true);
      try {
        await clearOfflineData();
        setMessage('Data lokal berhasil dibersihkan.');
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setSyncing(false);
        updateCounts();
      }
    }
  };

  const totalOffline = counts.checks + counts.findings;

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
            {syncing ? 'Proses...' : 'Sinkronkan'}
          </button>
          <button 
            className={styles.syncBtn} 
            onClick={handleClearOffline} 
            disabled={syncing}
            style={{ color: 'var(--color-danger-600)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}
