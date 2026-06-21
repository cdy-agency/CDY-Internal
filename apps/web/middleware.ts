import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth';
import type { PermissionMap } from '@cdy/shared';

interface JwtPayload {
  sub: string;
  email: string;
  roleKey: string;
  roleName: string;
  homeModule?: string;
  permissions: PermissionMap;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid token');
  }

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const json = atob(padded);
  return JSON.parse(json) as JwtPayload;
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = decodeJwtPayload(token);
    if (payload.exp != null && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}

function redirectToLogin(request: NextRequest): NextResponse {
  return clearAuthCookies(
    NextResponse.redirect(new URL('/login', request.url)),
  );
}

const PROTECTED_PREFIXES = [
  '/finance', '/it', '/crm', '/hr', '/projects',
  '/marketing', '/software', '/branding', '/influencer', '/sales', '/ceo',
];

const ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  feature: string;
  action: 'read' | 'write';
}> = [
  { pattern: /^\/crm\/pipeline/, feature: 'crm.pipeline', action: 'read' },
  { pattern: /^\/crm\/leads/, feature: 'crm.leads', action: 'read' },
  { pattern: /^\/crm\/proposals/, feature: 'crm.proposals', action: 'read' },
  { pattern: /^\/crm\/clients/, feature: 'crm.clients', action: 'read' },
  { pattern: /^\/crm\/reports/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm\/settings/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm\/audit/, feature: 'crm.reports', action: 'read' },
  { pattern: /^\/crm/, feature: 'crm.pipeline', action: 'read' },
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
  { pattern: /^\/hr/, feature: 'hr.employees', action: 'read' },
  { pattern: /^\/projects\/workload/, feature: 'projects.reports', action: 'read' },
  { pattern: /^\/projects\/reports/, feature: 'projects.reports', action: 'read' },
  { pattern: /^\/projects\/my/, feature: 'projects.own', action: 'read' },
  { pattern: /^\/projects\/new/, feature: 'projects.all', action: 'write' },
  { pattern: /^\/projects\/[^/]+\/handover/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/approvals/, feature: 'projects.approvals', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/status-report/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects\/[^/]+\/milestones/, feature: 'projects.all', action: 'read' },
  { pattern: /^\/projects/, feature: 'projects.all', action: 'read' },
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
  { pattern: /^\/finance/, feature: 'finance.dashboard', action: 'read' },
  { pattern: /^\/it\/users\/new/, feature: 'it.users', action: 'write' },
  { pattern: /^\/it\/roles\/new/, feature: 'it.roles', action: 'write' },
  { pattern: /^\/it/, feature: 'it.users', action: 'read' },
  { pattern: /^\/marketing\/[^/]+/, feature: 'marketing.content', action: 'read' },
  { pattern: /^\/marketing/, feature: 'marketing.content', action: 'read' },
  { pattern: /^\/software\/[^/]+/, feature: 'software.projects', action: 'read' },
  { pattern: /^\/software/, feature: 'software.projects', action: 'read' },
  { pattern: /^\/branding\/[^/]+/, feature: 'branding.projects', action: 'read' },
  { pattern: /^\/branding/, feature: 'branding.projects', action: 'read' },
  { pattern: /^\/influencer/, feature: 'influencer.campaigns', action: 'read' },
  { pattern: /^\/sales\/my/, feature: 'sales.reporting', action: 'read' },
  { pattern: /^\/sales/, feature: 'sales.campaigns', action: 'read' },
  { pattern: /^\/ceo/, feature: 'ceo.dashboard', action: 'read' },
];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Root: redirect to homeModule or login
  if (pathname === '/') {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const payload = parseJwtPayload(token);
    if (!payload) return redirectToLogin(request);
    return NextResponse.redirect(new URL(payload.homeModule ?? '/finance', request.url));
  }

  // Protected modules: require auth
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!token) {
    return NextResponse.next();
  }

  const payload = parseJwtPayload(token);

  // Login page: redirect authenticated users to homeModule
  if (pathname === '/login') {
    if (payload) {
      return NextResponse.redirect(new URL(payload.homeModule ?? '/finance', request.url));
    }
    return clearAuthCookies(NextResponse.next());
  }

  if (!payload) {
    return redirectToLogin(request);
  }

  // CEO bypasses all permission checks
  if (payload.roleKey === 'CEO') {
    return NextResponse.next();
  }

  const routeRule = ROUTE_PERMISSIONS.find((r) => r.pattern.test(pathname));
  if (!routeRule) {
    return NextResponse.next();
  }

  const permission = payload.permissions?.[routeRule.feature];
  const allowed =
    routeRule.action === 'read' ? permission?.canRead : permission?.canWrite;

  if (!allowed) {
    const homeModule = payload.homeModule ?? '/finance';
    return NextResponse.redirect(new URL(homeModule, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/finance/:path*',
    '/it/:path*',
    '/crm/:path*',
    '/hr/:path*',
    '/projects/:path*',
    '/marketing/:path*',
    '/software/:path*',
    '/branding/:path*',
    '/influencer/:path*',
    '/sales/:path*',
    '/ceo/:path*',
    '/ceo',
    '/login',
  ],
};
