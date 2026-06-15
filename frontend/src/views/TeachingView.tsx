import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Move, Circle, Square } from 'lucide-react';
import { teachingApi } from '../api/client';
import type { ToleranceSettings } from '../types';

// ─── Feature Toggles ───────────────────────────────────────
function FeatureToggle({ label, enabled, onChange, description }: {
  label: string; enabled: boolean; onChange: (v: boolean) => void; description: string;
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: enabled ? 'var(--color-sidebar-active)' : 'var(--color-ips-surface)',
        border: enabled ? '1px solid var(--color-brand-dark)' : '1px solid var(--color-ips-border)',
        cursor: 'pointer',
      }}
      onClick={() => onChange(!enabled)}
    >
      <label className="toggle" style={{ pointerEvents: 'none' }}>
        <input type="checkbox" checked={enabled} onChange={() => { }} />
        <div className="toggle__track"><div className="toggle__thumb" /></div>
      </label>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>{description}</p>
      </div>
      <span className={`badge ${enabled ? 'badge-pass' : 'badge-idle'}`} style={{ fontSize: 9 }}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}

// ─── ROI Canvas Editor ─────────────────────────────────────
function ROIEditor({ roi, onChange }: {
  roi: { x: number; y: number; width: number; height: number };
  onChange: (r: typeof roi) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<{ type: 'move' | 'resize'; startX: number; startY: number; startRoi: typeof roi } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0d0f';
    ctx.fillRect(0, 0, W, H);

    // Simulated cone
    ctx.save();
    ctx.fillStyle = '#1c2228';
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, W * 0.35, H * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2e3a45';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Inner tube
    ctx.save();
    ctx.fillStyle = '#111518';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#252d35';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ROI circle overlay
    const rx = roi.x * W + (roi.width * W) / 2;
    const ry = roi.y * H + (roi.height * H) / 2;
    const rr = Math.min(roi.width * W, roi.height * H) / 2;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.stroke();

    // Corner handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#22c55e';
    [[rx - rr, ry], [rx + rr, ry], [rx, ry - rr], [rx, ry + rr]].forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#22c55e';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`ROI: ${Math.round(roi.width * 100)}%W × ${Math.round(roi.height * 100)}%H`, rx - 50, ry - rr - 12);
    ctx.restore();
  }, [roi]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="roi-canvas-wrapper" style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={360}
        style={{ width: '100%', height: 'auto', cursor: 'crosshair' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: 10, color: 'var(--color-text-muted)',
        background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '3px 6px',
      }}>
        <Move size={10} style={{ display: 'inline', marginRight: 4 }} />
        Interactive ROI (drag to adjust)
      </div>
    </div>
  );
}

// ─── Tolerance Card ────────────────────────────────────────
function ToleranceRow({
  label, value, tolerance, onValueChange, onTolChange, unit = 'mm',
}: {
  label: string; value: number; tolerance: number;
  onValueChange: (v: number) => void; onTolChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <tr>
      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-ips-border)' }}>
        {label}
      </td>
      <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-ips-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            className="input"
            style={{ width: 90, textAlign: 'center' }}
            value={value}
            onChange={e => onValueChange(parseFloat(e.target.value) || 0)}
            step={0.5}
          />
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{unit}</span>
        </div>
      </td>
      <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-ips-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>±</span>
          <input
            type="number"
            className="input"
            style={{ width: 80, textAlign: 'center' }}
            value={tolerance}
            onChange={e => onTolChange(parseFloat(e.target.value) || 0)}
            step={0.1} min={0.1}
          />
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{unit}</span>
        </div>
      </td>
      <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-ips-border)' }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {(value - tolerance).toFixed(1)} – {(value + tolerance).toFixed(1)} {unit}
        </span>
      </td>
    </tr>
  );
}

export default function TeachingView() {
  const [settings, setSettings] = useState<ToleranceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    teachingApi.getTolerance().then(r => setSettings(r.data)).catch(() => { });
  }, []);

  const update = (patch: Partial<ToleranceSettings>) => {
    setSettings(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await teachingApi.updateTolerance({
        ...settings,
        roi_x: settings.roi.x,
        roi_y: settings.roi.y,
        roi_width: settings.roi.width,
        roi_height: settings.roi.height,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { } finally { setSaving(false); }
  };

  if (!settings) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)' }}>Loading teaching configuration…</p>
    </div>
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Teaching & Calibration</h1>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={14} />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
        {/* Card 1: Feature Toggles */}
        <div>
          <p className="section-title">Feature Extraction Toggles</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FeatureToggle
              label="Extraction" enabled={settings.enable_extraction}
              onChange={v => update({ enable_extraction: v })}
              description="Enable automated cone body extraction and segmentation"
            />
            <FeatureToggle
              label="Tube Pattern" enabled={settings.enable_tube_pattern}
              onChange={v => update({ enable_tube_pattern: v })}
              description="Verify inner tube pattern against reference template"
            />
            <FeatureToggle
              label="Stain Detection" enabled={settings.enable_stain_detection}
              onChange={v => update({ enable_stain_detection: v })}
              description="Detect surface contamination and staining defects"
            />
            <FeatureToggle
              label="Thread Mix Detection" enabled={settings.enable_thread_mix_detection}
              onChange={v => update({ enable_thread_mix_detection: v })}
              description="UV-based material mix-up and contamination detection"
            />
          </div>
        </div>

        {/* Card 2: ROI Editor */}
        <div>
          <p className="section-title">Interactive ROI Adjustment</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <ROIEditor
              roi={settings.roi}
              onChange={roi => update({ roi })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {(['x', 'y', 'width', 'height'] as const).map(k => (
              <div key={k}>
                <label className="input-label">{k.toUpperCase()}</label>
                <input
                  type="number" className="input"
                  value={settings.roi[k]} min={0} max={1} step={0.01}
                  onChange={e => update({ roi: { ...settings.roi, [k]: parseFloat(e.target.value) || 0 } })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Tolerance Matrix */}
      <div className="card">
        <p className="card-header">Tolerance Parameter Matrix</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Parameter', 'Target Value', 'Tolerance (±)', 'Acceptable Range'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', fontSize: 10, fontWeight: 700,
                  color: 'var(--color-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', textAlign: 'left',
                  background: 'var(--color-ips-surface-2)',
                  borderBottom: '1px solid var(--color-ips-border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ToleranceRow
              label="Bobbin Diameter"
              value={settings.required_cone_diameter_mm}
              tolerance={settings.cone_tolerance_mm}
              onValueChange={v => update({ required_cone_diameter_mm: v })}
              onTolChange={v => update({ cone_tolerance_mm: v })}
            />
            <ToleranceRow
              label="Tube Diameter"
              value={settings.required_tube_diameter_mm}
              tolerance={settings.tube_tolerance_mm}
              onValueChange={v => update({ required_tube_diameter_mm: v })}
              onTolChange={v => update({ tube_tolerance_mm: v })}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
