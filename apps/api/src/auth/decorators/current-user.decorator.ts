import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  roleKey: string;
  roleName: string;
  homeModule: string;
  /**
   * Compact permission claim ("feature.key:rw" entries, see encodePermissions
   * in @cdy/shared). Kept compact because the token is stored in a cookie and
   * the verbose PermissionMap form exceeded the 4 KB cookie limit. Backend
   * authorization never reads this claim — PermissionGuard checks the DB via
   * RbacService; it exists for the web middleware's route gating.
   */
  perms?: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
