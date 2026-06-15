import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/appStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AlertBanner } from './components/layout/AlertBanner';
import LoginView from './views/LoginView';
import InspectView from './views/InspectView';
import DataCaptureView from './views/DataCaptureView';
import TeachingView from './views/TeachingView';
import SettingsView from './views/SettingsView';
import AnalyticsView from './views/AnalyticsView';
import ReportsView from './views/ReportsView';
import ActivityLogView from './views/ActivityLogView';
import UserManagementView from './views/UserManagementView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10000 },
  },
});

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
                    <Route path="/" element={<Navigate to="/inspect" replace />} />
                    <Route path="/inspect" element={<InspectView />} />
                    <Route path="/analytics" element={<AnalyticsView />} />
                    <Route path="/data-capture" element={<DataCaptureView />} />
                    <Route path="/teaching" element={<TeachingView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/reports" element={<ReportsView />} />
                    <Route path="/activity-log" element={<ActivityLogView />} />
                    <Route path="/users" element={<UserManagementView />} />
                    <Route path="*" element={<Navigate to="/inspect" replace />} />
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
