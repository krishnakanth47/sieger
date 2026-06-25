import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play, Square, Pause, RotateCcw, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Layers,
  Ruler, Circle, Droplets, Scissors, Shuffle, Clock,
  Upload, FolderOpen, Image, Trash2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { inspectApi } from '../api/client';
import { useInspectionWebSocket } from '../hooks/useWebSocket';

// ─── Inspection Timer ───────────────────────────────────────
function useInspectionTimer(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let id: number | undefined;
    if (isRunning) {
      id = window.setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    setElapsed(0);
  }, []);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return { timeStr: `${hh}:${mm}:${ss}`, resetTimer };
}

// ─── Image Upload State ─────────────────────────────────────
interface UploadedImage {
  name: string;
  url: string;
  status: 'pending' | 'checking' | 'pass' | 'fail';
}

// ─── Camera Box with Upload Folder ─────────────────────────
function CameraBox({
  label, color, src, status, accentColor,
}: {
  label: string; color: string; src: string; status: 'PASS' | 'FAIL' | null; accentColor: string;
}) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    const newImgs: UploadedImage[] = arr.map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      status: 'pending',
    }));
    setImages(prev => {
      const updated = [...prev, ...newImgs];
      // Simulate checking each image
      updated.forEach((img, i) => {
        if (img.status === 'pending') {
          setTimeout(() => {
            setImages(cur => cur.map((c, ci) =>
              ci === i ? { ...c, status: 'checking' } : c
            ));
            setTimeout(() => {
              setImages(cur => cur.map((c, ci) =>
                ci === i ? { ...c, status: Math.random() > 0.3 ? 'pass' : 'fail' } : c
              ));
            }, 800 + Math.random() * 400);
          }, i * 300);
        }
      });
      return updated;
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const clearImages = () => {
    images.forEach(i => URL.revokeObjectURL(i.url));
    setImages([]);
    setCurrentIdx(0);
  };

  const displayImg = images.length > 0 ? images[currentIdx] : null;

  return (
    <div
      className="camera-box-large"
      style={{ borderColor: dragging ? accentColor : undefined }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
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
        {images.length > 0 && (
          <button
            onClick={clearImages}
            title="Clear images"
            style={{
              marginLeft: 'auto', background: 'rgba(239,68,68,0.15)',
              border: 'none', borderRadius: 4, padding: '2px 6px',
              cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 9,
            }}
          >
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      {/* Main view area */}
      <div className="camera-box-large__body">
        {/* Live stream or uploaded image */}
        {src ? (
          <img
            src={`data:image/jpeg;base64,${src}`}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : displayImg ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={displayImg.url}
              alt={displayImg.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
            {/* Status overlay */}
            {displayImg.status === 'checking' && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
              }}>
                <RefreshCw size={24} style={{ color: accentColor, animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Checking…</span>
              </div>
            )}
            {(displayImg.status === 'pass' || displayImg.status === 'fail') && (
              <div style={{
                position: 'absolute', top: 32, right: 8,
                background: displayImg.status === 'pass' ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {displayImg.status === 'pass' ? '✓ PASS' : '✗ FAIL'}
              </div>
            )}
            {/* Image name */}
            <div style={{
              position: 'absolute', bottom: 36, left: 0, right: 0,
              background: 'rgba(0,0,0,0.6)', padding: '4px 8px',
              fontSize: 10, color: '#e2e8f0', textAlign: 'center', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayImg.name}
            </div>
          </div>
        ) : (
          /* Drop zone */
          <div
            className="camera-drop-zone"
            style={{ borderColor: dragging ? accentColor : undefined, background: dragging ? `${accentColor}10` : undefined }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="camera-drop-zone__icon" style={{ color: accentColor }}>
              <FolderOpen size={36} />
            </div>
            <span className="camera-drop-zone__title" style={{ color }}>Drop Images Here</span>
            <span className="camera-drop-zone__sub">or click to browse</span>
            <div className="camera-drop-zone__btn" style={{ borderColor: accentColor, color: accentColor }}>
              <Upload size={12} /> Select Images
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip + upload button */}
      <div className="camera-box-large__footer" style={{ borderTopColor: `${accentColor}30` }}>
        <div className="camera-thumb-strip">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className="camera-thumb"
              style={{
                outline: i === currentIdx ? `2px solid ${accentColor}` : 'none',
                opacity: i === currentIdx ? 1 : 0.65,
              }}
              title={img.name}
            >
              <img src={img.url} alt={img.name} />
              <span
                className="camera-thumb__badge"
                style={{
                  background:
                    img.status === 'pass' ? '#22c55e' :
                    img.status === 'fail' ? '#ef4444' :
                    img.status === 'checking' ? '#f59e0b' : '#64748b',
                }}
              />
            </button>
          ))}
          {/* Add more button */}
          <button
            className="camera-thumb-add"
            onClick={() => fileInputRef.current?.click()}
            title="Add images"
            style={{ borderColor: `${accentColor}40`, color: accentColor }}
          >
            <Upload size={14} />
          </button>
        </div>
        <div style={{ fontSize: 9, color: '#64748b', marginLeft: 4, whiteSpace: 'nowrap' }}>
          {images.length > 0
            ? `${images.filter(i => i.status === 'pass').length}✓ ${images.filter(i => i.status === 'fail').length}✗ / ${images.length} imgs`
            : 'No images'}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────
function KPICard({
  label, value, icon, accent, sub, style
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: { bg: string; iconBg: string; iconColor: string; valueColor: string };
  sub?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="kpi-card-colored"
      style={{ background: accent.bg, ...style }}
    >
      <div className="kpi-card-colored__icon" style={{ background: accent.iconBg, color: accent.iconColor }}>
        {icon}
      </div>
      <div className="kpi-card-colored__body">
        <span className="kpi-card__value" style={{ color: accent.valueColor }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        <span className="kpi-card__label">{label}</span>
        {sub && <span className="kpi-card__sub">{sub}</span>}
      </div>
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
    <div className="card h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="card-header" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Batch Efficiency
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-2">
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

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: '0 12px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Good Product</span>
            </div>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{accepted}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Rejected Product</span>
            </div>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{defective}</span>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ width: '100%', padding: '8px 12px 0' }}>
          <div style={{ background: 'var(--color-ips-surface-2)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: passRate > 80 ? '#22c55e' : passRate > 60 ? '#f59e0b' : '#ef4444',
              width: `${passRate}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 4 }}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Total */}
        <div style={{
          marginTop: 10, padding: '6px 12px',
          background: 'var(--color-ips-surface-2)', borderRadius: 6, width: 'calc(100% - 24px)',
          textAlign: 'center', fontSize: 10, color: 'var(--color-text-muted)',
        }}>
          Total Inspected: <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Accent palette ─────────────────────────────────────────
const ACCENTS = {
  total:    { bg: 'rgba(59,130,246,0.08)',  iconBg: 'rgba(59,130,246,0.15)',  iconColor: '#3b82f6', valueColor: '#2563eb' },
  accepted: { bg: 'rgba(16,185,129,0.08)',  iconBg: 'rgba(16,185,129,0.18)',  iconColor: '#10b981', valueColor: '#059669' },
  defective:{ bg: 'rgba(239,68,68,0.08)',   iconBg: 'rgba(239,68,68,0.15)',   iconColor: '#ef4444', valueColor: '#dc2626' },
  pattern:  { bg: 'rgba(245,158,11,0.08)',  iconBg: 'rgba(245,158,11,0.15)',  iconColor: '#f59e0b', valueColor: '#b45309' },
  diameter: { bg: 'rgba(168,85,247,0.08)',  iconBg: 'rgba(168,85,247,0.15)',  iconColor: '#a855f7', valueColor: '#7c3aed' },
  tube:     { bg: 'rgba(6,182,212,0.08)',   iconBg: 'rgba(6,182,212,0.15)',   iconColor: '#06b6d4', valueColor: '#0891b2' },
  stain:    { bg: 'rgba(249,115,22,0.08)',  iconBg: 'rgba(249,115,22,0.15)',  iconColor: '#f97316', valueColor: '#ea580c' },
  yarn:     { bg: 'rgba(20,184,166,0.08)',  iconBg: 'rgba(20,184,166,0.15)',  iconColor: '#14b8a6', valueColor: '#0d9488' },
  thread:   { bg: 'rgba(236,72,153,0.08)',  iconBg: 'rgba(236,72,153,0.15)',  iconColor: '#ec4899', valueColor: '#db2777' },
};

// ─── Main View ─────────────────────────────────────────────
export default function InspectView() {
  const { kpi, frames, lastFrameStatus, lastDefects, systemState } = useAppStore();
  const [loading, setLoading] = useState(false);

  useInspectionWebSocket();

  const isRunning = systemState === 'INSPECTION_RUNNING';
  const hasFrames = !!(frames.visible || frames.uv || frames.yarn_tail);
  const showAlarm = isRunning && !hasFrames;

  const { timeStr: inspectionTime, resetTimer } = useInspectionTimer(isRunning);

  const handleStart = async () => {
    setLoading(true);
    try { await inspectApi.start(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleStop = async () => {
    setLoading(true);
    try { await inspectApi.stop(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handlePause  = async () => { try { await inspectApi.pause(); } catch { } };
  const handleResume = async () => { try { await inspectApi.resume(); } catch { } };
  const handleReset  = async () => { 
    try { 
      await inspectApi.reset(); 
      resetTimer();
    } catch { } 
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', minHeight: 0, height: '100%' }}>

      {/* ── KPI Cards + Controls Bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.625rem',
          flexShrink: 0,
        }}
      >
        <KPICard label="No of Cones"    value={kpi.total}               icon={<Layers size={16} />}       accent={ACCENTS.total}    style={{ flex: '1 1 130px' }} />
        <KPICard label="Accepted Cones" value={kpi.accepted}            icon={<CheckCircle2 size={16} />}  accent={ACCENTS.accepted} sub="items passed" style={{ flex: '1 1 130px' }} />
        <KPICard label="Defective Cones"value={kpi.defective}           icon={<XCircle size={16} />}       accent={ACCENTS.defective}sub="items rejected" style={{ flex: '1 1 130px' }} />
        <KPICard label="Tube Pattern"   value={kpi.tube_pattern_status} icon={<AlertCircle size={16} />}   accent={ACCENTS.pattern}  style={{ flex: '1 1 130px' }} />
        <KPICard label="Cone Diameter"  value={kpi.cone_diameter_status}icon={<Ruler size={16} />}         accent={ACCENTS.diameter} style={{ flex: '1 1 130px' }} />
        <KPICard label="Tube Diameter"  value={kpi.tube_diameter_status}icon={<Circle size={16} />}        accent={ACCENTS.tube}     style={{ flex: '1 1 130px' }} />
        <KPICard label="Stain Count"    value={kpi.stain_count}         icon={<Droplets size={16} />}      accent={ACCENTS.stain}    style={{ flex: '1 1 130px' }} />
        <KPICard label="Yarn Tail"      value={kpi.yarn_tail_faults}    icon={<Scissors size={16} />}      accent={ACCENTS.yarn}     style={{ flex: '1 1 130px' }} />
        <KPICard label="Thread Mix"     value={kpi.thread_mix_faults}   icon={<Shuffle size={16} />}       accent={ACCENTS.thread}   style={{ flex: '1 1 130px' }} />

        {/* ── Inspection Time + Controls Bar ── */}
        <div className="card" style={{ flex: '99 1 400px', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem' }}>
          
          {/* Live indicator */}
          <div className="live-indicator" style={{ marginRight: 'auto' }}>
            {isRunning && <><div className="live-dot" /><span>Live Inspection</span></>}
            {!isRunning && <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>System Idle</span>}
          </div>

          {/* Inspection Time */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: isRunning ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)',
            border: `1px solid ${isRunning ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`,
            borderRadius: 6,
            padding: '0.375rem 0.75rem',
          }}>
            <Clock size={13} style={{ color: isRunning ? '#10b981' : '#64748b' }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Inspection Time:
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 700,
              color: isRunning ? '#10b981' : 'var(--color-text-muted)',
              letterSpacing: '0.05em',
            }}>
              {isRunning ? inspectionTime : '00:00:00'}
            </span>
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

          <button className="btn btn-outline" onClick={handleReset} title="Reset counters">
            <RotateCcw size={14} /> Reset
          </button>

          {isRunning && (
            <button className="btn btn-warning" onClick={handlePause}>
              <Pause size={14} /> Pause
            </button>
          )}

          {systemState === 'INSPECTION_RUNNING' ? (
            <button className="btn btn-danger" onClick={handleStop} disabled={loading}>
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

      {showAlarm && (
        <div className="alert-banner mb-1" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444', animation: 'pulse-dot 1.5s infinite', fontWeight: 'bold', flexShrink: 0 }}>
          ⚠️ MACHINE ON — NO COMPONENT DETECTED
        </div>
      )}

      {/* ── Main Grid: 3 Cameras (left) + Batch Efficiency (right) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 240px',
        gap: '0.75rem',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Visible Camera */}
        <CameraBox
          label="Visible Camera"
          color="#10b981"
          accentColor="#10b981"
          src={frames.visible}
          status={lastFrameStatus}
        />

        {/* UV Camera */}
        <CameraBox
          label="UV Camera"
          color="#8b5cf6"
          accentColor="#8b5cf6"
          src={frames.uv}
          status={lastDefects.some(d => d.camera === 'uv') ? 'FAIL' : lastFrameStatus}
        />

        {/* Yarn Tail Camera */}
        <CameraBox
          label="Yarn Tail Camera"
          color="#3b82f6"
          accentColor="#3b82f6"
          src={frames.yarn_tail}
          status={lastDefects.some(d => d.type === 'yarn_tail_missing') ? 'FAIL' : lastFrameStatus}
        />

        {/* Batch Efficiency — right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0, overflow: 'auto' }}>
          <BatchRingChart accepted={kpi.accepted} defective={kpi.defective} />
        </div>
      </div>
    </div>
  );
}
