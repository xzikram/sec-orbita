'use client';

import { useEffect, useState } from 'react';
import { getOfflineCount } from '@/lib/db';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkOffline = async () => {
      try {
        const counts = await getOfflineCount();
        setOfflineCount(counts.checks + counts.findings);
      } catch (err) {
        console.error('Failed to get offline count:', err);
      }
    };

    checkOffline();
    const interval = setInterval(checkOffline, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) {
    if (offlineCount > 0) {
      return (
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 193, 7, 0.15)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '11px',
            color: '#FFC107',
            fontWeight: '600'
          }}
          title={`${offlineCount} data pending sinkronisasi`}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFC107', display: 'inline-block', boxShadow: '0 0 6px #FFC107' }} />
          <span>{offlineCount} Pending</span>
        </div>
      );
    }
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(76, 175, 80, 0.15)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '11px',
          color: '#4CAF50',
          fontWeight: '600'
        }}
        title="Online - Terhubung ke Server"
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block', boxShadow: '0 0 6px #4CAF50' }} />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(244, 67, 54, 0.15)',
        border: '1px solid rgba(244, 67, 54, 0.3)',
        borderRadius: '12px',
        padding: '4px 8px',
        fontSize: '11px',
        color: '#F44336',
        fontWeight: '600'
      }}
      title="Offline - Tidak ada koneksi internet"
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F44336', display: 'inline-block', boxShadow: '0 0 6px #F44336', animation: 'pulse 1.5s infinite' }} />
      <span>Offline {offlineCount > 0 ? `(${offlineCount})` : ''}</span>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
