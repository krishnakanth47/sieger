import { useState, useEffect } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityApi } from '../api/client';
import type { ActivityLogEntry } from '../types';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#22c55e',
  LOGOUT: '#64748b',
  START_INSPECTION: '#3b82f6',
  STOP_INSPECTION: '#f59e0b',
  PARAMETER_CHANGE: '#a855f7',
  CREATE: '#22c55e',
  DELETE: '#ef4444',
  RENAME_PATTERN: '#3b82f6',
  CAPTURE_IMAGE: '#3b82f6',
  EXPORT_REPORT: '#f59e0b',
  CLEANUP: '#64748b',
  RESET_COUNTERS: '#f59e0b',
  LOGIN_FAILED: '#ef4444',
};

export default function ActivityLogView() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  const [filters, setFilters] = useState({ action_type: '', module: '' });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, page_size: 50 };
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.module) params.module = filters.module;
      const res = await activityApi.getLogs(params);
      setLogs(res.data.data);
      setTotal(res.data.total);
      setPage(p);
      setPages(res.data.pages || 1);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    activityApi.getStats().then(r => setStats(r.data)).catch(() => { });
    activityApi.getActionTypes().then(r => setActionTypes(r.data)).catch(() => { });
  }, []);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClipboardList size={18} style={{ color: 'var(--color-brand)' }} />
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Security Activity Log</h1>
        <span className="badge badge-idle" style={{ fontSize: 9, marginLeft: 4 }}>Read-Only</span>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Events', value: stats.total_events },
            { label: 'Logins', value: stats.logins },
            { label: 'Param Changes', value: stats.parameter_changes },
            { label: 'Exports', value: stats.exports },
          ].map(({ label, value }) => (
            <div key={label} className="kpi-card">
              <span className="kpi-card__label">{label}</span>
              <span className="kpi-card__value" style={{ fontSize: '1.25rem' }}>{value?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="input-label">Action Type</label>
            <select className="input" style={{ width: 180 }} value={filters.action_type}
              onChange={e => setFilters(f => ({ ...f, action_type: e.target.value }))}>
              <option value="">All Actions</option>
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Module</label>
            <select className="input" style={{ width: 140 }} value={filters.module}
              onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}>
              <option value="">All Modules</option>
              {['inspect', 'data_capture', 'teaching', 'settings', 'reports', 'auth', 'user_management', 'system'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => load(1)} disabled={loading}>
            {loading ? 'Loading…' : 'Filter'}
          </button>
          <button className="btn btn-outline" onClick={() => { setFilters({ action_type: '', module: '' }); load(1); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                {['Timestamp', 'User', 'Role', 'IP Address', 'Action', 'Module', 'Description'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    {loading ? 'Loading…' : 'No log entries'}
                  </td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'nowrap' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 11 }}>
                    {log.username ?? 'system'}
                  </td>
                  <td>
                    {log.role_name && (
                      <span className="badge badge-idle" style={{ fontSize: 9 }}>{log.role_name}</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{log.ip_address ?? '—'}</td>
                  <td>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: (ACTION_COLORS[log.action_type] || '#64748b') + '20',
                      color: ACTION_COLORS[log.action_type] || '#64748b',
                    }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{log.module ?? '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-ips-border)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{total.toLocaleString()} events</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => load(page - 1)} disabled={page <= 1}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Page {page} / {pages}</span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => load(page + 1)} disabled={page >= pages}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
