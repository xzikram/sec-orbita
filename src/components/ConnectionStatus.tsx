'use client';

import { useEffect, useState } from 'react';
import { getOfflineCount } from '@/lib/db';
import { checkServerReachable } from '@/lib/data-client';

export default function ConnectionStatus() {
  const [serverReachable, setServerReachable] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const probeServer = async () => {
      const ok = await checkServerReachable(800);
      if (isMounted) setServerReachable(ok);
      try {
        const counts = await getOfflineCount();
        if (isMounted) setOfflineCount(counts.checks + counts.findings + (counts.qrScans || 0));
      } catch {}
    };

    probeServer();
    const interval = setInterval(probeServer, 10000);

    const handleOnline = () => probeServer();
    const handleOffline = () => {
      setServerReachable(false);
      probeServer();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const isOnline = serverReachable;

  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        lineHeight: 1,
      }}
      title={isOnline ? (offlineCount > 0 ? `Terhubung (${offlineCount} data di HP)` : 'Terhubung ke Server') : `Terputus (Mode Offline${offlineCount > 0 ? ` - ${offlineCount} data di HP` : ''})`}
      aria-label={isOnline ? 'Online' : 'Offline'}
    >
      <span 
        style={{
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          backgroundColor: isOnline ? '#10b981' : '#ef4444',
          display: 'inline-block',
          boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.7)' : '0 0 8px rgba(239, 68, 68, 0.7)',
          animation: !isOnline ? 'pulseOffline 1.5s infinite' : 'none',
          transition: 'all 0.2s ease',
        }} 
      />
      <style jsx>{`
        @keyframes pulseOffline {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
