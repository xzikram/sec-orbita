'use client';

import { useEffect, useState } from 'react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    console.error('Application Error caught by root boundary:', error);
    const msg = error?.message || '';
    if (
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('dynamically imported module') ||
      msg.includes('instantiated') ||
      msg.includes('module factory') ||
      msg.includes('was required from module')
    ) {
      // Auto-trigger cache cleanup once if chunk mismatch
      if (!sessionStorage.getItem('chunk_reload_v23')) {
        sessionStorage.setItem('chunk_reload_v23', 'true');
        handleForceReload();
      }
    }
  }, [error]);

  const handleForceReload = async () => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        // Clear all CacheStorage
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
        // Unregister stale service worker registrations
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister().catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Cache clearing error:', e);
    }
    // Hard navigate directly to security dashboard with timestamp query
    window.location.replace('/security/dashboard?v=' + Date.now());
  };

  const handleGoToLogin = async () => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
      }
    } catch {}
    window.location.replace('/login?v=' + Date.now());
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#1e293b'
    }}>
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        background: '#e0f2fe',
        color: '#0284c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        marginBottom: '16px'
      }}>
        🚀
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
        Pembaruan Aplikasi Tersedia
      </h2>
      <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '380px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        Aplikasi patroli telah diperbarui ke versi terbaru di server. Tekan tombol di bawah untuk menyegarkan dan membuka versi terbaru.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handleForceReload}
          disabled={isUpdating}
          style={{
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isUpdating ? '⏳ Menyegarkan Versi Baru...' : '🔄 Perbarui & Buka Dashboard'}
        </button>
        <button
          onClick={handleGoToLogin}
          disabled={isUpdating}
          style={{
            background: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '12px 20px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Ke Halaman Login
        </button>
      </div>
    </div>
  );
}
