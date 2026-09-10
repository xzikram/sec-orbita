'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupervisorDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/supervisor/reports');
  }, [router]);

  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid var(--color-primary-600, #0b6623)',
        borderRadius: '50%',
        margin: '0 auto 12px auto',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ fontSize: '14px' }}>Memuat Laporan Patroli...</p>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
