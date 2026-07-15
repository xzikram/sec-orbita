'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SyncStatus from '@/components/SyncStatus';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import ConnectionStatus from '@/components/ConnectionStatus';
import styles from './security.module.css';

interface LayoutUser {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  shift?: { name: string; startTime: string; endTime: string } | null;
}

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
    path: '/security/patrol',
    label: 'Patroli',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
    path: '/security/leaderboard',
    label: 'Peringkat',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
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
  const [currentUser, setCurrentUser] = useState<LayoutUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    // Load dark mode preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check offline data count
    const checkOffline = async () => {
      try {
        const { getOfflineCount } = await import('@/lib/db');
        const counts = await getOfflineCount();
        setOfflineCount(counts.checks + counts.findings);
      } catch { /* ignore */ }
    };
    checkOffline();
    const offlineInterval = setInterval(checkOffline, 30000);

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          // Auto dark mode for night shifts (endTime after 22:00 or startTime before 06:00)
          if (!savedTheme && data.user.shift) {
            const endH = parseInt(data.user.shift.endTime?.split(':')[0] || '0');
            const startH = parseInt(data.user.shift.startTime?.split(':')[0] || '8');
            if (endH >= 22 || endH <= 5 || startH >= 20) {
              setDarkMode(true);
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          }
        }
      })
      .catch(err => console.error('Error fetching auth user:', err));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(offlineInterval);
    };
  }, []);

  const user = currentUser;
  const shift = currentUser?.shift;

  const isNavActive = (path: string) => {
    if (path === '/security/dashboard') return pathname === '/security/dashboard';
    return pathname.startsWith(path);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="mobile-shell">
      {/* Header */}
      <header className="app-header">
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerLogo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src="/Logo RS JEC ORBITA.png" 
                alt="Logo JEC ORBITA" 
                style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div className={styles.headerInfo}>
              <span className={styles.headerName}>{user?.name || 'Loading...'}</span>
              <span className={styles.headerShift}>{shift ? `${shift.name} • ${shift.startTime} - ${shift.endTime}` : ''}</span>
            </div>
          </div>
          <LiveClock />
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ConnectionStatus />
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1 }}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="page-container" style={{ paddingTop: '0px', paddingBottom: '76px' }}>
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
