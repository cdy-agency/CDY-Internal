'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/context/PermissionContext';
import { firstAccessibleModulePath, isRouteAllowed } from '@/lib/module-access';

/**
 * Client-side page guard: checks the CURRENT path against the shared
 * ROUTE_PERMISSIONS table (apps/web/lib/module-access.ts) — the same table
 * the edge middleware uses — and redirects away if the user lacks the
 * specific permission that exact page needs.
 *
 * This is intentionally path-aware rather than a one-time module-level
 * check: a user can have SOME access to a module (e.g. finance.invoices)
 * without having the narrower permission a specific page needs (e.g.
 * finance.dashboard for the Overview page). A coarser "does the user have
 * any permission in this module" check would let them reach that page,
 * where its data-fetching calls would then fail with 403 and render an
 * empty/broken page instead of being blocked. Because this hook re-derives
 * its result from `usePathname()`, it re-checks on every in-module
 * navigation too — call it once per module layout, not per page.
 *
 * Also complements the edge middleware for permission changes that land
 * mid-session (PermissionContext refetches /auth/me periodically), since
 * the layout doesn't otherwise re-check after first render.
 */
export function useRouteAccessGuard(): boolean {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, isLoading } = usePermissions();
  const allowed = isLoading || isRouteAllowed(pathname, permissions);

  useEffect(() => {
    if (allowed) return;
    router.replace(firstAccessibleModulePath(permissions));
  }, [allowed, pathname, permissions, router]);

  return allowed;
}
