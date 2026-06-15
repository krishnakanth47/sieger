import React, { ReactNode, useState, useEffect } from 'react';
import {
  Wifi, WifiOff, Plus, Trash2, Save,
  Camera, Cpu, Clock, Zap, ZapOff,
  AlertTriangle,
} from 'lucide-react';
import { settingsApi } from '../api/client';
import type { CameraConfig, PLCConfig, Shift, IlluminationState } from '../types';

// ─── Helpers ───────────────────────────────────────────────
function SectionCard({ title, icon, children }: {
  title: string; icon: ReactNode; children: ReactNode;
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: 'var(--color-brand)' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Camera Setup ──────────────────────────────────────────
function CameraSetup() {
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<CameraConfig>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getCameras().then(r => setCameras(r.data)).catch(() => { });
  }, []);

  const edit = (name: string, field: string, value: string | number) =>
    setEditing(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }));

  const save = async (name: string) => {
    setSaving(name);
    try {
      await settingsApi.updateCamera(name, editing[name] || {});
      setCameras(prev => prev.map(c => c.camera_name === name ? { ...c, ...(editing[name] || {}) } as CameraConfig : c));
    } catch { } finally { setSaving(null); }
  };

  return (
    <SectionCard title="Camera Configuration" icon={<Camera size={16} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cameras.map(cam => {
          const e = editing[cam.camera_name] || {};
          return (
            <div key={cam.camera_name} style={{ padding: '12px', background: 'var(--color-ips-surface-2)', borderRadius: 6, border: '1px solid var(--color-ips-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className={`badge ${cam.is_active ? 'badge-pass' : 'badge-idle'}`} style={{ fontSize: 9 }}>
                  {cam.camera_name.toUpperCase()}
                </span>
                {cam.is_active
                  ? <Wifi size={12} style={{ color: 'var(--color-pass)' }} />
                  : <WifiOff size={12} style={{ color: 'var(--color-text-muted)' }} />
                }
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                <Field label="IP Address">
                  <input
                    className="input"
                    value={e.ip_address ?? cam.ip_address ?? ''}
                    onChange={ev => edit(cam.camera_name, 'ip_address', ev.target.value)}
                    placeholder="192.168.1.101"
                  />
                </Field>
                <Field label="Port">
                  <input
                    className="input"
                    type="number"
                    value={e.port ?? cam.port}
                    onChange={ev => edit(cam.camera_name, 'port', parseInt(ev.target.value))}
                  />
                </Field>
              </div>
              <Field label="Stream URL">
                <input
                  className="input"
                  style={{ marginTop: 6 }}
                  value={e.stream_url ?? cam.stream_url ?? ''}
                  onChange={ev => edit(cam.camera_name, 'stream_url', ev.target.value)}
                  placeholder="rtsp://user:pass@192.168.1.101/stream"
                />
              </Field>
              <button
                className="btn btn-primary"
                style={{ marginTop: 10, fontSize: 11, padding: '5px 12px' }}
                onClick={() => save(cam.camera_name)}
                disabled={saving === cam.camera_name}
              >
                <Save size={12} /> {saving === cam.camera_name ? 'Saving…' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── PLC Setup ─────────────────────────────────────────────
function PLCSetup() {
  const [plc, setPLC] = useState<Partial<PLCConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.getPLC().then(r => setPLC(r.data)).catch(() => { });
  }, []);

  const save = async () => {
    setSaving(true);
    try { await settingsApi.updatePLC(plc); } catch { } finally { setSaving(false); }
  };

  return (
    <SectionCard title="PLC / Modbus TCP" icon={<Cpu size={16} />}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, marginBottom: 8 }}>
        <Field label="Host IP">
          <input className="input" value={plc.host || ''} onChange={e => setPLC(p => ({ ...p, host: e.target.value }))} placeholder="192.168.1.100" />
        </Field>
        <Field label="Port">
          <input className="input" type="number" value={plc.port || 502} onChange={e => setPLC(p => ({ ...p, port: parseInt(e.target.value) }))} />
        </Field>
        <Field label="Unit">
          <input className="input" type="number" value={plc.unit_id || 1} onChange={e => setPLC(p => ({ ...p, unit_id: parseInt(e.target.value) }))} />
        </Field>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Register Mapping</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Basket ID Reg', key: 'basket_id_register' },
          { label: 'Machine ID Reg', key: 'machine_id_register' },
          { label: 'Material ID Reg', key: 'material_id_register' },
        ].map(({ label, key }) => (
          <Field key={key} label={label}>
            <input
              className="input"
              type="number"
              value={(plc as any)[key] || ''}
              onChange={e => setPLC(p => ({ ...p, [key]: parseInt(e.target.value) }))}
            />
          </Field>
        ))}
      </div>
      <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={save} disabled={saving}>
        <Save size={12} /> {saving ? 'Saving…' : 'Save PLC Config'}
      </button>
    </SectionCard>
  );
}

// ─── Shift Setup ───────────────────────────────────────────
function ShiftSetup() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState('');
  const MAX = 3;

  const load = () => settingsApi.getShifts().then(r => setShifts(r.data)).catch(() => { });
  useEffect(() => { load(); }, []);

  const addShift = async () => {
    if (shifts.length >= MAX) {
      setError(`Maximum number of shifts (${MAX}) reached.`);
      return;
    }
    setError('');
    try {
      await settingsApi.createShift({
        name: `Shift ${String.fromCharCode(65 + shifts.length)}`,
        start_time: '06:00:00',
        end_time: '14:00:00',
        is_active: true,
      });
      load();
    } catch { }
  };

  const deleteShift = async (id: number) => {
    try { await settingsApi.deleteShift(id); load(); } catch { }
  };

  return (
    <SectionCard title="Shift Configuration" icon={<Clock size={16} />}>
      {error && (
        <div className="alert-banner" style={{ marginBottom: 12, padding: '8px 12px' }}>
          <AlertTriangle size={13} /> {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {shifts.map(shift => (
          <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-ips-surface-2)', borderRadius: 6, border: '1px solid var(--color-ips-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>{shift.name}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
            </span>
            <span className={`badge ${shift.is_active ? 'badge-pass' : 'badge-idle'}`} style={{ fontSize: 9 }}>
              {shift.is_active ? 'Active' : 'Inactive'}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 6px', color: 'var(--color-fail)' }} onClick={() => deleteShift(shift.id)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="btn btn-outline"
        style={{ fontSize: 11, padding: '5px 12px' }}
        onClick={addShift}
        disabled={shifts.length >= MAX}
      >
        <Plus size={12} /> Add Shift {shifts.length >= MAX ? `(Max ${MAX})` : ''}
      </button>
    </SectionCard>
  );
}

// ─── Illumination Panel ────────────────────────────────────
function IlluminationPanel() {
  const [state, setState] = useState<IlluminationState>({ master_enabled: false, visible_light: false, uv_light: false, yarn_tail_light: false });

  const load = () => settingsApi.getIllumination().then(r => setState(r.data)).catch(() => { });
  useEffect(() => { load(); }, []);

  const toggle = async (key: keyof IlluminationState) => {
    const next = { ...state, [key]: !state[key] };
    if (key === 'master_enabled' && !next.master_enabled) {
      next.visible_light = false;
      next.uv_light = false;
      next.yarn_tail_light = false;
    }
    setState(next);
    try { await settingsApi.updateIllumination(next); } catch { }
  };

  const lights = [
    { key: 'visible_light' as const, label: 'Visible Lights', color: '#f59e0b' },
    { key: 'uv_light' as const, label: 'UV Lights', color: '#a855f7' },
    { key: 'yarn_tail_light' as const, label: 'Yarn Tail Lights', color: '#3b82f6' },
  ];

  return (
    <SectionCard title="Illumination Control" icon={<Zap size={16} />}>
      {/* Master toggle */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
          background: state.master_enabled ? 'rgba(34,197,94,0.1)' : 'var(--color-ips-surface-2)',
          border: state.master_enabled ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--color-ips-border)',
          cursor: 'pointer',
        }}
        onClick={() => toggle('master_enabled')}
      >
        {state.master_enabled ? <Zap size={18} style={{ color: '#22c55e' }} /> : <ZapOff size={18} style={{ color: 'var(--color-text-muted)' }} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Master Switch</p>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Control all lights simultaneously</p>
        </div>
        <label className="toggle" style={{ pointerEvents: 'none' }}>
          <input type="checkbox" checked={state.master_enabled} onChange={() => { }} />
          <div className="toggle__track"><div className="toggle__thumb" /></div>
        </label>
      </div>

      {/* Individual lights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {lights.map(({ key, label, color }) => {
          const on = state[key] && state.master_enabled;
          return (
            <div
              key={key}
              style={{
                padding: '12px',
                borderRadius: 6,
                border: `1px solid ${on ? color + '55' : 'var(--color-ips-border)'}`,
                background: on ? color + '15' : 'var(--color-ips-surface-2)',
                cursor: state.master_enabled ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                opacity: state.master_enabled ? 1 : 0.5,
              }}
              onClick={() => state.master_enabled && toggle(key)}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: on ? color : 'var(--color-ips-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: on ? `0 0 12px ${color}88` : 'none', transition: 'all 0.3s' }}>
                <Zap size={14} style={{ color: on ? '#fff' : 'var(--color-text-muted)' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: on ? color : 'var(--color-text-muted)', textAlign: 'center' }}>{label}</span>
              <span className={`badge ${on ? 'badge-pass' : 'badge-idle'}`} style={{ fontSize: 8 }}>{on ? 'ON' : 'OFF'}</span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Main View ─────────────────────────────────────────────
export default function SettingsView() {
  return (
    <div className="page">
      <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>System Settings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <CameraSetup />
        <PLCSetup />
        <ShiftSetup />
        <IlluminationPanel />
      </div>
    </div>
  );
}
