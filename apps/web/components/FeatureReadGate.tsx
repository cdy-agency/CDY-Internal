'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/context/PermissionContext';
import { AccessDenied } from '@/components/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureReadGateProps {
  feature: string;
  featureName?: string;
  children: ReactNode;
}

export function FeatureReadGate({
  feature,
  featureName,
  children,
}: FeatureReadGateProps): JSX.Element {
  const { canRead, canWrite, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // Allow access if the user has at least one permission (read OR write).
  // Individual sections that require write are still guarded by PermissionGate.
  if (!canRead(feature) && !canWrite(feature)) {
    return <AccessDenied feature={featureName} />;
  }

  return <>{children}</>;
}
