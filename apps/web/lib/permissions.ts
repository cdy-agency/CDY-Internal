import type { PermissionMap } from '@cdy/shared';

export type { PermissionMap };

export function canRead(permissions: PermissionMap, featureKey: string): boolean {
  return permissions[featureKey]?.canRead ?? false;
}

export function canWrite(permissions: PermissionMap, featureKey: string): boolean {
  return permissions[featureKey]?.canWrite ?? false;
}

export function hasAnyAccess(permissions: PermissionMap, featureKey: string): boolean {
  const p = permissions[featureKey];
  return Boolean(p?.canRead || p?.canWrite);
}

export function hasAnyModuleAccess(permissions: PermissionMap, module: string): boolean {
  return Object.keys(permissions).some(
    (key) => key.startsWith(`${module}.`) && !key.endsWith('.lookup'),
  );
}
