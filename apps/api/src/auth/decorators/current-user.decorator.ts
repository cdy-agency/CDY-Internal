import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import type { PermissionMap } from '../../rbac/permission.types';

export interface JwtPayload {
  sub: string;
  email: string;
  roleKey: string;
  roleName: string;
  homeModule: string;
  permissions?: PermissionMap;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
