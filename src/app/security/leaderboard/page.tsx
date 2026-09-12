'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const BADGES_MAP: Record<string, { label: string; icon: string; desc: string }> = {
  first_blood: { label: 'First Blood', icon: '🩸', desc: 'Menemukan & melaporkan temuan pertama' },
  eagle_eye: { label: 'Eagle Eye', icon: '🦅', desc: 'Jeli mendeteksi >= 10 temuan fasilitas' },
  night_owl: { label: 'Night Owl', icon: '🦉', desc: 'Selesai 5+ patroli di shift malam' },
  streak_master: { label: 'Streak Master', icon: '🔥', desc: 'Konsisten patroli 3 hari berturut-turut' },
  speed_runner: { label: 'Speed Runner', icon: '⚡', desc: 'Patroli selesai cepat & tepat waktu' },
  perfect_score: { label: 'Perfect Patrol', icon: '⭐', desc: '100% tepat waktu dengan 10+ patroli' },
};

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const [meRes, lbRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/leaderboard').catch(() => null),
        ]);

        if (meRes && meRes.ok) {
          const meJson = await meRes.json();
          setCurrentUser(meJson.user);
        }

        if (lbRes && lbRes.ok) {
          const lbJson = await lbRes.json();
          setData(lbJson.leaderboard || []);
          setMyRank(lbJson.myRank || 0);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <p className="text-sm text-muted">Memuat papan peringkat...</p>
      </div>
    );
  }

  const top1 = data[0] || null;
  const top2 = data[1] || null;
  const top3 = data[2] || null;

  const myEntry = data.find(u => u.id === currentUser?.id) || null;

  return (
    <div className="page-content" style={{ paddingBottom: '90px' }}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Link href="/security/dashboard" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            ← Kembali
          </Link>
          <span className="badge badge-info" style={{ fontSize: '11px' }}>
            🏆 Musim Patroli Aktif
          </span>
        </div>
        <h1 className={styles.title}>Papan Peringkat Security</h1>
        <p className={styles.subtitle}>Penghargaan Kinerja & Disiplin Jaga JEC ORBITA</p>
      </div>

      {/* My Rank Highlight Card */}
      {myEntry && (
        <div className="card animate-slide-up" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, var(--color-primary-700), var(--color-primary-900))', color: '#fff', padding: '14px 18px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(21, 101, 192, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
                #{myRank}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>Peringkat Anda</p>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>{myEntry.name}</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                  🔥 {myEntry.streak} Hari Streak • {myEntry.completedPatrols} Patroli Selesai
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700' }}>{myEntry.score}</span>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>Poin Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Podium Juara 1, 2, 3 */}
      {data.length > 0 && (
        <div className={styles.podiumContainer}>
          {/* Juara 2 */}
          <div className={styles.podiumCol}>
            {top2 && (
              <>
                <div className={styles.avatar}>
                  {top2.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={`${styles.podiumCard} ${styles.second}`}>
                  <span className={styles.podiumRank}>🥈</span>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>#2</span>
                  <span className={styles.podiumScore}>{top2.score} pts</span>
                </div>
                <div className={styles.podiumName}>{top2.name}</div>
              </>
            )}
          </div>

          {/* Juara 1 */}
          <div className={styles.podiumCol}>
            {top1 && (
              <>
                <span style={{ fontSize: '22px', marginBottom: '-6px' }}>👑</span>
                <div className={styles.avatar} style={{ borderColor: '#FFD700', borderWidth: '3px' }}>
                  {top1.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={`${styles.podiumCard} ${styles.first}`}>
                  <span className={styles.podiumRank}>🥇</span>
                  <span style={{ fontSize: '15px', fontWeight: 900 }}>#1</span>
                  <span className={styles.podiumScore}>{top1.score} pts</span>
                </div>
                <div className={styles.podiumName} style={{ fontWeight: 800, color: 'var(--color-primary-600)' }}>{top1.name}</div>
              </>
            )}
          </div>

          {/* Juara 3 */}
          <div className={styles.podiumCol}>
            {top3 && (
              <>
                <div className={styles.avatar}>
                  {top3.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={`${styles.podiumCard} ${styles.third}`}>
                  <span className={styles.podiumRank}>🥉</span>
                  <span style={{ fontSize: '12px', fontWeight: 800 }}>#3</span>
                  <span className={styles.podiumScore}>{top3.score} pts</span>
                </div>
                <div className={styles.podiumName}>{top3.name}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lencana Prestasi (Badges) */}
      <div className={`card ${styles.myAchievementsCard}`} style={{ padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>🎖️ Koleksi Lencana Prestasi</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
          Lencana yang didapat melalui dedikasi patroli & kejelian pengawasan
        </p>

        <div className={styles.achGrid}>
          {Object.entries(BADGES_MAP).map(([key, meta]) => {
            const hasBadge = myEntry?.achievements?.includes(key);
            return (
              <div
                key={key}
                className={`${styles.achBadge} ${hasBadge ? styles.achBadgeActive : ''}`}
                title={meta.desc}
              >
                <span className={`${styles.badgeIcon} ${hasBadge ? styles.badgeIconActive : ''}`}>
                  {meta.icon}
                </span>
                <span className={`${styles.badgeLabel} ${hasBadge ? styles.badgeLabelActive : ''}`}>
                  {meta.label}
                </span>
                <span style={{ fontSize: '8px', color: hasBadge ? 'var(--color-success-600)' : 'var(--text-muted)', marginTop: '2px', fontWeight: hasBadge ? 700 : 400 }}>
                  {hasBadge ? '✓ Terbuka' : 'Terkunci'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabel Lengkap Leaderboard */}
      <div className={`card ${styles.tableContainer}`} style={{ padding: '14px', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px 0' }}>
          📊 Klasemen Seluruh Personel
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th className={styles.rankCell}>Pos</th>
                <th>Nama Anggota</th>
                <th style={{ textAlign: 'center' }}>Patroli</th>
                <th style={{ textAlign: 'center' }}>Temuan</th>
                <th className={styles.scoreCell}>Skor</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, idx) => {
                const isMe = user.id === currentUser?.id;
                return (
                  <tr key={user.id} className={isMe ? styles.currentUserRow : ''}>
                    <td className={styles.rankCell}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className={styles.nameCell}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: isMe ? 800 : 600 }}>
                          {user.name} {isMe && '(Anda)'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {user.employeeId} • 🔥 {user.streak}d streak
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                      {user.completedPatrols}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12px', color: user.findingsCount > 0 ? 'var(--color-warning-700)' : 'var(--text-muted)' }}>
                      {user.findingsCount}
                    </td>
                    <td className={styles.scoreCell}>
                      {user.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
