import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

// ─── Sharp helper ────────────────────────────────────────────
function drawSharp(
  canvas: HTMLCanvasElement,
  displayW: number,
  displayH: number,
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void
) {
  const dpr = window.devicePixelRatio || 2;
  canvas.width  = displayW * dpr;
  canvas.height = displayH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  draw(ctx, displayW, displayH);
}

// ─── Mock camera canvas ───────────────────────────────────────
function CameraFeed({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dW = rect.width  || 640;
    const dH = rect.height || 400;

    drawSharp(canvas, dW, dH, (ctx, W, H) => {
      ctx.fillStyle = '#090d0f'; ctx.fillRect(0, 0, W, H);

      // Top/bottom lighting
      const tg = ctx.createLinearGradient(0, 0, 0, 50);
      tg.addColorStop(0, 'rgba(255,255,200,0.2)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 50);
      const bg = ctx.createLinearGradient(0, H-50, 0, H);
      bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(255,255,200,0.15)');
      ctx.fillStyle = bg; ctx.fillRect(0, H-50, W, 50);

      // Rig rails
      ctx.strokeStyle = '#1e2a35'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, H*0.14); ctx.lineTo(W, H*0.14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H*0.86); ctx.lineTo(W, H*0.86); ctx.stroke();

      // Bobbin body — bright gradient
      const bg2 = ctx.createRadialGradient(W/2 - W*0.06, H/2 - H*0.06, 8, W/2, H/2, W*0.3);
      bg2.addColorStop(0, '#c8d5e0'); bg2.addColorStop(1, '#5a7080');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, W*0.3, H*0.34, 0, 0, Math.PI*2); ctx.fill();

      // Ring lines — crisp, visible contrast
      for (let r = W*0.05; r < W*0.3; r += W*0.028) {
        ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(40,60,80,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Green ROI dashed ring
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.32, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);

      // ROI handle dots
      [[W/2-W*0.32,H/2],[W/2+W*0.32,H/2],[W/2,H/2-W*0.32],[W/2,H/2+W*0.32]].forEach(([x,y]) => {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.stroke();
      });

      // HUD labels
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(8, 8, 148, 20);
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('VISIBLE CAM  LIVE', 12, 22);

      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('RIGHT DIMENSION: 189.65', 10, H - 38);
      ctx.fillText('RIGHT TUBE DIMENSION: 41.36', 10, H - 24);
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ─── Cropped bobbin preview ───────────────────────────────────
function CroppedBobbin() {
  const DISPLAY = 130;
  const ref = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    drawSharp(canvas, DISPLAY, DISPLAY, (ctx, W, H) => {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(W/2-W*0.05, H/2-H*0.05, 4, W/2, H/2, W*0.46);
      grad.addColorStop(0, '#b8c8d8'); grad.addColorStop(1, '#3a5060');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.46, 0, Math.PI*2); ctx.fill();
      for (let r = W*0.08; r < W*0.46; r += W*0.055) {
        ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(20,50,70,0.35)'; ctx.lineWidth = 0.7; ctx.stroke();
      }
      ctx.fillStyle = '#060a10';
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.1, 0, Math.PI*2); ctx.fill();
      // Green dashed border
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      ctx.strokeRect(2, 2, W-4, H-4);
      ctx.setLineDash([]);
    });
  };
  return <canvas ref={ref} style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
}

export default function DiameterStep1({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (diameter: number) => void;
}) {
  const [diameter, setDiameter] = useState(190);
  const containerRef = useRef<HTMLDivElement>(null);
  const isValid = diameter > 50 && diameter < 500;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Extraction</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>Diameter Setting</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Bobbin Calibration</span>
        </div>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>

        {/* Left: Camera */}
        <div
          ref={containerRef}
          style={{
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #1e293b',
          }}
        >
          <CameraFeed containerRef={containerRef} />
        </div>

        {/* Right: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="card" style={{ padding: '0.875rem' }}>
            <div className="card-header">Cropped Bobbin</div>
            <CroppedBobbin />
          </div>

          <div className="card" style={{ padding: '0.875rem', flex: 1 }}>
            <label className="input-label">Required Bobbin Diameter (mm) *</label>
            <input
              type="number"
              className="input"
              value={diameter}
              onChange={e => setDiameter(parseFloat(e.target.value) || 0)}
              step={0.5}
              style={{ marginTop: 4 }}
            />
            {isValid ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Valid</span>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>Enter 50–500 mm</div>
            )}
          </div>

          <button
            className="btn btn-primary"
            disabled={!isValid}
            onClick={() => onNext(diameter)}
            style={{ justifyContent: 'center', fontSize: 13, fontWeight: 700, padding: '0.75rem' }}
          >
            NEXT <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
