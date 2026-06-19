import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/** Clear session cookies and send the user to login (avoids /login ↔ /finance redirect loops). */
export function redirectToLoginAfterAuthFailure(
  router: AppRouterInstance,
): void {
  router.push('/login');
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
}
