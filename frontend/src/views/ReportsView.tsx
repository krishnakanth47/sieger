import { useState, useEffect } from 'react';
import { FileText, Download, Filter, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { reportsApi, settingsApi, activityApi } from '../api/client';
import type { InspectionRecord, Shift, ActivityLogEntry } from '../types';

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BoolCell({ val, invert = false }: { val: boolean; invert?: boolean }) {
  const positive = invert ? !val : val;
  return (
    <span style={{ fontSize: 11, color: positive ? 'var(--color-pass)' : 'var(--color-fail)', fontFamily: 'var(--font-mono)' }}>
      {val ? '✓' : '✗'}
    </span>
  );
}

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

function InspectionReportsTab() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    shift_id: '',
    status: 'ALL',
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, page_size: 50, ...filters };
      if (!filters.start_date) delete params.start_date;
      if (!filters.end_date) delete params.end_date;
      if (!filters.shift_id) delete params.shift_id;
      if (filters.status === 'ALL') delete params.status;

      const res = await reportsApi.getData(params);
      setRecords(res.data.data);
      setTotal(res.data.total);
      setPage(p);
      setPages(res.data.pages || 1);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    settingsApi.getShifts().then(r => setShifts(r.data)).catch(() => { });
  }, []);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format);
    try {
      const params: any = { ...filters };
      if (filters.status === 'ALL') delete params.status;
      const res = format === 'csv' ? await reportsApi.exportCSV(params) : await reportsApi.exportPDF(params);
      const ext = format === 'csv' ? 'csv' : 'pdf';
      downloadBlob(res.data, `ips_report_${new Date().toISOString().slice(0, 10)}.${ext}`);
    } catch { } finally { setExporting(null); }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Inspection Records</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => handleExport('csv')} disabled={exporting === 'csv'}>
            <Download size={14} /> {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button className="btn btn-outline" onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}>
            <FileText size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label className="input-label">Start Date</label>
            <input type="date" className="input" style={{ width: 150 }} value={filters.start_date}
              onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">End Date</label>
            <input type="date" className="input" style={{ width: 150 }} value={filters.end_date}
              onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Shift</label>
            <select className="input" style={{ width: 130 }} value={filters.shift_id}
              onChange={e => setFilters(f => ({ ...f, shift_id: e.target.value }))}>
              <option value="">All Shifts</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" style={{ width: 110 }} value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="ALL">All</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => load(1)} disabled={loading}>
            <Filter size={14} /> {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'Timestamp', 'Status', 'Component Ø (mm)', 'Tube Ø (mm)', 'Pattern', 'Stain', 'Thread Mix', 'Yarn Tail', 'Basket'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    {loading ? 'Loading…' : 'No records found'}
                  </td>
                </tr>
              )}
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'PASS' ? 'badge-pass' : 'badge-fail'}`} style={{ fontSize: 9 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.cone_diameter_mm?.toFixed(1) ?? '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.tube_diameter_mm?.toFixed(1) ?? '—'}</td>
                  <td><BoolCell val={r.pattern_matched} /></td>
                  <td><BoolCell val={r.stain_detected} invert /></td>
                  <td><BoolCell val={r.thread_mix_detected} invert /></td>
                  <td><BoolCell val={r.yarn_tail_present} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.basket_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-ips-border)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total records
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => load(page - 1)} disabled={page <= 1}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Page {page} / {pages}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => load(page + 1)} disabled={page >= pages}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ActivityLogTab() {
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
    <>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
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
              {['inspect', 'data_correction', 'teaching', 'settings', 'reports', 'auth', 'user_management', 'system'].map(m => (
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
    </>
  );
}

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<'reports' | 'logs'>('reports');

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Reports & Logs</h1>
        <div style={{ display: 'flex', gap: 8, background: 'var(--color-ips-surface-2)', padding: '4px', borderRadius: '8px' }}>
          <button
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('reports')}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <FileText size={14} style={{ marginRight: 4 }} />
            Inspection Reports
          </button>
          <button
            className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('logs')}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <ClipboardList size={14} style={{ marginRight: 4 }} />
            Activity Log
          </button>
        </div>
      </div>

      {activeTab === 'reports' && <InspectionReportsTab />}
      {activeTab === 'logs' && <ActivityLogTab />}
    </div>
  );
}
