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

  if (serverReachable) {
    if (offlineCount > 0) {
      return (
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '11px',
            color: '#b45309',
            fontWeight: '600'
          }}
          title={`${offlineCount} data tersimpan di HP siap disinkronkan ke server`}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 6px #f59e0b' }} />
          <span>{offlineCount} Tersimpan di HP</span>
        </div>
      );
    }
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '11px',
          color: '#065f46',
          fontWeight: '600'
        }}
        title="Terhubung ke Server RS Mata JEC ORBITA"
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
        <span>Terhubung</span>
      </div>
    );
  }

  // Server unreachable or dead zone
  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '12px',
        padding: '4px 8px',
        fontSize: '11px',
        color: '#b45309',
        fontWeight: '600'
      }}
      title="Mode Patroli Offline — Data aman tersimpan di HP Anda"
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
      <span>Mode Offline {offlineCount > 0 ? `(${offlineCount} data di HP)` : ''}</span>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
