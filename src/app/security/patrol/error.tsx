'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function PatrolErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const doRetry = useCallback(() => {
    setIsRetrying(true);
    // Clear any stale chunk reload flags and render retry flags on manual retry
    try {
      sessionStorage.removeItem('chunk_reload_security');
      sessionStorage.removeItem('chunk_reload_patrol');
      sessionStorage.removeItem('patrol_render_retry_count');
    } catch {}
    // Reset the error boundary
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 300);
  }, [reset]);

  useEffect(() => {
    console.error('Patrol Error caught by boundary:', error?.message, error);

    const msg = error?.message || '';
    const isChunkError =
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Load failed') ||
      msg.includes('error loading dynamically imported module');

    if (isChunkError) {
      // Auto-retry up to 2 times for chunk load errors
      const retryKey = 'patrol_chunk_retry_count';
      const count = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
      if (count < 2) {
        sessionStorage.setItem(retryKey, String(count + 1));
        // Force a full page reload to get fresh chunks
        window.location.reload();
        return;
      }
      // After 2 retries, reset the counter for next time
      sessionStorage.removeItem(retryKey);
    }

    // For non-chunk errors, auto-retry once after a short delay (guarded by sessionStorage to prevent loops)
    const renderRetryKey = 'patrol_render_retry_count';
    const renderRetryCount = parseInt(sessionStorage.getItem(renderRetryKey) || '0', 10);
    if (renderRetryCount < 1 && autoRetryCount === 0) {
      setAutoRetryCount(1);
      sessionStorage.setItem(renderRetryKey, '1');
      const timer = setTimeout(() => {
        doRetry();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, autoRetryCount, doRetry]);

  const handleForceReload = () => {
    // Clear all cached session data that might be stale
    try {
      sessionStorage.removeItem('chunk_reload_security');
      sessionStorage.removeItem('chunk_reload_patrol');
      sessionStorage.removeItem('patrol_chunk_retry_count');
      sessionStorage.removeItem('patrol_render_retry_count');
      localStorage.removeItem('cached-active-session');
    } catch {}
    window.location.reload();
  };

  const handleGoBack = () => {
    try {
      sessionStorage.removeItem('patrol_chunk_retry_count');
      sessionStorage.removeItem('patrol_render_retry_count');
    } catch {}
    window.location.href = '/security/patrol';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#1e293b',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#fef3c7',
        color: '#d97706',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        marginBottom: '16px',
      }}>
        ⚠️
      </div>

      {isRetrying ? (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
            Mencoba memuat ulang...
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '320px', lineHeight: 1.5, margin: 0 }}>
            Mohon tunggu sebentar
          </p>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
            Halaman Gagal Dimuat
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '320px', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            Terjadi gangguan saat memuat halaman pemeriksaan. Data pemeriksaan Anda yang sudah tersimpan tetap aman.
          </p>
          <p style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '320px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            Tip: Coba muat ulang halaman atau kembali ke rute patroli.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={doRetry}
              style={{
                background: 'var(--color-primary-600, #0056b3)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Coba Lagi
            </button>
            <button
              onClick={handleForceReload}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔃 Muat Ulang Penuh
            </button>
            <button
              onClick={handleGoBack}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Rute Patroli
            </button>
          </div>

          {error?.message && (
            <details style={{ marginTop: '20px', maxWidth: '340px', textAlign: 'left', fontSize: '11px', color: '#94a3b8' }}>
              <summary style={{ cursor: 'pointer', textAlign: 'center' }}>Detail Kendala</summary>
              <pre style={{ marginTop: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px', overflowX: 'auto', fontSize: '10px', color: '#e11d48', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {error.message}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
