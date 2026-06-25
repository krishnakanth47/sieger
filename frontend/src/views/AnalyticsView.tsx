import { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { analyticsApi } from '../api/client';

const COLORS = { pass: '#22c55e', fail: '#ef4444', warn: '#f59e0b', uv: '#a855f7', blue: '#3b82f6' };

function KPICard({ label, value, color = '#1e293b', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
      {sub && <span className="kpi-card__sub">{sub}</span>}
    </div>
  );
}

export default function AnalyticsView() {
  const [summary, setSummary] = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(today);
  const [applied,   setApplied]   = useState({ start: today, end: today });

  const fetchData = useCallback(() => {
    analyticsApi.summary().then(r => setSummary(r.data)).catch(() => {});
    analyticsApi.hourly().then(r => setHourly(r.data)).catch(() => {});
    analyticsApi.shifts().then(r => setShifts(r.data)).catch(() => {});
    analyticsApi.defectTrends(3).then(r => setTrends(r.data)).catch(() => {});
    analyticsApi.kpiCards().then(r => setKpis(r.data)).catch(() => {});
  }, [applied]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = () => {
    setApplied({ start: startDate, end: endDate });
  };

  const handleReset = () => {
    setStartDate(today);
    setEndDate(today);
    setApplied({ start: today, end: today });
  };

  const donutData = summary
    ? [
        { name: 'Accepted', value: summary.passed, color: COLORS.pass },
        { name: 'Rejected', value: summary.failed, color: COLORS.fail },
      ]
    : [];

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Production Analytics</h1>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>

          {/* ── START DATE ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--color-text-muted)', textTransform: 'uppercase',
            }}>
              Start Date
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1.5px solid var(--color-ips-border)',
              borderRadius: 8, background: 'var(--color-ips-surface)',
              padding: '0.375rem 0.625rem', gap: 8,
              transition: 'border-color 0.15s',
            }}>
              <input
                id="analytics-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500,
                  color: 'var(--color-text-primary)', cursor: 'pointer',
                  letterSpacing: '0.04em', minWidth: 120,
                }}
              />
            </div>
          </div>

          {/* ── END DATE ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--color-text-muted)', textTransform: 'uppercase',
            }}>
              End Date
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1.5px solid var(--color-ips-border)',
              borderRadius: 8, background: 'var(--color-ips-surface)',
              padding: '0.375rem 0.625rem', gap: 8,
              transition: 'border-color 0.15s',
            }}>
              <input
                id="analytics-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500,
                  color: 'var(--color-text-primary)', cursor: 'pointer',
                  letterSpacing: '0.04em', minWidth: 120,
                }}
              />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              id="analytics-apply-btn"
              onClick={handleApply}
              style={{
                background: 'var(--color-brand)', color: '#fff',
                border: 'none', borderRadius: 7, padding: '0.42rem 1rem',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em', transition: 'opacity 0.15s',
              }}
            >
              Apply
            </button>
            <button
              id="analytics-reset-btn"
              onClick={handleReset}
              style={{
                background: 'var(--color-ips-surface-2)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-ips-border)',
                borderRadius: 7, padding: '0.42rem 0.75rem',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Reset
            </button>
          </div>

          {/* ── Applied range label ── */}
          {applied.start !== applied.end ? (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {applied.start} → {applied.end}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              Showing: Today ({applied.start})
            </span>
          )}

        </div>
      </div>

      {/* KPI strip */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <KPICard label="Total Inspected" value={kpis.total_inspected} />
          <KPICard label="Total Passed" value={kpis.total_passed} color={COLORS.pass} />
          <KPICard label="Total Failed" value={kpis.total_failed} color={COLORS.fail} />
          <KPICard label="Pass Rate" value={`${kpis.pass_rate}%`} color={COLORS.pass} />
          <KPICard label="Avg / Hour" value={kpis.avg_hourly} sub="items/hr" />
          <KPICard label="Uptime" value={`${kpis.uptime_pct}%`} color={COLORS.pass} />
        </div>
      )}

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem' }}>
        {/* Donut */}
        <div className="card">
          <p className="card-header">Inspection Summary</p>
          {donutData.length > 0 && (
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--color-ips-surface-2)', border: '1px solid var(--color-ips-border)', borderRadius: 6, fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: COLORS.pass, fontFamily: 'var(--font-mono)' }}>
                  {summary?.pass_rate ?? 0}%
                </p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pass Rate</p>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>{d.name}</span>
                </div>
                <span style={{ color: d.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Line */}
        <div className="card">
          <p className="card-header">24-Hour Yield Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-ips-surface-2)', border: '1px solid var(--color-ips-border)', borderRadius: 6, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="passed" stroke={COLORS.pass} strokeWidth={2} dot={false} name="Passed" />
              <Line type="monotone" dataKey="failed" stroke={COLORS.fail} strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Shift Bar */}
        <div className="card">
          <p className="card-header">Shift Comparison</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={shifts} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="shift" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-ips-surface-2)', border: '1px solid var(--color-ips-border)', borderRadius: 6, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="passed" fill={COLORS.pass} name="Passed" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" fill={COLORS.fail} name="Failed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Defect Trend */}
        <div className="card">
          <p className="card-header">Defect Trend (3 Days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-ips-surface-2)', border: '1px solid var(--color-ips-border)', borderRadius: 6, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="stains" stroke={COLORS.warn} strokeWidth={2} dot={false} name="Stains" />
              <Line type="monotone" dataKey="thread_mix" stroke={COLORS.uv} strokeWidth={2} dot={false} name="Thread Mix" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
