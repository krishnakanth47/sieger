import { ChevronLeft, Ruler, Target } from 'lucide-react';

function ActionGauge({
  icon,
  label,
  sublabel,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#1e293b',
        border: `2px solid #334155`,
        borderRadius: 20,
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flex: 1,
        maxWidth: 280,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = accent;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${accent}`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = '#334155';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
      }}
    >
      {/* Circular badge */}
      <div style={{
        width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle at 40% 35%, #2d3748, #1a2332)`,
        border: `3px solid ${accent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 24px ${accent}33, inset 0 2px 8px rgba(0,0,0,0.4)`,
        position: 'relative',
      }}>
        {/* Tick marks */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 2, height: i % 4 === 0 ? 10 : 6,
            background: i % 4 === 0 ? accent : '#475569',
            borderRadius: 1,
            top: 6,
            transformOrigin: '1px 54px',
            transform: `rotate(${i * 22.5}deg)`,
          }} />
        ))}
        <div style={{ color: accent, zIndex: 1 }}>
          {icon}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
          {label}
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700,
          color: accent,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginTop: 4,
        }}>
          {sublabel}
        </div>
      </div>
    </button>
  );
}

export default function ExtractionActions({
  onBack,
  onDiameter,
  onFinalize,
}: {
  onBack: () => void;
  onDiameter: () => void;
  onFinalize: () => void;
}) {
  return (
    <div className="page">
      {/* Breadcrumb header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Extraction</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 700 }}>Actions</span>
        </div>
        <button className="btn btn-outline" onClick={onBack} style={{ gap: 4, fontSize: 12 }}>
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      {/* Gauge buttons */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: '2rem 0',
      }}>
        <ActionGauge
          icon={<Ruler size={36} strokeWidth={1.5} />}
          label="Diameter Setting"
          sublabel="Diameter Training"
          accent="#10b981"
          onClick={onDiameter}
        />
        <ActionGauge
          icon={<Target size={36} strokeWidth={1.5} />}
          label="Finalize & Setup"
          sublabel="Diameter & Tolerance"
          accent="#3b82f6"
          onClick={onFinalize}
        />
      </div>
    </div>
  );
}
