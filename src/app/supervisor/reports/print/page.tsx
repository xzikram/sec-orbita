'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './print-report.module.css';

interface RoomCheck {
  id: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
  condition: 'normal' | 'finding';
  remarks: string | null;
  checkedAt: string;
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
  rooms: RoomItem[];
}

interface SessionData {
  id: string;
  date: string;
  patrolNumber: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  officer: {
    name: string;
    employeeId: string;
  };
  schedule: {
    name: string;
    startTime: string;
    endTime: string;
  };
  shift: {
    name: string;
  };
}

interface ReportData {
  session: SessionData;
  floors: FloorItem[];
}

function PrintPatrolBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID tidak ditemukan di URL');
      setLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/patrol-book?sessionId=${sessionId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Gagal memuat data laporan');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Gagal menghubungi server untuk memuat laporan');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  const getDayName = (dateString: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  const getFormattedDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return `${getDayName(dateString)}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateString;
    }
  };

  const formatCheckTime = (timeString: string | undefined) => {
    if (!timeString) return '—';
    const date = new Date(timeString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #ccc',
          borderTop: '5px solid #0b6623',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontFamily: 'sans-serif', color: '#555' }}>Memuat Buku Patroli...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: 'red' }}>⚠️ Error</h2>
        <p style={{ margin: '1rem 0' }}>{error || 'Data laporan tidak dapat dimuat'}</p>
        <button className="btn btn-primary" onClick={() => router.back()}>Kembali</button>
      </div>
    );
  }

  const { session, floors: floorList } = data;

  // Sorting floors canonically (either 11 down to SB or SB up to 11)
  const sortedFloors = [...floorList].sort((a, b) => {
    const getRank = (code: string) => {
      const c = code.toUpperCase();
      if (c === 'SB') return -1;
      const num = parseInt(c.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    };
    const rankA = getRank(a.code);
    const rankB = getRank(b.code);
    return sortDirection === 'desc' ? rankB - rankA : rankA - rankB;
  });

  return (
    <div>
      {/* On-screen controls */}
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className={styles.toolbarTitle}>Pratinjau Cetak: Buku Patroli</span>
          <button
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            style={{
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            title="Klik untuk mengubah urutan lantai cetak"
          >
            <span>↕️</span>
            <span>{sortDirection === 'desc' ? 'Urutan: Lantai 11 → SB' : 'Urutan: SB → Lantai 11'}</span>
          </button>
        </div>

        <div className={styles.toolbarActions}>
          <button className="btn btn-outline btn-sm text-white" onClick={() => router.back()}>
            Kembali
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            🖨️ Cetak Laporan
          </button>
        </div>
      </div>

      {/* Printable template */}
      <div className={styles.printContainer}>
        {/* Brand & Title block */}
        <div className={styles.headerBlock}>
          <div className={styles.logoArea}>
            <img 
              src="/Logo RS JEC ORBITA.png" 
              alt="Logo RS JEC ORBITA" 
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div className={styles.titleArea}>
            <span className={styles.titleText}>BUKU PATROLI</span>
          </div>
          <div style={{ width: '160px' }} /> {/* Spacer to balance logo */}
        </div>

        {/* Metadata block layout */}
        <div className={styles.metaBlock}>
          <div className={styles.metaCol}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Nama Petugas:</span>
              <span className={styles.metaValue}>{session.officer?.name || 'Petugas Security'}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Hari / Tanggal:</span>
              <span className={styles.metaValue}>{getFormattedDate(session.date)}</span>
            </div>
          </div>
          <div className={styles.metaCol}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>PERIODE:</span>
              <span className={styles.metaValue}>
                {session.shift?.name || 'Shift Patroli'} 
                {session.schedule ? ` (${session.schedule.startTime} - ${session.schedule.endTime})` : ''}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Patroli ke :</span>
              <span className={styles.metaValue}>{session.patrolNumber ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Main report table */}
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '80px' }}>LOKASI LANTAI</th>
              <th rowSpan={2} style={{ width: '220px' }}>NAMA RUANGAN</th>
              <th rowSpan={2} style={{ width: '60px' }}>JAM</th>
              <th colSpan={2} style={{ width: '80px' }}>AC</th>
              <th colSpan={2} style={{ width: '80px' }}>LAMPU</th>
              <th rowSpan={2}>KETERANGAN (situasi ruangan)</th>
              <th rowSpan={2} style={{ width: '110px' }}>PARAF PJ. RUANGAN</th>
            </tr>
            <tr>
              <th>ON</th>
              <th>OFF</th>
              <th>ON</th>
              <th>OFF</th>
            </tr>
          </thead>
          <tbody>
            {sortedFloors.map((floor) => {
              if (floor.rooms.length === 0) return null;

              return floor.rooms.map((room, idx) => {
                const check = room.check;
                const isFirst = idx === 0;

                return (
                  <tr key={room.id}>
                    {/* Render Location Floor column once per floor using rowSpan */}
                    {isFirst && (
                      <td 
                        rowSpan={floor.rooms.length} 
                        className={styles.floorCell}
                      >
                        {floor.name}
                      </td>
                    )}
                    <td className={styles.roomNameCell}>
                      {room.name}
                    </td>
                    <td className={styles.timeCell}>
                      {check ? formatCheckTime(check.checkedAt) : ''}
                    </td>
                    {/* AC Checkboxes */}
                    <td className={styles.checkCell}>
                      {room.hasAc && check && check.acStatus === 'on' ? '✓' : ''}
                    </td>
                    <td className={styles.checkCell}>
                      {room.hasAc && check && check.acStatus === 'off' ? '✓' : ''}
                    </td>
                    {/* Lampu Checkboxes */}
                    <td className={styles.checkCell}>
                      {check && check.lightStatus === 'on' ? '✓' : ''}
                    </td>
                    <td className={styles.checkCell}>
                      {check && check.lightStatus === 'off' ? '✓' : ''}
                    </td>
                    {/* Remarks */}
                    <td className={styles.remarksCell}>
                      {check && check.remarks ? check.remarks : (check && check.condition === 'finding' ? 'Ada temuan' : '')}
                    </td>
                    {/* Paraf PJ Ruangan */}
                    <td className={styles.signatureCell} />
                  </tr>
                );
              });
            })}
          </tbody>
        </table>

        {/* Footer sign block */}
        <div className={styles.footerArea}>
          <div className={styles.signatureBox}>
            <span className={styles.signatureLabel}>Petugas patroli</span>
            <div className={styles.signatureLine}>
              SECURITY
            </div>
          </div>
          <div className={styles.signatureBox}>
            <span className={styles.signatureLabel}>Mengetahui</span>
            <div className={styles.signatureLine}>
              PJ. SECURITY
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintPatrolBookPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #ccc',
          borderTop: '5px solid #0b6623',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontFamily: 'sans-serif', color: '#555' }}>Memuat Buku Patroli...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <PrintPatrolBookContent />
    </Suspense>
  );
}
