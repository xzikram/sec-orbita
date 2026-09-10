'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaderboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/security/dashboard');
  }, [router]);

  return null;
}
