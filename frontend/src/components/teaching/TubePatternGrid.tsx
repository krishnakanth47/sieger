import { useEffect, useRef } from 'react';
import { ChevronLeft, ImageIcon } from 'lucide-react';

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

// ─── Pattern color map ─────────────────────────────────────────
type PatternKey = 'brown' | 'green' | 'dark-brown' | 'white-pattern' | 'testing';
const PATTERN_COLORS: Record<PatternKey, { outer: string; mid: string; inner: string; rim: string }> = {
  'brown':         { outer: '#c06010', mid: '#804010', inner: '#060300', rim: '#f09020' },
  'green':         { outer: '#20a040', mid: '#107028', inner: '#010a04', rim: '#30d060' },
  'dark-brown':    { outer: '#6a3010', mid: '#401808', inner: '#030100', rim: '#a05020' },
  'white-pattern': { outer: '#d8e0ea', mid: '#a0b0c0', inner: '#202830', rim: '#c0d0e0' },
  'testing':       { outer: '#5070a0', mid: '#304070', inner: '#060810', rim: '#7090c0' },
};

function PatternThumb({ name, display = 64 }: { name: string; display?: number }) {
  const colors = PATTERN_COLORS[name as PatternKey] ?? PATTERN_COLORS['testing'];
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    drawSharp(canvas, display, (ctx, W, H) => {
      ctx.fillStyle = '#060402'; ctx.fillRect(0,0,W,H);
      const g = ctx.createRadialGradient(W/2,H/2,W*0.12,W/2,H/2,W*0.46);
      g.addColorStop(0, colors.outer); g.addColorStop(0.55, colors.mid); g.addColorStop(1, '#1a0800');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(W/2,H/2,W*0.46,0,Math.PI*2); ctx.fill();
      // Surface rings
      for (let r = W*0.18; r < W*0.44; r += W*0.09) {
        ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.fillStyle = colors.inner;
      ctx.beginPath(); ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = colors.rim; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2); ctx.stroke();
    });
  }, [name, display, colors]);

  return (
    <canvas
      ref={ref}
      style={{ width: display, height: display, borderRadius: display * 0.15, display: 'block' }}
    />
  );
}

const PATTERNS = [
  { name: 'brown',         count: 8 },
  { name: 'green',         count: 23 },
  { name: 'dark-brown',    count: 5 },
  { name: 'white-pattern', count: 4 },
  { name: 'testing',       count: 1 },
];

export default function TubePatternGrid({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Select Tube Pattern
        </h1>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
        paddingTop: '0.25rem',
      }}>
        {PATTERNS.map(p => (
          <button
            key={p.name}
            onClick={() => onSelect(p.name)}
            style={{
              background: '#fff',
              border: '1px solid var(--color-ips-border)',
              borderRadius: 14,
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'all 0.16s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
              el.style.borderColor = '#10b981';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
              el.style.borderColor = 'var(--color-ips-border)';
            }}
          >
            <PatternThumb name={p.name} display={64} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {p.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 3 }}>
                <ImageIcon size={10} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: 10, color: '#64748b' }}>{p.count} images</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
