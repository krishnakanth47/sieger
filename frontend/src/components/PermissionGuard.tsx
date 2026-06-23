import React from 'react';
import { useAppStore } from '../store/appStore';
import AccessDeniedView from '../views/AccessDeniedView';

interface PermissionGuardProps {
  /** The permission module key — e.g. "inspect", "settings", "user_management" */
  module: string;
  children: React.ReactNode;
}

/**
 * PermissionGuard wraps a page/route and renders AccessDeniedView
 * if the current user lacks `read` permission for the given module.
 * Administrator role always bypasses permission checks.
 */
export function PermissionGuard({ module, children }: PermissionGuardProps) {
  const auth = useAppStore(s => s.auth);
  const hasPermission = useAppStore(s => s.hasPermission);

  // Administrators always have full access
  if (auth?.role === 'Administrator') {
    return <>{children}</>;
  }

  // Check read permission for the module
  if (!hasPermission(module, 'read')) {
    return <AccessDeniedView />;
  }

  return <>{children}</>;
}
