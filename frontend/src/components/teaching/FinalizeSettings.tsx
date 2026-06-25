import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Minus, Plus } from 'lucide-react';

// ─── Sharp helper ────────────────────────────────────────────
function drawSharp(
  canvas: HTMLCanvasElement,
  displaySize: number,
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void
) {
  const dpr = window.devicePixelRatio || 2;
  canvas.width  = displaySize * dpr;
  canvas.height = displaySize * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  draw(ctx, displaySize, displaySize);
}

// ─── Stepper input ─────────────────────────────────────────────
function StepperInput({
  label, value, onChange, step = 0.5, min = 0, unit = 'mm', required = false,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; unit?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="input-label">{label}{required && ' *'}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <button
          className="btn btn-outline"
          style={{ padding: '0.4rem', minWidth: 32, justifyContent: 'center' }}
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        >
          <Minus size={12} />
        </button>
        <input
          type="number" className="input"
          value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          step={step} style={{ textAlign: 'center', flex: 1 }}
        />
        <button
          className="btn btn-outline"
          style={{ padding: '0.4rem', minWidth: 32, justifyContent: 'center' }}
          onClick={() => onChange(+(value + step).toFixed(2))}
        >
          <Plus size={12} />
        </button>
        <span style={{ fontSize: 10, color: '#64748b', minWidth: 20 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── History sample row ────────────────────────────────────────
function SampleRow({ bobbinMm, tubeMm, imgId, index }: {
  bobbinMm: number; tubeMm: number; imgId: string; index: number;
}) {
  const THUMB = 48;
  const bobbinRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    drawSharp(canvas, THUMB, (ctx, W, H) => {
      ctx.fillStyle = '#0a0e14'; ctx.fillRect(0,0,W,H);
      const g = ctx.createRadialGradient(W/2-3,H/2-3,2,W/2,H/2,W*0.46);
      g.addColorStop(0,'#b0c0d0'); g.addColorStop(1,'#3a5060');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(W/2,H/2,W*0.44,0,Math.PI*2); ctx.fill();
      for(let r=W*0.08;r<W*0.44;r+=W*0.09){
        ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);
        ctx.strokeStyle='rgba(20,50,70,0.4)';ctx.lineWidth=0.6;ctx.stroke();
      }
      ctx.fillStyle='#040810'; ctx.beginPath();ctx.arc(W/2,H/2,W*0.1,0,Math.PI*2);ctx.fill();
    });
  };
  const tubeRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    drawSharp(canvas, THUMB, (ctx, W, H) => {
      ctx.fillStyle='#060402'; ctx.fillRect(0,0,W,H);
      const g = ctx.createRadialGradient(W/2,H/2,W*0.14,W/2,H/2,W*0.46);
      g.addColorStop(0,'#d07020'); g.addColorStop(1,'#3a1400');
      ctx.fillStyle=g; ctx.beginPath();ctx.arc(W/2,H/2,W*0.46,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#020101'; ctx.beginPath();ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#f09020'; ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2);ctx.stroke();
    });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0.5rem 0.75rem',
      background: index % 2 === 0 ? '#f8fafc' : '#fff',
      borderRadius: 8, border: '1px solid #e2e8f0',
      marginBottom: 5,
    }}>
      <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)', minWidth: 24 }}>
        #{index + 1}
      </span>
      <div style={{ textAlign: 'center' }}>
        <canvas ref={bobbinRef} style={{ width: THUMB, height: THUMB, borderRadius: 6, display: 'block' }} />
        <span style={{ fontSize: 8, color: '#475569', fontFamily: 'var(--font-mono)' }}>
          BOBBIN {bobbinMm}mm
        </span>
        <span style={{ fontSize: 7, color: '#94a3b8', display: 'block' }}>{imgId}</span>
      </div>
      <ChevronRight size={10} style={{ color: '#cbd5e1' }} />
      <div style={{ textAlign: 'center' }}>
        <canvas ref={tubeRef} style={{ width: THUMB, height: THUMB, borderRadius: 6, display: 'block' }} />
        <span style={{ fontSize: 8, color: '#475569', fontFamily: 'var(--font-mono)' }}>
          TUBE {tubeMm}mm
        </span>
      </div>
      <CheckCircle2 size={12} style={{ color: '#10b981', marginLeft: 'auto' }} />
    </div>
  );
}

const SAMPLE_DATA = [
  { bobbinMm: 190, tubeMm: 41, imgId: 'IMG-055' },
  { bobbinMm: 189, tubeMm: 40, imgId: 'IMG-054' },
  { bobbinMm: 191, tubeMm: 41, imgId: 'IMG-053' },
  { bobbinMm: 190, tubeMm: 42, imgId: 'IMG-052' },
  { bobbinMm: 188, tubeMm: 40, imgId: 'IMG-051' },
];

export default function FinalizeSettings({
  bobbinDiameter, tubeDiameter, onBack, onUseForInspection,
}: {
  bobbinDiameter: number; tubeDiameter: number;
  onBack: () => void; onUseForInspection: (s: any) => void;
}) {
  const [reqBobbin, setReqBobbin] = useState(bobbinDiameter || 190);
  const [bobbinTol, setBobbinTol] = useState(2.5);
  const [reqTube,   setReqTube]   = useState(tubeDiameter || 41);
  const [tubeTol,   setTubeTol]   = useState(1.0);
  const [saving,    setSaving]    = useState(false);

  const handleUse = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    onUseForInspection({ reqBobbin, bobbinTol, reqTube, tubeTol });
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Extraction</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Finalize Settings</span>
        </div>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem', flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: '0.875rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <span className="card-header" style={{ margin: 0 }}>Training History</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748b', background: '#f1f5f9', borderRadius: 4, padding: '2px 6px' }}>
              2026-02-09
            </span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {SAMPLE_DATA.map((s, i) => <SampleRow key={i} index={i} {...s} />)}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Finalize Settings
          </div>
          <StepperInput label="Required Bobbin Diameter" value={reqBobbin} onChange={setReqBobbin} step={0.5} required />
          <StepperInput label="Bobbin Tolerance (±)"     value={bobbinTol} onChange={setBobbinTol} step={0.1} min={0.1} required />
          <StepperInput label="Required Tube Diameter"   value={reqTube}   onChange={setReqTube}   step={0.5} required />
          <StepperInput label="Tube Tolerance (±)"       value={tubeTol}   onChange={setTubeTol}   step={0.1} min={0.1} required />
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.625rem' }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Acceptable Ranges</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#10b981', lineHeight: 1.8 }}>
              Bobbin: {(reqBobbin-bobbinTol).toFixed(1)} – {(reqBobbin+bobbinTol).toFixed(1)} mm<br/>
              Tube:   {(reqTube-tubeTol).toFixed(1)} – {(reqTube+tubeTol).toFixed(1)} mm
            </div>
          </div>
          <button
            className="btn btn-primary" onClick={handleUse} disabled={saving}
            style={{ marginTop: 'auto', justifyContent: 'center', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', padding: '0.875rem' }}
          >
            {saving ? 'Applying…' : '✓ USE FOR INSPECTION'}
          </button>
        </div>
      </div>
    </div>
  );
}
