'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { ApiResponse, PermissionMap, UserProfile } from '@cdy/shared';

interface PermissionContextValue {
  permissions: PermissionMap;
  roleKey: string;
  roleName: string;
  homeModule: string;
  isLoading: boolean;
  can: (featureKey: string, action: 'read' | 'write') => boolean;
  canRead: (featureKey: string) => boolean;
  canWrite: (featureKey: string) => boolean;
  hasModule: (module: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const emptyPermissions: PermissionMap = {};

const PermissionContext = createContext<PermissionContextValue | null>(null);

function permissionsEqual(a: PermissionMap, b: PermissionMap): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function PermissionProvider({
  children,
  initialProfile,
}: {
  children: ReactNode;
  initialProfile?: Pick<UserProfile, 'roleKey' | 'roleName' | 'homeModule' | 'permissions'>;
}): JSX.Element {
  const [permissions, setPermissions] = useState<PermissionMap>(
    initialProfile?.permissions ?? emptyPermissions,
  );
  const [roleKey, setRoleKey] = useState(initialProfile?.roleKey ?? '');
  const [roleName, setRoleName] = useState(initialProfile?.roleName ?? '');
  const [homeModule, setHomeModule] = useState(initialProfile?.homeModule ?? '/finance');
  const [isLoading, setIsLoading] = useState(!initialProfile);

  const applyProfile = useCallback((profile: UserProfile, showToast = false) => {
    setRoleKey(profile.roleKey);
    setRoleName(profile.roleName);
    setHomeModule(profile.homeModule ?? '/finance');
    setPermissions((current) => {
      const next = profile.permissions ?? emptyPermissions;
      if (showToast && !permissionsEqual(current, next)) {
        toast('Your access permissions have been updated');
      }
      return next;
    });
    setIsLoading(false);
  }, []);

  const refreshPermissions = useCallback(async () => {
    const res = await api.get<ApiResponse<UserProfile>>('/auth/me');
    applyProfile(res.data.data, true);
  }, [applyProfile]);

  useEffect(() => {
    if (initialProfile) return;

    api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => applyProfile(res.data.data))
      .catch(() => setIsLoading(false));
  }, [initialProfile, applyProfile]);

  // Only poll when authenticated
  useEffect(() => {
    if (!roleKey) return;

    const interval = setInterval(() => {
      void refreshPermissions().catch(() => undefined);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshPermissions, roleKey]);

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions,
      roleKey,
      roleName,
      homeModule,
      isLoading,
      can: (featureKey, action) =>
        action === 'read'
          ? (permissions[featureKey]?.canRead ?? false)
          : (permissions[featureKey]?.canWrite ?? false),
      canRead: (featureKey) => permissions[featureKey]?.canRead ?? false,
      canWrite: (featureKey) => permissions[featureKey]?.canWrite ?? false,
      hasModule: (module) =>
        Object.keys(permissions).some((key) => key.startsWith(`${module}.`)),
      refreshPermissions,
    }),
    [permissions, roleKey, roleName, homeModule, isLoading, refreshPermissions],
  );

  return (
    <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermissions must be used inside PermissionProvider');
  }
  return ctx;
}
