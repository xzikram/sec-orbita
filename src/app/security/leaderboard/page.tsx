'use client';

import { useState, useEffect } from 'react';
import styles from './leaderboard.module.css';

interface LeaderboardUser {
  id: string;
  name: string;
  employeeId: string;
  score: number;
  streak: number;
  completedPatrols: number;
  findingsCount: number;
  onTimeRate: number;
  achievements: string[];
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[];
  myRank: number;
}

const BADGES = [
  { id: 'first_blood', icon: '🎯', label: 'First Blood', desc: 'Melaporkan temuan pertama' },
  { id: 'eagle_eye', icon: '🦅', label: 'Eagle Eye', desc: 'Menemukan 10+ temuan bahaya' },
  { id: 'night_owl', icon: '🌙', label: 'Night Owl', desc: 'Menyelesaikan 5+ ronda malam' },
  { id: 'streak_master', icon: '🔥', label: 'Streak Master', desc: 'Ronda 3+ hari berturut-turut' },
  { id: 'speed_runner', icon: '⚡', label: 'Speed Runner', desc: 'Menyelesaikan ronda <10 menit' },
  { id: 'perfect_score', icon: '⭐', label: 'Perfect Score', desc: '100% kepatuhan (min 10 ronda)' },
];

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        // Fetch current user details
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meJson = await meRes.json();
          setCurrentUser(meJson.user);
        }

        // Fetch leaderboard details
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--color-neutral-200)', borderTop: '4px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat peringkat security...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger-600)' }}>Gagal memuat papan peringkat.</p>
      </div>
    );
  }

  const list = data.leaderboard;
  const firstPlace = list[0];
  const secondPlace = list[1];
  const thirdPlace = list[2];

  // Find current user's profile on leaderboard
  const myProfile = list.find(u => u.id === currentUser?.id);
  const myAchievements = myProfile?.achievements || [];

  return (
    <div className="page-content">
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Peringkat Ronda Security</h1>
        <p className={styles.subtitle}>Sistem Poin Gamifikasi RS Mata JEC ORBITA</p>
      </div>

      {/* Podium Top 3 */}
      {list.length > 0 && (
        <div className={styles.podiumContainer}>
          {/* 2nd Place (Silver) */}
          {secondPlace && (
            <div className={styles.podiumCol}>
              <div className={styles.avatar}>
                {secondPlace.name.substring(0, 2).toUpperCase()}
              </div>
              <div className={`${styles.podiumCard} ${styles.second}`}>
                <span className={styles.podiumRank}>2</span>
                <span className={styles.podiumScore}>{secondPlace.score} Pts</span>
              </div>
              <span className={styles.podiumName}>{secondPlace.name}</span>
            </div>
          )}

          {/* 1st Place (Gold) */}
          {firstPlace && (
            <div className={styles.podiumCol}>
              <div className={styles.avatar} style={{ borderColor: '#FFD700', width: '52px', height: '52px' }}>
                👑
              </div>
              <div className={`${styles.podiumCard} ${styles.first}`}>
                <span className={styles.podiumRank} style={{ fontSize: '28px' }}>1</span>
                <span className={styles.podiumScore}>{firstPlace.score} Pts</span>
              </div>
              <span className={styles.podiumName} style={{ fontWeight: 'bold' }}>{firstPlace.name}</span>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {thirdPlace && (
            <div className={styles.podiumCol}>
              <div className={styles.avatar}>
                {thirdPlace.name.substring(0, 2).toUpperCase()}
              </div>
              <div className={`${styles.podiumCard} ${styles.third}`}>
                <span className={styles.podiumRank}>3</span>
                <span className={styles.podiumScore}>{thirdPlace.score} Pts</span>
              </div>
              <span className={styles.podiumName}>{thirdPlace.name}</span>
            </div>
          )}
        </div>
      )}

      {/* My Achievements Box */}
      {currentUser && (
        <div className={`card ${styles.myAchievementsCard}`}>
          <div className="card-body">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎖️ Kabinet Lencana Saya (Rank #{data.myRank || '-'})
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Kumpulkan lencana dengan melakukan ronda rajin dan melaporkan temuan bahaya.
            </p>

            <div className={styles.achGrid}>
              {BADGES.map(badge => {
                const isUnlocked = myAchievements.includes(badge.id);
                return (
                  <div 
                    key={badge.id} 
                    className={`${styles.achBadge} ${isUnlocked ? styles.achBadgeActive : ''}`}
                    title={badge.desc}
                  >
                    <span className={`${styles.badgeIcon} ${isUnlocked ? styles.badgeIconActive : ''}`}>
                      {badge.icon}
                    </span>
                    <span className={`${styles.badgeLabel} ${isUnlocked ? styles.badgeLabelActive : ''}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ranks Table Card */}
      <div className="card">
        <div className="card-body" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' }}>
            📊 Klasemen Ronda Bulan Ini
          </h3>
          <div className={styles.tableContainer}>
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Nama Petugas</th>
                  <th style={{ textAlign: 'center' }}>Streak</th>
                  <th style={{ textAlign: 'center' }}>Patroli</th>
                  <th style={{ textAlign: 'right' }}>Poin</th>
                </tr>
              </thead>
              <tbody>
                {list.map((officer, index) => {
                  const isMe = officer.id === currentUser?.id;
                  return (
                    <tr key={officer.id} className={isMe ? styles.currentUserRow : ''}>
                      <td className={styles.rankCell}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className={styles.nameCell}>
                        {officer.name} {isMe && <span style={{ fontSize: '10px', background: 'var(--color-primary-500)', color: 'white', padding: '2px 6px', borderRadius: '8px', marginLeft: '4px' }}>Saya</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {officer.streak > 0 ? `🔥 ${officer.streak}d` : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{officer.completedPatrols} Sesi</td>
                      <td className={styles.scoreCell}>{officer.score} Pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
