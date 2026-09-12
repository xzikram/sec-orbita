'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './admin-dash.module.css';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState<number>(0);
  const [buildingCount, setBuildingCount] = useState<number>(0);
  const [floorCount, setFloorCount] = useState<number>(0);
  const [roomCount, setRoomCount] = useState<number>(0);
  const [scheduleCount, setScheduleCount] = useState<number>(0);
  const [shiftCount, setShiftCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [floorsRes, usersRes, buildingsRes, schedulesRes, shiftsRes] = await Promise.all([
          fetch('/api/floors'),
          fetch('/api/users'),
          fetch('/api/buildings'),
          fetch('/api/schedules'),
          fetch('/api/shifts'),
        ]);

        if (floorsRes.ok) {
          const floorsData = await floorsRes.json();
          setFloorCount(floorsData.length);
          const totalRooms = floorsData.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0);
          setRoomCount(totalRooms);
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUserCount(Array.isArray(usersData) ? usersData.length : (usersData.data?.length || 0));
        }
        if (buildingsRes.ok) {
          const bData = await buildingsRes.json();
          setBuildingCount(Array.isArray(bData) ? bData.length : 0);
        }
        if (schedulesRes.ok) {
          const sData = await schedulesRes.json();
          setScheduleCount(Array.isArray(sData) ? sData.length : 0);
        }
        if (shiftsRes.ok) {
          const shData = await shiftsRes.json();
          setShiftCount(Array.isArray(shData) ? shData.length : 0);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const menuCards = [
    { href: '/admin/users', icon: '👥', label: 'User Management', count: loading ? '-' : userCount, desc: 'Kelola akun petugas' },
    { href: '/admin/buildings', icon: '🏢', label: 'Master Gedung', count: loading ? '-' : buildingCount, desc: 'Data gedung' },
    { href: '/admin/floors', icon: '🏗️', label: 'Master Lantai', count: loading ? '-' : floorCount, desc: 'Data lantai' },
    { href: '/admin/rooms', icon: '🚪', label: 'Master Ruangan', count: loading ? '-' : roomCount, desc: 'Data ruangan' },
    { href: '/admin/schedules', icon: '📅', label: 'Jadwal Patroli', count: loading ? '-' : scheduleCount, desc: `${scheduleCount} sesi patroli` },
    { href: '/admin/shifts', icon: '⏰', label: 'Shift', count: loading ? '-' : shiftCount, desc: 'Pengaturan shift' },
    { href: '/admin/qr-codes', icon: '📱', label: 'Generate QR', count: loading ? '-' : floorCount, desc: 'QR per lantai' },
    { href: '/admin/settings', icon: '⚙️', label: 'Pengaturan', count: null, desc: 'Konfigurasi sistem' },
  ];

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <div className={styles.welcomeIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 className={styles.title}>Selamat Datang, Admin</h1>
            <p className={styles.subtitle}>Kelola sistem patroli security RS Mata JEC ORBITA</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : userCount}</span><span className={styles.statLabel}>User</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : floorCount}</span><span className={styles.statLabel}>Lantai</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : roomCount}</span><span className={styles.statLabel}>Ruangan</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : scheduleCount}</span><span className={styles.statLabel}>Jadwal</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : shiftCount}</span><span className={styles.statLabel}>Shift</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{loading ? '-' : floorCount}</span><span className={styles.statLabel}>QR</span></div>
      </div>

      {/* Menu grid */}
      <h2 className={styles.sectionTitle}>Menu</h2>
      <div className={styles.menuGrid}>
        {menuCards.map(card => (
          <Link key={card.href} href={card.href} className={`card card-interactive ${styles.menuCard}`}>
            <div className={styles.menuCardBody}>
              <span className={styles.menuIcon}>{card.icon}</span>
              <div className={styles.menuInfo}>
                <h3 className={styles.menuLabel}>{card.label}</h3>
                <p className={styles.menuDesc}>{card.desc}</p>
              </div>
              {card.count !== null && <span className={styles.menuCount}>{card.count}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
