import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  BarChart2,
  Camera,
  BookOpen,
  Settings,
  FileText,
  ClipboardList,
  Users,
  Lock,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { authApi } from '../../api/client';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  /** permission module key to check (defaults to id) */
  permModule?: string;
  alwaysAccessible?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inspect',      label: 'Inspect',         icon: <Eye size={16} />,         path: '/inspect',       permModule: 'inspect' },
  { id: 'analytics',   label: 'Analytics',        icon: <BarChart2 size={16} />,   path: '/analytics',     permModule: 'analytics' },
  { id: 'data_capture',label: 'Data Correction',  icon: <Camera size={16} />,      path: '/data-correction',permModule: 'data_capture' },
  { id: 'teaching',    label: 'Teaching',         icon: <BookOpen size={16} />,    path: '/teaching',      permModule: 'teaching' },
  { id: 'settings',    label: 'Settings',         icon: <Settings size={16} />,    path: '/settings',      permModule: 'settings' },
  { id: 'reports',     label: 'Reports',          icon: <FileText size={16} />,    path: '/reports',       permModule: 'reports' },
  { id: 'activity_log',label: 'Activity log',     icon: <ClipboardList size={16} />,path: '/activity-log', permModule: 'activity_log' },
  { id: 'users',       label: 'Manage user',      icon: <Users size={16} />,       path: '/users',         permModule: 'user_management' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { activeView, setActiveView, isModuleLocked, showAlert, setAuth, auth, hasPermission } = useAppStore();

  const handleNav = (item: NavItem) => {
    if (!item.adminOnly && !item.alwaysAccessible && isModuleLocked(item.id)) {
      showAlert(
        'Access Denied: Halt live inspection line operations before altering core system configurations.'
      );
      return;
    }
    setActiveView(item.id);
    navigate(item.path);
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('ips_token');
    localStorage.removeItem('ips_user');
    setAuth(null);
    navigate('/login');
  };

  return (
    <aside className="app-sidebar flex flex-col">
      {/* Logo section */}
      <div className="px-3 py-4 border-b border-[var(--color-sidebar-border)]">
        <div className="flex items-center justify-center px-1">
          <img src="/logo.png" alt="SIEGER" style={{ maxWidth: '100%', height: 'auto', maxHeight: '100%' }} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        <p className="px-4 pt-2 pb-1 text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isAdmin = auth?.role === 'Administrator';

          // For non-admins: hide items they lack read permission for
          if (!isAdmin && item.permModule && !hasPermission(item.permModule, 'read')) return null;

          const locked = !item.alwaysAccessible && isModuleLocked(item.id);
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item w-full ${active ? 'active' : ''} ${locked ? 'nav-item--disabled' : ''}`}
              onClick={() => handleNav(item)}
              title={locked ? 'Locked during inspection' : item.label}
            >
              <span className={active ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {locked && (
                <Lock
                  size={11}
                  className="text-[var(--color-text-muted)] shrink-0"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-[var(--color-sidebar-border)] p-2">
        {auth && (
          <div className="px-3 py-2 mb-1">
            <p className="text-[10px] font-semibold text-[var(--color-text-secondary)] truncate">
              {auth.full_name}
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)]">{auth.role}</p>
          </div>
        )}
        <button
          className="nav-item w-full text-red-400 hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
