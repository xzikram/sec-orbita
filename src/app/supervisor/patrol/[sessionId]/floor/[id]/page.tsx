'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { lantai1Checks, sbChecks, session6Floors } from '@/lib/supervisor-data';
import { getRoomsByFloor, floors as allFloors } from '@/lib/dummy-data';
import styles from './floor-detail.module.css';

export default function SessionFloorDetailPage({ params }: { params: Promise<{ sessionId: string; id: string }> }) {
  const { sessionId, id: floorId } = use(params);
  const router = useRouter();
  const floor = allFloors.find(f => f.id === floorId);
  const sfData = session6Floors.find(sf => sf.floorId === floorId);
  const checks = floorId === 'floor-1' ? lantai1Checks : floorId === 'floor-sb' ? sbChecks : [];
  const allRooms = getRoomsByFloor(floorId);
  const checkedIds = checks.map(c => c.roomId);
  const unchecked = allRooms.filter(r => !checkedIds.includes(r.id));

  return (
    <div>
      <div className={styles.header}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 className={styles.title}>{floor?.name || floorId}</h1>
          <p className={styles.sub}>Patroli sesi {sessionId} • {checks.length}/{allRooms.length} ruangan</p>
        </div>
        {sfData?.qrValidated && <span className="badge badge-success badge-lg">QR ✓</span>}
      </div>

      {/* Room table */}
      <div className={`card ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead>
            <tr><th className={styles.th}>#</th><th className={styles.th}>Ruangan</th><th className={styles.th}>Jam</th><th className={styles.th}>AC</th><th className={styles.th}>Lampu</th><th className={styles.th}>Kondisi</th></tr>
          </thead>
          <tbody>
            {checks.map((chk, i) => (
              <tr key={chk.id} className={styles.tr}>
                <td className={styles.td}>{i + 1}</td>
                <td className={`${styles.td} ${styles.tdBold}`}>{chk.roomNameSnapshot}<br /><span className={styles.code}>{chk.roomCodeSnapshot}</span></td>
                <td className={styles.td}>{new Date(chk.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className={styles.td}><span className={`${styles.tag} ${chk.acStatus === 'on' ? styles.tagOn : chk.acStatus === 'off' ? styles.tagOff : styles.tagNa}`}>{chk.acStatus === 'on' ? 'ON' : chk.acStatus === 'off' ? 'OFF' : '—'}</span></td>
                <td className={styles.td}><span className={`${styles.tag} ${chk.lightStatus === 'on' ? styles.tagOn : styles.tagOff}`}>{chk.lightStatus === 'on' ? 'ON' : 'OFF'}</span></td>
                <td className={styles.td}><span className={`badge ${chk.condition === 'normal' ? 'badge-success' : 'badge-danger'}`}>{chk.condition === 'normal' ? 'Normal' : 'Temuan'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unchecked rooms */}
      {unchecked.length > 0 && (
        <div className={`card ${styles.uncheckedCard}`}>
          <h3 className={styles.uncheckedTitle}>⚠ Belum Diperiksa ({unchecked.length})</h3>
          <div className={styles.chipList}>
            {unchecked.map(r => <span key={r.id} className={styles.chip}>{r.name} ({r.code})</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
