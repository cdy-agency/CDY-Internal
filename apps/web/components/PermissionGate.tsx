'use client';

import { usePermissions } from '@/context/PermissionContext';

interface PermissionGateProps {
  feature: string;
  action: 'read' | 'write';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  feature,
  action,
  children,
  fallback = null,
}: PermissionGateProps): JSX.Element {
  const { can } = usePermissions();

  if (!can(feature, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
