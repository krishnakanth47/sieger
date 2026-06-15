import { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Edit3, RotateCcw, PlayCircle, StopCircle, AlertTriangle } from 'lucide-react';
import { captureApi } from '../api/client';
import type { Pattern } from '../types';

const MIN_IMAGES = 10;

function PatternCard({
  pattern, onSelect, selected, onDelete, onRename, onClear,
}: {
  pattern: Pattern; onSelect: () => void; selected: boolean;
  onDelete: () => void; onRename: () => void; onClear: () => void;
}) {
  const progress = Math.min(pattern.image_count / MIN_IMAGES, 1);
  return (
    <div
      className="card cursor-pointer"
      style={{
        border: selected ? '1px solid var(--color-brand-dark)' : '1px solid var(--color-ips-border)',
        background: selected ? 'var(--color-sidebar-active)' : 'var(--color-ips-surface)',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{pattern.name}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {pattern.image_count} / {MIN_IMAGES} images
          </p>
        </div>
        <span
          className={`badge ${pattern.ready ? 'badge-pass' : 'badge-warn'}`}
          style={{ fontSize: 9 }}
        >
          {pattern.ready ? 'Ready' : 'Staging'}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: 'var(--color-ips-border)', borderRadius: 2, marginTop: 10,
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: pattern.ready ? 'var(--color-brand)' : 'var(--color-warn)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onRename}>
          <Edit3 size={12} /> Rename
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--color-warn)' }} onClick={onClear}>
          <RotateCcw size={12} /> Clear
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--color-fail)', marginLeft: 'auto' }} onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function CreatePatternModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (v: string) => /^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$/.test(v);

  const handleCreate = async () => {
    if (!validate(name)) {
      setError('Name must be lowercase alphanumeric with hyphens, 3–50 chars (e.g. dark-brown-cone)');
      return;
    }
    setLoading(true);
    try {
      await captureApi.createPattern(name, desc);
      onCreate();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create pattern');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__title"><Plus size={16} /> New Pattern</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Pattern Name *</label>
            <input
              className="input"
              placeholder="dark-brown-cone"
              value={name}
              onChange={e => { setName(e.target.value.toLowerCase()); setError(''); }}
            />
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Lowercase, alphanumeric, hyphens allowed (e.g. dark-brown-cone)
            </p>
          </div>
          <div>
            <label className="input-label">Description</label>
            <input className="input" placeholder="Optional description" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          {error && (
            <div className="alert-banner" style={{ padding: '8px 12px' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !name}>
              {loading ? 'Creating…' : 'Create Pattern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataCaptureView() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState('');
  const [captureResult, setCaptureResult] = useState<any>(null);

  const loadPatterns = async () => {
    try {
      const res = await captureApi.listPatterns();
      setPatterns(res.data);
    } catch { }
  };

  useEffect(() => { loadPatterns(); }, []);

  const selected = patterns.find(p => p.id === selectedId);

  const handleCapture = async () => {
    if (!selectedId) return;
    setCapturing(true);
    try {
      const res = await captureApi.captureImage(selectedId);
      setCaptureResult(res.data);
      await loadPatterns();
    } catch { } finally { setCapturing(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pattern and all its images?')) return;
    try { await captureApi.deletePattern(id); await loadPatterns(); } catch { }
  };

  const handleRename = async () => {
    if (!renameId) return;
    try { await captureApi.renamePattern(renameId, renameName); setRenameId(null); await loadPatterns(); } catch { }
  };

  const handleClear = async (id: number) => {
    if (!confirm('Clear all captured images for this pattern?')) return;
    try { await captureApi.clearStaging(id); await loadPatterns(); } catch { }
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Data Capture</h1>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Collect baseline reference images for pattern training
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Pattern
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Pattern Grid */}
        <div>
          <p className="section-title">Patterns</p>
          {patterns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              <Camera size={32} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>No patterns yet. Create one to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {patterns.map(p => (
                <PatternCard
                  key={p.id} pattern={p}
                  selected={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id)}
                  onDelete={() => handleDelete(p.id)}
                  onRename={() => { setRenameId(p.id); setRenameName(p.name); }}
                  onClear={() => handleClear(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Capture Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <p className="card-header">Capture Control</p>
            {!selected ? (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                Select a pattern to begin capture
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Selected</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-light)' }}>{selected.name}</p>
                </div>

                {/* Counter */}
                <div style={{
                  background: 'var(--color-ips-surface-2)',
                  borderRadius: 8,
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-mono)', color: selected.ready ? '#22c55e' : '#f59e0b' }}>
                    {selected.image_count}
                  </span>
                  <span style={{ fontSize: 20, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    / {MIN_IMAGES}
                  </span>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Images Captured
                  </p>
                  {/* Progress */}
                  <div style={{ height: 6, background: 'var(--color-ips-border)', borderRadius: 3, marginTop: 8 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(selected.image_count / MIN_IMAGES * 100, 100)}%`,
                      background: selected.ready ? '#22c55e' : '#f59e0b',
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {!selected.ready && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: 'var(--color-warn)', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '6px 10px' }}>
                    <AlertTriangle size={12} />
                    Minimum {MIN_IMAGES} images required before training
                  </div>
                )}

                {captureResult && (
                  <div style={{ fontSize: 10, color: 'var(--color-pass)', background: 'rgba(34,197,94,0.1)', borderRadius: 6, padding: '6px 10px' }}>
                    ✓ Image {captureResult.image_count} captured
                  </div>
                )}

                <button
                  className={`btn ${capturing ? 'btn-warning' : 'btn-primary'}`}
                  onClick={handleCapture}
                  disabled={capturing}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {capturing ? <><StopCircle size={14} /> Capturing…</> : <><PlayCircle size={14} /> Capture Image</>}
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <p className="card-header">Stats</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatRow label="Total Patterns" value={patterns.length} />
              <StatRow label="Ready Patterns" value={patterns.filter(p => p.ready).length} />
              <StatRow label="Total Images" value={patterns.reduce((a, p) => a + p.image_count, 0)} />
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreatePatternModal
          onClose={() => setShowCreate(false)}
          onCreate={loadPatterns}
        />
      )}

      {/* Rename Modal */}
      {renameId && (
        <div className="modal-overlay" onClick={() => setRenameId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title"><Edit3 size={16} /> Rename Pattern</div>
            <label className="input-label">New Name</label>
            <input
              className="input"
              value={renameName}
              onChange={e => setRenameName(e.target.value.toLowerCase())}
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRenameId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRename}>Rename</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  );
}
