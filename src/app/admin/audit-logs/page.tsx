'use client';

import { useState, useEffect, useCallback } from 'react';
import s from '../admin-crud.module.css';

interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  detail: string;
  ip: string;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  login: 'badge-neutral',
  start_patrol: 'badge-info',
  check_room: 'badge-success',
  scan_qr: 'badge-info',
  complete_floor: 'badge-success',
  complete_patrol: 'badge-success',
  early_finish_patrol: 'badge-warning',
  create_finding: 'badge-danger',
  process_finding: 'badge-warning',
  resolve_finding: 'badge-success',
  update_setting: 'badge-neutral',
  change_password: 'badge-neutral',
  create_handover: 'badge-info',
  acknowledge_handover: 'badge-success',
};

const actionLabels: Record<string, string> = {
  login: 'Login',
  start_patrol: 'Mulai Patroli',
  check_room: 'Periksa Ruangan',
  scan_qr: 'Scan QR',
  complete_floor: 'Selesai Lantai',
  complete_patrol: 'Selesai Patroli',
  early_finish_patrol: 'Akhiri Lebih Awal',
  create_finding: 'Buat Temuan',
  process_finding: 'Proses Temuan',
  resolve_finding: 'Selesai Temuan',
  update_setting: 'Ubah Setting',
  change_password: 'Ubah Password',
  create_handover: 'Serah Terima',
  acknowledge_handover: 'Terima Shift',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '100');

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data.logs) ? data.logs : (Array.isArray(data) ? data : []));
      } else {
        console.error('Failed to fetch activity logs:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Derive unique action types dynamically from database logs for filter options
  const filterActionOptions = [
    'all',
    'login',
    'start_patrol',
    'check_room',
    'scan_qr',
    'complete_patrol',
    'early_finish_patrol',
    'create_finding',
    'process_finding',
    'resolve_finding',
    'update_setting',
    'create_handover',
    'change_password',
  ];

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Log Aktivitas</h1>
          <p className={s.pageSub}>Audit trail real-time dari seluruh aktivitas sistem security</p>
        </div>
        <div>
          <button
            className="btn btn-ghost"
            onClick={() => fetchLogs(true)}
            disabled={loading || refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            title="Muat Ulang Log"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                transformOrigin: 'center',
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? 'Memperbarui...' : 'Segarkan'}
          </button>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>
            {loading ? 'Memuat...' : `${logs.length} aktivitas`}
          </span>
          <div className={s.tableActions} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className={s.searchInput}
              placeholder="Cari user, entitas, IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <select
              className={s.searchInput}
              style={{ width: 180 }}
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">Semua Aksi</option>
              {filterActionOptions.filter(a => a !== 'all').map(a => (
                <option key={a} value={a}>
                  {actionLabels[a] || a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Waktu (WITA)</th>
                <th className={s.th}>User</th>
                <th className={s.th}>Aksi</th>
                <th className={s.th}>Entitas</th>
                <th className={s.th}>Detail</th>
                <th className={s.th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        width: '28px',
                        height: '28px',
                        border: '3px solid rgba(0,0,0,0.1)',
                        borderTopColor: 'var(--color-primary-600, #0284c7)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <div style={{ marginTop: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Mengambil data audit log dari database...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📜</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Belum Ada Log Aktivitas
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {search || actionFilter !== 'all'
                        ? 'Tidak ada aktivitas yang sesuai dengan filter pencarian.'
                        : 'Aktivitas security dan login akan otomatis tercatat di sini.'}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={s.tr}>
                    <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xs)' }}>
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.tdBold}>{log.userName}</span>
                      <br />
                      <span className={s.tdMuted}>{log.userId}</span>
                    </td>
                    <td className={s.td}>
                      <span className={`badge ${actionColors[log.action] || 'badge-neutral'}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.tdCode}>{log.entity}</span>
                    </td>
                    <td className={s.td} style={{ maxWidth: 320 }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                        {log.detail}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.tdMuted} style={{ fontSize: 'var(--font-size-xs)' }}>
                        {log.ip}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={s.tableFooter}>
          <span>
            {loading ? 'Memuat data...' : `Menampilkan ${logs.length} catatan log aktivitas`}
          </span>
        </div>
      </div>
    </div>
  );
}
