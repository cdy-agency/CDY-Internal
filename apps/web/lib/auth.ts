export const AUTH_COOKIE_NAME = 'cdy_access_token';
export const REFRESH_COOKIE_NAME = 'cdy_refresh_token';

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=')[1] ?? '');
}
