'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './session-detail.module.css';

interface RoomCheck {
  id: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
  condition: 'normal' | 'finding';
  remarks: string | null;
  checkedAt: string;
  photos?: { id: string; filePath: string }[];
  findings?: any[];
}

interface RoomItem {
  id: string;
  code: string;
  name: string;
  hasAc: boolean;
  hasLight: boolean;
  check: RoomCheck | null;
}

interface FloorItem {
  id: string;
  code: string;
  name: string;
  qrValidated: boolean;
  qrScannedAt: string | null;
  floorStatus: string;
  rooms: RoomItem[];
}

interface ReportData {
  session: {
    id: string;
    date: string;
    patrolNumber: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    notes: string | null;
    officer: { name: string; employeeId: string };
    schedule: { name: string; startTime: string; endTime: string };
    shift?: { name: string };
  };
  floors: FloorItem[];
}

export default function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/patrol-book?sessionId=${sessionId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Data sesi patroli tidak ditemukan.');
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Gagal memuat rincian sesi patroli.');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid var(--color-primary-600, #0b6623)',
          borderRadius: '50%',
          margin: '0 auto 12px auto',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Memuat rincian patroli...</p>
        <style jsx global>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{error || 'Sesi tidak ditemukan'}</h2>
        <Link href="/supervisor/reports" className="btn btn-outline btn-sm">
          Kembali ke Laporan
        </Link>
      </div>
    );
  }

  const { session, floors } = data;
  const allRooms = floors.flatMap(f => f.rooms);
  const checkedRooms = allRooms.filter(r => r.check !== null);
  const findingRooms = allRooms.filter(r => r.check?.condition === 'finding');
  const completionPct = allRooms.length > 0 ? Math.round((checkedRooms.length / allRooms.length) * 100) : 0;

  const filteredFloors = selectedFloor === 'all' 
    ? floors 
    : floors.filter(f => f.id === selectedFloor);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={() => router.push('/supervisor/reports')}
            title="Kembali ke Daftar Laporan"
            style={{ border: '1px solid var(--border-light, #e2e8f0)', background: '#fff', borderRadius: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                Patroli #{session.patrolNumber}
              </h1>
              <span className={`badge ${session.status === 'completed' ? 'badge-success' : session.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                {session.status === 'completed' ? 'Selesai' : session.status === 'in_progress' ? 'Sedang Berjalan' : 'Terjadwal'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              {session.schedule?.name || 'Jadwal'} • {session.shift?.name || 'Shift Pagi'} • {new Date(session.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.open(`/supervisor/reports/print?sessionId=${session.id}`, '_blank')}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            🖨️ Cetak Buku Patroli
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light, #e2e8f0)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Petugas Security</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {session.officer?.name || '-'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {session.officer?.employeeId || '-'}</span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Jam Patroli</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {session.schedule?.startTime} - {session.schedule?.endTime}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Mulai: {session.startedAt ? new Date(session.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} • Selesai: {session.completedAt ? new Date(session.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Hasil Pemeriksaan</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {checkedRooms.length} dari {allRooms.length} Ruangan
            </span>
            <span style={{ fontSize: '12px', color: completionPct === 100 ? 'var(--color-success-600)' : 'var(--text-secondary)' }}>
              {completionPct}% Terkover ({floors.length} Lantai)
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Kondisi & Temuan</span>
            {findingRooms.length > 0 ? (
              <span className="badge badge-danger" style={{ marginTop: '4px' }}>
                ⚠️ {findingRooms.length} Temuan Kendala
              </span>
            ) : (
              <span className="badge badge-success" style={{ marginTop: '4px' }}>
                ✅ Semua Ruangan Aman
              </span>
            )}
          </div>
        </div>

        {session.notes && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>Catatan Petugas:</strong> {session.notes}
          </div>
        )}
      </div>

      {/* Filter lantai */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Rincian Pemeriksaan Ruangan</h2>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            className={`btn btn-xs ${selectedFloor === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedFloor('all')}
            style={{ borderRadius: '6px' }}
          >
            Semua Lantai ({floors.length})
          </button>
          {floors.map(f => (
            <button
              key={f.id}
              className={`btn btn-xs ${selectedFloor === f.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedFloor(f.id)}
              style={{ borderRadius: '6px' }}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Floor Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredFloors.map(floor => {
          const fChecked = floor.rooms.filter(r => r.check !== null);
          return (
            <div key={floor.id} className="card" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
              {/* Floor Head */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{floor.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({fChecked.length}/{floor.rooms.length} Ruangan Diperiksa)</span>
                </div>
                <div>
                  {floor.qrValidated ? (
                    <span className="badge badge-success" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      Barcode Terverifikasi {floor.qrScannedAt ? `(${new Date(floor.qrScannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Barcode Belum Discan</span>
                  )}
                </div>
              </div>

              {/* Room Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Ruangan</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Jam Cek</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Lampu</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>AC</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Kondisi</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Catatan / Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floor.rooms.map((room) => {
                      const chk = room.check;
                      return (
                        <tr key={room.id} style={{ borderBottom: '1px solid #f1f5f9', background: chk?.condition === 'finding' ? '#fff5f5' : 'transparent' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{room.code}</div>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {chk?.checkedAt ? new Date(chk.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {chk ? (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: chk.lightStatus === 'on' ? '#fef3c7' : '#f1f5f9',
                                color: chk.lightStatus === 'on' ? '#b45309' : '#64748b',
                              }}>
                                {chk.lightStatus === 'on' ? 'ON 💡' : 'OFF'}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {chk ? (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: chk.acStatus === 'on' ? '#e0f2fe' : chk.acStatus === 'off' ? '#f1f5f9' : '#f8fafc',
                                color: chk.acStatus === 'on' ? '#0369a1' : '#64748b',
                              }}>
                                {chk.acStatus === 'on' ? 'ON ❄️' : chk.acStatus === 'off' ? 'OFF' : 'Tidak Ada'}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {chk ? (
                              <span className={`badge ${chk.condition === 'normal' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                                {chk.condition === 'normal' ? 'Aman' : 'Temuan'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Belum Cek</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {chk ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: chk.condition === 'finding' ? 'var(--color-danger-700)' : 'var(--text-secondary)' }}>
                                  {chk.remarks || (chk.condition === 'normal' ? 'Aman / Nihil' : '-')}
                                </span>
                                {chk.photos && chk.photos.length > 0 && (
                                  <button
                                    onClick={() => setSelectedPhoto(chk.photos![0].filePath)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                    title="Lihat Foto Bukti"
                                  >
                                    <span style={{ fontSize: '14px' }}>📷</span>
                                  </button>
                                )}
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Lightbox Foto */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div style={{ maxWidth: '600px', width: '100%', background: '#fff', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Foto Dokumentasi Patroli</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelectedPhoto(null)}>✕ Tutup</button>
            </div>
            <div style={{ padding: '12px', textAlign: 'center', background: '#000' }}>
              <img src={selectedPhoto} alt="Dokumentasi Patroli" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
