'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionFloorDetailPage({ params }: { params: Promise<{ sessionId: string; id: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/supervisor/patrol/${sessionId}`);
  }, [router, sessionId]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat detail patroli...</p>
    </div>
  );
}
