import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';

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

// ─── Tube camera feed ─────────────────────────────────────────
function CameraFeedTube({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dW = rect.width  || 640;
    const dH = rect.height || 400;

    drawSharp(canvas, dW, dH, (ctx, W, H) => {
      ctx.fillStyle = '#080603'; ctx.fillRect(0, 0, W, H);

      // Top lighting
      const tg = ctx.createLinearGradient(0, 0, 0, 50);
      tg.addColorStop(0, 'rgba(255,220,150,0.18)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 50);

      // Rig rails
      ctx.strokeStyle = '#1a1510'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, H*0.12); ctx.lineTo(W, H*0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H*0.88); ctx.lineTo(W, H*0.88); ctx.stroke();

      // Outer brown tube body
      const outerGrad = ctx.createRadialGradient(W/2-W*0.04, H/2-H*0.04, W*0.05, W/2, H/2, W*0.38);
      outerGrad.addColorStop(0, '#d07020'); outerGrad.addColorStop(0.5, '#904010'); outerGrad.addColorStop(1, '#3a1600');
      ctx.fillStyle = outerGrad;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.38, 0, Math.PI*2); ctx.fill();

      // Subtle surface rings
      for (let r = W*0.18; r < W*0.37; r += W*0.045) {
        ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,180,80,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Inner dark tube hole
      ctx.fillStyle = '#050302';
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.14, 0, Math.PI*2); ctx.fill();

      // Amber rim around hole
      ctx.strokeStyle = '#e08010'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.14, 0, Math.PI*2); ctx.stroke();

      // Green dashed measurement ring
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.145, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);

      // Handle dots
      [[W/2-W*0.145,H/2],[W/2+W*0.145,H/2],[W/2,H/2-W*0.145],[W/2,H/2+W*0.145]].forEach(([x,y]) => {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.stroke();
      });

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(8, 8, 148, 20);
      ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('TUBE DETECT  LIVE', 12, 22);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('TUBE DIAMETER: 41.36mm', 10, H - 24);
    });
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Cropped tube preview ─────────────────────────────────────
function CroppedTube() {
  const DISPLAY = 130;
  const ref = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    drawSharp(canvas, DISPLAY, DISPLAY, (ctx, W, H) => {
      ctx.fillStyle = '#080503'; ctx.fillRect(0, 0, W, H);
      // High-contrast tube ring
      const grad = ctx.createRadialGradient(W/2, H/2, W*0.16, W/2, H/2, W*0.46);
      grad.addColorStop(0, '#e07820'); grad.addColorStop(0.5, '#a04810'); grad.addColorStop(1, '#3a1400');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.46, 0, Math.PI*2); ctx.fill();
      // Inner black hole
      ctx.fillStyle = '#030201';
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.17, 0, Math.PI*2); ctx.fill();
      // Amber rim — thick and visible
      ctx.strokeStyle = '#f09020'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.17, 0, Math.PI*2); ctx.stroke();
      // Soft outer glow ring
      ctx.strokeStyle = 'rgba(255,170,60,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.32, 0, Math.PI*2); ctx.stroke();
      // Green dashed frame
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      ctx.strokeRect(2, 2, W-4, H-4); ctx.setLineDash([]);
      // Measurement label
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('41.4mm', W/2 - 22, H - 8);
    });
  };
  return <canvas ref={ref} style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
}

export default function DiameterStep2({
  bobbinDiameter,
  onBack,
  onSave,
}: {
  bobbinDiameter: number;
  onBack: () => void;
  onSave: (tube: number) => void;
}) {
  const [tubeDiam, setTubeDiam] = useState(41);
  const [saving, setSaving]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onSave(tubeDiam);
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Extraction</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>Diameter Setting</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Tube Calibration</span>
        </div>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        <div
          ref={containerRef}
          style={{
            background: '#080503',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #1e1208',
          }}
        >
          <CameraFeedTube containerRef={containerRef} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Bobbin Ref
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#10b981' }}>
              {bobbinDiameter} mm
            </div>
          </div>

          <div className="card" style={{ padding: '0.875rem' }}>
            <div className="card-header">Cropped Tube</div>
            <CroppedTube />
          </div>

          <div className="card" style={{ padding: '0.875rem', flex: 1 }}>
            <label className="input-label">Required Tube Diameter (mm) *</label>
            <input
              type="number"
              className="input"
              value={tubeDiam}
              onChange={e => setTubeDiam(parseFloat(e.target.value) || 0)}
              step={0.5}
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-outline" onClick={onBack} style={{ justifyContent: 'center' }}>
              <ChevronLeft size={14} /> BACK
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ justifyContent: 'center', fontSize: 13, fontWeight: 700, padding: '0.75rem' }}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
