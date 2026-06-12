import { usePermissions } from '@/context/PermissionContext';

export function useCanRead(featureKey: string): boolean {
  const { canRead } = usePermissions();
  return canRead(featureKey);
}

export function useCanWrite(featureKey: string): boolean {
  const { canWrite } = usePermissions();
  return canWrite(featureKey);
}

export function useFeatureAccess(featureKey: string): {
  canRead: boolean;
  canWrite: boolean;
  hasAny: boolean;
} {
  const { canRead, canWrite } = usePermissions();
  return {
    canRead: canRead(featureKey),
    canWrite: canWrite(featureKey),
    hasAny: canRead(featureKey) || canWrite(featureKey),
  };
}
