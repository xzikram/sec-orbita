'use client';

import { useState, useEffect } from 'react';
import styles from './analytics.module.css';

interface RoomHeatmap {
  name: string;
  count: number;
}

interface FloorHeatmap {
  floorName: string;
  rooms: RoomHeatmap[];
}

interface PeakHour {
  hour: string;
  count: number;
}

interface RecurringRoom {
  roomId: string;
  name: string;
  floor: string;
  count: number;
  categories: string[];
}

interface Recommendation {
  level: 'red' | 'yellow' | 'green';
  text: string;
}

interface AnalyticsData {
  heatmap: FloorHeatmap[];
  peakHours: PeakHour[];
  recurring: RecurringRoom[];
  recommendations: Recommendation[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--color-neutral-200)', borderTop: '4px solid var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat analitik prediktif...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger-600)' }}>Gagal memuat analitik prediktif.</p>
      </div>
    );
  }

  // Get color for heatmap cells based on finding counts
  const getHeatmapCellColor = (count: number) => {
    if (count === 0) return 'rgba(229, 231, 235, 0.2)'; // transparent grey
    if (count === 1) return 'rgba(239, 68, 68, 0.15)'; // light red
    if (count === 2) return 'rgba(239, 68, 68, 0.4)';  // medium red
    if (count === 3) return 'rgba(239, 68, 68, 0.7)';  // dark red
    return 'rgba(239, 68, 68, 0.95)'; // bright red
  };

  const getHeatmapTextColor = (count: number) => {
    if (count === 0) return 'var(--text-secondary)';
    if (count >= 3) return 'white';
    return 'var(--color-danger-700)';
  };

  const maxPeakCount = Math.max(...data.peakHours.map(h => h.count), 1);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Analitik Prediktif</h1>
        <p className={styles.pageSub}>Identifikasi dini area rawan temuan, jam sibuk masalah, dan rekomendasi perawatan</p>
      </div>

      {/* Grid: Heatmap and Recommendations */}
      <div className={styles.grid}>
        {/* Heatmap Card */}
        <div className={`card ${styles.card}`}>
          <h3 className={styles.cardTitle}>
            🗺️ Heatmap Temuan per Lantai & Ruangan (90 Hari)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Gradasi warna merah menunjukkan tingginya frekuensi temuan masalah di ruangan tersebut.
          </p>

          <div className={styles.heatmapContainer}>
            {data.heatmap.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Belum ada data temuan untuk membuat heatmap.
              </p>
            ) : (
              data.heatmap.map((floorItem) => (
                <div key={floorItem.floorName} className={styles.heatmapFloorRow}>
                  <div className={styles.heatmapFloorLabel}>{floorItem.floorName}</div>
                  <div className={styles.heatmapRoomGrid}>
                    {floorItem.rooms.map((room) => (
                      <div
                        key={room.name}
                        className={styles.heatmapCell}
                        style={{
                          backgroundColor: getHeatmapCellColor(room.count),
                          color: getHeatmapTextColor(room.count),
                        }}
                        title={`${room.name}: ${room.count} temuan`}
                      >
                        {room.name} ({room.count})
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recommendations Card */}
        <div className={`card ${styles.card}`}>
          <h3 className={styles.cardTitle}>
            🧠 Rekomendasi Pintar (Rule-based AI)
          </h3>
          <div className={styles.recContainer}>
            {data.recommendations.map((rec, idx) => {
              const recClass = 
                rec.level === 'red' ? styles.recRed :
                rec.level === 'yellow' ? styles.recYellow :
                styles.recGreen;
              return (
                <div key={idx} className={`${styles.recItem} ${recClass}`}>
                  {rec.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Peak Hours & Recurring Rooms list */}
      <div className={styles.grid}>
        {/* Peak Hours Card */}
        <div className={`card ${styles.card}`}>
          <h3 className={styles.cardTitle}>
            🕒 Distribusi Jam Temuan Terdeteksi
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Waktu-waktu krusial di mana temuan paling sering dilaporkan selama patroli.
          </p>

          <div className={styles.chartContainer}>
            {data.peakHours.map((h, idx) => {
              const heightPercent = Math.max(5, Math.round((h.count / maxPeakCount) * 100));
              const isEvenHour = idx % 2 === 0;
              return (
                <div key={h.hour} className={styles.barCol}>
                  <span className={styles.barValue}>{h.count > 0 ? h.count : ''}</span>
                  <div className={styles.barTrack}>
                    <div 
                      className={styles.bar} 
                      style={{ height: `${heightPercent}%` }}
                      title={`${h.hour}: ${h.count} temuan`}
                    />
                  </div>
                  {isEvenHour ? <span className={styles.barLabel}>{h.hour}</span> : <span className={styles.barLabel}></span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recurring Issues List Card */}
        <div className={`card ${styles.card}`}>
          <h3 className={styles.cardTitle}>
            ⚠️ Area dengan Temuan Berulang (&ge; 3x)
          </h3>
          <div className={styles.tableContainer}>
            {data.recurring.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Tidak ada ruangan dengan temuan berulang (&ge; 3x) dalam 90 hari terakhir.
              </p>
            ) : (
              <table className={styles.analyticsTable}>
                <thead>
                  <tr>
                    <th>Ruangan</th>
                    <th>Lantai</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recurring.map((item) => (
                    <tr key={item.roomId}>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td>{item.floor}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.categories.join(', ')}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-danger-600)' }}>
                        {item.count}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
