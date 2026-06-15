import { useState, useEffect } from 'react';
import {
  Users, Plus, Edit3, Trash2, KeyRound, Shield, CheckSquare, Square,
} from 'lucide-react';
import { usersApi } from '../api/client';
import type { User, Role } from '../types';

const MODULES = [
  'inspect', 'data_capture', 'teaching', 'settings',
  'analytics', 'reports', 'activity_log', 'user_management',
];

function UserModal({ user, roles, onClose, onSave }: {
  user: Partial<User> | null; roles: Role[]; onClose: () => void; onSave: () => void;
}) {
  const isNew = !user?.id;
  const [form, setForm] = useState<any>(user || {});
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (isNew && (!form.username || !password || !form.role_id)) {
      setError('Username, password, and role are required');
      return;
    }
    setLoading(true);
    try {
      if (isNew) {
        await usersApi.create({ ...form, password });
      } else {
        await usersApi.update(user!.id!, form);
      }
      onSave();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__title">
          <Users size={16} /> {isNew ? 'Create User' : 'Edit User'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="input-label">Username {isNew && '*'}</label>
              <input className="input" value={form.username || ''} onChange={e => setForm((f: any) => ({ ...f, username: e.target.value }))} disabled={!isNew} />
            </div>
            <div>
              <label className="input-label">Full Name</label>
              <input className="input" value={form.full_name || ''} onChange={e => setForm((f: any) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input className="input" type="email" value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Role *</label>
              <select className="input" value={form.role_id || ''} onChange={e => setForm((f: any) => ({ ...f, role_id: parseInt(e.target.value) }))}>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {isNew && (
              <div>
                <label className="input-label">Password *</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            )}
            <div>
              <label className="input-label">Employee ID</label>
              <input className="input" value={form.employee_id || ''} onChange={e => setForm((f: any) => ({ ...f, employee_id: e.target.value }))} />
            </div>
          </div>
          {error && <div className="alert-banner" style={{ padding: '8px 12px', fontSize: 11 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const [perms, setPerms] = useState<Record<string, { read: boolean; write: boolean; delete: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize all modules with false
    const init: any = {};
    MODULES.forEach(m => { init[m] = { read: false, write: false, delete: false }; });
    setPerms(init);
  }, [role]);

  const toggle = (module: string, action: 'read' | 'write' | 'delete') => {
    setPerms(p => ({ ...p, [module]: { ...p[module], [action]: !p[module][action] } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.updatePermissions(role.id, MODULES.map(m => ({ module: m, ...perms[m] })));
      onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal__title"><Shield size={16} /> Edit Permissions — {role.name}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--color-text-muted)', fontSize: 10, borderBottom: '1px solid var(--color-ips-border)' }}>Module</th>
              {['Read', 'Write', 'Delete'].map(a => (
                <th key={a} style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--color-text-muted)', fontSize: 10, borderBottom: '1px solid var(--color-ips-border)' }}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(module => (
              <tr key={module}>
                <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', textTransform: 'capitalize', borderBottom: '1px solid var(--color-ips-border)' }}>
                  {module.replace('_', ' ')}
                </td>
                {(['read', 'write', 'delete'] as const).map(action => (
                  <td key={action} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-ips-border)' }}>
                    <button onClick={() => toggle(module, action)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {perms[module]?.[action]
                        ? <CheckSquare size={16} style={{ color: 'var(--color-brand)' }} />
                        : <Square size={16} style={{ color: 'var(--color-text-muted)' }} />
                      }
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editUser, setEditUser] = useState<Partial<User> | null | 'new'>(null);
  const [permRole, setPermRole] = useState<Role | null>(null);
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
    if (!resetId || newPwd.length < 6) return;
    try { await usersApi.resetPassword(resetId, newPwd); setResetId(null); setNewPwd(''); } catch { }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>User Management</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setPermRole(roles[0] || null)}>
            <Shield size={14} /> Edit Permissions
          </button>
          <button className="btn btn-primary" onClick={() => setEditUser({})}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Roles strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {roles.map(r => (
          <button
            key={r.id}
            className="badge badge-idle"
            style={{ fontSize: 10, cursor: 'pointer', border: '1px solid var(--color-ips-border-2)' }}
            onClick={() => setPermRole(r)}
          >
            <Shield size={10} /> {r.name}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              {['ID', 'Username', 'Full Name', 'Role', 'Department', 'Last Login', 'Status', 'Actions'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{u.id}</td>
                <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 12 }}>{u.username}</td>
                <td>{u.full_name}</td>
                <td>
                  <span className="badge badge-idle" style={{ fontSize: 9 }}>{u.role}</span>
                </td>
                <td style={{ color: 'var(--color-text-muted)' }}>{u.department ?? '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-pass' : 'badge-fail'}`} style={{ fontSize: 9 }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10 }} onClick={() => setEditUser(u)}>
                      <Edit3 size={12} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10 }} onClick={() => { setResetId(u.id); setNewPwd(''); }}>
                      <KeyRound size={12} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10, color: 'var(--color-fail)' }} onClick={() => handleDelete(u.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editUser !== null && editUser !== 'new' && (
        <UserModal user={editUser} roles={roles} onClose={() => setEditUser(null)} onSave={load} />
      )}
      {permRole && (
        <PermissionsModal role={permRole} onClose={() => setPermRole(null)} />
      )}
      {resetId && (
        <div className="modal-overlay" onClick={() => setResetId(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal__title"><KeyRound size={16} /> Reset Password</div>
            <label className="input-label">New Password (min 6 chars)</label>
            <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setResetId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPwd} disabled={newPwd.length < 6}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
