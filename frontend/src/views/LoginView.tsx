import React from 'react';
import { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import type { AuthToken } from '../types';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Enter username and password'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(username, password);
      const data: AuthToken = res.data;
      localStorage.setItem('ips_token', data.access_token);
      setAuth(data);

      // Navigate to the first accessible module, or /inspect as fallback
      const MODULE_PATHS: Record<string, string> = {
        inspect: '/inspect',
        analytics: '/analytics',
        data_capture: '/data-correction',
        teaching: '/teaching',
        settings: '/settings',
        reports: '/reports',
        activity_log: '/activity-log',
        user_management: '/users',
      };
      const MODULE_ORDER = [
        'inspect', 'data_capture', 'teaching', 'settings',
        'analytics', 'reports', 'activity_log', 'user_management',
      ];

      if (data.role === 'Administrator') {
        navigate('/inspect');
      } else {
        const firstModule = MODULE_ORDER.find(m => data.permissions?.[m]?.read);
        navigate(firstModule ? MODULE_PATHS[firstModule] : '/inspect');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-ips-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 380,
        background: 'var(--color-ips-surface)',
        border: '1px solid var(--color-ips-border-2)',
        borderRadius: 14,
        padding: '2.5rem',
        position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="SIEGER" style={{ width: '200px', height: 'auto', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Inspection System
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Username</label>
            <input
              id="login-username"
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-banner" style={{ padding: '8px 12px' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', fontSize: 14, marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Default credentials hint */}
        <div style={{
          marginTop: '1.5rem',
          padding: '10px 12px',
          background: 'var(--color-ips-surface-2)',
          borderRadius: 6,
          border: '1px solid var(--color-ips-border)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Default Admin Credentials
          </p>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            Username: <span style={{ color: 'var(--color-brand-light)' }}>admin</span>
          </p>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            Password: <span style={{ color: 'var(--color-brand-light)' }}>Admin@1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
