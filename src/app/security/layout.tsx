'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getCurrentShift } from '@/lib/dummy-data';
import SyncStatus from '@/components/SyncStatus';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import styles from './security.module.css';

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className={styles.headerTime}>{time}</span>;
}

const navItems = [
  {
    path: '/security/dashboard',
    label: 'Beranda',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/security/patrol',
    label: 'Patroli',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    path: '/security/findings',
    label: 'Temuan',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    path: '/security/history',
    label: 'Riwayat',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: '/security/profile',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Error fetching auth user:', err));
  }, []);

  const dummyUser = getCurrentUser();
  const dummyShift = getCurrentShift();

  const user = currentUser || dummyUser;
  const shift = currentUser?.shift || dummyShift;

  const isNavActive = (path: string) => {
    if (path === '/security/dashboard') return pathname === '/security/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <div className="mobile-shell">
      {/* Header */}
      <header className="app-header">
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerLogo}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.headerInfo}>
              <span className={styles.headerName}>{user.name}</span>
              <span className={styles.headerShift}>{shift.name} • {shift.startTime} - {shift.endTime}</span>
            </div>
          </div>
          <LiveClock />
        </div>
      </header>

      {/* Page Content */}
      <div className="page-container" style={{ paddingTop: '80px', paddingBottom: '90px' }}>
        <SyncStatus />
        <PwaInstallBanner />
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" id="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`bottom-nav-item ${isNavActive(item.path) ? 'active' : ''}`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
