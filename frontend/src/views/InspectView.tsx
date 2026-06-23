import React from 'react';
import { useState } from 'react';
import {
  Play, Square, Pause, RotateCcw, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Layers,
  Ruler, Circle, Droplets, Scissors, Shuffle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { inspectApi } from '../api/client';
import { useInspectionWebSocket } from '../hooks/useWebSocket';

// ─── Camera Box ────────────────────────────────────────────
function CameraBox({
  label, color, src, status,
}: {
  label: string; color: string; src: string; status: 'PASS' | 'FAIL' | null;
}) {
  return (
    <div className="camera-box">
      <div className="camera-box__header" style={{ color }}>
        <span
          className="camera-box__status-dot"
          style={{ background: status === 'FAIL' ? '#ef4444' : status === 'PASS' ? '#22c55e' : '#64748b' }}
        />
        {label}
        {status && (
          <span
            className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: status === 'FAIL' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
              color: status === 'FAIL' ? '#ef4444' : '#22c55e',
            }}
          >
            {status}
          </span>
        )}
      </div>
      {src ? (
        <img
          src={`data:image/jpeg;base64,${src}`}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}
        >
          <RefreshCw size={20} style={{ color: '#2e3a45', animation: 'spin 2s linear infinite' }} />
          <span style={{ fontSize: 11, color: '#4a6070' }}>Connecting…</span>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────
function KPICard({
  label, value, icon, variant = 'default', sub,
}: {
  label: string; value: number | string; icon: React.ReactNode;
  variant?: 'default' | 'pass' | 'fail' | 'warn';
  sub?: string;
}) {
  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="kpi-card__label">{label}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      </div>
      <span className="kpi-card__value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      {sub && <span className="kpi-card__sub">{sub}</span>}
    </div>
  );
}

// ─── Ring Chart ────────────────────────────────────────────
function BatchRingChart({ accepted, defective }: { accepted: number; defective: number }) {
  const total = accepted + defective;
  const passRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const data = [
    { name: 'Good', value: accepted, color: '#22c55e' },
    { name: 'Rejected', value: defective, color: '#ef4444' },
  ];
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return percent > 0.08 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">Batch Efficiency</div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter(d => d.value > 0)}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
              >
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-ips-surface-2)',
                  border: '1px solid var(--color-ips-border)',
                  borderRadius: 6, fontSize: 11,
                }}
                labelStyle={{ color: 'var(--color-text-primary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: passRate > 80 ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
              {passRate}%
            </span>
            <span style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Efficiency</span>
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-[10px]">
          <div className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Good: {accepted}</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Rejected: {defective}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ─────────────────────────────────────────────
export default function InspectView() {
  const { kpi, frames, lastFrameStatus, lastDefects, systemState } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Connect WebSocket
  useInspectionWebSocket();

  const isRunning = systemState === 'INSPECTION_RUNNING';
  const hasFrames = !!(frames.visible || frames.uv || frames.yarn_tail);
  const showAlarm = isRunning && !hasFrames;

  const handleStart = async () => {
    setLoading(true);
    try { await inspectApi.start(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleStop = async () => {
    setLoading(true);
    try { await inspectApi.stop(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handlePause = async () => { try { await inspectApi.pause(); } catch { } };
  const handleResume = async () => { try { await inspectApi.resume(); } catch { } };
  const handleReset = async () => { try { await inspectApi.reset(); } catch { } };

  return (
    <div className="page">
      {/* ── KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.625rem',
        }}
      >
        <KPICard label="Total Processed" value={kpi.total} icon={<Layers size={14} />} />
        <KPICard label="Accepted" value={kpi.accepted} icon={<CheckCircle2 size={14} />} variant="pass" sub="items passed" />
        <KPICard label="Defective" value={kpi.defective} icon={<XCircle size={14} />} variant="fail" sub="items rejected" />
        <KPICard label="Pattern Fail" value={kpi.tube_pattern_status} icon={<AlertCircle size={14} />} variant="warn" />
        <KPICard label="Diameter Fail" value={kpi.cone_diameter_status} icon={<Ruler size={14} />} variant="warn" />
        <KPICard label="Tube Fail" value={kpi.tube_diameter_status} icon={<Circle size={14} />} variant="warn" />
        <KPICard label="Stain Count" value={kpi.stain_count} icon={<Droplets size={14} />} variant="warn" />
        <KPICard label="Yarn Tail" value={kpi.yarn_tail_faults} icon={<Scissors size={14} />} variant="warn" />
        <KPICard label="Thread Mix" value={kpi.thread_mix_faults} icon={<Shuffle size={14} />} variant="fail" />
      </div>

      {showAlarm && (
        <div className="alert-banner mb-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444', animation: 'pulse-dot 1.5s infinite', fontWeight: 'bold' }}>
          ⚠️ MACHINE ON — NO COMPONENT DETECTED
        </div>
      )}

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr)) 200px', gap: '0.75rem', flex: 1, minHeight: 0 }}>
        {/* Camera feeds */}
        {(!isRunning || frames.visible) && (
          <CameraBox
            label="Visible Camera"
            color="#10b981"
            src={frames.visible}
            status={lastFrameStatus}
          />
        )}
        {(!isRunning || frames.uv) && (
          <CameraBox
            label="UV Camera"
            color="#8b5cf6"
            src={frames.uv}
            status={lastDefects.some(d => d.camera === 'uv') ? 'FAIL' : lastFrameStatus}
          />
        )}
        {(!isRunning || frames.yarn_tail) && (
          <CameraBox
            label="Yarn Tail Camera"
            color="#3b82f6"
            src={frames.yarn_tail}
            status={lastDefects.some(d => d.type === 'yarn_tail_missing') ? 'FAIL' : lastFrameStatus}
          />
        )}

        {/* Ring chart + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <BatchRingChart accepted={kpi.accepted} defective={kpi.defective} />
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="live-indicator" style={{ marginRight: 'auto' }}>
            {isRunning && <><div className="live-dot" /><span>Live Inspection</span></>}
            {!isRunning && <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>System Idle</span>}
          </div>

          {/* Defect chips */}
          {lastDefects.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {lastDefects.map((d, i) => (
                <span key={i} className="badge badge-fail" style={{ fontSize: 9 }}>
                  {d.type.replace('_', ' ')} {Math.round(d.confidence * 100)}%
                </span>
              ))}
            </div>
          )}

          <button
            className="btn btn-outline"
            onClick={handleReset}
            title="Reset counters"
          >
            <RotateCcw size={14} /> Reset
          </button>

          {isRunning && (
            <button className="btn btn-warning" onClick={handlePause}>
              <Pause size={14} /> Pause
            </button>
          )}

          {systemState === 'INSPECTION_RUNNING' ? (
            <button
              className="btn btn-danger"
              onClick={handleStop}
              disabled={loading}
            >
              <Square size={14} /> Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={loading}
              style={{ minWidth: 130 }}
            >
              <Play size={14} />
              {loading ? 'Starting…' : 'Start Inspection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
