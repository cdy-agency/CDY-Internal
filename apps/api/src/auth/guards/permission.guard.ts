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
import { JwtPayload } from '../decorators/current-user.decorator';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
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
