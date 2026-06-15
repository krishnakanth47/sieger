import { useState, useEffect } from 'react';
import { Shield, Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const STATE_COLORS: Record<string, string> = {
  IDLE: 'badge-idle',
  INSPECTION_RUNNING: 'badge-run',
  DATA_CAPTURING: 'badge-warn',
  TEACHING: 'badge-warn',
  MAINTENANCE: 'badge-warn',
};

const STATE_LABELS: Record<string, string> = {
  IDLE: 'Idle',
  INSPECTION_RUNNING: 'Live',
  DATA_CAPTURING: 'Capturing',
  TEACHING: 'Teaching',
  MAINTENANCE: 'Maintenance',
};

export function Header() {
  const { systemState, plc, auth, kpi } = useAppStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmt = time.toLocaleTimeString('en-GB', { hour12: false });
  const date = time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="app-header">
      {/* Branding */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-wide">SIEGER</p>
          <p className="text-[9px] text-[var(--color-text-muted)] tracking-widest uppercase leading-none mt-0.5">
            partnering progress
          </p>
        </div>
        <div className="w-px h-8 bg-[var(--color-ips-border)]" />
        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:block">
          Cone Inspection System
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Real-time metrics strip */}
      <div className="hidden lg:flex items-center gap-4 text-[10px]">
        <MetricChip label="Total" value={kpi.total.toLocaleString()} />
        <MetricChip label="Accepted" value={kpi.accepted.toLocaleString()} color="text-[var(--color-pass)]" />
        <MetricChip label="Defective" value={kpi.defective.toLocaleString()} color="text-[var(--color-fail)]" />
        <MetricChip label="Efficiency" value={`${kpi.efficiency_pct}%`} color="text-[var(--color-brand)]" />
      </div>

      <div className="w-px h-6 bg-[var(--color-ips-border)] mx-1" />

      {/* PLC Status */}
      <div className="flex items-center gap-1.5 text-[10px]">
        {plc.connected
          ? <Wifi size={12} className="text-[var(--color-pass)]" />
          : <WifiOff size={12} className="text-[var(--color-fail)]" />
        }
        <span className="text-[var(--color-text-muted)] hidden md:block">
          {plc.basket_id} · {plc.machine_id}
        </span>
      </div>

      {/* System state badge */}
      <span className={`badge ${STATE_COLORS[systemState] || 'badge-idle'}`}>
        <Activity size={9} />
        {STATE_LABELS[systemState] || systemState}
      </span>

      {/* Clock */}
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
        <Clock size={11} />
        <div className="hidden md:block text-right">
          <p className="font-mono font-semibold text-[var(--color-text-secondary)]">{fmt}</p>
          <p className="text-[8px]">{date}</p>
        </div>
      </div>

      {/* User role chip */}
      {auth && (
        <div className="flex items-center gap-1.5 bg-[var(--color-ips-surface-2)] border border-[var(--color-ips-border)] rounded-md px-2 py-1">
          <Shield size={11} className="text-[var(--color-brand)]" />
          <span className="text-[10px] text-[var(--color-text-secondary)] hidden sm:block">
            {auth.role}
          </span>
        </div>
      )}
    </header>
  );
}

function MetricChip({ label, value, color = 'text-[var(--color-text-primary)]' }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--color-text-muted)] uppercase tracking-wider">{label}:</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
