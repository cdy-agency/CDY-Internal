import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/** Clear session cookies and send the user to login (avoids /login ↔ /finance redirect loops). */
export async function redirectToLoginAfterAuthFailure(
  router: AppRouterInstance,
): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/login');
  router.refresh();
}
