'use client';

import { useEffect } from 'react';

export default function SecurityErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Security Patrol Error caught by boundary:', error);
    // Auto-reload once if chunk load failure
    const msg = error?.message || '';
    if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError') || msg.includes('dynamically imported module')) {
      if (!sessionStorage.getItem('chunk_reload_security')) {
        sessionStorage.setItem('chunk_reload_security', 'true');
        window.location.reload();
      }
    }
  }, [error]);

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
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#fee2e2',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        marginBottom: '16px'
      }}>
        ⚠️
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
        Halaman Tidak Dapat Dimuat
      </h2>
      <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        Terjadi pembaruan sistem atau gangguan jaringan. Silakan segarkan halaman untuk memperbarui data pemeriksaan.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--color-primary-600, #0056b3)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🔄 Muat Ulang Halaman
        </button>
        <button
          onClick={() => { window.location.href = '/security/patrol'; }}
          style={{
            background: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Kembali ke Rute Patroli
        </button>
      </div>
    </div>
  );
}
