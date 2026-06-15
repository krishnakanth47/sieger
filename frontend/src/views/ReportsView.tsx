import { useState, useEffect } from 'react';
import { FileText, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportsApi, settingsApi } from '../api/client';
import type { InspectionRecord, Shift } from '../types';

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

export default function ReportsView() {
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
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Inspection Reports
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => handleExport('csv')} disabled={exporting === 'csv'}>
            <Download size={14} /> {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button className="btn btn-outline" onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}>
            <FileText size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'Timestamp', 'Status', 'Cone Ø (mm)', 'Tube Ø (mm)', 'Pattern', 'Stain', 'Thread Mix', 'Yarn Tail', 'Basket'].map(h => (
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

        {/* Pagination */}
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
    </div>
  );
}

function BoolCell({ val, invert = false }: { val: boolean; invert?: boolean }) {
  const positive = invert ? !val : val;
  return (
    <span style={{ fontSize: 11, color: positive ? 'var(--color-pass)' : 'var(--color-fail)', fontFamily: 'var(--font-mono)' }}>
      {val ? '✓' : '✗'}
    </span>
  );
}
