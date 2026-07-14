'use client';

import { use, useState, useEffect } from 'react';
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

export default function PrintPatrolBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getFormattedDate = (dateString: string) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateString);
    return `${getDayName(dateString)}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

  return (
    <div>
      {/* On-screen controls */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Pratinjau Cetak: Buku Patroli</span>
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
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0b6623" strokeWidth="2.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <div className={styles.logoText}>
              <span className={styles.brandName}>JEC ORBITA</span>
              <span className={styles.brandSub}>Eye Hospitals and Clinics</span>
            </div>
          </div>
          <div className={styles.titleArea}>
            <span className={styles.titleText}>BUKU PATROLI</span>
          </div>
          <div style={{ width: '150px' }} /> {/* Spacer to balance logo */}
        </div>

        {/* Metadata block layout */}
        <div className={styles.metaBlock}>
          <div className={styles.metaCol}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Nama Petugas:</span>
              <span className={styles.metaValue}>{session.officer.name}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Hari / Tanggal:</span>
              <span className={styles.metaValue}>{getFormattedDate(session.date)}</span>
            </div>
          </div>
          <div className={styles.metaCol}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>PERIODE:</span>
              <span className={styles.metaValue}>{session.shift.name} ({session.schedule.startTime} - {session.schedule.endTime})</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Patroli ke :</span>
              <span className={styles.metaValue}>{session.patrolNumber}</span>
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
            {floorList.map((floor) => {
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
