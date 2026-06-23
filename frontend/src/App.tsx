import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/appStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AlertBanner } from './components/layout/AlertBanner';
import { PermissionGuard } from './components/PermissionGuard';
import LoginView from './views/LoginView';
import InspectView from './views/InspectView';
import DataCorrectionView from './views/DataCorrectionView';
import TeachingView from './views/TeachingView';
import SettingsView from './views/SettingsView';
import AnalyticsView from './views/AnalyticsView';
import ReportsView from './views/ReportsView';
import UserManagementView from './views/UserManagementView';
import ActivityLogView from './views/ActivityLogView';
import AccessDeniedView from './views/AccessDeniedView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10000 },
  },
});

const MODULE_PATHS: Record<string, string> = {
  inspect: '/inspect',
  data_capture: '/data-correction',
  teaching: '/teaching',
  settings: '/settings',
  analytics: '/analytics',
  reports: '/reports',
  activity_log: '/activity-log',
  user_management: '/users',
};
const MODULE_ORDER = [
  'inspect', 'data_capture', 'teaching', 'settings',
  'analytics', 'reports', 'activity_log', 'user_management',
];

function DefaultRedirect() {
  const auth = useAppStore(s => s.auth);
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === 'Administrator') return <Navigate to="/inspect" replace />;
  const firstModule = MODULE_ORDER.find(m => auth.permissions?.[m]?.read);
  return <Navigate to={firstModule ? MODULE_PATHS[firstModule] : '/inspect'} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore(s => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="app-main">
        <AlertBanner />
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DefaultRedirect />} />

                    <Route path="/inspect" element={
                      <PermissionGuard module="inspect">
                        <InspectView />
                      </PermissionGuard>
                    } />

                    <Route path="/analytics" element={
                      <PermissionGuard module="analytics">
                        <AnalyticsView />
                      </PermissionGuard>
                    } />

                    <Route path="/data-correction" element={
                      <PermissionGuard module="data_capture">
                        <DataCorrectionView />
                      </PermissionGuard>
                    } />

                    <Route path="/teaching" element={
                      <PermissionGuard module="teaching">
                        <TeachingView />
                      </PermissionGuard>
                    } />

                    <Route path="/settings" element={
                      <PermissionGuard module="settings">
                        <SettingsView />
                      </PermissionGuard>
                    } />

                    <Route path="/reports" element={
                      <PermissionGuard module="reports">
                        <ReportsView />
                      </PermissionGuard>
                    } />

                    <Route path="/activity-log" element={
                      <PermissionGuard module="activity_log">
                        <ActivityLogView />
                      </PermissionGuard>
                    } />

                    <Route path="/users" element={
                      <PermissionGuard module="user_management">
                        <UserManagementView />
                      </PermissionGuard>
                    } />

                    <Route path="/access-denied" element={<AccessDeniedView />} />
                    <Route path="*" element={<DefaultRedirect />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
