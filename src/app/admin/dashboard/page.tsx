'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminUsers, adminBuildings, adminFloors, adminRooms, adminSchedules, adminShifts, qrConfigs } from '@/lib/admin-data';
import styles from './admin-dash.module.css';

export default function AdminDashboard() {
  const [floorCount, setFloorCount] = useState<number>(adminFloors.length);
  const [roomCount, setRoomCount] = useState<number>(adminRooms.length);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/floors');
        if (res.ok) {
          const floorsData = await res.json();
          setFloorCount(floorsData.length);
          const totalRooms = floorsData.reduce((sum: number, f: any) => sum + f.rooms.length, 0);
          setRoomCount(totalRooms);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }
    fetchStats();
  }, []);

  const menuCards = [
    { href: '/admin/users', icon: '👥', label: 'User Management', count: adminUsers.length, desc: 'Kelola akun petugas' },
    { href: '/admin/buildings', icon: '🏢', label: 'Master Gedung', count: adminBuildings.length, desc: 'Data gedung' },
    { href: '/admin/floors', icon: '🏗️', label: 'Master Lantai', count: floorCount, desc: 'Data lantai' },
    { href: '/admin/rooms', icon: '🚪', label: 'Master Ruangan', count: roomCount, desc: 'Data ruangan' },
    { href: '/admin/schedules', icon: '📅', label: 'Jadwal Patroli', count: adminSchedules.length, desc: 'Jadwal 8 sesi' },
    { href: '/admin/shifts', icon: '⏰', label: 'Shift', count: adminShifts.length, desc: 'Pengaturan shift' },
    { href: '/admin/qr-codes', icon: '📱', label: 'Generate QR', count: floorCount, desc: 'QR per lantai' },
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
        <div className={styles.stat}><span className={styles.statNum}>{adminUsers.length}</span><span className={styles.statLabel}>User</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{floorCount}</span><span className={styles.statLabel}>Lantai</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{roomCount}</span><span className={styles.statLabel}>Ruangan</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{adminSchedules.length}</span><span className={styles.statLabel}>Jadwal</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{adminShifts.length}</span><span className={styles.statLabel}>Shift</span></div>
        <div className={styles.stat}><span className={styles.statNum}>{floorCount}</span><span className={styles.statLabel}>QR</span></div>
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
