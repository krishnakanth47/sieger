import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { activityApi } from '../api/client';

export default function ActivityLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [username, setUsername] = useState('');
  const [actionType, setActionType] = useState('All Actions');

  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    const params: any = {};
    if (fromDate) params.from_date = new Date(fromDate).toISOString();
    if (toDate) params.to_date = new Date(toDate).toISOString();
    if (username) params.username = username;
    if (actionType !== 'All Actions') params.action_type = actionType;

    activityApi.getLogs(params)
      .then(res => {
        setLogs(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    activityApi.getActionTypes().then(res => setActionTypes(res.data)).catch(() => {});
  }, []);

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setUsername('');
    setActionType('All Actions');
    setLoading(true);
    activityApi.getLogs({})
      .then(res => setLogs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const getActionStyle = (action: string) => {
    switch (action.toUpperCase()) {
      case 'LOGIN':
        return { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }; // blue
      case 'LOGOUT':
        return { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }; // gray
      case 'CREATE':
      case 'CREATE_USER':
        return { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }; // green
      case 'UPDATE':
      case 'UPDATE_USER':
        return { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }; // yellow
      case 'DELETE':
      case 'DELETE_USER':
        return { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }; // red
      default:
        return { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }; // default gray
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('en-GB', {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    }).replace(',', ','); // Adjust format to match image
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Activity Log</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Filters Section */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-ips-border)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="input-label" style={{ textTransform: 'none', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>From Date</label>
            <input 
              type="date" 
              className="input" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="input-label" style={{ textTransform: 'none', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>To Date</label>
            <input 
              type="date" 
              className="input" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>
          <div style={{ flex: 1.5, minWidth: '200px' }}>
            <label className="input-label" style={{ textTransform: 'none', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>User</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Search User..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>
          <div style={{ flex: 1.5, minWidth: '200px' }}>
            <label className="input-label" style={{ textTransform: 'none', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Action</label>
            <select 
              className="input" 
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="All Actions">All Actions</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', padding: '8px 24px' }}
              onClick={handleSearch}
              disabled={loading}
            >
              <Search size={14} /> Search
            </button>
            <button 
              className="btn btn-danger" 
              style={{ padding: '8px 24px' }}
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ width: '8%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>ID</th>
                <th style={{ width: '15%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>User</th>
                <th style={{ width: '12%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>Action</th>
                <th style={{ width: '20%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>Target</th>
                <th style={{ width: '20%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>Timestamp</th>
                <th style={{ width: '25%', padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-ips-border-2)', textTransform: 'none', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 13 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: 13 }}>#{log.id}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: 24, height: 24, borderRadius: '50%', 
                        background: 'var(--color-ips-surface-3)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 'bold', color: 'var(--color-text-secondary)'
                      }}>
                        {log.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{log.username}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: 11, 
                      fontWeight: 600, 
                      ...getActionStyle(log.action_type || '')
                    }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{log.module || '—'}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{formatDate(log.timestamp)}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{log.description || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    No activity logs found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
