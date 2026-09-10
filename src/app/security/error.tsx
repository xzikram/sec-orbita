'use client';

import { useEffect, useState, useCallback } from 'react';

export default function SecurityErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoRetried, setAutoRetried] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const doRetry = useCallback(() => {
    setIsRetrying(true);
    try {
      sessionStorage.removeItem('chunk_reload_security');
      sessionStorage.removeItem('security_chunk_retry_count');
      sessionStorage.removeItem('patrol_chunk_retry_count');
      sessionStorage.removeItem('security_render_retry_count');
    } catch {}
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 300);
  }, [reset]);

  useEffect(() => {
    console.error('Security Error caught by boundary:', error?.message, error);

    const msg = error?.message || '';
    const isChunkError =
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Load failed') ||
      msg.includes('error loading dynamically imported module');

    if (isChunkError) {
      const retryKey = 'security_chunk_retry_count';
      const count = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
      if (count < 2) {
        sessionStorage.setItem(retryKey, String(count + 1));
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(retryKey);
    }

    // Auto-retry once for any error (guarded by sessionStorage to prevent loops)
    const renderRetryKey = 'security_render_retry_count';
    const renderRetryCount = parseInt(sessionStorage.getItem(renderRetryKey) || '0', 10);
    if (renderRetryCount < 1 && !autoRetried) {
      setAutoRetried(true);
      sessionStorage.setItem(renderRetryKey, '1');
      const timer = setTimeout(() => doRetry(), 1000);
      return () => clearTimeout(timer);
    }
  }, [error, autoRetried, doRetry]);

  const handleForceReload = () => {
    try {
      sessionStorage.removeItem('chunk_reload_security');
      sessionStorage.removeItem('security_chunk_retry_count');
      sessionStorage.removeItem('patrol_chunk_retry_count');
      sessionStorage.removeItem('security_render_retry_count');
      localStorage.removeItem('cached-active-session');
    } catch {}
    window.location.reload();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '75vh',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#1e293b'
    }}>
      {isRetrying ? (
        <>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#dbeafe', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', marginBottom: '16px'
          }}>
            🔄
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Mencoba memuat ulang...</h2>
        </>
      ) : (
        <>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#fee2e2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
            Halaman Tidak Dapat Dimuat
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Terjadi pembaruan sistem atau gangguan jaringan. Data pemeriksaan Anda tetap aman.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={doRetry}
              style={{
                background: 'var(--color-primary-600, #0056b3)',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              🔄 Coba Lagi
            </button>
            <button
              onClick={handleForceReload}
              style={{
                background: '#f1f5f9', color: '#334155',
                border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              🔃 Muat Ulang Penuh
            </button>
            <button
              onClick={() => { window.location.href = '/security/patrol'; }}
              style={{
                background: '#f1f5f9', color: '#334155',
                border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Kembali ke Rute Patroli
            </button>
          </div>
        </>
      )}
    </div>
  );
}
