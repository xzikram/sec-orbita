'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './admin-layout.module.css';

const navGroups = [
  {
    label: 'OVERVIEW',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'USER',
    items: [
      { path: '/admin/users', label: 'Manajemen User', icon: '👥' },
    ],
  },
  {
    label: 'MASTER DATA',
    items: [
      { path: '/admin/buildings', label: 'Gedung', icon: '🏢' },
      { path: '/admin/floors', label: 'Lantai', icon: '🏗️' },
      { path: '/admin/rooms', label: 'Ruangan', icon: '🚪' },
    ],
  },
  {
    label: 'PATROLI',
    items: [
      { path: '/admin/schedules', label: 'Jadwal Patroli', icon: '📅' },
      { path: '/admin/shifts', label: 'Shift', icon: '⏰' },
      { path: '/admin/checklists', label: 'Checklist', icon: '☑️' },
      { path: '/admin/qr-codes', label: 'Generate QR', icon: '📱' },
    ],
  },
  {
    label: 'SISTEM',
    items: [
      { path: '/admin/settings', label: 'Pengaturan', icon: '⚙️' },
      { path: '/admin/audit-logs', label: 'Log Aktivitas', icon: '📜' },
    ],
  },
  {
    label: 'AKSES ROLE',
    items: [
      { path: '/supervisor/dashboard', label: 'Supervisor Panel', icon: '📈' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user.role !== 'admin') {
            router.push(`/${data.user.role}/dashboard`);
            return;
          }
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const isActive = (path: string) => pathname === path || (path !== '/admin/dashboard' && pathname.startsWith(path));

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#f8f9fa' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #0056b3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <img 
              src="/Logo RS JEC ORBITA.png" 
              alt="Logo JEC ORBITA" 
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Admin Panel</span>
            <span className={styles.logoSub}>JEC ORBITA</span>
          </div>
          <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className={styles.navScroll}>
          {navGroups.map(group => (
            <div key={group.label} className={styles.navGroup}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.items.map(item => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.navActive : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={styles.navEmoji}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className={styles.topbarRight}>
            <div className={styles.userChip}>
              <div className={styles.userAvatar}>
                {user ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <span className={styles.userName}>{user ? user.name : 'Admin'}</span>
            </div>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
