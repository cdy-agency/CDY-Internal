import type { PermissionMap } from '@cdy/shared';

export interface ModuleHomeRoute {
  module: string;
  /**
   * Candidate paths within this module, in priority order (mirrors each
   * module's sidebar nav order, Overview first). The first one the user can
   * actually access wins. This matters because module access is not
   * uniform: a user with only finance.invoices (not finance.dashboard)
   * should land on /finance/invoices, not be bounced to an unrelated module
   * (they DO have real access within finance) and not be sent to /finance
   * itself (which would immediately redirect again — a loop).
   */
  candidatePaths: string[];
}

/**
 * Business priority order for redirect purposes: the first module in this
 * list the user has any access to becomes their landing page. Mirrors the
 * module grouping in apps/api/prisma/seeds/rbac.seed.ts (SYSTEM_FEATURES).
 */
export const MODULE_HOME_ROUTES: ModuleHomeRoute[] = [
  { module: 'ceo', candidatePaths: ['/ceo'] },
  {
    module: 'finance',
    candidatePaths: [
      '/finance', '/finance/invoices', '/finance/payments', '/finance/expenses',
      '/finance/bills', '/finance/ar', '/finance/reconciliation', '/finance/retainers',
      '/finance/budget', '/finance/reserve', '/finance/reports', '/finance/commissions',
      '/finance/payroll', '/finance/ventures', '/finance/settings',
    ],
  },
  {
    module: 'crm',
    candidatePaths: ['/crm', '/crm/pipeline', '/crm/leads', '/crm/proposals', '/crm/clients', '/crm/reports'],
  },
  {
    module: 'hr',
    candidatePaths: ['/hr', '/hr/employees', '/hr/leave', '/hr/leave/my', '/hr/attendance', '/hr/performance', '/hr/settings'],
  },
  {
    module: 'projects',
    candidatePaths: ['/projects', '/projects/my', '/projects/workload', '/projects/reports'],
  },
  { module: 'it', candidatePaths: ['/it', '/it/users', '/it/roles', '/it/audit'] },
  { module: 'marketing', candidatePaths: ['/marketing'] },
  { module: 'software', candidatePaths: ['/software'] },
  { module: 'branding', candidatePaths: ['/branding'] },
  { module: 'influencer', candidatePaths: ['/influencer', '/influencer/database'] },
  { module: 'sales', candidatePaths: ['/sales', '/sales/my'] },
];

/** Shown when a user has no access to any module at all. */
export const NO_ACCESS_PATH = '/403';

export function hasModuleAccess(
  permissions: PermissionMap | undefined,
  module: string,
): boolean {
  if (!permissions) return false;
  const prefix = `${module}.`;
  return Object.entries(permissions).some(
    ([key, val]) =>
      !key.endsWith('.lookup') &&
      (key === module || key.startsWith(prefix)) &&
      (val.canRead || val.canWrite),
  );
}

/**
 * First path (by module priority, then by each module's own candidate
 * order) the user can actually access, or NO_ACCESS_PATH. Checks the exact
 * candidate path via isRouteAllowed — not just "any permission somewhere in
 * this module" — so it never lands the user on a page it then immediately
 * redirects away from.
 */
export function firstAccessibleModulePath(
  permissions: PermissionMap | undefined,
): string {
  for (const route of MODULE_HOME_ROUTES) {
    for (const path of route.candidatePaths) {
      if (isRouteAllowed(path, permissions)) return path;
    }
  }
  return NO_ACCESS_PATH;
}

/**
 * Landing path for a freshly authenticated user. Keeps the role's configured
 * homeModule (e.g. /hr/leave/my, /finance/invoices) if the user still has
 * access to that EXACT path, so curated per-role landings are preserved.
 * Otherwise falls back to the first path the user actually has access to,
 * so a stale/default homeModule (e.g. a custom role stuck at "/finance", or
 * one missing just the specific permission its own homeModule page needs)
 * never strands the user on a page they can't use.
 */
export function resolveLandingPath(
  permissions: PermissionMap | undefined,
  preferredPath?: string,
): string {
  // Fail closed: no permission data means we cannot prove access to anything.
  // (Legacy/slim tokens without embedded permissions are forced back through
  // login by the middleware, which reissues a full token.)
  if (!permissions) return NO_ACCESS_PATH;
  if (preferredPath && isRouteAllowed(preferredPath, permissions)) {
    return preferredPath;
  }
  return firstAccessibleModulePath(permissions);
}

// ─── Per-page permission table ──────────────────────────────────────────
//
// Single source of truth for "what permission does this exact page need",
// used by BOTH the edge middleware (server-side gate on navigation) and
// useRouteAccessGuard (client-side gate that also covers in-module route
// changes and permission changes mid-session). A rule with `module` grants
// access on ANY read/write permission under that module prefix (e.g.
// module:'hr' matches hr.employees, hr.attendance, …) EXCEPT `*.lookup`
// features, which are picker-only and must not unlock module navigation.
// A rule with `feature + action` requires that exact permission. Order matters:
// `.find()` returns the first match, so more specific patterns must precede
// broader ones.
export type RouteRule =
  | { pattern: RegExp; module: string; feature?: never; action?: never }
  | { pattern: RegExp; feature: string; action: 'read' | 'write'; module?: never };

export const ROUTE_PERMISSIONS: RouteRule[] = [
  // ── CRM ──────────────────────────────────────────────────────────────
  { pattern: /^\/crm\/pipeline/, feature: 'crm.pipeline', action: 'read' },
  { pattern: /^\/crm\/leads/, feature: 'crm.leads', action: 'read' },
  { pattern: /^\/crm\/proposals/, feature: 'crm.proposals', action: 'read' },
  { pattern: /^\/crm\/clients/, feature: 'crm.clients', action: 'read' },
  { pattern: /^\/crm\/reports/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm\/settings/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm\/audit/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm$/, feature: 'crm.pipeline', action: 'read' },   // Overview
  { pattern: /^\/crm/, module: 'crm' },                              // any crm.* permission

  // ── HR ───────────────────────────────────────────────────────────────
  { pattern: /^\/hr\/performance\/my/, feature: 'hr.attendance', action: 'read' },
  { pattern: /^\/hr\/performance\/[^/]+$/, feature: 'hr.attendance', action: 'read' },
  { pattern: /^\/hr\/performance$/, feature: 'hr.performance', action: 'read' },
  { pattern: /^\/hr\/reports/, feature: 'hr.employees', action: 'read' },
  { pattern: /^\/hr\/audit/, feature: 'hr.settings', action: 'read' },
  { pattern: /^\/hr\/employees\/new/, feature: 'hr.employees', action: 'write' },
  { pattern: /^\/hr\/employees/, feature: 'hr.employees', action: 'read' },
  { pattern: /^\/hr\/leave\/my/, feature: 'hr.attendance', action: 'read' },
  { pattern: /^\/hr\/leave/, feature: 'hr.attendance', action: 'read' },
  { pattern: /^\/hr\/attendance\/my/, feature: 'hr.attendance', action: 'write' },
  { pattern: /^\/hr\/attendance/, feature: 'hr.attendance', action: 'read' },
  { pattern: /^\/hr\/settings/, feature: 'hr.settings', action: 'read' },
  { pattern: /^\/hr$/, feature: 'hr.employees', action: 'read' },    // Overview
  { pattern: /^\/hr/, module: 'hr' },                                // any hr.* permission

  // ── Projects ─────────────────────────────────────────────────────────
  { pattern: /^\/projects\/workload/, feature: 'projects.reports', action: 'read' },
  { pattern: /^\/projects\/reports/, feature: 'projects.reports', action: 'read' },
  { pattern: /^\/projects\/my/, feature: 'projects.own', action: 'read' },
  { pattern: /^\/projects\/new/, feature: 'projects.all', action: 'write' },
  { pattern: /^\/projects\/[^/]+\/handover/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/approvals/, feature: 'projects.approvals', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/status-report/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/milestones/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects$/, feature: 'projects.all', action: 'read' }, // Overview / All Projects
  { pattern: /^\/projects/, module: 'projects' },                    // any projects.* permission

  // ── Finance ──────────────────────────────────────────────────────────
  { pattern: /^\/finance\/invoices/, feature: 'finance.invoices', action: 'read' },
  { pattern: /^\/finance\/payments/, feature: 'finance.payments', action: 'read' },
  { pattern: /^\/finance\/expenses/, feature: 'finance.expenses', action: 'read' },
  { pattern: /^\/finance\/bills/, feature: 'finance.bills', action: 'read' },
  { pattern: /^\/finance\/ar/, feature: 'finance.ar', action: 'read' },
  { pattern: /^\/finance\/reports/, feature: 'finance.reports', action: 'read' },
  { pattern: /^\/finance\/commissions\/my/, feature: 'finance.commissions.own', action: 'read' },
  { pattern: /^\/finance\/commissions/, feature: 'finance.commissions', action: 'read' },
  { pattern: /^\/finance\/payroll/, feature: 'finance.payroll', action: 'read' },
  { pattern: /^\/finance\/retainers/, feature: 'finance.retainers', action: 'read' },
  { pattern: /^\/finance\/ventures/, feature: 'ventures.view', action: 'read' },
  { pattern: /^\/finance\/budget/, feature: 'finance.budget', action: 'read' },
  { pattern: /^\/finance\/reconciliation/, feature: 'finance.reconciliation', action: 'read' },
  { pattern: /^\/finance\/audit/, feature: 'finance.audit', action: 'read' },
  { pattern: /^\/finance\/settings/, feature: 'finance.settings', action: 'read' },
  { pattern: /^\/finance$/, feature: 'finance.dashboard', action: 'read' }, // Overview
  { pattern: /^\/finance/, module: 'finance' },                      // any finance.* permission

  // ── IT ───────────────────────────────────────────────────────────────
  { pattern: /^\/it\/users\/new/, feature: 'it.users', action: 'write' },
  { pattern: /^\/it\/roles\/new/, feature: 'it.roles', action: 'write' },
  { pattern: /^\/it/, module: 'it' },                                // any it.* permission

  // ── Marketing ────────────────────────────────────────────────────────
  { pattern: /^\/marketing\/calendar/, feature: 'marketing.content', action: 'read' },
  { pattern: /^\/marketing\/[^/]+/, feature: 'marketing.content', action: 'read' }, // client detail
  { pattern: /^\/marketing$/, feature: 'marketing.clients', action: 'read' }, // Overview
  { pattern: /^\/marketing/, module: 'marketing' },

  // ── Software ─────────────────────────────────────────────────────────
  { pattern: /^\/software\/[^/]+/, feature: 'software.projects', action: 'read' },
  { pattern: /^\/software$/, feature: 'software.projects', action: 'read' }, // Overview
  { pattern: /^\/software/, module: 'software' },

  // ── Branding ─────────────────────────────────────────────────────────
  { pattern: /^\/branding\/[^/]+/, feature: 'branding.projects', action: 'read' },
  { pattern: /^\/branding$/, feature: 'branding.projects', action: 'read' }, // Overview
  { pattern: /^\/branding/, module: 'branding' },

  // ── Influencer ───────────────────────────────────────────────────────
  { pattern: /^\/influencer\/database/, feature: 'influencer.database', action: 'read' },
  { pattern: /^\/influencer\/[^/]+$/, feature: 'influencer.campaigns', action: 'read' }, // campaign detail
  { pattern: /^\/influencer$/, feature: 'influencer.campaigns', action: 'read' },        // Overview
  { pattern: /^\/influencer/, module: 'influencer' },

  // ── Sales ────────────────────────────────────────────────────────────
  { pattern: /^\/sales\/my/, feature: 'sales.reporting', action: 'read' },
  { pattern: /^\/sales\/[^/]+$/, feature: 'sales.campaigns', action: 'read' }, // campaign detail
  { pattern: /^\/sales$/, feature: 'sales.campaigns', action: 'read' },        // Overview
  { pattern: /^\/sales/, module: 'sales' },

  // ── CEO ──────────────────────────────────────────────────────────────
  { pattern: /^\/ceo/, feature: 'ceo.dashboard', action: 'read' },
];

/**
 * Whether the given path is allowed for this user, per ROUTE_PERMISSIONS.
 * Fails CLOSED when permission data isn't available: access must be provable
 * from the permission map. Paths that match no rule are allowed — every
 * protected module prefix has a catch-all rule, so an unmatched path is by
 * definition outside the permission-gated module space (e.g. /login, /403).
 */
export function isRouteAllowed(
  pathname: string,
  permissions: PermissionMap | undefined,
): boolean {
  if (!permissions) return false;

  const rule = ROUTE_PERMISSIONS.find((r) => r.pattern.test(pathname));
  if (!rule) return true;

  if (rule.module) {
    return hasModuleAccess(permissions, rule.module);
  }
  const perm = permissions[rule.feature || ''];
  return rule.action === 'read' ? Boolean(perm?.canRead) : Boolean(perm?.canWrite);
}
