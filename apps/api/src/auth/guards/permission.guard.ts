import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      targets,
    );

    // Fail closed: a route with no explicit permission requirement is only
    // reachable when it opts in via @AllowAuthenticated (self-service routes
    // whose ownership is enforced in the service). Anything else is denied so
    // a forgotten decorator can never silently expose an endpoint.
    if (!required) {
      const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
        ALLOW_AUTHENTICATED_KEY,
        targets,
      );
      if (allowAuthenticated) {
        return true;
      }
      throw new ForbiddenException(
        'This endpoint has no access policy configured and is denied by default.',
      );
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    const allowed = await this.rbacService.can(
      user.sub,
      required.featureKey,
      required.action,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission denied. Feature: ${required.featureKey}, Action: ${required.action}. Your role "${user.roleName}" does not have this permission.`,
      );
    }

    return true;
  }
}
