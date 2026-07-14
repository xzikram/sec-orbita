'use client';

import { useState } from 'react';
import s from '../admin-crud.module.css';

const auditLogs = [
  { id: 'al1', user: 'Ahmad Fadillah', userId: 'SEC-001', action: 'start_patrol', entity: 'Patroli #6', detail: 'Memulai patroli sesi 6', ip: '192.168.1.45', timestamp: '2026-07-08T15:12:00' },
  { id: 'al2', user: 'Ahmad Fadillah', userId: 'SEC-001', action: 'check_room', entity: 'SB-01 Ruang Genset', detail: 'Memeriksa ruangan, kondisi: Normal', ip: '192.168.1.45', timestamp: '2026-07-08T15:14:00' },
  { id: 'al3', user: 'Ahmad Fadillah', userId: 'SEC-001', action: 'create_finding', entity: 'FND-20260708-001', detail: 'Membuat temuan: Suara genset tidak normal', ip: '192.168.1.45', timestamp: '2026-07-08T15:16:00' },
  { id: 'al4', user: 'Ahmad Fadillah', userId: 'SEC-001', action: 'scan_qr', entity: 'Semi Basement', detail: 'Scan QR lantai berhasil', ip: '192.168.1.45', timestamp: '2026-07-08T15:42:00' },
  { id: 'al5', user: 'Ahmad Fadillah', userId: 'SEC-001', action: 'complete_floor', entity: 'Semi Basement', detail: 'Menyelesaikan pemeriksaan lantai', ip: '192.168.1.45', timestamp: '2026-07-08T15:42:00' },
  { id: 'al6', user: 'Dimas Prasetyo', userId: 'SPV-001', action: 'process_finding', entity: 'FND-20260708-002', detail: 'Mengubah status temuan: new → in_progress', ip: '192.168.1.10', timestamp: '2026-07-08T16:10:00' },
  { id: 'al7', user: 'Dimas Prasetyo', userId: 'SPV-001', action: 'login', entity: 'Session', detail: 'Login berhasil', ip: '192.168.1.10', timestamp: '2026-07-08T06:02:00' },
  { id: 'al8', user: 'Eka Putri', userId: 'ADM-001', action: 'login', entity: 'Session', detail: 'Login berhasil', ip: '192.168.1.5', timestamp: '2026-07-08T08:00:00' },
  { id: 'al9', user: 'Eka Putri', userId: 'ADM-001', action: 'update_setting', entity: 'System', detail: 'Mengubah kualitas foto: 75% → 80%', ip: '192.168.1.5', timestamp: '2026-07-08T08:15:00' },
  { id: 'al10', user: 'Candra Wijaya', userId: 'SEC-003', action: 'complete_patrol', entity: 'Patroli #2', detail: 'Menyelesaikan patroli sesi 2', ip: '192.168.1.52', timestamp: '2026-07-08T05:15:00' },
];

const actionColors: Record<string, string> = {
  login: 'badge-neutral', start_patrol: 'badge-info', check_room: 'badge-success', scan_qr: 'badge-info',
  complete_floor: 'badge-success', complete_patrol: 'badge-success', create_finding: 'badge-danger',
  process_finding: 'badge-warning', resolve_finding: 'badge-success', update_setting: 'badge-neutral',
};

const actionLabels: Record<string, string> = {
  login: 'Login', start_patrol: 'Mulai Patroli', check_room: 'Periksa Ruangan', scan_qr: 'Scan QR',
  complete_floor: 'Selesai Lantai', complete_patrol: 'Selesai Patroli', create_finding: 'Buat Temuan',
  process_finding: 'Proses Temuan', resolve_finding: 'Selesai Temuan', update_setting: 'Ubah Setting',
};

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('all');
  const uniqueActions = [...new Set(auditLogs.map(l => l.action))];
  const filtered = auditLogs.filter(l => actionFilter === 'all' || l.action === actionFilter);

  return (
    <div>
      <div className={s.pageHeader}>
        <div><h1 className={s.pageTitle}>Log Aktivitas</h1><p className={s.pageSub}>Audit trail semua aktivitas sistem</p></div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>{filtered.length} aktivitas</span>
          <div className={s.tableActions}>
            <select className={s.searchInput} style={{ width: 180 }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="all">Semua Aksi</option>
              {uniqueActions.map(a => <option key={a} value={a}>{actionLabels[a] || a}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr><th className={s.th}>Waktu</th><th className={s.th}>User</th><th className={s.th}>Aksi</th><th className={s.th}>Entitas</th><th className={s.th}>Detail</th><th className={s.th}>IP</th></tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                <tr key={log.id} className={s.tr}>
                  <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xs)' }}>
                      {new Date(log.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </span>
                  </td>
                  <td className={s.td}>
                    <span className={s.tdBold}>{log.user}</span><br />
                    <span className={s.tdMuted}>{log.userId}</span>
                  </td>
                  <td className={s.td}><span className={`badge ${actionColors[log.action] || 'badge-neutral'}`}>{actionLabels[log.action] || log.action}</span></td>
                  <td className={s.td}><span className={s.tdCode}>{log.entity}</span></td>
                  <td className={s.td} style={{ maxWidth: 300 }}><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{log.detail}</span></td>
                  <td className={s.td}><span className={s.tdMuted}>{log.ip}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.tableFooter}><span>{filtered.length} dari {auditLogs.length} log</span></div>
      </div>
    </div>
  );
}
