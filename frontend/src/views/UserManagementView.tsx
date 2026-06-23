import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Plus, Edit3, Trash2, KeyRound, Search, ChevronDown, Check
} from 'lucide-react';
import { usersApi } from '../api/client';
import type { User, Role } from '../types';

const MODULES = [
  'inspect', 'data_capture', 'teaching', 'settings',
  'analytics', 'reports', 'activity_log', 'user_management',
];

const MODULE_INITIALS: Record<string, string> = {
  'inspect': 'I',
  'data_capture': 'D',
  'teaching': 'T',
  'settings': 'S',
  'analytics': 'AN',
  'reports': 'R',
  'activity_log': 'A',
  'user_management': 'M'
};

function MultiSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder 
}: { 
  options: { label: string; value: string }[], 
  selected: string[], 
  onChange: (val: string[]) => void,
  placeholder: string
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="input" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: 36 }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: selected.length ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length ? selected.map(s => options.find(o => o.value === s)?.label).join(', ') : placeholder}
        </span>
        <ChevronDown size={14} color="var(--color-text-muted)" />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--color-ips-surface)', border: '1px solid var(--color-ips-border)',
          borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {options.map(opt => (
            <div 
              key={opt.value} 
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-ips-border-2)' }}
              onClick={() => toggle(opt.value)}
            >
              <div style={{ width: 14, height: 14, border: '1px solid var(--color-ips-border)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected.includes(opt.value) ? 'var(--color-brand)' : 'transparent' }}>
                {selected.includes(opt.value) && <Check size={10} color="white" />}
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserModal({ user, roles, onClose, onSave }: {
  user: Partial<User> | null; roles: Role[]; onClose: () => void; onSave: () => void;
}) {
  const isNew = !user?.id;
  const [form, setForm] = useState<any>(user || {});
  const [password, setPassword] = useState('');
  // Pre-populate services from the user object (for edit mode)
  const [selectedServices, setSelectedServices] = useState<string[]>(
    (user as any)?.services ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  const submit = async () => {
    if (isNew && (!form.username || !form.full_name || !password || !form.role_id)) {
      setError('Username, full name, password, and role are required');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (form.email && !emailRegex.test(form.email)) {
      setError("Email must contain '@' and a valid domain (e.g., .com)");
      return;
    }

    if (isNew && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (isNew) {
        await usersApi.create({ ...form, password, services: selectedServices });
      } else {
        await usersApi.update(user!.id!, { ...form, services: selectedServices });
      }
      onSave();
      onClose();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(', '));
      } else {
        setError(detail || 'Save failed');
      }
    } finally { setLoading(false); }
  };

  const serviceOptions = MODULES.map(m => ({ label: m.replace('_', ' ').toUpperCase(), value: m }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal__title">
          <Users size={16} /> {isNew ? 'Add User' : 'Edit User'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label" style={{ textTransform: 'uppercase' }}>User Name {isNew && '*'}</label>
            <input className="input" placeholder="User Name" value={form.username || ''} onChange={e => setForm((f: any) => ({ ...f, username: e.target.value, full_name: e.target.value }))} disabled={!isNew} />
          </div>
          <div>
            <label className="input-label" style={{ textTransform: 'uppercase' }}>Mail ID</label>
            <input className="input" placeholder="Enter Mail ID" type="email" value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          {isNew && (
            <div>
              <label className="input-label" style={{ textTransform: 'uppercase' }}>Password *</label>
              <input className="input" placeholder="Enter password (min 8 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}
          <div>
            <label className="input-label" style={{ textTransform: 'uppercase' }}>Emp ID</label>
            <input className="input" placeholder="Employee ID" value={form.employee_id || ''} onChange={e => setForm((f: any) => ({ ...f, employee_id: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="input-label" style={{ textTransform: 'uppercase' }}>Role *</label>
              <select className="input" value={form.role_id || ''} onChange={e => setForm((f: any) => ({ ...f, role_id: parseInt(e.target.value) }))}>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label" style={{ textTransform: 'uppercase' }}>Services</label>
              <MultiSelectDropdown 
                options={serviceOptions} 
                selected={selectedServices} 
                onChange={setSelectedServices} 
                placeholder="Select services..." 
              />
            </div>
          </div>
          {error && <div className="alert-banner" style={{ padding: '8px 12px', fontSize: 11 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn" style={{ background: '#f87171', color: 'white' }} onClick={onClose}>CANCEL</button>
            <button className="btn btn-primary" style={{ background: '#65a30d', border: 'none' }} onClick={submit} disabled={loading}>
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editUser, setEditUser] = useState<Partial<User> | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterService, setFilterService] = useState('All Services');

  const [resetId, setResetId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const load = () => {
    usersApi.list().then(r => setUsers(r.data)).catch(() => { });
    usersApi.getRoles().then(r => setRoles(r.data)).catch(() => { });
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try { await usersApi.delete(id); load(); } catch { }
  };

  const handleResetPwd = async () => {
    if (!resetId || newPwd.length < 8) return;
    try { await usersApi.resetPassword(resetId, newPwd); setResetId(null); setNewPwd(''); } catch { }
  };

  const renderServicesTokens = (userServices: string[]) => {
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {MODULES.map(mod => {
          const hasAccess = userServices.includes(mod);
          return (
            <div key={mod} style={{
              minWidth: 16, height: 16, borderRadius: 3, padding: '0 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700,
              color: hasAccess ? '#fff' : 'var(--color-text-muted)',
              background: hasAccess ? 'var(--color-pass)' : '#e2e8f0',
            }}>
              {MODULE_INITIALS[mod]}
            </div>
          );
        })}
      </div>
    );
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole !== 'All Roles' && u.role !== filterRole) return false;
    if (filterService !== 'All Services') {
      if (!(u.services ?? []).includes(filterService)) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>User Management</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              className="input" 
              placeholder="Filter users..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: 200 }}
            />
          </div>
          <select className="input" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All Roles">All Roles</option>
            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <select className="input" value={filterService} onChange={e => setFilterService(e.target.value)}>
            <option value="All Services">All Services</option>
            {MODULES.map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setEditUser({})}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              {['EMP ID', 'USERNAME', 'ROLE', 'EMAIL', 'SERVICES ACCESS', 'ACTIONS'].map(h => (
                <th key={h} style={{ textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{u.employee_id || u.id}</td>
                <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 12 }}>{u.username}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{u.role}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{u.email ?? '—'}</td>
                <td>{renderServicesTokens(u.services ?? [])}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10 }} onClick={() => setEditUser(u)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10 }} onClick={() => { setResetId(u.id); setNewPwd(''); }}>
                      <KeyRound size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10, color: 'var(--color-fail)' }} onClick={() => handleDelete(u.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editUser !== null && (
        <UserModal user={editUser} roles={roles} onClose={() => setEditUser(null)} onSave={load} />
      )}
      
      {resetId && (
        <div className="modal-overlay" onClick={() => setResetId(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal__title"><KeyRound size={16} /> Reset Password</div>
            <label className="input-label">New Password (min 8 chars)</label>
            <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setResetId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPwd} disabled={newPwd.length < 8}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
