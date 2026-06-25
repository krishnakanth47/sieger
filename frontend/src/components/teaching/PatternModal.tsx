import { useEffect, useRef, useState } from 'react';
import { X, CheckSquare, Square, Trash2, Edit3, Image, Play } from 'lucide-react';

type ModalTab = 'actions' | 'rename' | 'images' | 'delete';

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

type PatternKey = 'brown' | 'green' | 'dark-brown' | 'white-pattern' | 'testing';
const PATTERN_COLORS: Record<PatternKey, { outer: string; mid: string; inner: string; rim: string }> = {
  'brown':         { outer: '#c06010', mid: '#804010', inner: '#060300', rim: '#f09020' },
  'green':         { outer: '#20a040', mid: '#107028', inner: '#010a04', rim: '#30d060' },
  'dark-brown':    { outer: '#6a3010', mid: '#401808', inner: '#030100', rim: '#a05020' },
  'white-pattern': { outer: '#d8e0ea', mid: '#a0b0c0', inner: '#202830', rim: '#c0d0e0' },
  'testing':       { outer: '#5070a0', mid: '#304070', inner: '#060810', rim: '#7090c0' },
};

function drawTube(ctx: CanvasRenderingContext2D, W: number, H: number, name: string) {
  const colors = PATTERN_COLORS[name as PatternKey] ?? PATTERN_COLORS['testing'];
  ctx.fillStyle = '#060402'; ctx.fillRect(0,0,W,H);
  const g = ctx.createRadialGradient(W/2,H/2,W*0.12,W/2,H/2,W*0.46);
  g.addColorStop(0, colors.outer); g.addColorStop(0.55, colors.mid); g.addColorStop(1, '#1a0800');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(W/2,H/2,W*0.46,0,Math.PI*2); ctx.fill();
  for (let r=W*0.18;r<W*0.44;r+=W*0.09){
    ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5;ctx.stroke();
  }
  ctx.fillStyle = colors.inner;
  ctx.beginPath(); ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = colors.rim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(W/2,H/2,W*0.16,0,Math.PI*2); ctx.stroke();
}

function PatternPreviewCanvas({ name, size = 140 }: { name: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    drawSharp(canvas, size, (ctx, W, H) => drawTube(ctx, W, H, name));
  }, [name, size]);
  return (
    <canvas ref={ref} style={{ width: size, height: size, borderRadius: 14, display: 'block' }} />
  );
}

function SmallThumb({ idx, name, selected, onToggle }: {
  idx: number; name: string; selected: boolean; onToggle: () => void;
}) {
  const DISPLAY = 64;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    drawSharp(canvas, DISPLAY, (ctx, W, H) => drawTube(ctx, W, H, name));
  }, [name]);

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onToggle}>
      <canvas
        ref={ref}
        style={{
          width: DISPLAY, height: DISPLAY,
          borderRadius: 9, display: 'block',
          outline: selected ? '2.5px solid #3b82f6' : 'none',
          outlineOffset: 1,
        }}
      />
      <div style={{ position: 'absolute', top: 4, right: 4, color: selected ? '#3b82f6' : '#94a3b8' }}>
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </div>
      <div style={{ fontSize: 8, color: '#64748b', textAlign: 'center', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
        IMG-0{(30 + idx).toString().padStart(2,'0')}
      </div>
    </div>
  );
}

const TABS: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
  { id: 'actions', label: 'Actions',       icon: <Play size={11} /> },
  { id: 'rename',  label: 'Rename',        icon: <Edit3 size={11} /> },
  { id: 'images',  label: 'Manage Images', icon: <Image size={11} /> },
  { id: 'delete',  label: 'Delete',        icon: <Trash2 size={11} /> },
];

export default function PatternModal({
  patternName, imageCount, onClose, onUseForInspection,
}: {
  patternName: string; imageCount: number;
  onClose: () => void; onUseForInspection: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>('actions');
  const [newName, setNewName]     = useState(patternName);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [deleteMode, setDeleteMode] = useState<'with-images' | 'remove-images'>('with-images');

  const isValidName   = /^[a-z0-9-]+$/.test(newName);
  const allIndices    = Array.from({ length: imageCount }, (_, i) => i);
  const toggleSelect  = (i: number) => setSelected(prev => { const n=new Set(prev); n.has(i)?n.delete(i):n.add(i); return n; });
  const selectAll     = () => setSelected(new Set(allIndices));
  const clearAll      = () => setSelected(new Set());

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, animation: 'fade-in 0.15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        width: 520, maxHeight: '88vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        animation: 'scale-in 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{patternName}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Choose an action for this pattern.</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0.75rem 1.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '0.375rem 0.75rem',
                border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.14s',
                background: activeTab === tab.id ? (tab.id==='delete' ? '#fef2f2' : '#eff6ff') : 'transparent',
                color: activeTab === tab.id ? (tab.id==='delete' ? '#ef4444' : '#2563eb') : '#64748b',
                borderBottom: activeTab === tab.id ? `2px solid ${tab.id==='delete' ? '#ef4444' : '#2563eb'}` : '2px solid transparent',
                borderRadius: activeTab === tab.id ? '8px 8px 0 0' : 8,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <PatternPreviewCanvas name={patternName} size={140} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{patternName}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{imageCount} training images</div>
              </div>
              <button className="btn btn-primary" onClick={onUseForInspection}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: 13, fontWeight: 700 }}>
                <Play size={14} /> Use for Inspection
              </button>
            </div>
          )}

          {activeTab === 'rename' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="input-label">New pattern name</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. brown-v2" />
              <div style={{ fontSize: 10, color: '#94a3b8' }}>💡 Use lowercase letters/numbers with hyphens only</div>
              {newName && (
                <div style={{ fontSize: 10, fontWeight: 600, color: isValidName ? '#10b981' : '#ef4444' }}>
                  {isValidName ? '✓ Valid Name' : '✗ Invalid — lowercase, digits and hyphens only'}
                </div>
              )}
              <button className="btn" disabled style={{ background: '#e2e8f0', color: '#94a3b8', border: 'none', justifyContent: 'center' }}>
                Rename Pattern
              </button>
            </div>
          )}

          {activeTab === 'images' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{selected.size} selected / {imageCount}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={selectAll} style={{ fontSize: 10, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Select all</button>
                  <button onClick={clearAll}  style={{ fontSize: 10, color: '#64748b',  background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 64px)', gap: 8 }}>
                {allIndices.map(i => (
                  <SmallThumb key={i} idx={i} name={patternName} selected={selected.has(i)} onToggle={() => toggleSelect(i)} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'delete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>⚠️ This action cannot be undone.</div>
              {[
                { val: 'with-images',    label: 'Delete pattern along with images',        sub: 'Deletes pattern and images.' },
                { val: 'remove-images',  label: 'Delete pattern and remove all images',    sub: 'Deletes pattern and sends all images back to Data Capture.' },
              ].map(opt => (
                <div key={opt.val} onClick={() => setDeleteMode(opt.val as any)} style={{
                  padding: '0.875rem',
                  border: `2px solid ${deleteMode===opt.val ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: deleteMode===opt.val ? '#fef2f2' : '#fff',
                  transition: 'all 0.14s',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      border: `2px solid ${deleteMode===opt.val ? '#ef4444' : '#cbd5e1'}`,
                      background: deleteMode===opt.val ? '#ef4444' : 'transparent',
                    }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{opt.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                  <Trash2 size={13} /> Delete Pattern
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
