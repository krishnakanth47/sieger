import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { analyticsApi } from '../api/client';

const COLORS = { pass: '#22c55e', fail: '#ef4444', warn: '#f59e0b', uv: '#a855f7', blue: '#3b82f6' };

function KPICard({ label, value, color = '#e8edf2', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
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

  useEffect(() => {
    analyticsApi.summary().then(r => setSummary(r.data)).catch(() => { });
    analyticsApi.hourly().then(r => setHourly(r.data)).catch(() => { });
    analyticsApi.shifts().then(r => setShifts(r.data)).catch(() => { });
    analyticsApi.defectTrends(3).then(r => setTrends(r.data)).catch(() => { });
    analyticsApi.kpiCards().then(r => setKpis(r.data)).catch(() => { });
  }, []);

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
        <select className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}>
          <option>Today</option>
          <option>Last 3 Days</option>
          <option>Last 7 Days</option>
          <option>This Month</option>
        </select>
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
