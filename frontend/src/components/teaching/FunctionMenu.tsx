import { ChevronLeft, ScanLine, Layers, Droplets, Shuffle } from 'lucide-react';

// ─── Sharp canvas renderer — uses devicePixelRatio to avoid blur ───────────────
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

// ─── Canvas bobbin thumbnails ─────────────────────────────────
function BobbinCanvas({ type }: { type: 'extraction' | 'tube' | 'stain' | 'thread' }) {
  const DISPLAY = 90;
  const ref = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    drawSharp(canvas, DISPLAY, (ctx, W, H) => {

      if (type === 'extraction') {
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W/2, H/2, 3, W/2, H/2, W*0.42);
        grad.addColorStop(0, '#b0bec8'); grad.addColorStop(1, '#dde5ed');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(W/2, H/2, W*0.42, H*0.42, 0, 0, Math.PI*2); ctx.fill();
        for (let r = W*0.1; r < W*0.42; r += 6) {
          ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(71,85,105,0.22)'; ctx.lineWidth = 0.6; ctx.stroke();
        }
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.08, 0, Math.PI*2); ctx.fill();

      } else if (type === 'tube') {
        ctx.fillStyle = '#1a1210'; ctx.fillRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W/2, H/2, W*0.1, W/2, H/2, W*0.44);
        grad.addColorStop(0, '#e07820'); grad.addColorStop(0.45, '#a05010'); grad.addColorStop(1, '#50240a');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.44, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0a0503';
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.16, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#f0900a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.16, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,160,50,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.33, 0, Math.PI*2); ctx.stroke();

      } else if (type === 'stain') {
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W/2, H/2, 3, W/2, H/2, W*0.42);
        grad.addColorStop(0, '#b0bec8'); grad.addColorStop(1, '#dde5ed');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(W/2, H/2, W*0.42, H*0.42, 0, 0, Math.PI*2); ctx.fill();
        for (let r = W*0.08; r < W*0.42; r += 7) {
          ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.fillStyle = 'rgba(150,65,10,0.75)';
        ctx.beginPath(); ctx.ellipse(W*0.62, H*0.35, 12, 8, 0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(130,55,10,0.5)';
        ctx.beginPath(); ctx.ellipse(W*0.57, H*0.44, 7, 5, 0.8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(71,85,105,0.7)'; ctx.lineWidth = 0.8;
        [[W*0.55,H*0.28,W*0.7,H*0.22],[W*0.6,H*0.3,W*0.75,H*0.35]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.08, 0, Math.PI*2); ctx.fill();

      } else {
        ctx.fillStyle = '#0c1628'; ctx.fillRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W/2, H/2, 4, W/2, H/2, W*0.44);
        grad.addColorStop(0, '#4090f0'); grad.addColorStop(0.55, '#1d4ed8'); grad.addColorStop(1, '#0f2060');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(W/2, H/2, W*0.43, H*0.43, 0, 0, Math.PI*2); ctx.fill();
        for (let r = W*0.1; r < W*0.43; r += 7) {
          ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(147,197,253,0.28)'; ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.fillStyle = '#060c1a';
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.09, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(147,197,253,0.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(W/2, H/2, W*0.09, 0, Math.PI*2); ctx.stroke();
      }
    });
  };
  return (
    <canvas
      ref={ref}
      style={{ width: DISPLAY, height: DISPLAY, borderRadius: 12, display: 'block' }}
    />
  );
}

const FUNCTION_CARDS = [
  { id: 'extraction',   label: 'Extraction',   icon: <ScanLine size={14} />,  type: 'extraction' as const },
  { id: 'tube-pattern', label: 'Tube Pattern',  icon: <Layers size={14} />,    type: 'tube'       as const },
  { id: 'stain',        label: 'Stain',         icon: <Droplets size={14} />,  type: 'stain'      as const },
  { id: 'thread-mix',   label: 'Thread Mix',    icon: <Shuffle size={14} />,   type: 'thread'     as const },
];

export default function FunctionMenu({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Teaching
        </h1>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1.25rem',
        paddingTop: '0.5rem',
      }}>
        {FUNCTION_CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            style={{
              background: '#fff',
              border: '1px solid var(--color-ips-border)',
              borderRadius: 16,
              padding: '2rem 1rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#10b981';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-ips-border)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: DISPLAY_SIZE, height: DISPLAY_SIZE,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}>
              <BobbinCanvas type={card.type} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11 }}>
                {card.icon}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                {card.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const DISPLAY_SIZE = 90;
