import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth';
import { firstAccessibleModulePath, isRouteAllowed, resolveLandingPath } from '@/lib/module-access';
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

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Root: redirect to the user's landing page, or login
  if (pathname === '/') {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const payload = parseJwtPayload(token);
    if (!payload) return redirectToLogin(request);
    // Legacy/slim tokens without a permission map can't prove access; force a
    // fresh login that issues a full token instead of guessing a landing page.
    if (!payload.permissions) {
      return redirectToLogin(request);
    }
    const landingPath = resolveLandingPath(payload.permissions, payload.homeModule);
    return NextResponse.redirect(new URL(landingPath, request.url));
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

  // Login page: redirect authenticated users to their landing page
  if (pathname === '/login') {
    if (payload) {
      const landingPath = resolveLandingPath(payload.permissions, payload.homeModule);
      return NextResponse.redirect(new URL(landingPath, request.url));
    }
    return clearAuthCookies(NextResponse.next());
  }

  if (!payload) {
    // Access token expired — if a refresh token exists let the page load;
    // the client-side axios interceptor will call /api/auth/refresh and retry.
    const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE_NAME)?.value);
    if (hasRefreshToken) {
      return NextResponse.next();
    }
    return redirectToLogin(request);
  }

  // Fail closed: a token without embedded permissions (legacy/slim token)
  // cannot prove access to anything. Force a fresh login, which issues a
  // full token with the permission map.
  if (!payload.permissions) {
    return redirectToLogin(request);
  }

  if (!isRouteAllowed(pathname, payload.permissions)) {
    // Deliberately ignore payload.homeModule here (unlike the redirects above):
    // homeModule can point at the very module that was just denied (e.g. a
    // stale/default value for a custom role), which would redirect right
    // back into another denial and loop forever. Module-root paths always
    // pass their own module's catch-all rule, so this is guaranteed to land
    // somewhere the user can actually access (or /403 if nowhere).
    const fallbackPath = firstAccessibleModulePath(payload.permissions);
    return NextResponse.redirect(new URL(fallbackPath, request.url));
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
