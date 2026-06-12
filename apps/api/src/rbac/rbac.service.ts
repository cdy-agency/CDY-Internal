import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import type { PermissionMap, PermissionProfile } from './permission.types';

export type { PermissionMap, PermissionProfile } from './permission.types';

@Injectable()
export class RbacService {
  private static readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async can(
    userId: string,
    featureKey: string,
    action: 'read' | 'write',
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const permission = permissions[featureKey];
    if (!permission) return false;
    return action === 'read' ? permission.canRead : permission.canWrite;
  }

  async getUserPermissions(userId: string): Promise<PermissionMap> {
    const cacheKey = `rbac:user:${userId}`;
    const cached = await this.cache.get<PermissionMap>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { feature: true },
              where: { feature: { isActive: true } },
            },
          },
        },
      },
    });

    if (!user) return {};

    const permissionMap: PermissionMap = Object.fromEntries(
      user.role.permissions.map((p) => [
        p.feature.key,
        { canRead: p.canRead, canWrite: p.canWrite },
      ]),
    );

    await this.cache.set(
      cacheKey,
      permissionMap,
      RbacService.CACHE_TTL_SECONDS,
    );

    return permissionMap;
  }

  async getPermissionProfile(userId: string): Promise<PermissionProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { feature: true },
              where: { feature: { isActive: true } },
            },
          },
        },
      },
    });

    if (!user) {
      return { roleKey: '', roleName: '', permissions: {} };
    }

    return {
      roleKey: user.role.key,
      roleName: user.role.name,
      permissions: Object.fromEntries(
        user.role.permissions.map((p) => [
          p.feature.key,
          { canRead: p.canRead, canWrite: p.canWrite },
        ]),
      ),
    };
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.del(`rbac:user:${userId}`);
  }

  async invalidateRoleCache(roleId: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { roleId },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.cache.del(`rbac:user:${u.id}`)),
    );
  }
}
