import { SetMetadata } from '@nestjs/common';

export const ALLOW_AUTHENTICATED_KEY = 'allowAuthenticated';

/**
 * Marks a route as reachable by ANY authenticated user without a specific
 * feature permission. Required because {@link PermissionGuard} fails closed:
 * a route with neither `@Public`, `@RequirePermission`, nor
 * `@AllowAuthenticated` is denied. Use this only for self-service endpoints
 * whose authorization is enforced by per-user ownership inside the service
 * (e.g. "my notifications", "my leave requests").
 */
export const AllowAuthenticated = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);
